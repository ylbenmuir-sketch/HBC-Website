// Tests for lib/practice-better/client.ts and scripts/pb-discover.ts.
//   1. The client never logs, prints or puts a credential or token in an
//      error, including when Practice Better echoes them back.
//   2. It caches the token, refreshes on expiry and on 401, and keeps under
//      5 requests per second.
//   3. The discovery script makes no non-GET call and never touches a
//      client-record or session endpoint.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createPbClient, MAX_REQUESTS_PER_SECOND, PB_TOKEN_URL } from "./client.ts";

const CLIENT_ID = "test-client-id-6f1d2a";
const CLIENT_SECRET = "test-client-secret-9c8b7a6e5d4c3b2a";
const TOKEN = "test-access-token-1a2b3c4d5e6f";
const SECRETS = [CLIENT_ID, CLIENT_SECRET, TOKEN];

const CLIENT_SRC = readFileSync(fileURLToPath(new URL("./client.ts", import.meta.url)), "utf8");
const SCRIPT_SRC = readFileSync(
  fileURLToPath(new URL("../../scripts/pb-discover.ts", import.meta.url)),
  "utf8",
);

const json = (status, body, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** A fake clock + sleep, so rate-limit tests run instantly. */
function fakeTime() {
  let t = 1_000_000;
  return { now: () => t, sleep: async (ms) => { t += ms; }, advance: (ms) => { t += ms; } };
}

/** Captures everything written to console and stdout/stderr while fn runs. */
async function captureOutput(fn) {
  const written = [];
  const methods = ["log", "info", "warn", "error", "debug", "trace", "dir"];
  const saved = methods.map((m) => console[m]);
  const savedOut = process.stdout.write;
  const savedErr = process.stderr.write;
  methods.forEach((m) => { console[m] = (...a) => written.push(a.map(String).join(" ")); });
  process.stdout.write = (chunk) => { written.push(String(chunk)); return true; };
  process.stderr.write = (chunk) => { written.push(String(chunk)); return true; };
  try {
    await fn();
  } finally {
    methods.forEach((m, i) => { console[m] = saved[i]; });
    process.stdout.write = savedOut;
    process.stderr.write = savedErr;
  }
  return written.join("\n");
}

function assertNoSecrets(text, where) {
  for (const s of SECRETS) assert.ok(!text.includes(s), `${where} contains a secret`);
}

test("client source has no logging at all", () => {
  assert.doesNotMatch(CLIENT_SRC, /\bconsole\s*\./);
  assert.doesNotMatch(CLIENT_SRC, /process\.(stdout|stderr)/);
});

test("client never logs secrets or puts them in errors, even when the API echoes them", async () => {
  const time = fakeTime();
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url) === PB_TOKEN_URL) return json(200, { access_token: TOKEN, token_type: "Bearer", expires_in: 1200 });
    if (String(url).includes("/boom")) {
      return json(500, { errorMessage: `bad client ${CLIENT_ID} secret ${CLIENT_SECRET} token ${TOKEN}` });
    }
    return json(200, { ok: true });
  };
  const errors = [];
  const out = await captureOutput(async () => {
    const pb = createPbClient({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, fetch, ...time });
    assert.deepEqual(await pb.get("/consultant/services"), { ok: true });
    await pb.get("/boom").catch((e) => errors.push(e));
  });
  assert.equal(out, "", "client wrote output");
  assert.equal(errors.length, 1);
  assertNoSecrets(errors[0].message, "error message");
  assertNoSecrets(String(errors[0].stack), "error stack");
  assertNoSecrets(JSON.stringify(errors[0]), "serialized error");
  assert.match(errors[0].message, /GET \/boom failed \(500\)/);

  // The secret only travels in the token request body; the token only in the Authorization header.
  const tokenCall = calls.find((c) => c.url === PB_TOKEN_URL);
  assert.equal(tokenCall.init.method, "POST");
  assert.ok(String(tokenCall.init.body).includes(`client_secret=${CLIENT_SECRET}`));
  for (const c of calls.filter((c) => c.url !== PB_TOKEN_URL)) {
    assert.equal(c.init.method, "GET");
    assertNoSecrets(c.url, "request URL");
    assert.equal(c.init.headers.Authorization, `Bearer ${TOKEN}`);
  }
});

test("a failed token request does not leak the secret", async () => {
  const fetch = async () => json(401, { error: `invalid_client ${CLIENT_SECRET}` });
  const err = await createPbClient({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, fetch, ...fakeTime() })
    .get("/consultant/services")
    .catch((e) => e);
  assert.match(err.message, /token request failed \(401\)/);
  assertNoSecrets(err.message, "token error");
});

