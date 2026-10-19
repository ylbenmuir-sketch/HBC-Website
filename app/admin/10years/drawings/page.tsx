import type { Metadata } from "next";
import { loadDrawings, personName } from "@/lib/giveaway/admin-data";
import { giveawayNow } from "@/lib/giveaway/clock";
import { reverify } from "@/lib/giveaway/drawings";
import { ACTIONS, AdminShell, Flash, fmtAt, muted, requireAdminPage, short, smallBtn, smallInput, table, td, th } from "../_ui";

/**
 * /admin/10years/drawings — one row per drawing in config order: time,
 * status, pool size (stored, or a live preview while scheduled), the current
 * winner, seed/hash. Draw now (when due), Redraw with a reason, Re-verify
 * (results shown inline after the POST redirects back with ?reverify=<id>),
 * and the audit trail for the row. Plain forms; no JavaScript needed.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Drawings — 10-year giveaway admin", robots: { index: false, follow: false, nocache: true } };

export default async function DrawingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string; reverify?: string }> }) {
  const sp = await searchParams;
  const { deps, admin } = await requireAdminPage();
  const now = giveawayNow();
  let rows: Awaited<ReturnType<typeof loadDrawings>> = [];
  let loadError: string | null = null;
  try {
    rows = await loadDrawings(deps.store, now);
  } catch (err) {
    loadError = err instanceof Error ? err.message : "could not load";
  }
  const verified = sp.reverify ? await reverify(deps.store, sp.reverify) : null;

  return (
    <AdminShell title="Drawings" current="/drawings" admin={admin.email} env={deps.store.env}>
      <Flash ok={sp.ok} error={sp.error} />
      {loadError && (
        <p role="alert" style={{ color: "var(--alert, #9a3b2e)" }}>
          Could not load the drawings: {loadError}
        </p>
      )}
      <p style={{ ...muted, fontSize: 14, margin: "0 0 18px" }}>
        Now (giveaway clock): {fmtAt(now.toISOString())}. The per-minute cron draws each slot at its time; Draw now is for a slot the cron missed. A redraw picks from the frozen pool and needs a reason.
      </p>
      <table style={table}>
        <thead>
          <tr>
            <th style={th}>Slot</th>
            <th style={th}>Time (CT)</th>
            <th style={th}>Status</th>
            <th style={th}>Pool</th>
            <th style={th}>Current winner</th>
            <th style={th}>Seed / hash</th>
            <th style={th}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const id = d.row?.id ?? d.config.slot;
            const result = verified && d.row && sp.reverify === d.row.id ? verified : null;
            return (
              <tr key={d.config.slot} id={`drawing-${d.config.slot}`}>
                <td style={td}>
                  <b>{d.config.dayName}</b>
                  <br />
                  <span style={muted}>
                    {d.config.slot} · {d.config.kind}
                  </span>
                </td>
                <td style={{ ...td, color: d.timeMismatch ? "var(--alert, #9a3b2e)" : undefined }}>
                  {d.row ? fmtAt(d.row.scheduled_at) : d.config.ct}
                  {d.timeMismatch && (
                    <>
                      <br />
                      <span style={{ fontSize: 12 }}>config says {d.config.ct}</span>
                    </>
                  )}
                </td>
                <td style={td}>
                  {d.row?.status ?? "no row"}
                  {d.row?.drawn_at && (
                    <>
                      <br />
                      <span style={{ ...muted, fontSize: 12 }}>
                        {fmtAt(d.row.drawn_at)} by {d.row.drawn_by ?? "?"}
                      </span>
                    </>
                  )}
                </td>
                <td style={td}>
                  {d.poolSize ?? "—"}
                  {d.poolIsPreview && (
                    <>
                      <br />
                      <span style={{ ...muted, fontSize: 12 }}>live preview</span>
                    </>
                  )}
                </td>
                <td style={td}>
                  {d.winner ? (
                    <>
                      {personName(d.person)}
                      <br />
                      <span style={{ ...muted, fontSize: 12 }}>{d.winner.status}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
                <td style={{ ...td, fontFamily: "monospace", fontSize: 12 }}>
                  {short(d.row?.seed)}
                  <br />
                  {short(d.row?.pool_snapshot_hash)}
                </td>
                <td style={{ ...td, minWidth: 260 }}>
                  {d.canDrawNow && (
                    <form method="post" action={`${ACTIONS}/draw`} style={{ marginBottom: 10 }}>
                      <input type="hidden" name="slot" value={d.config.slot} />
                      <button type="submit" className="btn btn-primary" style={smallBtn}>
                        Draw now
                      </button>
                    </form>
                  )}
                  {d.canRedraw && d.row && (
                    <form method="post" action={`${ACTIONS}/redraw`} style={{ marginBottom: 10, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                      <input type="hidden" name="drawing_id" value={d.row.id} />
                      <label htmlFor={`reason-${id}`} style={{ position: "absolute", left: -9999 }}>
                        Redraw reason
                      </label>
                      <input id={`reason-${id}`} name="reason" required placeholder="Reason for the redraw" style={{ ...smallInput, width: 170 }} />
                      <button type="submit" className="btn btn-outline" style={smallBtn}>
                        Redraw
                      </button>
                    </form>
                  )}
                  {d.row && d.row.status !== "scheduled" && (
                    <form method="post" action={`${ACTIONS}/reverify`} style={{ marginBottom: 10 }}>
                      <input type="hidden" name="drawing_id" value={d.row.id} />
                      <button type="submit" className="btn btn-outline" style={smallBtn}>
                        Re-verify
                      </button>
                    </form>
                  )}
                  {result && (
                    <div style={{ fontSize: 13, marginBottom: 10, padding: "8px 10px", borderRadius: 4, background: result.hashOk && result.results.every((r) => r.ok) ? "rgba(80,120,90,0.1)" : "rgba(154,59,46,0.08)" }}>
                      <b>Re-verify:</b> pool hash {result.hashOk ? "OK" : "MISMATCH"}
                      <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
                        {result.results.length === 0 && <li>no winner rows</li>}
                        {result.results.map((r) => (
                          <li key={r.winnerId} style={{ fontFamily: "monospace", fontSize: 12 }}>
                            winner {short(r.winnerId, 8)}: {r.ok ? "ok" : "FAIL"} · expected {short(r.expectedEntry, 8)} · actual {short(r.actualEntry, 8)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {d.row && (
                    <details style={{ fontSize: 13 }}>
                      <summary style={{ cursor: "pointer", ...muted }}>Audit trail ({d.auditTrail.length})</summary>
                      {d.auditTrail.length === 0 && <p style={muted}>Nothing yet.</p>}
                      <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                        {d.auditTrail.map((a) => (
                          <li key={a.id} style={{ marginBottom: 6 }}>
                            <b>{a.action}</b> · {fmtAt(a.at)} · {a.actor}
                            {a.reason && <> · {a.reason}</>}
                            {(a.before != null || a.after != null) && (
                              <pre style={{ margin: "2px 0 0", fontSize: 11, whiteSpace: "pre-wrap", wordBreak: "break-all", ...muted }}>
                                {a.before != null && `before ${JSON.stringify(a.before)}\n`}
                                {a.after != null && `after ${JSON.stringify(a.after)}`}
                              </pre>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </AdminShell>
  );
}
