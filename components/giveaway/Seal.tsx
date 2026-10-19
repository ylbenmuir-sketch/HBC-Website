/**
 * The anniversary seal: a gold, foil-style ring with "10 YEARS" on the top
 * arc and "2016–2026" on the bottom, the number in the middle. Pure SVG —
 * crisp at any size, no image file. Decorative: the words are in the hero
 * text, so it is hidden from assistive tech.
 */
export default function Seal({ number, years, span }: { number: number; years: string; span: string }) {
  return (
    <svg className="ty-seal" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="ty-seal-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e4cf98" />
          <stop offset="0.45" stopColor="#a9853f" />
          <stop offset="0.7" stopColor="#c9ab63" />
          <stop offset="1" stopColor="#8f6f33" />
        </linearGradient>
        {/* Two arcs, both travelling left to right so each word reads the right way up: over the top on r=40 (glyphs sit outward), under the bottom on r=47 (glyphs sit inward, so the two rings of text share one band). */}
        <path id="ty-seal-top" d="M20,60 A40,40 0 0 1 100,60" />
        <path id="ty-seal-bottom" d="M13,60 A47,47 0 0 0 107,60" />
      </defs>
      <circle cx="60" cy="60" r="58.5" fill="none" stroke="url(#ty-seal-gold)" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="55" fill="none" stroke="url(#ty-seal-gold)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="27" fill="none" stroke="url(#ty-seal-gold)" strokeWidth="0.6" />
      <text fill="url(#ty-seal-gold)" fontSize="9.4" letterSpacing="2.6" fontWeight="600" style={{ textTransform: "uppercase" }}>
        <textPath href="#ty-seal-top" startOffset="50%" textAnchor="middle">
          {years}
        </textPath>
      </text>
      <text fill="url(#ty-seal-gold)" fontSize="8.6" letterSpacing="2.2" fontWeight="600">
        <textPath href="#ty-seal-bottom" startOffset="50%" textAnchor="middle">
          {span}
        </textPath>
      </text>
      <circle cx="13" cy="60" r="1.4" fill="url(#ty-seal-gold)" />
      <circle cx="107" cy="60" r="1.4" fill="url(#ty-seal-gold)" />
      <text x="60" y="71" textAnchor="middle" fill="url(#ty-seal-gold)" fontSize="34" fontWeight="500" className="ty-seal-num">
        {number}
      </text>
    </svg>
  );
}