test("missing credentials fail without a network call", async () => {
  let called = false;
  const fetch = async () => { called = true; return json(200, {}); };
  const err = await createPbClient({ clientId: "", clientSecret: "", fetch, ...fakeTime() }).get("/x").catch((e) => e);
  assert.match(err.message, /PB_CLIENT_ID and PB_CLIENT_SECRET/);
  assert.equal(called, false);
});

test("token is cached until it nears expiry, and refreshed on a 401", async () => {
  const time = fakeTime();
  let tokens = 0;
  let reject = false;
  const fetch = async (url, init) => {
    if (String(url) === PB_TOKEN_URL) {
      tokens++;
      return json(200, { access_token: `${TOKEN}-${tokens}`, expires_in: 1200 });
    }
    if (reject) { reject = false; return json(401, {}); }
    return json(200, { auth: init.headers.Authorization });
  };
  const pb = createPbClient({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, fetch, ...time });
  await Promise.all([pb.get("/a"), pb.get("/b"), pb.get("/c")]);
  assert.equal(tokens, 1, "concurrent calls share one token request");
  time.advance(1_200_000); // the full 1200 s lifetime
  await pb.get("/d");
  assert.equal(tokens, 2, "expired token is replaced");
  reject = true;
  const res = await pb.get("/e");
  assert.equal(tokens, 3, "401 fetches a fresh token once");
  assert.equal(res.auth, `Bearer ${TOKEN}-3`);
});

test("stays under 5 requests in any rolling second", async () => {
  const time = fakeTime();
  const stamps = [];
  const fetch = async (url) => {
    stamps.push(time.now());
    return String(url) === PB_TOKEN_URL ? json(200, { access_token: TOKEN, expires_in: 1200 }) : json(200, {});
  };
  const pb = createPbClient({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, fetch, ...time });
  await Promise.all(Array.from({ length: 25 }, (_, i) => pb.get(`/p${i}`)));
  assert.equal(stamps.length, 26);
  for (let i = 0; i < stamps.length; i++) {
    const inWindow = stamps.filter((s) => s >= stamps[i] && s < stamps[i] + 1000).length;
    assert.ok(inWindow <= MAX_REQUESTS_PER_SECOND, `${inWindow} requests in one second`);
  }
  assert.ok(MAX_REQUESTS_PER_SECOND < 5);
});

test("429 waits for Retry-After and retries", async () => {
  const time = fakeTime();
  let n = 0;
  const fetch = async (url) => {
    if (String(url) === PB_TOKEN_URL) return json(200, { access_token: TOKEN, expires_in: 1200 });
    return ++n === 1 ? json(429, {}, { "retry-after": "2" }) : json(200, { n });
  };
  const start = time.now();
  const res = await createPbClient({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, fetch, ...time }).get("/x");
  assert.deepEqual(res, { n: 2 });
  assert.ok(time.now() - start >= 2000);
});

test("client exposes GET only", () => {
  const pb = createPbClient({ clientId: CLIENT_ID, clientSecret: CLIENT_SECRET, fetch: async () => json(200, {}) });
  assert.deepEqual(Object.keys(pb), ["get"]);
  // The only non-GET method in the client is the OAuth2 token POST.
  const methods = [...CLIENT_SRC.matchAll(/method:\s*"([A-Z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(methods.sort(), ["GET", "POST"]);
  assert.equal((CLIENT_SRC.match(/method:\s*"POST"/g) ?? []).length, 1);
});

test("pb-discover makes no non-GET call and avoids records and sessions", () => {
  // Strip comments so the rules written in the header don't count as code.
  const code = SCRIPT_SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.doesNotMatch(code, /\b(POST|PUT|PATCH|DELETE)\b/i, "names a non-GET method");
  assert.doesNotMatch(code, /\bmethod\s*:/, "sets a request method");
  assert.doesNotMatch(code, /\bfetch\s*\(|XMLHttpRequest|node:https?|\bhttps?\.request/, "makes its own HTTP call");
  assert.doesNotMatch(code, /\.(post|put|patch|delete|request)\s*\(/i, "calls a write method");
  assert.doesNotMatch(code, /records|sessions/i, "mentions a records or sessions endpoint");

  // Every API path it can call is in its allow-list, and only via client.get.
  const allowed = [...code.matchAll(/"(\/consultant\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    [...new Set(allowed)].sort(),
    ["/consultant/availability/slots", "/consultant/profile", "/consultant/services"],
  );
  assert.deepEqual([...code.matchAll(/client\.(\w+)\s*[<(]/g)].map((m) => m[1]), ["get"]);
});
