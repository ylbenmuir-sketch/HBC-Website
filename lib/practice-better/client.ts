// Practice Better API client: server-only, read-only (Ben, 2026-11-24).
// Step 1 of online booking is discovery, so this client exposes GET and
// nothing else. A later booking step adds its own write method on purpose.
//
// What was confirmed against the live API on 2026-11-24 (the docs at
// docs.practicebetter.io sit behind the Practice Better login):
//   token   POST https://api.practicebetter.io/oauth2/token, form-encoded
//           grant_type=client_credentials, client_id, client_secret in the
//           body (HTTP Basic is refused with 400). The response is
//           {access_token, token_type: "Bearer", expires_in: 1200}.
//   GET     /consultant/services        {count, hasMore, items[]}, paged
//                                       with limit + skip
//   GET     /consultant/profile         the API account's own profile
//   GET     /consultant/availability/slots?as_consultant&serviceId&day
//           [{startDate, endDate, duration}]: slots from `day` onward
//
// SECRETS, the hard rule: PB_CLIENT_ID, PB_CLIENT_SECRET and the access
// token live only inside this module. Nothing here logs, and no error
// message carries them: every message is built from the method, the path
// and a status code, and any text from Practice Better is redacted before
// use. lib/practice-better/client.test.mjs checks both.
//
// Rate limit: at most 4 requests in any rolling second (Practice Better
// allows 5), counting token requests too. A 429 waits for Retry-After (or
// one second) and retries, up to three times.

if (typeof window !== "undefined") {
  throw new Error("lib/practice-better/client.ts is server-only");
}

export const PB_API_BASE = "https://api.practicebetter.io";
export const PB_TOKEN_URL = `${PB_API_BASE}/oauth2/token`;

/** Requests allowed in any rolling one-second window (Practice Better's cap is 5). */
export const MAX_REQUESTS_PER_SECOND = 4;
/** Refresh the token this long before Practice Better says it expires. */
const TOKEN_REFRESH_MARGIN_MS = 60_000;
const MAX_429_RETRIES = 3;

export type Query = Record<string, string | number | boolean | undefined>;

export type PbClientOptions = {
  clientId?: string;
  clientSecret?: string;
  /** Injected for tests; defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Injected for tests; defaults to Date.now. */
  now?: () => number;
  /** Injected for tests; defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
};

/** A failed Practice Better call. The message never holds a credential or token. */
export class PbApiError extends Error {
  status: number;
  path: string;
  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "PbApiError";
    this.status = status;
    this.path = path;
  }
}

export type PbClient = {
  /** GET a JSON resource. `path` starts with "/", e.g. "/consultant/services". */
  get<T = unknown>(path: string, query?: Query): Promise<T>;
};

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createPbClient(options: PbClientOptions = {}): PbClient {
  const clientId = options.clientId ?? process.env.PB_CLIENT_ID ?? "";
  const clientSecret = options.clientSecret ?? process.env.PB_CLIENT_SECRET ?? "";
  const doFetch = options.fetch ?? fetch;
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? realSleep;

  let token: { value: string; expiresAt: number } | null = null;
  let tokenInFlight: Promise<string> | null = null;
  const sent: number[] = []; // start times of recent requests
  let queue: Promise<void> = Promise.resolve();

  /** Removes anything secret from text before it can reach an error message. */
  function redact(text: string): string {
    let out = text;
    for (const secret of [clientSecret, clientId, token?.value ?? ""]) {
      if (secret) out = out.split(secret).join("[redacted]");
    }
    return out;
  }

  /** Waits until a request fits under the rate limit, then claims the slot. */
  function takeSlot(): Promise<void> {
    const turn = queue.then(async () => {
      for (;;) {
        const t = now();
        while (sent.length && t - sent[0] >= 1000) sent.shift();
        if (sent.length < MAX_REQUESTS_PER_SECOND) {
          sent.push(t);
          return;
        }
        await sleep(1000 - (t - sent[0]) + 5);
      }
    });
    queue = turn.catch(() => {});
    return turn;
  }

  /** Practice Better's short error text, if any, with secrets removed. */
  async function errorDetail(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { errorMessage?: unknown; error?: unknown };
      const msg = body?.errorMessage ?? body?.error;
      return typeof msg === "string" || typeof msg === "number"
        ? `: ${redact(String(msg)).slice(0, 200)}`
        : "";
    } catch {
      return "";
    }
  }

  async function fetchToken(): Promise<string> {
    if (!clientId || !clientSecret) {
      throw new PbApiError(
        "Practice Better credentials missing: set PB_CLIENT_ID and PB_CLIENT_SECRET",
        0,
        "/oauth2/token",
      );
    }
    for (let attempt = 0; ; attempt++) {
      await takeSlot();
      const res = await doFetch(PB_TOKEN_URL, {
        method: "POST", // OAuth2 requires POST for the token request; it changes nothing in Practice Better
        headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });
      if (res.status === 429 && attempt < MAX_429_RETRIES) {
        await sleep(retryAfterMs(res));
        continue;
      }
      if (!res.ok) {
        throw new PbApiError(
          `Practice Better token request failed (${res.status})${await errorDetail(res)}`,
          res.status,
          "/oauth2/token",
        );
      }
      const body = (await res.json()) as { access_token?: unknown; expires_in?: unknown };
      if (typeof body.access_token !== "string" || !body.access_token) {
        throw new PbApiError("Practice Better token response had no access_token", res.status, "/oauth2/token");
      }
      const lifetimeMs = (Number(body.expires_in) || 300) * 1000;
      token = {
        value: body.access_token,
        expiresAt: now() + Math.max(lifetimeMs - TOKEN_REFRESH_MARGIN_MS, lifetimeMs / 2),
      };
      return token.value;
    }
  }

  async function getToken(): Promise<string> {
    if (token && now() < token.expiresAt) return token.value;
    if (!tokenInFlight) {
      tokenInFlight = fetchToken().finally(() => {
        tokenInFlight = null;
      });
    }
    return tokenInFlight;
  }

  async function get<T = unknown>(path: string, query?: Query): Promise<T> {
    if (!path.startsWith("/") || path.includes("://")) {
      throw new PbApiError("Practice Better path must start with /", 0, "(invalid)");
    }
    const url = new URL(PB_API_BASE + path);
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
    let refreshed = false;
    for (let attempt = 0; ; attempt++) {
      const bearer = await getToken();
      await takeSlot();
      const res = await doFetch(url, {
        method: "GET",
        headers: { Authorization: `Bearer ${bearer}`, Accept: "application/json" },
      });
      if (res.status === 401 && !refreshed) {
        token = null; // expired or revoked early: fetch a fresh one once
        refreshed = true;
        continue;
      }
      if (res.status === 429 && attempt < MAX_429_RETRIES) {
        await sleep(retryAfterMs(res));
        continue;
      }
      if (!res.ok) {
        throw new PbApiError(
          `Practice Better GET ${path} failed (${res.status})${await errorDetail(res)}`,
          res.status,
          path,
        );
      }
      return (await res.json()) as T;
    }
  }

  return { get };
}

function retryAfterMs(res: Response): number {
  const secs = Number(res.headers.get("retry-after"));
  return Number.isFinite(secs) && secs > 0 ? Math.min(secs, 30) * 1000 : 1000;
}
