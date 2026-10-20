import type { Metadata } from "next";
import Link from "next/link";
import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { SUSPICIOUS_REFERRAL_CREDITS, SUSPICIOUS_SHARED_IP_OTHERS, loadPeople, personName, type PersonView } from "@/lib/giveaway/admin-data";
import { ACTIONS, AdminShell, Flash, fmtAt, muted, requireAdminPage, smallBtn, smallInput, table, td, th } from "../_ui";

/**
 * /admin/10years/entries — every person, searchable (?q= over email, name,
 * ZIP, referral code; matched in JavaScript), with each person's entries
 * under a disclosure and a Void form per live entry. The saved "Suspicious"
 * filter (?filter=suspicious) shows people sharing an IP hash with three or
 * more others, with five or more referral credits, or touched by a voided
 * referral entry (decision 15: a filter, not a separate view).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Entries — 10-year giveaway admin", robots: { index: false, follow: false, nocache: true } };

const PATH = `${ADMIN_PATH}/entries`;
const PAGE_SIZE = 200;

export default async function EntriesPage({ searchParams }: { searchParams: Promise<{ q?: string; filter?: string; ok?: string; error?: string; show?: string }> }) {
  const sp = await searchParams;
  const { deps, admin } = await requireAdminPage();
  const q = (sp.q ?? "").trim();
  const suspicious = sp.filter === "suspicious";
  let people: PersonView[] = [];
  let total = 0;
  let loadError: string | null = null;
  try {
    ({ people, total } = await loadPeople(deps.store, { q, filter: sp.filter }));
  } catch (err) {
    loadError = err instanceof Error ? err.message : "could not load";
  }
  const shown = people.slice(0, PAGE_SIZE);
  const here = `${PATH}?${new URLSearchParams({ ...(q ? { q } : {}), ...(suspicious ? { filter: "suspicious" } : {}) }).toString()}`.replace(/\?$/, "");

  return (
    <AdminShell title="Entries" current="/entries" admin={admin.email} env={deps.store.env}>
      <Flash ok={sp.ok} error={sp.error} />
      {loadError && (
        <p role="alert" style={{ color: "var(--alert, #9a3b2e)" }}>
          Could not load: {loadError}
        </p>
      )}
      <form method="get" action={PATH} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
        <label htmlFor="q" style={{ position: "absolute", left: -9999 }}>
          Search
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder="Email, name, ZIP or referral code" style={{ ...smallInput, width: 300 }} />
        {suspicious && <input type="hidden" name="filter" value="suspicious" />}
        <button type="submit" className="btn btn-primary" style={smallBtn}>
          Search
        </button>
        {(q || suspicious) && (
          <Link href={PATH} style={{ fontSize: 14 }}>
            Clear
          </Link>
        )}
      </form>
      <p style={{ fontSize: 14, margin: "0 0 18px" }}>
        Saved filter:{" "}
        {suspicious ? (
          <b>Suspicious</b>
        ) : (
          <Link href={`${PATH}?filter=suspicious${q ? `&q=${encodeURIComponent(q)}` : ""}`}>Suspicious</Link>
        )}
        <span style={{ ...muted }}>
          {" "}
          — shares an IP hash with {SUSPICIOUS_SHARED_IP_OTHERS}+ other people, {SUSPICIOUS_REFERRAL_CREDITS}+ referral credits, or a voided referral entry.
        </span>
        <br />
        <span style={muted}>
          Showing {shown.length} of {people.length} matching · {total} people in {deps.store.env}.{people.length > PAGE_SIZE ? " Narrow the search to see the rest." : ""}
        </span>
      </p>

      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Name</th>
            <th style={th}>Email</th>
            <th style={th}>ZIP / city</th>
            <th style={th}>Verified</th>
            <th style={th}>Client</th>
            <th style={th}>Entries</th>
            <th style={th}>Credits</th>
            <th style={th}>Referred by</th>
            <th style={th}>Unsub</th>
            <th style={th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {shown.length === 0 && (
            <tr>
              <td style={{ ...td, ...muted }} colSpan={10}>
                Nobody matches.
              </td>
            </tr>
          )}
          {shown.map((v) => {
            const p = v.person;
            return (
              <tr key={p.id} id={`person-${p.id}`}>
                <td style={td}>
                  <details>
                    <summary style={{ cursor: "pointer" }}>
                      <b>{personName(p)}</b>
                    </summary>
                    <div style={{ marginTop: 8, fontSize: 13 }}>
                      <div style={muted}>
                        id {p.id} · referral code <code>{p.referral_code}</code>
                        {p.ip_hash ? <> · ip {p.ip_hash.slice(0, 10)}…</> : null}
                      </div>
                      {v.flags.length > 0 && (
                        <ul style={{ margin: "6px 0", paddingLeft: 18, color: "var(--alert, #9a3b2e)" }}>
                          {v.flags.map((f) => (
                            <li key={f}>{f}</li>
                          ))}
                        </ul>
                      )}
                      <EntriesList view={v} back={here} />
                    </div>
                  </details>
                  {v.flags.length > 0 && <span style={{ fontSize: 11, color: "var(--alert, #9a3b2e)", letterSpacing: "0.08em", textTransform: "uppercase" }}>suspicious</span>}
                </td>
                <td style={{ ...td, wordBreak: "break-all" }}>{p.email_display || p.email}</td>
                <td style={td}>
                  {p.zip}
                  <br />
                  <span style={{ ...muted, fontSize: 12 }}>{p.city ?? "—"}</span>
                </td>
                <td style={td}>{p.verified_at ? fmtAt(p.verified_at) : <span style={muted}>no</span>}</td>
                <td style={td}>{p.is_existing_client ? "existing" : "new"}</td>
                <td style={td}>{v.liveEntries}</td>
                <td style={td}>{p.referral_credits}</td>
                <td style={{ ...td, fontSize: 13 }}>{v.referredBy ? personName(v.referredBy) : p.referred_by_person_id ? <span style={muted}>unknown person</span> : "—"}</td>
                <td style={td}>{p.unsubscribed_at ? fmtAt(p.unsubscribed_at) : "—"}</td>
                <td style={td}>{fmtAt(p.created_at)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminShell>
  );
}

function EntriesList({ view, back }: { view: PersonView; back: string }) {
  if (view.entries.length === 0) return <p style={muted}>No entries (not verified yet).</p>;
  return (
    <table style={{ ...table, width: "auto", marginBottom: 6 }}>
      <thead>
        <tr>
          <th style={th}>Kind</th>
          <th style={th}>Created</th>
          <th style={th}>Via</th>
          <th style={th}>Void</th>
        </tr>
      </thead>
      <tbody>
        {view.entries.map((e) => (
          <tr key={e.id}>
            <td style={td}>{e.kind}</td>
            <td style={td}>{fmtAt(e.created_at)}</td>
            <td style={{ ...td, ...muted, fontSize: 12 }}>{e.referral_person_id ? `person ${e.referral_person_id.slice(0, 8)}…` : "—"}</td>
            <td style={td}>
              {e.void_reason ? (
                <span style={{ color: "var(--alert, #9a3b2e)" }}>
                  voided {fmtAt(e.voided_at)}: {e.void_reason}
                </span>
              ) : (
                <form method="post" action={`${ACTIONS}/void-entry`} style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="hidden" name="entry_id" value={e.id} />
                  <input type="hidden" name="return" value={back} />
                  <label htmlFor={`void-${e.id}`} style={{ position: "absolute", left: -9999 }}>
                    Void reason
                  </label>
                  <input id={`void-${e.id}`} name="reason" required placeholder="Reason" style={{ ...smallInput, width: 160, padding: "5px 8px", fontSize: 13 }} />
                  <button type="submit" className="btn btn-outline" style={{ ...smallBtn, padding: "6px 10px", fontSize: 12 }}>
                    Void
                  </button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
