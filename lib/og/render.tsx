import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_NAME } from "../site-config";

/**
 * The per-route Open Graph card (SEO-AUDIT-3 §4.3, A6).
 *
 * Forty URLs shared one image — a 3 a.m. sleep article, the Murfreesboro
 * page and the privacy policy all unfurled as the same smiling woman and the
 * same headline. The three dynamic segments now generate their own at build
 * time with `ImageResponse`; the utility pages keep /images/og-default.jpg
 * (lib/metadata.ts). No design assets beyond the two faces the site already
 * sets in, as static instances in ./fonts.
 *
 * The layout is the site's own: ivory ground, a gold rule under a small
 * uppercase DM Sans eyebrow, the headline in Cormorant Garamond, and the
 * wordmark with the two cities along the foot. 1200×630, the size every
 * platform crops to; the headline sits in the upper-left so iMessage's
 * centre crop and a square crop both keep it.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const NAVY = "#1C2B3A";
export const IVORY = "#FBF8F1";
export const GOLD = "#A9853F";
export const GOLD_INK = "#856831";
export const SAGE = "#596E5B";
export const SLATE = "#5D6873";

let fontsPromise: Promise<{ serif: ArrayBuffer; sans: ArrayBuffer }> | null = null;
/** The two faces every card is set in; shared with lib/og/ten-years.tsx. */
export function fonts() {
  if (!fontsPromise) {
    const dir = join(process.cwd(), "lib", "og", "fonts");
    fontsPromise = Promise.all([
      readFile(join(dir, "CormorantGaramond-SemiBold.woff")),
      readFile(join(dir, "DMSans-Medium.woff")),
    ]).then(([serif, sans]) => ({
      serif: serif.buffer.slice(serif.byteOffset, serif.byteOffset + serif.byteLength),
      sans: sans.buffer.slice(sans.byteOffset, sans.byteOffset + sans.byteLength),
    }));
  }
  return fontsPromise;
}

export type OgCard = {
  /** Small uppercase line above the headline — "Neurofeedback for sleep". */
  eyebrow: string;
  /** The headline, in the serif. Three lines at most at this size. */
  headline: string;
  /** One or two lines under the headline, in the sans; optional. */
  sub?: string;
  /** Foot, right side — "Nashville · Murfreesboro" by default. */
  foot?: string;
};

export async function renderOgCard(card: OgCard) {
  const { serif, sans } = await fonts();
  const headlineSize = card.headline.length > 48 ? 66 : card.headline.length > 30 ? 76 : 88;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: IVORY,
          padding: "64px 72px 56px",
          fontFamily: "DM Sans",
          color: NAVY,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              fontSize: 22,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              color: GOLD_INK,
            }}
          >
            <div style={{ width: 36, height: 2, background: GOLD, marginRight: 18 }} />
            {card.eyebrow}
          </div>
          <div
            style={{
              marginTop: 34,
              fontFamily: "Cormorant Garamond",
              fontSize: headlineSize,
              lineHeight: 1.06,
              maxWidth: 1000,
              display: "flex",
            }}
          >
            {card.headline}
          </div>
          {card.sub && (
            <div
              style={{
                marginTop: 28,
                fontSize: 27,
                lineHeight: 1.4,
                color: SLATE,
                maxWidth: 900,
                display: "flex",
              }}
            >
              {card.sub}
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            borderTop: `1px solid rgba(169,133,63,0.45)`,
            paddingTop: 26,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <svg width="44" height="44" viewBox="0 0 40 40" fill="none">
              <circle cx="20" cy="20" r="19" stroke={GOLD} strokeWidth="1" />
              <path
                d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20"
                stroke="#8FA08D"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
              <div style={{ fontFamily: "Cormorant Garamond", fontSize: 30, lineHeight: 1 }}>
                {SITE_NAME}
              </div>
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.3em",
                  textTransform: "uppercase",
                  color: GOLD_INK,
                  marginTop: 6,
                }}
              >
                LENS neurofeedback
              </div>
            </div>
          </div>
          <div style={{ fontSize: 22, color: SAGE, letterSpacing: "0.04em" }}>
            {card.foot ?? "Nashville · Murfreesboro"}
          </div>
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
