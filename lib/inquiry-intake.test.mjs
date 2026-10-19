// Unit tests for the HBC platform connection (lib/inquiry-intake.ts), in
// both of its states (Ben, 2026-10-15): switched OFF — INQUIRY_API_BASE /
// INQUIRY_INTAKE_SECRET unset, the way it ships until the HBC app is
// finished — and switched back ON. fetch is stubbed; nothing leaves the
// process. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// lib/ imports are extensionless; the hook appends ".ts" for local specifiers
// (the same trick as lib/email.test.mjs). inquiry-intake.ts imports
// lib/contact-method.ts since 2026-10-19.
registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const I = await import("./inquiry-intake.ts");

async function withEnv(env, fn) {
  const saved = { base: process.env.INQUIRY_API_BASE, secret: process.env.INQUIRY_INTAKE_SECRET };
  const realFetch = globalThis.fetch;
  const realInfo = console.info;
  const realError = console.error;
  const calls = [];
  const logs = { info: [], error: [] };
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), headers: init.headers, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ received: true }), { status: 201 });
  };
  console.info = (m) => logs.info.push(m);
  console.error = (m) => logs.error.push(m);
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return { result: await fn(), calls, logs };
  } finally {
    globalThis.fetch = realFetch;
    console.info = realInfo;
    console.error = realError;
    for (const [k, v] of [["INQUIRY_API_BASE", saved.base], ["INQUIRY_INTAKE_SECRET", saved.secret]]) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

const stepOne = {
  helpingWho: null, concerns: [], firstName: "Sarah Mitchell", phone: "6155550134",
  email: "sarah@example.test", preferredCenter: "Nashville", bestTime: "Any time",
  note: null, website: "", smsConsent: false,
};
const pageTwo = {
  ...stepOne, helpingWho: "My child", concerns: ["Sleep", "Focus & ADHD"],
  note: "Bedtime is hard.", referredBy: "Dr. Patel", update: true,
};

test("OFF (variables unset): skipped cleanly — no request, no error, one quiet line at most", async () => {
  const off = { INQUIRY_API_BASE: undefined, INQUIRY_INTAKE_SECRET: undefined };
  const { result, calls, logs } = await withEnv(off, async () => [
    await I.forwardInquiry(stepOne),
    await I.forwardInquiry(pageTwo),
    await I.forwardInquiry(stepOne),
  ]);
  assert.deepEqual(result, Array(3).fill({ ok: false, reason: "unconfigured" }));
  assert.equal(calls.length, 0, "nothing is sent anywhere");
  assert.equal(logs.error.length, 0, "not an error — it is off on purpose");
  assert.ok(logs.info.length <= 1, "said once per server instance, not once per lead");
  // Half-set is still off.
  const half = await withEnv({ INQUIRY_API_BASE: "https://platform.test", INQUIRY_INTAKE_SECRET: undefined }, () => I.forwardInquiry(stepOne));
  assert.deepEqual(half.result, { ok: false, reason: "unconfigured" });
  assert.equal(half.calls.length, 0);
});

test("ON (variables set): step one and the page-two UPDATE both post, exactly as before", async () => {
  const on = { INQUIRY_API_BASE: "https://platform.test/", INQUIRY_INTAKE_SECRET: "s3cret" };
  const { result, calls } = await withEnv(on, async () => [await I.forwardInquiry(stepOne), await I.forwardInquiry(pageTwo)]);
  assert.deepEqual(result, [{ ok: true }, { ok: true }]);
  assert.equal(calls.length, 2);
  for (const c of calls) {
    assert.equal(c.url, "https://platform.test/api/public/inquiries");
    assert.equal(c.headers["x-hbc-inquiry-secret"], "s3cret");
  }
  // Step one: the who-for stand-in and its flag line, the no-consent line.
  const [one, two] = calls.map((c) => c.body);
  assert.equal(one.whoFor, I.WHO_FOR_STAND_IN);
  assert.ok(one.message.startsWith(I.WHO_FOR_NOT_GIVEN_LINE));
  assert.ok(one.message.includes(I.NO_TEXT_CONSENT_LINE));
  assert.ok(!one.message.includes(I.UPDATE_LINE));
  assert.equal(one.firstName, "Sarah Mitchell");
  assert.equal(one.preferredCenter, "Nashville");
  assert.equal(one.website, "");
  // Page two: labelled UPDATE first, the answers mapped to the contract's tokens.
  assert.ok(two.message.startsWith(I.UPDATE_LINE));
  assert.equal(two.whoFor, "my_child");
  assert.deepEqual(two.concerns, ["sleep", "focus_adhd"]);
  assert.ok(two.message.includes("Referred by: Dr. Patel"));
  assert.ok(two.message.endsWith("Bedtime is hard."));
  assert.ok(!two.message.includes(I.WHO_FOR_NOT_GIVEN_LINE));
});
