/**
 * The entry form's phone. Optional "Best phone if you win" on 2026-11-06;
 * REQUIRED since 2026-11-10 (Ben): label "Phone", after Email, "Only used
 * to reach you if you win." under it; common US spellings accepted, stored
 * as E.164; never on the reminder; shown in the staff winner alert so staff
 * can call; nothing texts it. Also the /10years header and step 3 wording
 * from the 2026-11-06 brief.
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

const N = await import("./phone.ts");

test("normalizeUsPhone: common US spellings become E.164; anything else is null", () => {
  for (const ok of ["6155550134", "615-555-0134", "615.555.0134", "(615) 555-0134", "615 555 0134", "+1 615 555 0134", "1-615-555-0134", "+16155550134", "  (615)555-0134  "]) assert.equal(N.normalizeUsPhone(ok), "+16155550134", ok);
  for (const bad of ["", "   ", "123", "555-0134", "call me", "615-555-01345", "2-615-555-0134", "+44 20 7946 0958", "015-555-0134", "115-555-0134", "615-555-0134 ext 2"]) assert.equal(N.normalizeUsPhone(bad), null, bad);
  // The HTML pattern (the browser's own check, and the no-JavaScript form) agrees with it.
  const re = new RegExp(`^(?:${N.US_PHONE_PATTERN})$`, "v");
  for (const ok of ["6155550134", "615-555-0134", "(615) 555-0134", "+1 615 555 0134", "1-615-555-0134"]) assert.ok(re.test(ok), ok);
  for (const bad of ["123", "555-0134", "call me", "615-555-01345", "015-555-0134"]) assert.ok(!re.test(bad), bad);
});

test("validation: a phone is required; a US number is stored as E.164; blank or anything else is refused", () => {
  for (const bad of [undefined, null, "", "  ", "123", "call me", "615-555-01345"]) assert.deepEqual(P.validateSignup(signup("a@example.test", { phone: bad })), { ok: false, reason: "invalid_phone" }, String(bad));
  assert.equal(P.validateSignup(signup("a@example.test", { phone: "615.555.0134" })).value.phone, "+16155550134");
  assert.equal(P.validateSignup(signup("a@example.test", { phone: "+1 (615) 555-0134" })).value.phone, "+16155550134");
  assert.match(PAGES.tenYears.errors.invalid_phone, /10-digit US phone number/, "the refusal has a plain message on the page");
});

test("saved on the entrant as E.164; no entry without one", async () => {
  const store = new GiveawayStore(memoryClient(), "test");
  const a = await P.entrySignup(store, signup("a@example.test", { phone: "6155550134" }), ctx);
  assert.equal(a.person.phone, "+16155550134");
  const changed = await P.entrySignup(store, signup("a@example.test", { phone: "629-555-0199" }), ctx);
  assert.equal(changed.person.phone, "+16295550199", "a new number on a repeat replaces it");
  assert.deepEqual(await P.enterFromForm(store, signup("b@example.test"), ctx), { ok: false, reason: "invalid_phone" });
  assert.equal((await store.select("giveaway_people", "id").eq("email", "b@example.test")).data.length, 0, "nothing saved without a phone");
  const b = await P.enterFromForm(store, signup("b@example.test", { phone: "(615) 555-0177" }), ctx);
  assert.equal(b.ok, true);
  assert.equal(b.person.phone, "+16155550177");
  assert.equal(await P.entryCount(store, b.person.id), 1);
});

test("the reminder never asks for or stores a phone", async () => {
  const store = new GiveawayStore(memoryClient(), "test");
  const r = await P.notifySignup(store, { email: "n@example.test", marketingOptIn: false, phone: "6155550134" }, ctx);
  assert.equal(r.ok, true);
  assert.ok(!("phone" in r.row) || r.row.phone == null);
  const view = read("components/giveaway/TenYearsView.tsx");
  const reminder = view.slice(view.indexOf("export function ReminderCard"), view.indexOf("/** A title and one line"));
  assert.doesNotMatch(reminder, /phone|PhoneField|last_name|name="zip"|age_rules/i, "the reminder has no entry-form field");
  assert.match(reminder, /name="email"[^>]*required/);
  assert.doesNotMatch(reminder.slice(reminder.indexOf('name="first_name"'), reminder.indexOf('name="first_name"') + 120), /required/);
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
  // Stored E.164, shown the way staff dial it.
  const withPhone = E.staffWinnerAlertEmail({ drawing: d, winner: { ...winner, phone: "+16155550134" }, taxFormRequired: false, now: NOW });
  assert.match(withPhone.html, /href="tel:\+16155550134"/);
  assert.match(withPhone.text, /Phone: \(615\) 555-0134/);
  assert.doesNotMatch(withPhone.text, /No phone given/);
  const without = E.staffWinnerAlertEmail({ drawing: d, winner: { ...winner, phone: null }, taxFormRequired: false, now: NOW });
  assert.match(without.text, /Phone: No phone given, email first\./);
  assert.ok(without.html.includes(EMAILS.staffWinnerAlert.phoneNone));
  assert.doesNotMatch(without.html, /href="tel:/);
  assert.doesNotMatch(without.text, /Not on the entry form/);
});

test("the field is required on the entry form (and the one-tap form), after Email; the alert is fed from the person", () => {
  const view = read("components/giveaway/TenYearsView.tsx");
  const form = view.slice(view.indexOf("export function FormCard"), view.indexOf("export function ReminderCard"));
  assert.ok(form.indexOf('htmlFor="email"') < form.indexOf("<PhoneField") && form.indexOf("<PhoneField") < form.indexOf('htmlFor="zip"'), "Phone comes after Email");
  const field = read("components/giveaway/PhoneField.tsx");
  assert.match(field, /name="phone"[\s\S]*?\brequired\b[\s\S]*?pattern=\{US_PHONE_PATTERN\}/, "required and patterned without JavaScript too");
  assert.match(read("lib/giveaway/web.ts"), /phone: field\(form, "phone", 40\) \|\| null/);
  assert.match(read("lib/giveaway/notify.ts"), /phone: r\.person\.phone \?\? null/);
  assert.equal(PAGES.tenYears.phone, "Phone");
  assert.equal(PAGES.tenYears.phoneHelp, "Only used to reach you if you win.");
  // No SMS box on this form, and no giveaway code path sends a text.
  assert.doesNotMatch(form, /sms/i);
  assert.match(read("lib/giveaway/rules.ts"), /A valid email address and a valid U\.S\. phone number are required to enter\. We use them to contact winners\./);
  assert.equal(C.RULES_VERSION, "2026-11-10");
});

test("the header is 'Celebrating 10 Years!' in every mode; step 3 says call and email", () => {
  assert.equal(PAGES.tenYears.heading.split(/(?<=[.!])\s+/)[0], "Celebrating 10 Years!");
  assert.match(read("components/giveaway/TenYearsView.tsx"), /const headingLines = t\.heading\.split\(\/\(\?<=\[\.!\]\)\\s\+\/\);/);
  const how = PAGES.tenYears.how;
  for (const line of [how.step3Line("noon", "Mon–Fri", "Saturday", "5 PM"), how.step3LineLive("Tue at noon", "Saturday", "5 PM"), how.step3LineGrandNext("Saturday", "5 PM")]) {
    assert.match(line, /We'll call and email you\.$/);
  }
});
