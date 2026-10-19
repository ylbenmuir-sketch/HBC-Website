import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ADMIN_PATH, CODE_MINUTES, PENDING_COOKIE, SESSION_COOKIE, currentAdmin, pendingEmail } from "@/lib/giveaway/admin-auth";
import { loadDashboard, personName, type Dashboard } from "@/lib/giveaway/admin-data";
import { adminDeps, migrationApplied } from "@/lib/giveaway/admin-server";
import { DRAWINGS, SCHEDULE } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { AdminNav, dayLabel, fmtAt, h2, muted, table, td, th } from "./_ui";

/**
 * /admin/10years — the giveaway's staff screens (GIVEAWAY-PLAN.md §5).
 * The sign-in (Supabase Auth email code, allowlist from GIVEAWAY_ADMINS)
 * and, once signed in, the dashboard: counts, the six drawings, the send
 * jobs and a warning when a drawing row disagrees with the config. The
 * other screens live in ./drawings, ./winners, ./entries, ./exports.
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
    let dash: Dashboard | null = null;
    let loadError: string | null = null;
    if (applied) {
      try {
        dash = await loadDashboard(deps.store);
      } catch (err) {
        loadError = err instanceof Error ? err.message : "could not load";
      }
    }
    return (
      <Shell>
        <p className="sub" style={{ marginTop: 0 }}>
          {PAGES.admin.signedInAs} <b>{admin.email}</b> · {PAGES.admin.environment}: <code>{deps.store.env}</code>
        </p>
        <form method="post" action={`${ADMIN_PATH}/logout`} style={{ margin: "8px 0 8px" }}>
          <button type="submit" className="btn btn-outline" style={{ padding: "10px 18px", fontSize: 14 }}>
            {PAGES.admin.signOut}
          </button>
        </form>
        <AdminNav current="" />
        <h2 style={{ fontSize: 26, margin: "0 0 10px" }}>{PAGES.admin.shellTitle}</h2>
        <p className="sub" style={{ color: applied ? "var(--sage-deep)" : "var(--alert, #9a3b2e)" }}>
          {applied === null ? "Could not reach the database." : applied ? PAGES.admin.migrationOk : PAGES.admin.migrationMissing}
        </p>
        {loadError && (
          <p className="sub" role="alert" style={{ color: "var(--alert, #9a3b2e)" }}>
            The dashboard could not load: {loadError}
          </p>
        )}
        {dash && <DashboardBody dash={dash} />}
        <h3 style={h2}>{PAGES.admin.schedule}</h3>
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

function DashboardBody({ dash }: { dash: Dashboard }) {
  const pct = (n: number, of: number) => (of ? ` (${Math.round((n / of) * 100)}%)` : "");
  return (
    <>
      {dash.warnings.map((w) => (
        <p key={w} role="alert" style={{ margin: "0 0 10px", padding: "10px 14px", borderRadius: 4, background: "rgba(154,59,46,0.08)", color: "var(--alert, #9a3b2e)", fontSize: 15 }}>
          WARNING: {w}
        </p>
      ))}

      <h3 style={h2}>Counts</h3>
      <table style={{ ...table, width: "auto" }}>
        <tbody>
          <tr>
            <td style={{ ...td, ...muted }}>People</td>
            <td style={td}>
              {dash.people.total} total · {dash.people.verified} verified{pct(dash.people.verified, dash.people.total)} · {dash.people.unsubscribed} unsubscribed
            </td>
          </tr>
          <tr>
            <td style={{ ...td, ...muted }}>Notify-me signups</td>
            <td style={td}>
              {dash.notify.total} total · {dash.notify.verified} verified · {dash.notify.tapped} tapped the live link
            </td>
          </tr>
          <tr>
            <td style={{ ...td, ...muted }}>Referrals credited</td>
            <td style={td}>{dash.referralCredits} friends (sum of referral_credits)</td>
          </tr>
          <tr>
            <td style={{ ...td, ...muted }}>Offers</td>
            <td style={td}>
              {dash.offers.issued} issued · {dash.offers.redeemed} redeemed{pct(dash.offers.redeemed, dash.offers.issued)}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0 48px" }}>
        <div>
          <h3 style={h2}>Entries by kind</h3>
          <table style={{ ...table, width: "auto" }}>
            <thead>
              <tr>
                <th style={th}>Kind</th>
                <th style={th}>Live</th>
                <th style={th}>Voided</th>
              </tr>
            </thead>
            <tbody>
              {dash.entriesByKind.length === 0 && (
                <tr>
                  <td style={{ ...td, ...muted }} colSpan={3}>
                    No entries yet.
                  </td>
                </tr>
              )}
              {dash.entriesByKind.map((k) => (
                <tr key={k.kind}>
                  <td style={td}>{k.kind}</td>
                  <td style={td}>{k.live}</td>
                  <td style={td}>{k.voided}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3 style={h2}>Live entries per day (Central)</h3>
          <table style={{ ...table, width: "auto" }}>
            <thead>
              <tr>
                <th style={th}>Day</th>
                <th style={th}>Entries</th>
              </tr>
            </thead>
            <tbody>
              {dash.entriesByDay.length === 0 && (
                <tr>
                  <td style={{ ...td, ...muted }} colSpan={2}>
                    No entries yet.
                  </td>
                </tr>
              )}
              {dash.entriesByDay.map((d) => (
                <tr key={d.day}>
                  <td style={td}>
                    {dayLabel(d.day)} <span style={muted}>({d.day})</span>
                  </td>
                  <td style={td}>{d.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 style={h2}>
        Drawings · <Link href={`${ADMIN_PATH}/drawings`}>open</Link>
      </h3>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Slot</th>
            <th style={th}>Scheduled (CT)</th>
            <th style={th}>Status</th>
            <th style={th}>Pool</th>
            <th style={th}>Winner</th>
            <th style={th}>Winner status</th>
          </tr>
        </thead>
        <tbody>
          {dash.drawings.map((d) => (
            <tr key={d.config.slot}>
              <td style={td}>
                {d.config.dayName} <span style={muted}>({d.config.slot})</span>
              </td>
              <td style={{ ...td, color: d.timeMismatch ? "var(--alert, #9a3b2e)" : undefined }}>{d.row ? fmtAt(d.row.scheduled_at) : d.config.ct}</td>
              <td style={td}>{d.row?.status ?? "no row"}</td>
              <td style={td}>{d.row?.pool_size ?? "—"}</td>
              <td style={td}>{d.winner ? personName(d.person) : "—"}</td>
              <td style={td}>{d.winner?.status ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 style={h2}>Send jobs</h3>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Job</th>
            <th style={th}>Due (CT)</th>
            <th style={th}>Sent</th>
            <th style={th}>Receipts</th>
            <th style={th}>Skipped / error</th>
          </tr>
        </thead>
        <tbody>
          {dash.jobs.length === 0 && (
            <tr>
              <td style={{ ...td, ...muted }} colSpan={5}>
                No scheduled_sends job rows yet (the cron schedules them on its first tick).
              </td>
            </tr>
          )}
          {dash.jobs.map((j) => (
            <tr key={`${j.kind}-${j.due_at}`}>
              <td style={td}>{j.kind}</td>
              <td style={td}>{fmtAt(j.due_at)}</td>
              <td style={td}>{j.sent_at ? fmtAt(j.sent_at) : "not yet"}</td>
              <td style={td}>{j.receipts}</td>
              <td style={{ ...td, color: j.error ? "var(--alert, #9a3b2e)" : undefined }}>{j.error ?? j.skipped_reason ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
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
