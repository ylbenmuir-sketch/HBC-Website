/**
 * The sample recording — the bar chart a client receives today — as inline
 * SVG.
 *
 * Supplied by Ben (public/images/brain-map-chart.svg is the file as it
 * arrived, byte for byte) and inlined here rather than loaded as <img>: the
 * SVG names DM Sans in its font-family, which only resolves to the site's
 * loaded face when the markup is in the document, and inlining costs no
 * request. The body below is that file, mechanically converted to JSX
 * (attribute names only); the colours, labels, geometry and layout are the
 * artwork's and are not to be edited here. Regenerate from the file if the
 * artwork changes: strip the fixed width/height, keep the viewBox, add
 * preserveAspectRatio="xMidYMid meet" and the class, camelCase the
 * presentation attributes, and wrap the 21 site labels (the <text> elements
 * at y="509") in `<g className="bmc-sites">`.
 *
 * It fills whatever box it is given (globals.css `.bmc-svg`: width 100%,
 * height from the viewBox ratio) and never scrolls. Below 920px the
 * site-label group is hidden (Ben, 2026-10-13) — at that scale the 21
 * labels collide; the µV axis, the typical-range band and the legend stay,
 * and the SVG's own aria-label still names the 21 sites. See
 * components/BrainMapFigure.tsx.
 */
