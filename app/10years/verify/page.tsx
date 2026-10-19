import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { giveawayNow } from "@/lib/giveaway/clock";
import { pageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { handleVerify } from "@/lib/giveaway/web";

/** The verification click from the notify-me and entry emails (?t=token). */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Confirming your email", robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  if (pageMode(giveawayNow()) === "hidden") notFound();
  const { t } = await searchParams;
  const r = await handleVerify(t ?? null);
  return (
    <section className="page-hero">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="eyebrow">{PAGES.tenYears.eyebrow}</div>
        <h1 style={{ fontSize: 34 }}>{r.ok ? "Confirmed." : "Hmm."}</h1>
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
