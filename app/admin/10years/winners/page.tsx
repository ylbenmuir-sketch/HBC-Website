import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { loadWinners, personName, type WinnerView } from "@/lib/giveaway/admin-data";
import { ACTIONS, AdminShell, Flash, fmtAt, muted, requireAdminPage, smallBtn, smallInput, table, td, th } from "../_ui";

/**
 * /admin/10years/winners — every current winner (status != redrawn), then
 * the redrawn history. Per winner: the person, the prize (version named),
 * status, claim deadline, the call log, public OK and the label it would
 * publish, the tax-form step when required, notes. Forms POST to
 * actions/winner with a `kind` field; each redirects back here.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Winners — 10-year giveaway admin", robots: { index: false, follow: false, nocache: true } };

const STATUSES = ["contacted", "claimed", "unreachable", "declined", "ineligible"] as const;
const formRow: CSSProperties = { display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 8 };
const srOnly: CSSProperties = { position: "absolute", left: -9999 };

export default async function WinnersPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const { deps, admin } = await requireAdminPage();
  let current: WinnerView[] = [];
  let history: WinnerView[] = [];
  let loadError: string | null = null;
  try {
    ({ current, history } = await loadWinners(deps.store));
  } catch (err) {
    loadError = err instanceof Error ? err.message : "could not load";
  }

  return (
    <AdminShell title="Winners" current="/winners" admin={admin.email} env={deps.store.env}>
      <Flash ok={sp.ok} error={sp.error} />
      {loadError && (
        <p role="alert" style={{ color: "var(--alert, #9a3b2e)" }}>
          Could not load the winners: {loadError}
        </p>
      )}
      <p style={{ ...muted, fontSize: 14, margin: "0 0 18px" }}>
        Three call attempts, one per day. Mark contacted after the first conversation; public OK only after the winner says yes on the call. A winner unreachable past the deadline is redrawn from the Drawings screen.
      </p>
      {current.length === 0 && !loadError && <p style={muted}>No winners drawn yet.</p>}
      {current.length > 0 && <WinnersTable rows={current} editable />}
      {history.length > 0 && (
        <>
          <h2 style={{ fontSize: 22, margin: "28px 0 10px" }}>Redrawn (history)</h2>
          <WinnersTable rows={history} editable={false} />
        </>
      )}
    </AdminShell>
  );
}

function WinnersTable({ rows, editable }: { rows: WinnerView[]; editable: boolean }) {
  return (
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Drawing</th>
          <th style={th}>Person</th>
          <th style={th}>Prize</th>
          <th style={th}>Status</th>
          <th style={th}>Calls · public · tax</th>
          {editable && <th style={th}>Update</th>}
        </tr>
      </thead>
      <tbody>
        {rows.map((v) => {
          const w = v.winner;
          const p = v.person;
          return (
            <tr key={w.id} id={`winner-${w.id}`}>
              <td style={td}>
                <b>{v.config?.dayName ?? "?"}</b>
                <br />
                <span style={{ ...muted, fontSize: 12 }}>
                  {v.config?.slot ?? "?"} · drawn {fmtAt(w.created_at)}
                </span>
              </td>
              <td style={td}>
                {personName(p)}
                <br />
                <span style={{ fontSize: 13 }}>{p?.email_display ?? p?.email ?? "—"}</span>
                <br />
                <span style={{ fontSize: 13 }}>{w.phone ?? <span style={muted}>no phone yet</span>}</span>
                <br />
                <span style={{ ...muted, fontSize: 13 }}>
                  {p?.city ?? "city unknown"} {p?.zip ?? ""}
                  {p?.is_existing_client ? " · existing client" : ""}
                </span>
              </td>
              <td style={td}>
                {v.prizeName}
                <br />
                <span style={{ ...muted, fontSize: 12 }}>{v.versionLabel}</span>
              </td>
              <td style={td}>
                <b>{w.status}</b>
                <br />
                <span style={{ fontSize: 13 }}>claim by {fmtAt(w.claim_deadline_at)}</span>
                {w.contacted_at && (
                  <>
                    <br />
                    <span style={{ ...muted, fontSize: 12 }}>contacted {fmtAt(w.contacted_at)}</span>
                  </>
                )}
                {w.claimed_at && (
                  <>
                    <br />
                    <span style={{ ...muted, fontSize: 12 }}>claimed {fmtAt(w.claimed_at)}</span>
                  </>
                )}
                {w.redraw_reason && (
                  <>
                    <br />
                    <span style={{ ...muted, fontSize: 12 }}>
                      redrawn {fmtAt(w.redrawn_at)}: {w.redraw_reason}
                    </span>
                  </>
                )}
              </td>
              <td style={{ ...td, fontSize: 13 }}>
                <div>
                  <b>Calls ({(w.call_attempts ?? []).length}/3)</b>
                  {(w.call_attempts ?? []).length === 0 ? (
                    <span style={muted}> none yet</span>
                  ) : (
                    <ul style={{ margin: "2px 0 6px", paddingLeft: 18 }}>
                      {(w.call_attempts ?? []).map((c, i) => (
                        <li key={`${c.at}-${i}`}>
                          {fmtAt(c.at)} · {c.by} · {c.outcome}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <b>Public:</b> {w.public_ok ? `yes — "${w.public_label ?? ""}"` : "no"}
                  {!w.public_ok && v.publicLabelPreview && <span style={muted}> (would publish &quot;{v.publicLabelPreview}&quot;)</span>}
                </div>
                <div>
                  <b>Tax form:</b> {w.tax_form_required ? (w.tax_form_received_at ? `received ${fmtAt(w.tax_form_received_at)}` : "REQUIRED — not received") : "not required"}
                </div>
                {w.notes && (
                  <div style={{ marginTop: 4 }}>
                    <b>Notes:</b> {w.notes}
                  </div>
                )}
              </td>
              {editable && (
                <td style={{ ...td, minWidth: 280 }}>
                  <form method="post" action={`${ACTIONS}/winner`} style={formRow}>
                    <input type="hidden" name="winner_id" value={w.id} />
                    <input type="hidden" name="kind" value="call_attempt" />
                    <label htmlFor={`call-${w.id}`} style={srOnly}>
                      Call outcome
                    </label>
                    <input id={`call-${w.id}`} name="outcome" required placeholder="Call outcome (e.g. voicemail, reached)" style={{ ...smallInput, width: 190 }} />
                    <button type="submit" className="btn btn-outline" style={smallBtn}>
                      Add call
                    </button>
                  </form>
                  <form method="post" action={`${ACTIONS}/winner`} style={formRow}>
                    <input type="hidden" name="winner_id" value={w.id} />
                    <input type="hidden" name="kind" value="status" />
                    <label htmlFor={`status-${w.id}`} style={srOnly}>
                      Status
                    </label>
                    <select id={`status-${w.id}`} name="status" defaultValue={STATUSES.includes(w.status as (typeof STATUSES)[number]) ? w.status : "contacted"} style={{ ...smallInput, width: 190 }}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn btn-outline" style={smallBtn}>
                      Set status
                    </button>
                  </form>
                  <form method="post" action={`${ACTIONS}/winner`} style={formRow}>
                    <input type="hidden" name="winner_id" value={w.id} />
                    <input type="hidden" name="kind" value="public_ok" />
                    <input type="hidden" name="on" value={w.public_ok ? "0" : "1"} />
                    <button type="submit" className="btn btn-outline" style={smallBtn}>
                      {w.public_ok ? "Remove from public list" : `Publish as "${v.publicLabelPreview}"`}
                    </button>
                  </form>
                  {w.tax_form_required && (
                    <form method="post" action={`${ACTIONS}/winner`} style={formRow}>
                      <input type="hidden" name="winner_id" value={w.id} />
                      <input type="hidden" name="kind" value="tax_form_received" />
                      <input type="hidden" name="on" value={w.tax_form_received_at ? "0" : "1"} />
                      <button type="submit" className="btn btn-outline" style={smallBtn}>
                        {w.tax_form_received_at ? "Un-mark tax form received" : "Mark tax form received"}
                      </button>
                    </form>
                  )}
                  <form method="post" action={`${ACTIONS}/winner`} style={{ marginBottom: 8 }}>
                    <input type="hidden" name="winner_id" value={w.id} />
                    <input type="hidden" name="kind" value="note" />
                    <label htmlFor={`note-${w.id}`} style={srOnly}>
                      Notes
                    </label>
                    <textarea id={`note-${w.id}`} name="notes" rows={2} defaultValue={w.notes ?? ""} placeholder="Notes" style={{ ...smallInput, width: "100%", maxWidth: 270, display: "block", marginBottom: 6, resize: "vertical" }} />
                    <button type="submit" className="btn btn-outline" style={smallBtn}>
                      Save note
                    </button>
                  </form>
                </td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

