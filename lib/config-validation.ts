import { SHOW_DRAFT_CONTENT } from "./site-config";

/**
 * Build-time configuration validation.
 *
 * The sibling of lib/content-validation.ts, same pattern and same launch gate,
 * for runtime config rather than content facts. Imported by app/layout.tsx, so
 * it runs during every `next build`.
 *
 * Unverified *content* merely hides itself in production. Missing *config* is
 * worse than invisible: with no email provider set, every consultation request
 * still saves to Supabase but nothing tells a human it arrived, and the site
 * looks like it is working. That failure is silent by nature, so it gets a
 * loud build-time check.
 *
 * - Always logs a summary of misconfiguration in a production build.
 * - REQUIRE_VERIFIED_CONTENT=true makes the build FAIL — the same flag the
 *   launch build already uses, so there is one gate to remember, not two.
 */

const misconfigured: string[] = [];

function require_(label: string, ok: boolean) {
  if (!ok) misconfigured.push(label);
}

// Lead notification (lib/lead-notification.ts). Both are needed before a
// single lead reaches a human; LEADS_NOTIFY_FROM is optional and falls back to
// Resend's shared test sender, so it is not checked here.
require_(
  "RESEND_API_KEY (lead notification email provider)",
  Boolean(process.env.RESEND_API_KEY)
);
require_(
  "LEADS_NOTIFY_EMAIL (where new consultation requests are sent)",
  Boolean(process.env.LEADS_NOTIFY_EMAIL)
);


if (misconfigured.length > 0) {
  const summary = `[config] ${misconfigured.length} missing setting(s): ${misconfigured.join(
    "; "
  )} — leads will save but nobody will be notified`;

  if (process.env.REQUIRE_VERIFIED_CONTENT === "true") {
    throw new Error(summary);
  }

  if (!SHOW_DRAFT_CONTENT) {
    // Production build: this is the state that quietly loses leads.
    console.warn(`\n⚠️  ${summary}\n   See .env.example → Lead notifications.\n`);
  } else {
    // Local dev, where no key is expected — one quiet line, not a wall.
    console.warn(`[config] lead notification off — ${misconfigured.length} setting(s) unset.`);
  }
}
