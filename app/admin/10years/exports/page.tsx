import type { Metadata } from "next";
import { EXPORT_NAMES } from "@/lib/giveaway/admin-data";
import { ACTIONS, AdminShell, muted, requireAdminPage, table, td, th } from "../_ui";

/**
 * /admin/10years/exports — four CSV downloads (decision 15). Each link is a
 * GET to actions/export/<name>, which checks the session, audits
 * `export_csv` and streams the file with no-store headers.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Exports — 10-year giveaway admin", robots: { index: false, follow: false, nocache: true } };

const DESCRIPTIONS: Record<(typeof EXPORT_NAMES)[number], string> = {
  people: "One row per person: contact details, verified, live entry count, referral code and credits, who referred them, marketing opt-in, unsubscribed, and their offer code with redeemed_at and center.",
  entries: "One row per entry, voided ones included: person email, kind, the referral it came from, void reason and time.",
  offers: "One row per offer code: the person, issued and expiry times, redeemed_at, the center and the consultation request id.",
  winners: "One row per winner row, current and redrawn: drawing, person, phone, prize and version, claim deadline, call log, public OK and label, tax form, notes.",
};

export default async function ExportsPage() {
  const { deps, admin } = await requireAdminPage();
  return (
    <AdminShell title="Exports" current="/exports" admin={admin.email} env={deps.store.env}>
      <p style={{ ...muted, fontSize: 14, margin: "0 0 18px" }}>
        Every download is audited with your email. Files cover env <code>{deps.store.env}</code> only. These hold personal data: keep them inside the company and delete them when done.
      </p>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Export</th>
            <th style={th}>What it holds</th>
            <th style={th}>Download</th>
          </tr>
        </thead>
        <tbody>
          {EXPORT_NAMES.map((name) => (
            <tr key={name}>
              <td style={td}>
                <b>{name}</b>
              </td>
              <td style={{ ...td, maxWidth: 560 }}>{DESCRIPTIONS[name]}</td>
              <td style={td}>
                <a href={`${ACTIONS}/export/${name}`} className="btn btn-outline" style={{ padding: "8px 14px", fontSize: 13, minHeight: 0 }} download>
                  {name}.csv
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </AdminShell>
  );
}
