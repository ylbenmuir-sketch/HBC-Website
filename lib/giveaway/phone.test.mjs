/**
 * "Best phone if you win" (Ben, 2026-11-06): an optional field on the
 * drawing entry form (live mode only, never notify-me), saved on the
 * entrant, shown in the staff winner alert — or "No phone given, email
 * first." when blank. Also the /10years header and step 3 wording from the
 * same brief.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

process.env.GIVEAWAY_HIDE_DRAFT_TAGS = "1";
const { memoryClient } = await import("./memory-client.ts");
const { GiveawayStore } = await import("./store.ts");
const P = await import("./people.ts");
const C = await import("./config.ts");
const E = await import("./emails.ts");
const { PAGES, EMAILS } = await import("./copy.ts");

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const NOW = new Date("2026-11-16T16:00:00Z");
const ctx = { ipHash: "ip:1", uaHash: "ua:1", now: NOW };
const signup = (email, extra = {}) => ({ firstName: "Sarah", lastName: "Mitchell", email, zip: "37064", ageConfirmed: true, rulesAccepted: true, marketingOptIn: false, ...extra });
const quiet = (fn) => async (...a) => {
  const err = console.error;
  console.error = () => {};
  try {
    return await fn(...a);
  } finally {
    console.error = err;
  }
};

test("validation: blank is fine, a US number is formatted, anything else is refused", () => {
  assert.equal(P.validateSignup(signup("a@example.test")).value.phone, null);
  assert.equal(P.validateSignup(signup("a@example.test", { phone: "  " })).value.phone, null);
  assert.equal(P.validateSignup(signup("a@example.test", { phone: "615.555.0134" })).value.phone, "(615) 555-0134");
  assert.equal(P.validateSignup(signup("a@example.test", { phone: "+1 (615) 555-0134" })).value.phone, "(615) 555-0134");
  for (const bad of ["123", "call me", "615-555-01345"]) assert.deepEqual(P.validateSignup(signup("a@example.test", { phone: bad })), { ok: false, reason: "invalid_phone" }, bad);
  assert.ok(PAGES.tenYears.errors.invalid_phone.length > 0, "the refusal has a message on the page");
});

test("saved on the entrant; a blank repeat keeps it; no phone means null", async () => {
  const store = new GiveawayStore(memoryClient(), "test");
  const a = await P.entrySignup(store, signup("a@example.test", { phone: "6155550134" }), ctx);
  assert.equal(a.person.phone, "(615) 555-0134");
  const again = await P.entrySignup(store, signup("a@example.test"), ctx);
  assert.equal(again.person.phone, "(615) 555-0134", "a blank second submit keeps the number");
  const changed = await P.entrySignup(store, signup("a@example.test", { phone: "629-555-0199" }), ctx);
  assert.equal(changed.person.phone, "(629) 555-0199", "a new number replaces it");
  const b = await P.entrySignup(store, signup("b@example.test"), ctx);
  assert.equal(b.person.phone, null);
});

test("notify-me never stores a phone", async () => {
  const store = new GiveawayStore(memoryClient(), "test");
  const r = await P.notifySignup(store, signup("n@example.test", { phone: "6155550134" }), ctx);
  assert.equal(r.ok, true);
  assert.ok(!("phone" in r.row) || r.row.phone == null);
});

test("before migration 0018: the signup is saved without the phone, not lost", quiet(async () => {
  const err = { code: "PGRST204", message: "Could not find the 'phone' column of 'giveaway_people' in the schema cache" };
  const failing = { select() { return this; }, eq() { return this; }, single: () => Promise.resolve({ data: null, error: err }) };
  const base = memoryClient();
  const has = (rows) => (Array.isArray(rows) ? rows : [rows]).some((r) => "phone" in r);
  const client = {
    rpc: base.rpc?.bind(base),
    from(name) {
      const t = base.from(name);
      if (name !== "giveaway_people") return t;
      return new Proxy(t, {
        get(target, prop) {
          if (prop === "insert") return (rows) => (has(rows) ? failing : target.insert(rows));
          if (prop === "update") return (row) => (has(row) ? failing : target.update(row));
          const v = target[prop];
          return typeof v === "function" ? v.bind(target) : v;
        },
      });
    },
  };
  const store = new GiveawayStore(client, "test");
  const a = await P.entrySignup(store, signup("a@example.test", { phone: "6155550134" }), ctx);
  assert.equal(a.ok, true);
  assert.equal(a.person.email, "a@example.test");
  const again = await P.entrySignup(store, signup("a@example.test", { phone: "6155550134", firstName: "Sally" }), ctx);
  assert.equal(again.person.first_name, "Sally", "the update path retries too");
}));

test("staff winner alert: the phone (tap to call), or 'No phone given, email first.'", () => {
  const winner = { name: "Sarah Mitchell", email: "sarah@example.test", zip: "37064", city: "Franklin" };
  const d = C.drawing("mon");
  const withPhone = E.staffWinnerAlertEmail({ drawing: d, winner: { ...winner, phone: "(615) 555-0134" }, taxFormRequired: false, now: NOW });
  assert.match(withPhone.html, /href="tel:\+16155550134"/);
  assert.match(withPhone.text, /Phone: \(615\) 555-0134/);
  assert.doesNotMatch(withPhone.text, /No phone given/);
  const without = E.staffWinnerAlertEmail({ drawing: d, winner: { ...winner, phone: null }, taxFormRequired: false, now: NOW });
  assert.match(without.text, /Phone: No phone given, email first\./);
  assert.ok(without.html.includes(EMAILS.staffWinnerAlert.phoneNone));
  assert.doesNotMatch(without.html, /href="tel:/);
  assert.doesNotMatch(without.text, /Not on the entry form/);
});

test("the field is on the live entry form only, and the alert is fed from the person", () => {
  const view = read("components/giveaway/TenYearsView.tsx");
  const field = view.slice(view.indexOf('htmlFor="phone"') - 200, view.indexOf('htmlFor="phone"'));
  assert.match(field, /mode === "live" &&/);
  assert.match(read("lib/giveaway/web.ts"), /phone: mode === "live" \? field\(form, "phone", 40\) \|\| null : null/);
  assert.match(read("lib/giveaway/notify.ts"), /phone: r\.person\.phone \?\? null/);
  assert.equal(PAGES.tenYears.phone, "Best phone if you win");
});

test("the header is 'Celebrating 10 Years!' in every mode; step 3 says call and email", () => {
  assert.equal(PAGES.tenYears.heading.split(/(?<=[.!])\s+/)[0], "Celebrating 10 Years!");
  assert.match(read("components/giveaway/TenYearsView.tsx"), /const headingLines = t\.heading\.split\(\/\(\?<=\[\.!\]\)\\s\+\/\);/);
  const how = PAGES.tenYears.how;
  for (const line of [how.step3Line("noon", "Mon–Fri", "Saturday", "5 PM"), how.step3LineLive("Tue at noon", "Saturday", "5 PM"), how.step3LineGrandNext("Saturday", "5 PM")]) {
    assert.match(line, /We'll call and email you\.$/);
  }
});