export default function BrainMapChart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 530" preserveAspectRatio="xMidYMid meet" className="bmc-svg" role="img" aria-label="Sample brain recording. Amplitude in microvolts across 21 recording sites, sorted lowest to highest. Each bar is split into a larger rigidity portion and a smaller flexibility portion. Most sites fall inside the typical range of 10 to 35 microvolts." fontFamily="'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif">
    <rect width="1400" height="530" fill="#FBF8F1"/>
    <rect x="72" y="157.33333333333331" width="1150" height="233.33333333333331" fill="#596E5B" opacity="0.07"/>
    <line x1="72" y1="157.33333333333331" x2="1222" y2="157.33333333333331" stroke="#596E5B" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
    <line x1="72" y1="390.66666666666663" x2="1222" y2="390.66666666666663" stroke="#596E5B" strokeWidth="1" strokeDasharray="4 4" opacity="0.5"/>
    <text x="88" y="199.33333333333331" fill="#596E5B" fontSize="16" fontWeight="500">Typical range</text>
    <text x="88" y="220.33333333333331" fill="#6E7B86" fontSize="14">10–35 µV</text>
    <line x1="72" y1="484" x2="1222" y2="484" stroke="#E6E1D6" strokeWidth="1"/>
    <text x="58" y="489" fill="#6E7B86" fontSize="14" textAnchor="end">0</text>
    <text x="58" y="395.66666666666663" fill="#6E7B86" fontSize="14" textAnchor="end">10</text>
    <line x1="72" y1="297.3333333333333" x2="1222" y2="297.3333333333333" stroke="#E6E1D6" strokeWidth="1"/>
    <text x="58" y="302.3333333333333" fill="#6E7B86" fontSize="14" textAnchor="end">20</text>
    <line x1="72" y1="204" x2="1222" y2="204" stroke="#E6E1D6" strokeWidth="1"/>
    <text x="58" y="209" fill="#6E7B86" fontSize="14" textAnchor="end">30</text>
    <line x1="72" y1="110.66666666666663" x2="1222" y2="110.66666666666663" stroke="#E6E1D6" strokeWidth="1"/>
    <text x="58" y="115.66666666666663" fill="#6E7B86" fontSize="14" textAnchor="end">40</text>
    <text x="24" y="288" fill="#6E7B86" fontSize="14" textAnchor="middle" transform="rotate(-90 24 288)">µV</text>
    <rect x="82.38095238095238" y="366.82" width="34" height="117.18" fill="#1C2B3A"/>
    <path d="M82.38095238095238 343.3333333333333 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v21.48666666666668 h-34 z" fill="#5E8BAA"/>
    <g className="bmc-sites">
      <text x="99.38095238095238" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">T3</text>
    <rect x="137.14285714285714" y="355.48" width="34" height="128.51999999999998" fill="#1C2B3A"/>
    <path d="M137.14285714285714 329.3333333333333 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v24.146666666666704 h-34 z" fill="#5E8BAA"/>
      <text x="154.14285714285714" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Fpz</text>
    <rect x="191.9047619047619" y="349.6" width="34" height="134.39999999999998" fill="#1C2B3A"/>
    <path d="M191.9047619047619 320 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v27.600000000000023 h-34 z" fill="#5E8BAA"/>
      <text x="208.9047619047619" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">F7</text>
    <rect x="246.66666666666666" y="345.8666666666667" width="34" height="138.13333333333333" fill="#1C2B3A"/>
    <path d="M246.66666666666666 315.3333333333333 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v28.53333333333336 h-34 z" fill="#5E8BAA"/>
      <text x="263.66666666666663" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">T6</text>
    <rect x="301.42857142857144" y="342.1333333333333" width="34" height="141.86666666666667" fill="#1C2B3A"/>
    <path d="M301.42857142857144 310.66666666666663 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v29.466666666666697 h-34 z" fill="#5E8BAA"/>
      <text x="318.42857142857144" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Fp1</text>
    <rect x="356.19047619047615" y="340.21999999999997" width="34" height="143.78000000000003" fill="#1C2B3A"/>
    <path d="M356.19047619047615 306 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v32.21999999999997 h-34 z" fill="#5E8BAA"/>
      <text x="373.19047619047615" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">P4</text>
    <rect x="410.95238095238096" y="340.21999999999997" width="34" height="143.78000000000003" fill="#1C2B3A"/>
    <path d="M410.95238095238096 306 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v32.21999999999997 h-34 z" fill="#5E8BAA"/>
      <text x="427.95238095238096" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">T5</text>
    <rect x="465.71428571428567" y="336.5333333333333" width="34" height="147.4666666666667" fill="#1C2B3A"/>
    <path d="M465.71428571428567 301.3333333333333 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v33.19999999999999 h-34 z" fill="#5E8BAA"/>
      <text x="482.71428571428567" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">T4</text>
    <rect x="520.4761904761905" y="332.8466666666667" width="34" height="151.1533333333333" fill="#1C2B3A"/>
    <path d="M520.4761904761905 296.66666666666663 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v34.180000000000064 h-34 z" fill="#5E8BAA"/>
      <text x="537.4761904761905" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Pz</text>
    <rect x="575.2380952380953" y="331.12" width="34" height="152.88" fill="#1C2B3A"/>
    <path d="M575.2380952380953 292 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v37.120000000000005 h-34 z" fill="#5E8BAA"/>
      <text x="592.2380952380953" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Cz</text>
    <rect x="630" y="323.84" width="34" height="160.16000000000003" fill="#1C2B3A"/>
    <path d="M630 282.66666666666663 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v39.173333333333346 h-34 z" fill="#5E8BAA"/>
      <text x="647" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Fp2</text>
    <rect x="684.7619047619047" y="316.55999999999995" width="34" height="167.44000000000005" fill="#1C2B3A"/>
    <path d="M684.7619047619047 273.3333333333333 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v41.22666666666663 h-34 z" fill="#5E8BAA"/>
      <text x="701.7619047619047" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">C4</text>
    <rect x="739.5238095238095" y="311.52" width="34" height="172.48000000000002" fill="#1C2B3A"/>
    <path d="M739.5238095238095 264 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v45.51999999999998 h-34 z" fill="#5E8BAA"/>
      <text x="756.5238095238095" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">O2</text>
    <rect x="794.2857142857143" y="304.3333333333333" width="34" height="179.66666666666669" fill="#1C2B3A"/>
    <path d="M794.2857142857143 254.66666666666666 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v47.66666666666666 h-34 z" fill="#5E8BAA"/>
      <text x="811.2857142857143" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">C3</text>
    <rect x="849.047619047619" y="297.14666666666665" width="34" height="186.85333333333335" fill="#1C2B3A"/>
    <path d="M849.047619047619 245.33333333333331 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v49.81333333333333 h-34 z" fill="#5E8BAA"/>
      <text x="866.047619047619" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Oz</text>
    <rect x="903.8095238095237" y="288.93333333333334" width="34" height="195.06666666666666" fill="#1C2B3A"/>
    <path d="M903.8095238095237 231.33333333333331 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v55.60000000000002 h-34 z" fill="#5E8BAA"/>
      <text x="920.8095238095237" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">F3</text>
    <rect x="958.5714285714286" y="278.2933333333333" width="34" height="205.7066666666667" fill="#1C2B3A"/>
    <path d="M958.5714285714286 217.33333333333331 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v58.95999999999998 h-34 z" fill="#5E8BAA"/>
      <text x="975.5714285714286" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">F4</text>
    <rect x="1013.3333333333334" y="267.6533333333333" width="34" height="216.3466666666667" fill="#1C2B3A"/>
    <path d="M1013.3333333333334 203.33333333333331 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v62.31999999999999 h-34 z" fill="#5E8BAA"/>
      <text x="1030.3333333333335" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">Fz</text>
    <rect x="1068.095238095238" y="256.5" width="34" height="227.5" fill="#1C2B3A"/>
    <path d="M1068.095238095238 184.66666666666663 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v69.83333333333337 h-34 z" fill="#5E8BAA"/>
      <text x="1085.095238095238" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">F8</text>
    <rect x="1122.8571428571427" y="238.99999999999997" width="34" height="245.00000000000003" fill="#1C2B3A"/>
    <path d="M1122.8571428571427 161.33333333333331 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v75.66666666666666 h-34 z" fill="#5E8BAA"/>
      <text x="1139.8571428571427" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">P3</text>
    <rect x="1177.6190476190475" y="221.54666666666668" width="34" height="262.4533333333333" fill="#1C2B3A"/>
    <path d="M1177.6190476190475 133.33333333333331 a4 4 0 0 1 4 -4 h26 a4 4 0 0 1 4 4 v86.21333333333337 h-34 z" fill="#5E8BAA"/>
      <text x="1194.6190476190475" y="509" fill="#6E7B86" fontSize="14" textAnchor="middle">O1</text>
    </g>
    <line x1="72" y1="484" x2="1222" y2="484" stroke="#1C2B3A" strokeWidth="1" opacity="0.3"/>
    <line x1="1219.6190476190475" y1="175.44" x2="1241.6190476190475" y2="175.44" stroke="#5E8BAA" strokeWidth="2"/>
    <text x="1249.6190476190475" y="180.44" fill="#1C2B3A" fontSize="15" fontWeight="500">Flexibility</text>
    <line x1="1219.6190476190475" y1="352.7733333333333" x2="1241.6190476190475" y2="352.7733333333333" stroke="#1C2B3A" strokeWidth="2"/>
    <text x="1249.6190476190475" y="357.7733333333333" fill="#1C2B3A" fontSize="15" fontWeight="500">Rigidity</text>
    <text x="24" y="40" fill="#1C2B3A" fontSize="18" fontWeight="600">Sample recording — 21 sites</text>
    <text x="24" y="63" fill="#6E7B86" fontSize="14.5">Each bar is one site. Taller means more electrical activity.</text>
    <rect x="1072" y="33" width="13" height="13" rx="2.5" fill="#1C2B3A"/>
    <text x="1093" y="44" fill="#1C2B3A" fontSize="15">Rigidity</text>
    <rect x="1176" y="33" width="13" height="13" rx="2.5" fill="#5E8BAA"/>
    <text x="1197" y="44" fill="#1C2B3A" fontSize="15">Flexibility</text>
    </svg>
  );
}
