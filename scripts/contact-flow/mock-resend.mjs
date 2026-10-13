/**
 * Stand-in for Resend, for scripts/check-contact.mjs.
 *
 * Preloaded into the production server, never into a deploy:
 *
 *   MOCK_RESEND_LOG=/tmp/resend.jsonl NODE_OPTIONS="--import ./scripts/contact-flow/mock-resend.mjs" \
 *     RESEND_API_KEY=re_test LEADS_NOTIFY_EMAIL=office@example.test npx next start -p 3123
 *
 * Every POST lib/lead-notification.ts makes to api.resend.com is appended to
 * MOCK_RESEND_LOG as one JSON line — when, and the exact body — and answered
 * 200, so the route behaves exactly as it does with a real key and the check
 * can count and read the emails without a provider, a verified domain, or a
 * real inbox receiving test leads. Every other fetch passes straight through.
 *
 * Does nothing unless MOCK_RESEND_LOG is set, and is not imported by anything
 * in the app, so it cannot be left on by accident.
 */
import { appendFileSync } from "node:fs";

const LOG = process.env.MOCK_RESEND_LOG;
if (LOG) {
  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url.startsWith("https://api.resend.com/")) {
      let body = null;
      try {
        body = init?.body ? JSON.parse(String(init.body)) : null;
      } catch {
        body = { unparsed: String(init?.body) };
      }
      appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), url, body })}\n`);
      return new Response(JSON.stringify({ id: `mock-${Date.now()}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return real(input, init);
  };
  console.log(`[mock-resend] intercepting api.resend.com → ${LOG}`);
}
