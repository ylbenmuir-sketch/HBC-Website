import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { giveawayNow } from "@/lib/giveaway/clock";
import { pageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { handleTap } from "@/lib/giveaway/web";

/** The one-tap entry from the "It's live" email (decision 13). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Entering you", robots: { index: false, follow: false } };

export default async function EnterPage({ params }: { params: Promise<{ token: string }> }) {
  if (pageMode(giveawayNow()) === "hidden") notFound();
  const { token } = await params;
  const r = await handleTap(decodeURIComponent(token));
  return (
    <section className="page-hero">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="eyebrow">{PAGES.tenYears.eyebrow}</div>
        <h1 style={{ fontSize: 34 }}>{r.ok ? "You're in." : "Not yet."}</h1>
        <p className="sub" role="status" data-ok={r.ok ? "1" : "0"}>
          {r.message}
        </p>
        <p style={{ marginTop: 24 }}>
          <a href="/10years" className="btn btn-primary">
            Back to the giveaway
          </a>
        </p>
      </div>
    </section>
  );
}
