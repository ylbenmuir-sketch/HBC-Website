/**
 * The browser half of the spam guard (lib/form-guard.ts): fetch the page
 * token early, and post with it. Used by components/ContactForm.tsx and
 * components/GuideCta.tsx; one token per page, shared.
 *
 * A real visitor never sees any of this. The token is fetched when the form
 * mounts, so by the time she has typed it is old enough. If she is faster
 * than the minimum fill time — or the early fetch failed, or the tab sat
 * open past the token's life — the submit waits out the remainder (under
 * three seconds, behind "Sending…") rather than being refused. A refusal
 * that names the token (a deploy changed the key, a laptop slept) is
 * retried once with a fresh one.
 */

type Held = { token: string; at: number; minAgeMs: number; ttlMs: number };

let held: Held | null = null;
let loading: Promise<Held | null> | null = null;

/** Refetch this long before the server would call the token expired. */
const REFRESH_MARGIN_MS = 5 * 60_000;
/** On top of the server's minimum, for the two clocks. */
const WAIT_MARGIN_MS = 300;

function usable(h: Held | null): h is Held {
  return h !== null && Date.now() - h.at < h.ttlMs - REFRESH_MARGIN_MS;
}

function load(): Promise<Held | null> {
  if (!loading) {
    loading = fetch("/api/form-token", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = (await res.json().catch(() => null)) as Partial<Held> | null;
        if (!body || typeof body.token !== "string") return null;
        held = {
          token: body.token,
          at: Date.now(),
          minAgeMs: typeof body.minAgeMs === "number" ? body.minAgeMs : 3_000,
          ttlMs: typeof body.ttlMs === "number" ? body.ttlMs : 60 * 60_000,
        };
        return held;
      })
      .catch(() => null)
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

/** Start fetching a token if there is no usable one. Safe to call often. */
export function prefetchFormToken(): void {
  if (!usable(held)) void load();
}

async function tokenForSubmit(): Promise<string | null> {
  let h: Held | null = usable(held) ? held : await load();
  if (!h) h = await load();
  if (!h) return null;
  const wait = h.minAgeMs + WAIT_MARGIN_MS - (Date.now() - h.at);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return h.token;
}

/**
 * POST JSON with the page token added as `form_token`. Resolves to the
 * response exactly as fetch would (and rejects as fetch would), so the
 * caller's own handling of success and failure is unchanged.
 */
export async function postWithFormToken(url: string, payload: Record<string, unknown>): Promise<Response> {
  const send = async () =>
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, form_token: await tokenForSubmit() }),
    });
  const res = await send();
  if (res.status !== 403) return res;
  const body = (await res.clone().json().catch(() => null)) as { retry?: string } | null;
  if (body?.retry !== "form_token") return res;
  held = null;
  return send();
}

/**
 * The token for a plain HTML form post (the /10years form, Ben 2026-11-09):
 * the same wait-out-the-minimum as postWithFormToken, for a caller that puts
 * the token in a hidden field and submits the form itself. Null when no
 * token could be fetched (the server then refuses; the visitor can retry).
 */
export const formTokenForSubmit = tokenForSubmit;
