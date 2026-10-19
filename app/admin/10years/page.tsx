import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ADMIN_PATH, CODE_MINUTES, PENDING_COOKIE, SESSION_COOKIE, currentAdmin, pendingEmail } from "@/lib/giveaway/admin-auth";
import { adminDeps, migrationApplied } from "@/lib/giveaway/admin-server";
import { DRAWINGS, SCHEDULE } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";

/**
 * /admin/10years — the giveaway's staff screens (GIVEAWAY-PLAN.md §5).
 * Phase 1: the sign-in (Supabase Auth email code, allowlist from
 * GIVEAWAY_ADMINS) and an empty dashboard shell. Screens come in Phase 3.
 *
 * Server-rendered on every request, never cached (`force-dynamic` plus the
 * no-store header in next.config.ts), `noindex` here and in the header, and
 * `/admin/` is disallowed in robots.txt. Lives inside the site chrome; the
 * assistant is suppressed on /admin (lib/site-config.ts).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "10-year giveaway admin",
  robots: { index: false, follow: false, nocache: true },
};

type Search = { error?: string; sent?: string };

const ERRORS: Record<string, string> = {
  not_allowed: PAGES.admin.notAllowed,
  invalid: PAGES.admin.badCode,
  rate_limited: PAGES.admin.rateLimited,
  not_configured: PAGES.admin.notConfigured,
  send_failed: "The code could not be sent. Check the Supabase Auth SMTP settings and try again.",
  invalid_email: "That doesn't look like an email address.",
  missing: "Admin sign-in is not configured on this deployment.",
  expired: "That sign-in attempt expired. Request a new code.",
};

export default async function AdminPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const jar = await cookies();
  const ready = adminDeps();

  if (!ready.ok) {
    return (
      <Shell>
        <p className="sub" style={{ color: "var(--alert, #9a3b2e)" }}>
          Admin sign-in is not configured on this deployment: {ready.missing}.
        </p>
      </Shell>
    );
  }
  const { deps } = ready;
  const admin = await currentAdmin({ store: deps.store, secret: deps.secret }, jar.get(SESSION_COOKIE)?.value);

  if (admin) {
    const applied = await migrationApplied(deps.store);
    return (
      <Shell>
        <p className="sub" style={{ marginTop: 0 }}>
          {PAGES.admin.signedInAs} <b>{admin.email}</b> · {PAGES.admin.environment}: <code>{deps.store.env}</code>
        </p>
        <form method="post" action={`${ADMIN_PATH}/logout`} style={{ margin: "8px 0 28px" }}>
          <button type="submit" className="btn btn-outline" style={{ padding: "10px 18px", fontSize: 14 }}>
            {PAGES.admin.signOut}
          </button>
        </form>
        <h2 style={{ fontSize: 26, margin: "0 0 10px" }}>{PAGES.admin.shellTitle}</h2>
        <p className="sub">{PAGES.admin.shellBody}</p>
        <p className="sub" style={{ color: applied ? "var(--sage-deep)" : "var(--alert, #9a3b2e)" }}>
          {applied === null ? "Could not reach the database." : applied ? PAGES.admin.migrationOk : PAGES.admin.migrationMissing}
        </p>
        <h3 style={{ fontSize: 18, margin: "28px 0 8px" }}>{PAGES.admin.schedule}</h3>
        <table style={{ borderCollapse: "collapse", fontSize: 15 }}>
          <tbody>
            {[
              ["Notify-me opens", SCHEDULE.notifyMeStart.ct],
              ["Entries open", SCHEDULE.entriesOpen.ct],
              ...DRAWINGS.map((d) => [`${d.dayName} ${d.kind === "grand" ? "grand prize" : "drawing"}`, d.ct]),
              ["Thank-you email", SCHEDULE.thankYouSend.ct],
              ["Offer closes", SCHEDULE.offerEnd.ct],
            ].map(([label, when]) => (
              <tr key={label}>
                <td style={{ padding: "4px 18px 4px 0", color: "var(--slate)" }}>{label}</td>
                <td style={{ padding: "4px 0" }}>{when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Shell>
    );
  }

  const pending = pendingEmail(jar.get(PENDING_COOKIE)?.value, deps.store.env, deps.secret);
  const error = sp.error ? (ERRORS[sp.error] ?? ERRORS.missing) : null;

  return (
    <Shell>
      {error && (
        <p className="sub" role="alert" style={{ color: "var(--alert, #9a3b2e)", marginTop: 0 }}>
          {error}
        </p>
      )}
      {pending ? (
        <form method="post" action={`${ADMIN_PATH}/verify`} className="form" style={{ maxWidth: 420 }}>
          <p className="sub" style={{ marginTop: 0 }}>{PAGES.admin.codeSentTo(pending)}</p>
          <label htmlFor="code">{PAGES.admin.codeLabel}</label>
          <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,9}" required autoFocus />
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
            <button type="submit" className="btn btn-primary">
              {PAGES.admin.verify}
            </button>
            <button type="submit" className="btn btn-ghost" formAction={`${ADMIN_PATH}/logout`}>
              Start over
            </button>
          </div>
          <p className="sub" style={{ fontSize: 14 }}>Codes last {CODE_MINUTES} minutes.</p>
        </form>
      ) : (
        <form method="post" action={`${ADMIN_PATH}/request-code`} className="form" style={{ maxWidth: 420 }}>
          <label htmlFor="email">{PAGES.admin.emailLabel}</label>
          <input id="email" name="email" type="email" autoComplete="email" required autoFocus />
          <div style={{ marginTop: 20 }}>
            <button type="submit" className="btn btn-primary">
              {PAGES.admin.sendCode}
            </button>
          </div>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="page-hero" style={{ paddingBottom: 60 }}>
      <div className="wrap">
        <div className="eyebrow">10 years</div>
        <h1 style={{ fontSize: 34 }}>{PAGES.admin.title}</h1>
        <div style={{ marginTop: 24 }}>{children}</div>
      </div>
    </section>
  );
}
