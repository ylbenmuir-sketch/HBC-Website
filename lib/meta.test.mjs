// Unit tests for lib/meta.ts + lib/meta-capi.ts (Ben, 2026-11-09): the pixel
// runs only on general pages, a concern page's address never reaches Meta,
// and the server event carries six named fields and four user_data keys.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

process.env.NEXT_PUBLIC_META_PIXEL_ID = "1234567890";
const { metaAllowedPath, metaBlockedPath, isMetaEventId, newMetaEventId } = await import("./meta.ts");
const { metaSourceUrl, metaFbc, metaContext, buildMetaEvent, metaCapiEnabled } = await import("./meta-capi.ts");

const O = "https://harmonizedbraincenterstn.com";

test("general pages are allowed; concern, article, video and story pages are not", () => {
  for (const p of ["/", "/contact", "/start", "/locations/murfreesboro", "/about", "/brain-map", "/10years", "/resources", "/videos", "/contact/"]) {
    assert.equal(metaAllowedPath(p), true, p);
  }
  for (const p of ["/concerns/anxiety", "/concerns/focus-adhd", "/resources/the-3am-waking", "/videos/relief-from-add-adhd", "/stories", "/what-we-help-with", "/children-families", "/adults"]) {
    assert.equal(metaAllowedPath(p), false, p);
  }
});

test("blocked pages send nothing, browser or server", () => {
  for (const p of ["/review", "/review/x", "/admin", "/admin/giveaway", "/unsubscribe", "/about/founder/draft"]) {
    assert.equal(metaBlockedPath(p), true, p);
    assert.equal(metaAllowedPath(p), false, p);
    assert.equal(metaSourceUrl(p, O), null, p);
  }
  assert.equal(metaAllowedPath("/about/founder"), true);
});

test("event_source_url: concern pages cut to the home page; only utm_* query kept", () => {
  assert.equal(metaSourceUrl("/concerns/anxiety?utm_source=fb", O), `${O}/`);
  assert.equal(metaSourceUrl("/resources/always-on-guard", O), `${O}/`);
  assert.equal(
    metaSourceUrl("/start?center=murfreesboro&utm_source=instagram&fbclid=AbC&utm_campaign=bio", O),
    `${O}/start?utm_source=instagram&utm_campaign=bio`
  );
  assert.equal(metaSourceUrl("/contact", O), `${O}/contact`);
  assert.equal(metaSourceUrl("https://evil.test/x", O), `${O}/`);
  assert.equal(metaSourceUrl("//evil.test/x", O), `${O}/`);
  assert.equal(metaSourceUrl(undefined, O), `${O}/`);
});

test("fbc: the cookie as set, else built from the landing fbclid", () => {
  assert.equal(metaFbc("fb.1.1700000000000.AbC", null, null), "fb.1.1700000000000.AbC");
  assert.equal(metaFbc(null, "IwAR3", 1700000000000, 1800000000000), "fb.1.1700000000000.IwAR3");
  assert.equal(metaFbc(null, "IwAR3", undefined, 1800000000000), "fb.1.1800000000000.IwAR3");
  assert.equal(metaFbc(null, null, null), null);
  assert.equal(metaFbc("garbage", "bad id!", null), null);
});

test("the server event: six fields, user_data from the request only — no email, phone or custom_data", () => {
  const headers = new Headers({
    host: "harmonizedbraincenterstn.com",
    "x-forwarded-for": "203.0.113.9, 10.0.0.1",
    "user-agent": "Mozilla/5.0 Test",
    cookie: "_fbp=fb.1.1700000000000.123456; _fbc=fb.1.1700000000000.AbC; other=jane@example.test",
  });
  const ctx = metaContext(headers);
  const id = newMetaEventId();
  assert.equal(isMetaEventId(id), true);
  const e = buildMetaEvent({ eventName: "Lead", eventId: id, sourceUrl: `${O}/contact`, ctx, now: 1700000000123 });
  assert.deepEqual(Object.keys(e).sort(), ["action_source", "event_id", "event_name", "event_source_url", "event_time", "user_data"]);
  assert.deepEqual(e.user_data, {
    client_ip_address: "203.0.113.9",
    client_user_agent: "Mozilla/5.0 Test",
    fbc: "fb.1.1700000000000.AbC",
    fbp: "fb.1.1700000000000.123456",
  });
  assert.equal(e.event_time, 1700000000);
  assert.doesNotMatch(JSON.stringify(e), /jane|@|"em"|"ph"|custom_data/);
});

test("sends only in Production on the site's own domain, or with META_CAPI=on", () => {
  const env = { META_CAPI_TOKEN: "t", VERCEL_ENV: "production" };
  assert.equal(metaCapiEnabled("harmonizedbraincenterstn.com", env), true);
  assert.equal(metaCapiEnabled("www.harmonizedbraincenterstn.com", env), true);
  assert.equal(metaCapiEnabled("hbc-website-ashy.vercel.app", env), false);
  assert.equal(metaCapiEnabled("harmonizedbraincenterstn.com", { ...env, VERCEL_ENV: "preview" }), false);
  assert.equal(metaCapiEnabled("harmonizedbraincenterstn.com", { VERCEL_ENV: "production" }), false);
  assert.equal(metaCapiEnabled("localhost:3000", { META_CAPI_TOKEN: "t", META_CAPI: "on" }), true);
});
