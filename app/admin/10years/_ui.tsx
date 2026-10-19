import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ADMIN_PATH, SESSION_COOKIE, currentAdmin } from "@/lib/giveaway/admin-auth";
import { adminDeps, type AdminDeps } from "@/lib/giveaway/admin-server";
import { formatCentralLabel } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";

/**
 * What the four signed-in screens share: the guard (no session → the
 * sign-in page), the shell with the nav, the ok/error flash, and the small
 * table styles. Labels here are internal staff English, not visitor copy.
 */

export const SCREENS = [
  { label: "Dashboard", path: "" },
  { label: "Drawings", path: "/drawings" },
  { label: "Winners", path: "/winners" },
  { label: "Entries", path: "/entries" },
  { label: "Exports", path: "/exports" },
] as const;

export const ACTIONS = `${ADMIN_PATH}/actions`;

/** The signed-in admin and the deps, or a redirect to the sign-in page. */
export async function requireAdminPage(): Promise<{ deps: AdminDeps; admin: { email: string } }> {
  const ready = adminDeps();
  if (!ready.ok) redirect(ADMIN_PATH);
  const jar = await cookies();
  const admin = await currentAdmin({ store: ready.deps.store, secret: ready.deps.secret }, jar.get(SESSION_COOKIE)?.value);
  if (!admin) redirect(ADMIN_PATH);
  return { deps: ready.deps, admin };
}

export function AdminNav({ current }: { current: string }) {
  return (
    <nav aria-label="Admin screens" style={{ display: "flex", flexWrap: "wrap", gap: "6px 18px", margin: "14px 0 26px", fontSize: 15 }}>
      {SCREENS.map((s) => (
        <Link key={s.path} href={`${ADMIN_PATH}${s.path}`} aria-current={s.path === current ? "page" : undefined} style={{ color: s.path === current ? "var(--ink)" : "var(--sage-deep)", fontWeight: s.path === current ? 600 : 500, textDecoration: "none", borderBottom: `1px solid ${s.path === current ? "var(--gold)" : "var(--gold-soft)"}` }}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({ title, current, admin, env, children }: { title: string; current: string; admin: string; env: string; children: ReactNode }) {
  return (
    <section className="page-hero" style={{ paddingBottom: 60 }}>
      <div className="wrap">
        <div className="eyebrow">10 years</div>
        <h1 style={{ fontSize: 34 }}>{title}</h1>
        <p className="sub" style={{ marginTop: 12, fontSize: 15 }}>
          {PAGES.admin.signedInAs} <b>{admin}</b> · {PAGES.admin.environment}: <code>{env}</code>
        </p>
        <AdminNav current={current} />
        <div>{children}</div>
      </div>
    </section>
  );
}

const OK_MESSAGES: Record<string, string> = {
  "1": "Done.",
  drawn: "Drawn. The staff alert and the winner email have been sent.",
  redrawn: "Redrawn. The staff alert and the winner email have been sent.",
  reverified: "Re-verified below.",
  voided: "Entry voided.",
  winner: "Winner updated.",
};

export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  let detail = error ?? "";
  try {
    detail = decodeURIComponent(detail);
  } catch {
    /* keep the raw slug */
  }
  return (
    <p role="status" style={{ margin: "0 0 18px", padding: "10px 14px", borderRadius: 4, fontSize: 15, background: error ? "rgba(154,59,46,0.08)" : "rgba(80,120,90,0.1)", color: error ? "var(--alert, #9a3b2e)" : "var(--sage-deep)" }}>
      {error ? `Not done: ${detail.replace(/[_-]+/g, " ")}.` : OK_MESSAGES[ok ?? "1"] ?? OK_MESSAGES["1"]}
    </p>
  );
}

export function fmtAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : formatCentralLabel(d);
}

export function short(s: string | null | undefined, n = 12): string {
  if (!s) return "—";
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

export const table: CSSProperties = { borderCollapse: "collapse", fontSize: 14, width: "100%", marginBottom: 28 };
export const th: CSSProperties = { textAlign: "left", padding: "6px 14px 6px 0", borderBottom: "1px solid var(--line)", color: "var(--slate)", fontWeight: 600, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", verticalAlign: "bottom" };
export const td: CSSProperties = { padding: "8px 14px 8px 0", borderBottom: "1px solid var(--line)", verticalAlign: "top" };
export const smallBtn: CSSProperties = { padding: "8px 14px", fontSize: 13, minHeight: 0 };
export const smallInput: CSSProperties = { border: "1px solid var(--line-control)", borderRadius: 4, padding: "7px 10px", fontSize: 14, fontFamily: "var(--sans)", background: "#fff", color: "var(--ink)" };
export const h2: CSSProperties = { fontSize: 22, margin: "28px 0 10px" };
export const muted: CSSProperties = { color: "var(--slate)" };

/** YYYY-MM-DD → a short Central day label. */
export function dayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}
