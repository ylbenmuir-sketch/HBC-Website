/**
 * Stand-ins for Resend and for the platform's inquiry door, for
 * scripts/check-contact.mjs.
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
 * The same for the platform: with MOCK_PLATFORM_LOG set, every POST
 * lib/inquiry-intake.ts makes to `${INQUIRY_API_BASE}/api/public/inquiries`
 * is appended there and answered 201 `{ received: true }`, the contract's
 * own success body. INQUIRY_API_BASE and INQUIRY_INTAKE_SECRET still have
 * to be set — the route checks them before it sends — and may hold any
 * value; nothing leaves the process.
 *
 * And for Dialpad: with MOCK_SMS_LOG set, every POST lib/sms-confirmation.ts
 * makes to dialpad.com/api/v2/sms is appended there — the exact body, so the
 * check can read the text and the from-number — and answered 200. The route
 * only sends when DIALPAD_API_KEY and DIALPAD_SMS_FROM are set; give them
 * any value.
 *
 * Does nothing unless a log path is set, and is not imported by anything in
 * the app, so it cannot be left on by accident.
 */
import { appendFileSync } from "node:fs";

const LOG = process.env.MOCK_RESEND_LOG;
const PLATFORM_LOG = process.env.MOCK_PLATFORM_LOG;
const SMS_LOG = process.env.MOCK_SMS_LOG;
const SMS_URL = "https://dialpad.com/api/v2/sms";
const PLATFORM_URL = process.env.INQUIRY_API_BASE
  ? `${process.env.INQUIRY_API_BASE.replace(/\/+$/, "")}/api/public/inquiries`
  : null;
if (LOG || PLATFORM_LOG || SMS_LOG) {
  const real = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (SMS_LOG && url === SMS_URL) {
      let body = null;
      try {
        body = init?.body ? JSON.parse(String(init.body)) : null;
      } catch {
        body = { unparsed: String(init?.body) };
      }
      appendFileSync(SMS_LOG, `${JSON.stringify({ at: new Date().toISOString(), url, body })}\n`);
      return new Response(JSON.stringify({ id: `mock-sms-${Date.now()}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (PLATFORM_LOG && PLATFORM_URL && url === PLATFORM_URL) {
      let body = null;
      try {
        body = init?.body ? JSON.parse(String(init.body)) : null;
      } catch {
        body = { unparsed: String(init?.body) };
      }
      const secret = init?.headers?.["x-hbc-inquiry-secret"] ?? null;
      appendFileSync(
        PLATFORM_LOG,
        `${JSON.stringify({ at: new Date().toISOString(), url, secretPresent: Boolean(secret), body })}\n`
      );
      return new Response(JSON.stringify({ received: true }), {
        status: 201,
        headers: { "content-type": "application/json" },
      });
    }
    // The Message-ID read-back (lib/lead-notification.ts → rfcMessageIdOf):
    // answered, never logged — it is not an email. The id is derived from
    // Resend's, so check:contact can predict what the row stores and what
    // the page-two update's In-Reply-To must say.
    if (LOG && url.startsWith("https://api.resend.com/emails/") && (init?.method ?? "GET") === "GET") {
      const id = decodeURIComponent(url.slice("https://api.resend.com/emails/".length));
      return new Response(JSON.stringify({ id, message_id: `<${id}@mock.resend.test>` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    if (LOG && url.startsWith("https://api.resend.com/")) {
      let body = null;
      try {
        body = init?.body ? JSON.parse(String(init.body)) : null;
      } catch {
        body = { unparsed: String(init?.body) };
      }
      appendFileSync(LOG, `${JSON.stringify({ at: new Date().toISOString(), url, body })}\n`);
      // MOCK_RESEND_STATUS=500 (or any non-2xx) answers as Resend does when it
      // refuses a send, to drive the "email failed, lead kept" path.
      const failStatus = Number(process.env.MOCK_RESEND_STATUS || 0);
      if (failStatus >= 300) {
        return new Response(
          JSON.stringify({ name: "mock_failure", message: "MOCK_RESEND_STATUS forced a refusal" }),
          { status: failStatus, headers: { "content-type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return real(input, init);
  };
  if (LOG) console.log(`[mock-resend] intercepting api.resend.com → ${LOG}`);
  if (PLATFORM_LOG) console.log(`[mock-platform] intercepting ${PLATFORM_URL ?? "(INQUIRY_API_BASE unset — nothing to intercept)"} → ${PLATFORM_LOG}`);
  if (SMS_LOG) console.log(`[mock-dialpad] intercepting ${SMS_URL} → ${SMS_LOG}`);
}
