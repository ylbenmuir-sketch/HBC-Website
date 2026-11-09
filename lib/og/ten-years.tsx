import { ImageResponse } from "next/og";
import { DRAWINGS, centralParts, prizeTotalFloorUsd, spokenCentralRange } from "../giveaway/config";
import { PAGES } from "../giveaway/copy";
import { ESTABLISHED_YEAR, SITE_NAME } from "../site-config";
import { GOLD, GOLD_INK, IVORY, NAVY, OG_SIZE, SAGE, SLATE, fonts } from "./render";

/**
 * The /10years share card (Ben, 2026-10-20): the seal, "10 Years", the
 * week's value, the brand foot — in the site's palette and faces, 1200×630.
 * Every number comes from config (the years from the drawing week and
 * ESTABLISHED_YEAR, the total from prizeTotalFloorUsd); every word from
 * lib/giveaway/copy.ts. Served by app/10years/opengraph-image.tsx and
 * twitter-image.tsx, so a referral link (?ref=) shares the same preview.
 */
export const ogTitle = () => PAGES.tenYears.og.title;
export const ogDescription = () => PAGES.tenYears.og.description(DRAWINGS.length, spokenCentralRange(DRAWINGS[0].at, DRAWINGS[DRAWINGS.length - 1].at, "short"));

export async function renderTenYearsCard() {
  const { serif, sans } = await fonts();
  const t = PAGES.tenYears;
  const weekYear = centralParts(DRAWINGS[0].at).year;
  const years = weekYear - ESTABLISHED_YEAR.value;
  const total = prizeTotalFloorUsd();
  const heading = t.heading.split(/(?<=\.)\s+/);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: IVORY, padding: "56px 72px 52px", fontFamily: "DM Sans", color: NAVY }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          {/* The seal: gold rings, the number in the serif, the years and the span around it. */}
          <div style={{ width: 214, height: 214, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 107, border: `2px solid ${GOLD}`, position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 6, left: 6, right: 6, bottom: 6, borderRadius: 101, border: `1px solid ${GOLD}` }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 15, letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD_INK, display: "flex" }}>{t.sealYears(years)}</div>
              <div style={{ fontFamily: "Cormorant Garamond", fontSize: 104, lineHeight: 1, color: GOLD_INK, display: "flex", marginTop: 2 }}>{years}</div>
              <div style={{ fontSize: 14, letterSpacing: "0.26em", color: GOLD_INK, display: "flex", marginTop: 4 }}>{t.sealSpan(ESTABLISHED_YEAR.value, weekYear)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 56 }}>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 168, lineHeight: 0.9, color: SAGE, letterSpacing: "-0.03em", display: "flex" }}>{t.og.years(years)}</div>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 66, lineHeight: 1, color: NAVY, letterSpacing: "-0.01em", display: "flex", marginTop: 10 }}>{heading.length > 1 ? heading.slice(1).join(" ") : ogTitle()}</div>
            <div style={{ fontSize: 34, lineHeight: 1.2, color: GOLD_INK, display: "flex", marginTop: 22, fontWeight: 500 }}>{t.og.value(total)}</div>
            {/* The mystery gift (fix list rev 2, P0-4): "gift", never the visit. */}
            <div style={{ fontSize: 26, lineHeight: 1.2, color: NAVY, display: "flex", marginTop: 10, fontWeight: 500 }}>{t.og.tease}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderTop: "1px solid rgba(169,133,63,0.45)", paddingTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke={GOLD} strokeWidth="1" />
              <path d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20" stroke="#8FA08D" strokeWidth="1.6" fill="none" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ fontFamily: "Cormorant Garamond", fontSize: 30, lineHeight: 1, display: "flex" }}>{SITE_NAME}</div>
              <div style={{ fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD_INK, marginTop: 6, display: "flex" }}>LENS neurofeedback</div>
            </div>
          </div>
          <div style={{ fontSize: 22, color: SLATE, letterSpacing: "0.04em", display: "flex" }}>{t.og.foot(DRAWINGS.length, spokenCentralRange(DRAWINGS[0].at, DRAWINGS[DRAWINGS.length - 1].at, "short"))}</div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Cormorant Garamond", data: serif, weight: 600, style: "normal" },
        { name: "DM Sans", data: sans, weight: 500, style: "normal" },
      ],
    }
  );
}

/** The email header (Ben, 2026-11-09): the share card's seal, "10 Years" and the
 *  week, as a 1200×400 banner shown at 600 wide. scripts/render-email-banner.mjs
 *  turns it into the small, palette PNG the emails link to (public/email/). */
export const EMAIL_BANNER_SIZE = { width: 1200, height: 400 };

export async function renderTenYearsEmailBanner() {
  const { serif, sans } = await fonts();
  const t = PAGES.tenYears;
  const weekYear = centralParts(DRAWINGS[0].at).year;
  const years = weekYear - ESTABLISHED_YEAR.value;
  const total = prizeTotalFloorUsd();
  const heading = t.heading.split(/(?<=[.!])\s+/);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: IVORY, padding: "40px 64px 30px", fontFamily: "DM Sans", color: NAVY }}>
        <div style={{ display: "flex", alignItems: "center", flex: 1 }}>
          <div style={{ width: 236, height: 236, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 118, border: `3px solid ${GOLD}`, position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 8, left: 8, right: 8, bottom: 8, borderRadius: 110, border: `1.5px solid ${GOLD}` }} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 17, letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD_INK, display: "flex" }}>{t.sealYears(years)}</div>
              <div style={{ fontFamily: "Cormorant Garamond", fontSize: 116, lineHeight: 1, color: GOLD_INK, display: "flex", marginTop: 2 }}>{years}</div>
              <div style={{ fontSize: 16, letterSpacing: "0.26em", color: GOLD_INK, display: "flex", marginTop: 4 }}>{t.sealSpan(ESTABLISHED_YEAR.value, weekYear)}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 52 }}>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 148, lineHeight: 0.9, color: SAGE, letterSpacing: "-0.03em", display: "flex" }}>{t.og.years(years)}</div>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 60, lineHeight: 1, color: NAVY, letterSpacing: "-0.01em", display: "flex", marginTop: 12 }}>{heading.length > 1 ? heading.slice(1).join(" ") : ogTitle()}</div>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid rgba(169,133,63,0.5)", paddingTop: 18 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke={GOLD} strokeWidth="1.2" />
              <path d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20" stroke="#8FA08D" strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </svg>
            <div style={{ fontFamily: "Cormorant Garamond", fontSize: 30, lineHeight: 1, display: "flex", marginLeft: 14 }}>{SITE_NAME}</div>
          </div>
          <div style={{ fontSize: 26, color: GOLD_INK, display: "flex", fontWeight: 500 }}>{t.og.value(total)}</div>
        </div>
      </div>
    ),
    {
      ...EMAIL_BANNER_SIZE,
      fonts: [
        { name: "Cormorant Garamond", data: serif, weight: 600, style: "normal" },
        { name: "DM Sans", data: sans, weight: 500, style: "normal" },
      ],
    }
  );
}
