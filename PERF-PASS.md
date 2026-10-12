# Performance pass — JavaScript and everything around it

Measured and changed 2026-10-11/12 on `origin/main` (2891473), branch `perf/js-pass`, worktree `/Users/benmuir/Code/hbc-seo-batch-4`. Both rules in the brief were kept: nothing here was chosen because Lighthouse liked it, and `experimental.inlineCss` was not re-run.

**Two builds were measured throughout**, because the site ships with the assistant off and the brief asks what the assistant costs: *flag off* (`NEXT_PUBLIC_FEATURE_ASSISTANT` unset, the shipping default) and *flag on*. Every table says which.

## 0. The answer in one paragraph

Real throttled LCP is 680–880 ms on 43 of 44 routes and it is at the floor: text-LCP pages take two round trips plus the stylesheet, image-LCP pages ~100 ms more, and no JavaScript is on that path. The one exception was `/about/founder` at 1,584 ms — a lazy-loaded LCP portrait — now 756–772 ms. JavaScript costs this site interactivity, not paint: the header and ask bar start answering presses at 1.5–1.9 s on the throttled phone, and that time is set by ~135 kB of gzipped JS over a 1.6 Mbps line, not by hydration work (TBT ≈ 0, hydration ~60–100 ms at 4× CPU). The assistant was not the separate chunk the layout comment claimed — Turbopack had folded it into the chunk every page hydrates, flag on *or off* — and it is now a 2.9 kB gz chunk loaded at idle. Everything else that would move a real number changes something a visitor sees or feels, and those are in Bucket B with their measured cost. Lighthouse's 2.4–3.1 s LCP is Lantern; it did not move and it was not supposed to.

## 1. Baseline — every route, before any change (flag off = the shipping default)

check:cwv mobile profile: 412×823, 4× CPU, 1.6 Mbps / 150 ms RTT, cache off, median of 3. JS columns from a single CDP trace on the same profile (eval = top-level script evaluation; hydrate/run = FunctionCall + timers + microtasks + rAF + events at 4× CPU). RSC prefetch = `?_rsc=` payloads fetched at load, and after a full slow scroll.

| route | LCP ms | LCP element | CLS | TBT ms | kB (incl. scroll prefetch) | flag-on LCP | JS kB gz | JS files | eval ms | hydrate/run ms | long tasks | prefetch @load | prefetch after scroll | DOM nodes | hydrated at (ms) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| / | 832 | img | 0 | 50 | 495 | 860 | 145 | 11 | 63.7 | 101 | 2 | 2 / 13 kB | 17 / 118 kB | 558 | 1936 |
| /what-we-help-with | 696 | p.sub | 0 | 0 | 464 | 680 | 142 | 10 | 54.2 | 77 | 0 | 3 / 23 kB | 17 / 117 kB | 419 | 1726 |
| /adults | 708 | p.sub | 0 | 0 | 393 | 688 | 137 | 10 | 49.1 | 75 | 0 | 2 / 14 kB | 13 / 89 kB | 295 | 1781 |
| /children-families | 684 | p.sub | 0 | 0 | 304 | 688 | 137 | 10 | 52.2 | 71 | 0 | 3 / 20 kB | 3 / 20 kB | 257 | 1575 |
| /lens-neurofeedback | 708 | h1 | 0.0037 | 0 | 535 | 688 | 145 | 11 | 58.6 | 99 | 1 | 2 / 16 kB | 24 / 168 kB | 454 | 1869 |
| /how-lens-works | 692 | h1 | 0 | 0 | 384 | 684 | 145 | 11 | 55.1 | 58 | 1 | 2 / 16 kB | 6 / 46 kB | 334 | 1843 |
| /brain-map | 768 | p.sub | 0 | 0 | 333 | 752 | 145 | 11 | 55.1 | 71 | 0 | 2 / 16 kB | 5 / 37 kB | 335 | 1815 |
| /first-visit | 696 | h1 | 0 | 0 | 306 | 680 | 145 | 11 | 52.4 | 82 | 0 | 2 / 16 kB | 6 / 47 kB | 288 | 1621 |
| /about | 696 | p.sub | 0 | 0 | 340 | 680 | 142 | 10 | 53.7 | 76 | 0 | 1 / 10 kB | 4 / 27 kB | 287 | 1850 |
| /about/founder | 1584 | img | 0 | 1 | 286 | 1596 | 134 | 9 | 81 | 135 | 2 | 1 / 6 kB | 3 / 18 kB | 238 | 1713 |
| /about/team | 692 | p.sub | 0 | 0 | 273 | 680 | 134 | 9 | 51.6 | 69 | 0 | 1 / 6 kB | 3 / 17 kB | 254 | 1643 |
| /locations | 692 | h1 | 0 | 0 | 319 | 680 | 142 | 10 | 54.8 | 74 | 1 | 1 / 10 kB | 5 / 40 kB | 270 | 1651 |
| /concierge | 772 | p.sub | 0 | 0 | 335 | 760 | 145 | 11 | 57.3 | 77 | 1 | 3 / 22 kB | 5 / 38 kB | 345 | 1806 |
| /stories | 716 | h1 | 0 | 4 | 320 | 688 | 142 | 10 | 52.4 | 67 | 0 | 1 / 10 kB | 3 / 23 kB | 267 | 1727 |
| /faq | 692 | h1 | 0 | 0 | 261 | 684 | 136 | 9 | 51.3 | 67 | 0 | 1 / 10 kB | 3 / 23 kB | 270 | 1510 |
| /is-lens-safe | 712 | h1 | 0.0008 | 9 | 322 | 692 | 136 | 9 | 53.7 | 64 | 1 | 1 / 10 kB | 5 / 38 kB | 307 | 1711 |
| /contact | 680 | h1 | 0 | 0 | 254 | 704 | 139 | 10 | 52.8 | 66 | 0 | 1 / 10 kB | 2 / 17 kB | 284 | 1539 |
| /resources | 688 | h1 | 0 | 0 | 494 | 688 | 149 | 11 | 50.5 | 75 | 0 | 2 / 18 kB | 12 / 91 kB | 323 | 1900 |
| /privacy-policy | 696 | p.lede | 0 | 0 | 254 | 688 | 136 | 9 | 50.4 | 66 | 0 | 1 / 10 kB | 2 / 16 kB | 258 | 1507 |
| /concerns/anxiety | 732 | img | 0 | 15 | 364 | 740 | 144 | 11 | 50.5 | 73 | 0 | 3 / 22 kB | 10 / 72 kB | 318 | — |
| /concerns/focus-adhd | 744 | img | 0 | 1 | 366 | 740 | 144 | 11 | 56.9 | 79 | 1 | 3 / 22 kB | 10 / 72 kB | 318 | — |
| /concerns/sleep | 736 | img | 0 | 0 | 365 | 744 | 144 | 11 | 60.3 | 79 | 2 | 3 / 22 kB | 10 / 72 kB | 318 | 1802 |
| /concerns/emotional-regulation | 724 | img | 0 | 0 | 332 | 728 | 144 | 11 | 59.4 | 77 | 1 | 3 / 22 kB | 6 / 42 kB | 306 | — |
| /concerns/brain-fog | 796 | img | 0 | 1 | 356 | 796 | 144 | 11 | 52.6 | 78 | 1 | 3 / 22 kB | 7 / 49 kB | 312 | — |
| /concerns/stress-resilience | 752 | img | 0 | 0 | 352 | 756 | 144 | 11 | 54.2 | 64 | 1 | 3 / 22 kB | 8 / 57 kB | 314 | — |
| /concerns/children-school | 876 | img | 0 | 0 | 368 | 876 | 144 | 11 | 54.2 | 76 | 0 | 3 / 22 kB | 8 / 57 kB | 314 | — |
| /concerns/trauma | 728 | img | 0 | 0 | 334 | 736 | 144 | 11 | 52.7 | 74 | 0 | 3 / 22 kB | 6 / 42 kB | 306 | — |
| /concerns/performance | 740 | p.sub | 0 | 0 | 336 | 732 | 144 | 11 | 54.8 | 74 | 0 | 3 / 22 kB | 6 / 42 kB | 306 | — |
| /concerns/concussion | 680 | p | 0 | 0 | 325 | 680 | 141 | 10 | 53.1 | 66 | 0 | 1 / 9 kB | 6 / 42 kB | 306 | — |
| /concerns/migraines | 688 | p | 0 | 1 | 325 | 672 | 141 | 10 | 52.5 | 66 | 0 | 1 / 9 kB | 6 / 42 kB | 300 | — |
| /concerns/depression | 680 | p | 0 | 2 | 324 | 688 | 141 | 10 | 56.9 | 69 | 1 | 1 / 9 kB | 6 / 42 kB | 297 | — |
| /locations/nashville | 780 | h1 | 0.0005 | 0 | 440 | 752 | 137 | 10 | 60.6 | 85 | 1 | 2 / 11 kB | 7 / 49 kB | 371 | 1860 |
| /locations/murfreesboro | 704 | h1 | 0 | 0 | 335 | 684 | 137 | 10 | 58.3 | 73 | 1 | 2 / 11 kB | 7 / 49 kB | 355 | — |
| /locations/franklin | 696 | h1 | 0.0014 | 0 | 287 | 680 | 137 | 10 | 55.8 | 66 | 0 | 2 / 11 kB | 2 / 11 kB | 318 | — |
| /resources/homework-battles | 756 | p.lede | 0 | 0 | 342 | 744 | 141 | 10 | 56.6 | 72 | 0 | 1 / 6 kB | 7 / 47 kB | 266 | 1784 |
| /resources/exhausted-after-eight-hours | 756 | p.lede | 0 | 0 | 332 | 732 | 141 | 10 | 53.8 | 70 | 0 | 1 / 6 kB | 6 / 40 kB | 264 | — |
| /resources/the-3am-waking | 756 | p.lede | 0 | 0 | 333 | 732 | 141 | 10 | 55.4 | 73 | 1 | 1 / 6 kB | 6 / 40 kB | 266 | — |
| /resources/when-sleep-hygiene-isnt-it | 696 | p.lede | 0 | 0 | 322 | 680 | 141 | 10 | 53.4 | 66 | 0 | 1 / 6 kB | 6 / 40 kB | 259 | — |
| /resources/bad-at-school | 696 | p.lede | 0 | 0 | 330 | 680 | 141 | 10 | 53.2 | 66 | 0 | 1 / 6 kB | 7 / 48 kB | 264 | — |
| /resources/the-last-ten-percent | 764 | p.lede | 0 | 0 | 343 | 744 | 141 | 10 | 54.6 | 71 | 0 | 1 / 6 kB | 7 / 47 kB | 266 | — |
| /resources/lens-and-medication | 768 | p.lede | 0 | 0 | 345 | 752 | 141 | 10 | 53.5 | 69 | 0 | 1 / 6 kB | 7 / 49 kB | 263 | — |
| /resources/told-to-just-relax | 772 | p.lede | 0 | 0 | 346 | 760 | 141 | 10 | 51.9 | 67 | 0 | 1 / 6 kB | 6 / 40 kB | 266 | — |
| /resources/braced-for-something | 760 | h1 | 0 | 0 | 334 | 740 | 141 | 10 | 53.8 | 70 | 0 | 1 / 6 kB | 6 / 40 kB | 265 | — |
| /resources/alongside-therapy | 772 | h1 | 0 | 0 | 344 | 760 | 141 | 10 | 52.3 | 68 | 0 | 1 / 6 kB | 6 / 41 kB | 259 | — |

**Desktop** (1440×900, 1× CPU, 10 Mbps / 20 ms), flag off:

| route | LCP ms | LCP element | CLS | TBT | kB |
|---|---|---|---|---|---|
| / | 208 | img | 0 | 0 | 548 |
| /what-we-help-with | 160 | h1 | 0.0002 | 0 | 468 |
| /adults | 272 | img | 0 | 0 | 398 |
| /children-families | 236 | img | 0 | 0 | 306 |
| /lens-neurofeedback | 316 | img | 0 | 0 | 547 |
| /how-lens-works | 160 | h1 | 0.0001 | 0 | 390 |
| /brain-map | 176 | img | 0 | 0 | 335 |
| /first-visit | 244 | img | 0 | 0 | 309 |
| /about | 164 | h1 | 0 | 0 | 351 |
| /about/founder | 272 | img | 0 | 0 | 295 |
| /about/team | 152 | h1 | 0 | 0 | 273 |
| /locations | 164 | h1 | 0 | 0 | 323 |
| /concierge | 184 | img | 0 | 0 | 338 |
| /stories | 176 | h1 | 0 | 0 | 323 |
| /faq | 160 | h1 | 0 | 0 | 261 |
| /is-lens-safe | 160 | h1 | 0.001 | 0 | 322 |
| /contact | 160 | h1 | 0 | 0 | 254 |
| /resources | 164 | h1 | 0 | 0 | 494 |
| /privacy-policy | 156 | h1 | 0 | 0 | 254 |
| /concerns/anxiety | 172 | img | 0 | 0 | 366 |
| /concerns/focus-adhd | 180 | img | 0 | 0 | 368 |
| /concerns/sleep | 164 | img | 0 | 0 | 368 |
| /concerns/emotional-regulation | 168 | img | 0 | 0 | 334 |
| /concerns/brain-fog | 188 | img | 0 | 0 | 362 |
| /concerns/stress-resilience | 180 | img | 0 | 0 | 355 |
| /concerns/children-school | 196 | img | 0 | 0 | 376 |
| /concerns/trauma | 168 | img | 0 | 0 | 336 |
| /concerns/performance | 172 | img | 0 | 0 | 339 |
| /concerns/concussion | 160 | h1 | 0 | 0 | 325 |
| /concerns/migraines | 164 | h1 | 0 | 0 | 325 |
| /concerns/depression | 164 | h1 | 0 | 0 | 324 |
| /locations/nashville | 188 | img | 0.0004 | 0 | 447 |
| /locations/murfreesboro | 164 | h1 | 0.0009 | 0 | 335 |
| /locations/franklin | 168 | h1 | 0.0832 | 0 | 287 |
| /resources/homework-battles | 172 | img | 0 | 0 | 346 |
| /resources/exhausted-after-eight-hours | 172 | img | 0 | 0 | 335 |
| /resources/the-3am-waking | 176 | img | 0 | 0 | 337 |
| /resources/when-sleep-hygiene-isnt-it | 160 | p.lede | 0 | 0 | 322 |
| /resources/bad-at-school | 164 | p.lede | 0 | 0 | 330 |
| /resources/the-last-ten-percent | 184 | img | 0 | 0 | 349 |
| /resources/lens-and-medication | 192 | img | 0 | 0 | 351 |
| /resources/told-to-just-relax | 196 | img | 0 | 0 | 356 |
| /resources/braced-for-something | 176 | img | 0 | 0 | 339 |
| /resources/alongside-therapy | 200 | img | 0 | 0 | 354 |

### Lighthouse 12 mobile, one route per template, before (flag off)

Simulated throttling (Lantern). `blocks` = render-blocking resources Lighthouse names; `phases` = TTFB / load delay / load time / render delay for the LCP element.

| template route | perf | a11y | bp | seo | FCP | LCP | TBT | CLS | LCP element (LH) | phases | blocks | JS kB | JS exec ms | legacy JS kB |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| / | 94 | 100 | 100 | 100 | 1211 | 3071 | 5 | 0.000 | div.hero-grid > div.rv > div.ph > img | 454/33/248/2336 | c90150a4b872ed… 154 ms | 145 | 138 | 13 |
| /about | 96 | 100 | 100 | 100 | 1211 | 2760 | 2 | 0.000 | main#main > section.page-hero > div.wrap > p | 454/0/0/2307 | c90150a4b872ed… 304 ms | 142 | 125 | 13 |
| /about/founder | 97 | 100 | 100 | 100 | 908 | 2529 | 0 | 0.000 | div.wrap > div.rv > div.ph > img | 454/877/240/958 | c90150a4b872ed… 304 ms | 134 | 100 | 13 |
| /about/team | 97 | 100 | 100 | 100 | 907 | 2532 | 0 | 0.000 | main#main > section.page-hero > div.wrap > h | 454/0/0/2079 | c90150a4b872ed… 304 ms | 134 | 99 | 13 |
| /adults | 96 | 100 | 100 | 100 | 1207 | 2678 | 0 | 0.000 | section.page-hero > div.wrap > div.rv > p.su | 452/0/0/2225 | c90150a4b872ed… 302 ms | 137 | 118 | 13 |
| /brain-map | 96 | 100 | 100 | 100 | 1215 | 2817 | 8 | 0.000 | section.page-hero > div.wrap > div.rv > p.su | 455/0/0/2362 | c90150a4b872ed… 305 ms | 145 | 181 | 13 |
| /children-families | 97 | 100 | 100 | 100 | 907 | 2530 | 0 | 0.000 | section.page-hero > div.wrap > div.rv > p.su | 453/0/0/2076 | c90150a4b872ed… 303 ms | 137 | 98 | 13 |
| /concerns/sleep | 96 | 100 | 100 | 100 | 1207 | 2759 | 1 | 0.000 | div.wrap > div.rv > div.ph > img | 452/150/263/1893 | c90150a4b872ed… 302 ms | 144 | 121 | 13 |
| /concierge | 96 | 100 | 100 | 100 | 1207 | 2757 | 0 | 0.000 | section.page-hero > div.wrap > div.rv > p.su | 452/0/0/2305 | c90150a4b872ed… 302 ms | 145 | 113 | 13 |
| /contact | 98 | 100 | 100 | 100 | 904 | 2452 | 0 | 0.000 | main#main > section.page-hero > div.wrap > h | 452/0/0/2000 | c90150a4b872ed… 302 ms | 139 | 96 | 13 |
| /faq | 98 | 100 | 100 | 100 | 905 | 2451 | 0 | 0.000 | main#main > section.page-hero > div.wrap > h | 452/0/0/1998 | c90150a4b872ed… 302 ms | 136 | 95 | 13 |
| /first-visit | 97 | 100 | 100 | 100 | 909 | 2533 | 0 | 0.000 | section.page-hero > div.wrap > div.rv > h1 | 455/0/0/2079 | c90150a4b872ed… 305 ms | 145 | 108 | 13 |
| /how-lens-works | 96 | 100 | 100 | 100 | 1211 | 2711 | 14 | 0.000 | main#main > section.page-hero > div.wrap > h | 454/0/0/2257 | c90150a4b872ed… 304 ms | 145 | 167 | 13 |
| /is-lens-safe | 97 | 100 | 100 | 100 | 1206 | 2600 | 0 | 0.001 | main#main > section.page-hero > div.wrap > h | 452/0/0/2148 | c90150a4b872ed… 302 ms | 136 | 105 | 13 |
| /lens-neurofeedback | 95 | 100 | 100 | 100 | 1210 | 2830 | 0 | 0.004 | section.page-hero > div.wrap > div.rv > h1 | 453/0/0/2376 | c90150a4b872ed… 153 ms | 145 | 119 | 13 |
| /locations | 97 | 100 | 100 | 100 | 905 | 2528 | 0 | 0.000 | main#main > section.page-hero > div.wrap > h | 453/0/0/2076 | c90150a4b872ed… 303 ms | 142 | 101 | 13 |
| /locations/nashville | 94 | 100 | 100 | 100 | 1206 | 3053 | 0 | 0.001 | section.page-hero > div.wrap > div.rv > h1 | 452/0/0/2601 | c90150a4b872ed… 152 ms | 137 | 112 | 13 |
| /privacy-policy | 98 | 100 | 100 | 100 | 904 | 2459 | 3 | 0.000 | section.sec-tight > div.wrap > div.rv > p.le | 452/0/0/2007 | c90150a4b872ed… 302 ms | 136 | 112 | 13 |
| /resources | 96 | 100 | 100 | 100 | 1205 | 2751 | 0 | 0.000 | main#main > section.page-hero > div.wrap > h | 452/0/0/2299 | c90150a4b872ed… 302 ms | 149 | 119 | 13 |
| /resources/homework-battles | 96 | 100 | 100 | 100 | 1207 | 2755 | 0 | 0.000 | section.sec-tight > div.wrap > div.rv > p.le | 452/0/0/2303 | c90150a4b872ed… 302 ms | 141 | 97 | 13 |
| /stories | 97 | 100 | 100 | 100 | 1211 | 2621 | 7 | 0.000 | main#main > section.page-hero > div.wrap > h | 454/0/0/2168 | c90150a4b872ed… 304 ms | 142 | 124 | 13 |
| /what-we-help-with | 95 | 100 | 100 | 100 | 1213 | 2840 | 3 | 0.000 | section.page-hero > div.wrap > div.rv > p.su | 454/0/0/2385 | c90150a4b872ed… 154 ms | 142 | 124 | 13 |


## 2. Where the time actually goes

### 2.1 LCP — the critical path has no JavaScript on it

On the throttled phone profile (412 px, 4× CPU, 1.6 Mbps / 150 ms RTT):

- **Text-LCP pages (29 of 44)** paint at 680–790 ms. That is: ~150 ms RTT to the HTML, 19–25 kB gzipped HTML over 1.6 Mbps, a second RTT for the 15 kB render-blocking stylesheet, then layout. The only way under it is to inline the CSS — the experiment Rule 2 retired — or a faster line.
- **Image-LCP pages (14 of 44)** paint at 730–880 ms: the hero image is discovered from the `<link rel=preload imagesrcset>` in the head, requested at high priority, and shares the pipe with two preloaded font files (75 kB). It lands ~100 ms behind the text pages.
- **`/about/founder`** was the outlier at 1,584 ms: its portrait is the LCP element at phone width and it was the one hero on the site still shipping `loading="lazy"` with no preload. Fixed (Bucket A).
- Every script tag is `async`; hydration begins after LCP on every template and the traces show no long task before paint. The `.rv` reveal gate exempts the first viewport (audit 3's fix), and the MutationObserver fires 1–2 times per page load at 0.0–0.9 ms.

Lighthouse (Lantern) reports the same pages at 2,450–3,070 ms with a **2.0–2.6 s "render delay" on text elements** that real Chrome paints at 700 ms. That is the documented Lantern artefact: it routes paint through the JS dependency graph. After the changes it reads 2,450–3,074 ms, i.e. unchanged within its own noise, and on `/about/founder` it reads 150 ms *worse* while `check:cwv` reads 840 ms better. Rule 1 says that is the right trade, and it was made.

### 2.2 JavaScript — what hydrates, and why

Per route at load (flag off): 134–149 kB gzipped in 9–11 files. Of that, ~121 kB is runtime the site does not author — React DOM (59.6 kB), the App Router (25.1 kB), next/link + next/image client code and the Turbopack runtime (~29 kB) — and ~13 kB is the layout's client components. Page-level client code is 3–8 kB and only on `/`, `/contact`, concern pages and `/resources`.

Main-thread cost at 4× CPU: script evaluation 50–64 ms, hydration and everything else that runs 60–110 ms, 0–2 long tasks, TBT 0–50 ms (home). Unthrottled that is ~30–40 ms total. There is no hydration problem to solve.

Which client components could be server components — each one checked:

| component | verdict | why |
|---|---|---|
| `Header` | stays client | burger/drawer state, scroll-hide, `usePathname` for the active link, Escape handling. Splitting it into a server shell with client islands saves nothing measurable: every `<Link>` inside it is already a client component, and the Header's own code is ~3 kB gz. |
| `FooterGroup` ×4 | stays | a mobile disclosure; a native `<details>` would be ~0.5 kB lighter and risks a visible difference in the `+` mark and motion. Not worth it. |
| `RevealOnScroll` | stays | it is the reveal. Cost measured: 1–2 MutationObserver callbacks and ~100 IntersectionObserver callbacks over a full scroll, 17–25 ms total at 4× CPU. |
| `BottomBarContext` / `BottomBarDock` / `StickyAskBar` | stays | the ask bar is server-rendered and must be interactive; with the flag off the Dock renders null and only `MobileCtaBar` (home) registers. |
| `Analytics` | stays | renders null without `NEXT_PUBLIC_GA_ID`; it shares the layout chunk so gating it saves no bytes. |
| `ConcernRail`, `MobileCtaBar`, `GuideCta`, `ContactForm` | stay | scroll state, portal, forms. GuideCta's heading could be server-rendered but its strings would just move from the chunk to the RSC payload. |
| `SiteAssistant` | **was the finding** | see 2.3. |

### 2.3 The chat widget, measured

- **Flag off vs on, same code:** identical JS bytes (145 kB vs 145 kB on `/`), identical file count, hydration 1,936 vs 1,937 ms on `/`, LCP within ±28 ms on every route. The only measurable fingerprint of the flag is **CLS 0.020 on every route** — the ask bar's collapse/expand animation during the scroll pass (documented in `check-cwv.mjs`); one of three homepage runs caught it at 0.138.
- **Why identical:** `app/layout.tsx` imported SiteAssistant with `next/dynamic` and the comment said "split into its own chunk". Under Turbopack a dynamic component rendered from a server layout is a client reference in the page's RSC payload, and the bundler put it in the **layout chunk**: 37,580 bytes with the flag off, 37,536 with it on — the 44-byte difference is the flag literal. The assistant's code shipped and parsed on every page in both states. The "never requested while the flag is false" claim in that comment was wrong.
- **Now:** `components/AssistantLoader.tsx` holds a client-side `import("./SiteAssistant")` fired by `requestIdleCallback` (3 s timeout) or immediately when the ask bar posts an `assistantRequest`. The panel is a 7.5 kB / 2.9 kB gz chunk; the layout chunk is 29.5 kB / 10.1 kB gz (was 37.5 / 12.3). With the flag off the chunk is never fetched. Hydration lands 13 ms earlier (median of 22 templates), the ask bar is ready 19 ms earlier, shared first-load JS 142 → 139 kB. Nothing visible changes: SiteAssistant already rendered null until idle + 1.4 s, and the panel's markup only exists once opened.
- **Deferring it to the first interaction instead** (never download unless someone presses the bar) would save the 2.9 kB on ~every page view at the cost of a cold tap waiting on a round trip and, on iOS, the composer focusing outside the tap gesture (keyboard does not rise). That is Bucket B, item 6.

### 2.4 Reveal/MutationObserver and the mega menu

Negligible, measured: MutationObserver 1–2 callbacks, 0.0–1.0 ms per route over a full scroll; IntersectionObserver ~100 callbacks, 17–25 ms at 4× CPU, spread across the scroll. The mega menu is CSS-driven; its cost is DOM, not JS — 64 chrome links plus the drawer's duplicate set put 106 anchors in 558 nodes on `/`, and the HTML is 88 kB raw / 19 kB gzipped, of which 51 kB raw is the inlined RSC payload the App Router needs. Nothing to fix without changing the nav.

### 2.5 Fonts

Three WOFF2 files load on every first visit: Cormorant upright (37.8 kB, preloaded), DM Sans (37.0 kB, preloaded), Cormorant italic (39.3 kB, on demand for one hero phrase). `display: swap` means **no invisible-text window**. `check:fonts`: **no first-viewport heading reflows at any mobile width** on any route; body copy below the fold rewraps on 5 pages (reported, not gated). One desktop-only exception found: `/locations/franklin` at 1440 px, whose H1 is 83 px taller in the fallback face — the 0.083 desktop CLS in the baseline table. Mobile is clean.

The preloads cost LCP, because 75 kB of fonts share the 1.6 Mbps pipe with the stylesheet and the hero image. Measured by stripping the two preload tags from the served HTML (fonts still load from the CSS): LCP −120 to −200 ms on every template — and CLS 0.118 on `/`, 0.029 on `/about`, with a visible swap on every first visit. Dropping only the serif preload: −10 to −30 ms, no CLS. Bucket B, item 1.

### 2.6 Route prefetching

Chrome links already have `prefetch={false}` (audit 2). In-content links do not, and they are what fires: at load, 1–3 RSC payloads (6–23 kB); **after a full scroll, 2–24 payloads, 11–168 kB** per page view (`/lens-neurofeedback` 24 / 168 kB, `/` 17 / 118 kB, `/what-we-help-with` 17 / 117 kB, `/resources` 12 / 91 kB, concern pages 6–10 / 42–72 kB). Prefetch also pulls the target route's page chunk, which is why `/contact`'s form chunk (3 kB) appears on every page with a "Get a Free Call Today" link in view and the homepage's chunk appears on `/faq` via the breadcrumb. On a 1.6 Mbps line 168 kB is ~0.8 s of bandwidth spent while the visitor is scrolling past lazy images.

What it buys: a prefetched tap reaches the new page in **25–44 ms**; a cold tap takes **220–390 ms** (the concern payload is the big one). A real finger gets a `touchstart` prefetch ~100 ms before the click, so the felt difference with viewport prefetch off would be roughly 120–300 ms. Bucket B, item 2.

### 2.7 Caching and the build

- Optimized images (`/_next/image`) were served `Cache-Control: public, max-age=60` — Next's default `minimumCacheTTL`. A returning visitor revalidated every photo after a minute. Fixed (Bucket A): 31 days.
- Fonts, JS and OG images were already immutable. HTML is gzipped by `next start` (no Brotli; Vercel adds it).
- The `noModule` polyfill chunk (39 kB gz) is not fetched by any modern browser. Lighthouse's "13 kB legacy JavaScript" is inside Next's own React DOM chunk (`Array.prototype.at`, `flat`, `Object.fromEntries`…) and no `browserslist` setting reaches it.
- **webpack vs Turbopack:** the same HEAD built with `next build` (no `--turbopack`) ships 10–14 kB gz less JS per route (home 145 → 131 kB), hydrates 30 ms earlier (median), with LCP unchanged. Not switched: it is the build every script and doc assumes, and the first webpack build in this sandbox died inside `next/font`'s Google loader (a null regex match on a font URL) before succeeding on the retry. Bucket B, item 4, because it is a tooling decision rather than a visual one.

## 3. Bucket A — applied

| # | change | files | measured saving |
|---|---|---|---|
| A1 | Load the assistant's chunk at idle (or on the first ask-bar request), not at hydration | `components/AssistantLoader.tsx` (new), `app/layout.tsx` | layout chunk 12.3 → 10.1 kB gz on every page, both flag states; assistant 2.9 kB gz chunk only fetched with the flag on, at idle; hydration −13 ms, ask bar ready −19 ms (median, flag on); flag-off transfer −2 kB median. Behaviour: identical, with one edge noted in the file — a tap in the few hundred ms between hydration and the idle import opens the panel when the chunk lands rather than inside the gesture. |
| A2 | `priority` on the `/about/founder` portrait | `app/about/founder/page.tsx` | LCP **1,584 → 756 ms** (flag on) / **772 ms** (flag off); TBT 79 → 0 in the trace. |
| A3 | `images.minimumCacheTTL: 2678400` | `next.config.ts` | `/_next/image` responses `max-age=60` → 31 days; no first-visit change, repeat visits stop revalidating every photo. Replace an image by changing its filename, or wait a month. |

Not changed, having looked: `browserslist` (would not touch the 13 kB that Lighthouse flags), gating `Analytics` or `StickyAskBar` behind their flags at the layout (same chunk, zero bytes), splitting `Header`/`GuideCta` into server shells (zero bytes), `SHOW_LEGACY_LAUNCHER`'s retired pill (kept deliberately by the previous pass; a few hundred bytes).

## 4. Bucket B — Ben decides

Ranked by milliseconds saved per unit of what the visitor loses. All numbers are the throttled phone profile.

| rank | change | saves | what the visitor loses |
|---|---|---|---|
| 1 | **Viewport prefetch off for in-content links** (`prefetch={false}` on `Btn`, `ConcernCard`, `ReadMore`, breadcrumb and related links; hover/touch prefetch stays) | 11–168 kB per fully scrolled page view (median ~45 kB); on `/` and `/lens-neurofeedback` that is 0.6–0.8 s of a 1.6 Mbps line no longer spent during the scroll | a tap on a link that was never hovered/touched waits 220–390 ms instead of 25–44 ms; a real finger's `touchstart` prefetch recovers ~100 ms of that. Desktop with a mouse: nearly nothing, the hover prefetch remains. |
| 2 | **Drop the two font preloads** (`preload: false` on Cormorant upright and DM Sans) | LCP −120 to −200 ms on every template (/: 828 → 704; sleep 744 → 604; nashville 780 → 628; article 792 → 588; about 704 → 532) | fallback fonts visible for ~0.5–1 s on every first visit; body copy shifts as DM Sans swaps — CLS 0.118 on `/` (over the 0.1 bar), 0.029 on `/about`, 0.013 on concern pages. Headings hold (tuned fallback). **Not recommended** as-is. |
| 3 | **Drop only the serif preload** | LCP −10 to −30 ms | headings swap visibly, body copy does not; no CLS. Not worth it. |
| 4 | **Build with webpack** (`"build": "next build"`) | −10–14 kB gz JS per route, hydration −30 ms median, last JS byte −60–120 ms | nothing visible. Changes the build tool for dev and CI; one transient `next/font` loader failure seen. |
| 5 | **Shorten or rewrap the `/locations/franklin` H1 at desktop** | desktop CLS 0.083 → ~0 on that page | the sentence as written (the H1 is 83 px taller in the fallback face at 1440 px, the one heading the sitewide `size-adjust` does not hold); mobile is already clean. Content call. |
| 6 | **Load the assistant only on first interaction** (never at idle) | 2.9 kB gz on every page view where nobody opens it | the first tap on the ask bar waits ~150–300 ms for the chunk and, on iOS, the composer focuses outside the gesture so the keyboard does not rise on that press. |
| 7 | **Animate the ask bar's collapse with `transform` instead of width/min-height** | CLS 0.020 → 0 on every route with the flag on (one run hit 0.138) | the pill would scale rather than reflow; its text and icon would look slightly different mid-transition. |
| 8 | **Drop the Cormorant italic face** (upright or synthesized italic for the one accent phrase per hero) | 39 kB on first visit, off the critical path (it loads after LCP) | the real italic. Mentioned for completeness; it does not move LCP. |

Hero image quality/size (`q=75`, AVIF, 13.8 kB at 640 w) and the reveal fade were looked at and left alone: the image is already small and the fade is exempt above the fold.

## 5. The ceiling, plainly

Every template except the founder page was already as fast as it needs to be for a real visitor, and the founder page now is. The remaining 680–880 ms is the network model: two round trips at 150 ms, the HTML, and a 15 kB stylesheet, on a line that moves 200 kB/s. The JavaScript on this site is cheap enough that the trace cannot find 50 ms of hydration to save on any route, and TBT rounds to zero. Lighthouse will keep saying 2.5–3 s and will keep being wrong about why.

## 6. What this cannot tell you

Everything here is lab. The throttle is one phone profile and one network, TTFB is 2–10 ms on localhost where production will add 20–300 ms per request, and there is no field CrUX until the domain moves. The two things most likely to differ in the field: real TTFB (which adds to every LCP figure above, equally) and HTTP/2 prioritisation on Vercel, which may blunt the font-preload contention measured in 2.5. The before/after deltas are robust; the absolute numbers are a floor.

## 7. Verification after Bucket A

Run on the worktree at `776ffdd` (three commits above `origin/main` 2891473), production builds via `npm run build` (Turbopack), served by `next start -p 3123`.

| check | result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run build` (flag off) | ok — shared first-load JS 142 → 139 kB |
| `npm run build` (flag on) | ok — assistant in its own 2.9 kB gz chunk, layout chunk 12.3 → 10.1 kB gz |
| `check:cwv`, all 44 routes, flag off | every route inside the mobile budget; LCP 672–876 ms, `/about/founder` 1,584 → 772 ms, median LCP delta 0, median transfer −2 kB |
| `check:cwv`, all 44 routes, flag on | every route inside the mobile budget; `/about/founder` 1,596 → 756 ms, median LCP delta 0 |
| Lighthouse 12 mobile, 22 templates, both states | perf 94–98, a11y / best-practices / SEO 100 everywhere; LCP 2,448–3,074 ms — unchanged within Lantern's noise (founder reads +150 ms while real paint reads −840 ms) |
| `check:fonts`, both states | no first-viewport heading reflows at any mobile width |
| `check:links` | every route has at least two in-content inbound links |
| `check:schema` | 44 routes, one @graph each, anchored, typed, every reference named |
| `check:index` | bylines and testimonials clean |
| `check:answers -- --retrieval` | all guardrails hold (the answer half needs a live route with an API key — not run) |
| `check:chat` | **not run**: it inserts two consultation rows and sends two notification emails per run, needs the assistant live on :3000 with an API key, and nothing in this pass touches the chat path |
| `check:layout` | 176 page/width combinations audited: no clipped text, no overlap, nothing past the viewport |

The full 44-route before/after and the per-template hydration and Lighthouse tables follow.

## 8. Before / after — all 44 routes, check:cwv mobile, both flag states

| route | OFF LCP before → after | OFF TBT | OFF CLS | OFF kB | ON LCP before → after | ON TBT | ON CLS | ON kB |
|---|---|---|---|---|---|---|---|---|
| / | 832 → 840 (+8) | 50 → 34 | 0 → 0 | 495 → 493 | 860 → 848 (-12) | 74 → 42 | 0.0197 → 0.0197 | 496 → 497 |
| /what-we-help-with | 696 → 704 (+8) | 0 → 0 | 0 → 0 | 464 → 462 | 680 → 688 (+8) | 0 → 0 | 0.0197 → 0.0197 | 466 → 466 |
| /adults | 708 → 692 (-16) | 0 → 0 | 0 → 0 | 393 → 390 | 688 → 684 (-4) | 0 → 0 | 0.0197 → 0.0197 | 394 → 394 |
| /children-families | 684 → 692 (+8) | 0 → 0 | 0 → 0 | 304 → 302 | 688 → 684 (-4) | 0 → 3 | 0.0197 → 0.0197 | 305 → 306 |
| /lens-neurofeedback | 708 → 704 (-4) | 0 → 0 | 0.0037 → 0.0037 | 535 → 532 | 688 → 684 (-4) | 2 → 0 | 0.0234 → 0.0234 | 537 → 537 |
| /how-lens-works | 692 → 704 (+12) | 0 → 0 | 0 → 0 | 384 → 382 | 684 → 688 (+4) | 0 → 0 | 0.0197 → 0.0197 | 386 → 386 |
| /brain-map | 768 → 764 (-4) | 0 → 0 | 0 → 0 | 333 → 330 | 752 → 748 (-4) | 0 → 0 | 0.0197 → 0.0197 | 334 → 335 |
| /first-visit | 696 → 696 (+0) | 0 → 0 | 0 → 0 | 306 → 303 | 680 → 688 (+8) | 0 → 0 | 0.0197 → 0.0197 | 306 → 307 |
| /about | 696 → 692 (-4) | 0 → 0 | 0 → 0 | 340 → 337 | 680 → 684 (+4) | 0 → 0 | 0.0197 → 0.0197 | 340 → 341 |
| /about/founder | 1584 → 772 (-812) | 1 → 0 | 0 → 0 | 286 → 284 | 1596 → 756 (-840) | 4 → 0 | 0.0197 → 0.0197 | 286 → 288 |
| /about/team | 692 → 692 (+0) | 0 → 0 | 0 → 0 | 273 → 271 | 680 → 680 (+0) | 0 → 0 | 0.0197 → 0.0197 | 274 → 275 |
| /locations | 692 → 696 (+4) | 0 → 0 | 0 → 0 | 319 → 317 | 680 → 684 (+4) | 0 → 0 | 0.0197 → 0.0197 | 320 → 321 |
| /concierge | 772 → 772 (+0) | 0 → 0 | 0 → 0 | 335 → 333 | 760 → 772 (+12) | 0 → 0 | 0.0197 → 0.0197 | 336 → 337 |
| /stories | 716 → 720 (+4) | 4 → 0 | 0 → 0 | 320 → 318 | 688 → 692 (+4) | 11 → 10 | 0.0197 → 0.0197 | 320 → 321 |
| /faq | 692 → 692 (+0) | 0 → 0 | 0 → 0 | 261 → 259 | 684 → 688 (+4) | 0 → 0 | 0.0197 → 0.0197 | 262 → 263 |
| /is-lens-safe | 712 → 700 (-12) | 9 → 0 | 0.0008 → 0.0008 | 322 → 320 | 692 → 684 (-8) | 14 → 0 | 0.0204 → 0.0204 | 323 → 324 |
| /contact | 680 → 684 (+4) | 0 → 0 | 0 → 0 | 254 → 252 | 704 → 684 (-20) | 37 → 0 | 0.0197 → 0.0197 | 255 → 256 |
| /resources | 688 → 680 (-8) | 0 → 0 | 0 → 0 | 494 → 492 | 688 → 688 (+0) | 0 → 0 | 0.0197 → 0.0197 | 496 → 496 |
| /privacy-policy | 696 → 688 (-8) | 0 → 0 | 0 → 0 | 254 → 251 | 688 → 680 (-8) | 0 → 0 | 0.0197 → 0.0197 | 254 → 255 |
| /concerns/anxiety | 732 → 736 (+4) | 15 → 0 | 0 → 0 | 364 → 362 | 740 → 732 (-8) | 0 → 0 | 0.0197 → 0.0197 | 365 → 366 |
| /concerns/focus-adhd | 744 → 748 (+4) | 1 → 0 | 0 → 0 | 366 → 364 | 740 → 744 (+4) | 0 → 0 | 0.0197 → 0.0197 | 367 → 368 |
| /concerns/sleep | 736 → 740 (+4) | 0 → 0 | 0 → 0 | 365 → 363 | 744 → 744 (+0) | 0 → 0 | 0.0197 → 0.0197 | 366 → 367 |
| /concerns/emotional-regulation | 724 → 724 (+0) | 0 → 0 | 0 → 0 | 332 → 330 | 728 → 728 (+0) | 0 → 0 | 0.0197 → 0.0197 | 333 → 334 |
| /concerns/brain-fog | 796 → 796 (+0) | 1 → 0 | 0 → 0 | 356 → 354 | 796 → 796 (+0) | 0 → 0 | 0.0197 → 0.0197 | 357 → 358 |
| /concerns/stress-resilience | 752 → 744 (-8) | 0 → 0 | 0 → 0 | 352 → 350 | 756 → 752 (-4) | 0 → 0 | 0.0197 → 0.0197 | 353 → 354 |
| /concerns/children-school | 876 → 876 (+0) | 0 → 0 | 0 → 0 | 368 → 366 | 876 → 876 (+0) | 0 → 0 | 0.0197 → 0.0197 | 369 → 370 |
| /concerns/trauma | 728 → 728 (+0) | 0 → 0 | 0 → 0 | 334 → 331 | 736 → 736 (+0) | 0 → 0 | 0.0197 → 0.0197 | 334 → 335 |
| /concerns/performance | 740 → 748 (+8) | 0 → 0 | 0 → 0 | 336 → 334 | 732 → 740 (+8) | 0 → 0 | 0.0197 → 0.0197 | 337 → 338 |
| /concerns/concussion | 680 → 680 (+0) | 0 → 0 | 0 → 0 | 325 → 322 | 680 → 688 (+8) | 0 → 0 | 0.0197 → 0.0197 | 326 → 327 |
| /concerns/migraines | 688 → 680 (-8) | 1 → 0 | 0 → 0 | 325 → 323 | 672 → 684 (+12) | 0 → 0 | 0.0197 → 0.0197 | 326 → 327 |
| /concerns/depression | 680 → 684 (+4) | 2 → 0 | 0 → 0 | 324 → 322 | 688 → 688 (+0) | 0 → 0 | 0.0197 → 0.0197 | 325 → 326 |
| /locations/nashville | 780 → 776 (-4) | 0 → 0 | 0.0005 → 0.0005 | 440 → 438 | 752 → 760 (+8) | 24 → 0 | 0.0202 → 0.0202 | 442 → 442 |
| /locations/murfreesboro | 704 → 700 (-4) | 0 → 0 | 0 → 0 | 335 → 332 | 684 → 684 (+0) | 0 → 0 | 0.0197 → 0.0197 | 336 → 336 |
| /locations/franklin | 696 → 704 (+8) | 0 → 0 | 0.0014 → 0.0014 | 287 → 284 | 680 → 688 (+8) | 0 → 0 | 0.0211 → 0.0211 | 287 → 288 |
| /resources/homework-battles | 756 → 752 (-4) | 0 → 0 | 0 → 0 | 342 → 340 | 744 → 744 (+0) | 3 → 0 | 0.0197 → 0.0197 | 344 → 345 |
| /resources/exhausted-after-eight-hours | 756 → 744 (-12) | 0 → 0 | 0 → 0 | 332 → 330 | 732 → 736 (+4) | 0 → 0 | 0.0197 → 0.0197 | 333 → 334 |
| /resources/the-3am-waking | 756 → 756 (+0) | 0 → 0 | 0 → 0 | 333 → 331 | 732 → 736 (+4) | 5 → 0 | 0.0197 → 0.0197 | 334 → 335 |
| /resources/when-sleep-hygiene-isnt-it | 696 → 700 (+4) | 0 → 0 | 0 → 0 | 322 → 320 | 680 → 680 (+0) | 0 → 0 | 0.0197 → 0.0197 | 323 → 324 |
| /resources/bad-at-school | 696 → 700 (+4) | 0 → 0 | 0 → 0 | 330 → 328 | 680 → 680 (+0) | 0 → 0 | 0.0197 → 0.0197 | 331 → 332 |
| /resources/the-last-ten-percent | 764 → 784 (+20) | 0 → 0 | 0 → 0 | 343 → 341 | 744 → 748 (+4) | 0 → 0 | 0.0197 → 0.0197 | 345 → 346 |
| /resources/lens-and-medication | 768 → 780 (+12) | 0 → 0 | 0 → 0 | 345 → 343 | 752 → 756 (+4) | 0 → 0 | 0.0197 → 0.0197 | 346 → 347 |
| /resources/told-to-just-relax | 772 → 780 (+8) | 0 → 0 | 0 → 0 | 346 → 344 | 760 → 768 (+8) | 0 → 0 | 0.0197 → 0.0197 | 348 → 348 |
| /resources/braced-for-something | 760 → 760 (+0) | 0 → 0 | 0 → 0 | 334 → 332 | 740 → 740 (+0) | 0 → 0 | 0.0197 → 0.0197 | 335 → 336 |
| /resources/alongside-therapy | 772 → 780 (+8) | 0 → 0 | 0 → 0 | 344 → 342 | 760 → 760 (+0) | 15 → 0 | 0.0197 → 0.0197 | 345 → 346 |

### Hydration (header burger interactive), JS bytes at load, and ask bar ready — templates, before → after

| route | OFF hydrated ms | OFF JS kB gz | ON hydrated ms | ON ask bar ready ms | ON JS kB gz | ON layout chunk gz | webpack build (HEAD) hydrated / JS kB |
|---|---|---|---|---|---|---|---|
| / | 1936 → 1922 (-14) | 145 → 143 | 1937 → 1932 (-5) | 1972 → 1966 | 145 → 146 | 13 → 10 | 1899 / 131 |
| /what-we-help-with | 1726 → 1705 (-21) | 142 → 140 | 1718 → 1722 (+4) | 1747 → 1747 | 142 → 143 | 13 → 10 | 1705 / 128 |
| /adults | 1781 → 1769 (-12) | 137 → 135 | 1778 → 1791 (+13) | 1804 → 1814 | 137 → 138 | 13 → 10 | 1766 / 128 |
| /children-families | 1575 → 1561 (-14) | 137 → 135 | 1575 → 1575 (+0) | 1600 → 1597 | 137 → 138 | 13 → 10 | 1561 / 128 |
| /lens-neurofeedback | 1869 → 1847 (-22) | 145 → 143 | 1857 → 1856 (-1) | 1888 → 1882 | 145 → 146 | 13 → 10 | 1841 / 131 |
| /how-lens-works | 1843 → 1833 (-10) | 145 → 143 | 1827 → 1831 (+4) | 1856 → 1857 | 145 → 146 | 13 → 10 | 1787 / 131 |
| /brain-map | 1815 → 1778 (-37) | 145 → 143 | 1788 → 1781 (-7) | 1816 → 1804 | 145 → 146 | 13 → 10 | 1762 / 131 |
| /first-visit | 1621 → 1589 (-32) | 145 → 143 | 1602 → 1598 (-4) | 1627 → 1616 | 145 → 146 | 13 → 10 | 1576 / 131 |
| /about | 1850 → 1819 (-31) | 142 → 140 | 1834 → 1821 (-13) | 1859 → 1843 | 142 → 143 | 13 → 10 | 1764 / 128 |
| /about/founder | 1713 → 1698 (-15) | 134 → 132 | 1706 → 1697 (-9) | 1731 → 1717 | 134 → 135 | 13 → 10 | 1683 / 125 |
| /about/team | 1643 → 1625 (-18) | 134 → 132 | 1643 → 1625 (-18) | 1668 → 1644 | 134 → 135 | 13 → 10 | 1615 / 125 |
| /locations | 1651 → 1625 (-26) | 142 → 140 | 1645 → 1640 (-5) | 1671 → 1661 | 142 → 143 | 13 → 10 | 1624 / 128 |
| /concierge | 1806 → 1782 (-24) | 145 → 143 | 1807 → 1781 (-26) | 1835 → 1805 | 145 → 146 | 13 → 10 | 1772 / 131 |
| /stories | 1727 → 1710 (-17) | 142 → 140 | 1727 → 1720 (-7) | 1757 → 1738 | 142 → 143 | 13 → 10 | 1708 / 128 |
| /faq | 1510 → 1495 (-15) | 136 → 134 | 1507 → 1491 (-16) | 1532 → 1510 | 136 → 137 | 13 → 10 | 1481 / 128 |
| /is-lens-safe | 1711 → 1691 (-20) | 136 → 134 | 1700 → 1683 (-17) | 1727 → 1700 | 136 → 137 | 13 → 10 | 1686 / 128 |
| /contact | 1539 → 1512 (-27) | 139 → 137 | 1529 → 1510 (-19) | 1557 → 1531 | 139 → 140 | 13 → 10 | 1510 / 130 |
| /resources | 1900 → 1883 (-17) | 149 → 147 | 1910 → 1892 (-18) | 1941 → 1915 | 149 → 150 | 13 → 10 | 1849 / 130 |
| /privacy-policy | 1507 → 1495 (-12) | 136 → 134 | 1515 → 1499 (-16) | 1539 → 1520 | 136 → 137 | 13 → 10 | 1473 / 128 |
| /concerns/sleep | 1802 → 1777 (-25) | 144 → 142 | 1803 → 1785 (-18) | 1833 → 1808 | 144 → 145 | 13 → 10 | 1768 / 130 |
| /locations/nashville | 1860 → 1833 (-27) | 137 → 135 | 1852 → 1827 (-25) | 1886 → 1851 | 137 → 138 | 13 → 10 | 1819 / 128 |
| /resources/homework-battles | 1784 → 1771 (-13) | 141 → 139 | 1793 → 1772 (-21) | 1817 → 1794 | 141 → 142 | 13 → 10 | 1763 / 126 |

### Lighthouse 12 mobile, templates, before → after (flag off | flag on)

| route | perf off | perf on | LCP off before → after | LCP on before → after | TBT off → after | CLS off → after |
|---|---|---|---|---|---|---|
| / | 94 → 94 | 94 → 94 | 3071 → 3062 | 3063 → 3074 | 5 → 2 | 0.000 → 0.000 |
| /about | 96 → 96 | 96 → 96 | 2760 → 2749 | 2754 → 2749 | 2 → 0 | 0.000 → 0.000 |
| /about/founder | 97 → 97 | 97 → 97 | 2529 → 2682 | 2528 → 2678 | 0 → 0 | 0.000 → 0.000 |
| /about/team | 97 → 97 | 97 → 97 | 2532 → 2527 | 2533 → 2528 | 0 → 0 | 0.000 → 0.000 |
| /adults | 96 → 96 | 96 → 96 | 2678 → 2673 | 2690 → 2704 | 0 → 0 | 0.000 → 0.000 |
| /brain-map | 96 → 96 | 96 → 96 | 2817 → 2753 | 2757 → 2755 | 8 → 0 | 0.000 → 0.000 |
| /children-families | 97 → 97 | 97 → 97 | 2530 → 2527 | 2531 → 2528 | 0 → 0 | 0.000 → 0.000 |
| /concerns/sleep | 96 → 96 | 96 → 96 | 2759 → 2754 | 2756 → 2754 | 1 → 0 | 0.000 → 0.000 |
| /concierge | 96 → 96 | 96 → 96 | 2757 → 2754 | 2754 → 2755 | 0 → 0 | 0.000 → 0.000 |
| /contact | 98 → 99 | 98 → 98 | 2452 → 1954 | 2455 → 2450 | 0 → 0 | 0.000 → 0.000 |
| /faq | 98 → 98 | 98 → 98 | 2451 → 2449 | 2358 → 2448 | 0 → 0 | 0.000 → 0.000 |
| /first-visit | 97 → 97 | 97 → 97 | 2533 → 2524 | 2530 → 2525 | 0 → 0 | 0.000 → 0.000 |
| /how-lens-works | 96 → 96 | 96 → 96 | 2711 → 2746 | 2754 → 2763 | 14 → 0 | 0.000 → 0.000 |
| /is-lens-safe | 97 → 97 | 97 → 97 | 2600 → 2599 | 2603 → 2613 | 0 → 0 | 0.001 → 0.001 |
| /lens-neurofeedback | 95 → 95 | 95 → 94 | 2830 → 2824 | 2826 → 3053 | 0 → 0 | 0.004 → 0.004 |
| /locations | 97 → 99 | 97 → 97 | 2528 → 2031 | 2528 → 2531 | 0 → 0 | 0.000 → 0.000 |
| /locations/nashville | 94 → 94 | 94 → 94 | 3053 → 3052 | 3056 → 3051 | 0 → 0 | 0.001 → 0.001 |
| /privacy-policy | 98 → 98 | 98 → 98 | 2459 → 2447 | 2453 → 2450 | 3 → 0 | 0.000 → 0.000 |
| /resources | 96 → 98 | 96 → 96 | 2751 → 2348 | 2758 → 2754 | 0 → 0 | 0.000 → 0.000 |
| /resources/homework-battles | 96 → 96 | 96 → 96 | 2755 → 2751 | 2758 → 2757 | 0 → 0 | 0.000 → 0.000 |
| /stories | 97 → 98 | 96 → 96 | 2621 → 2332 | 2677 → 2675 | 7 → 0 | 0.000 → 0.000 |
| /what-we-help-with | 95 → 95 | 95 → 95 | 2840 → 2900 | 2905 → 2917 | 3 → 0 | 0.000 → 0.000 |

## 9. Bucket B, round one — 2026-10-12

Ben took three items from §4. Two shipped; one was built, measured on all 44 routes, and reverted. `perf/js-pass` was merged to `main` first (08f9204); this round is on top of it.

### 9.1 Franklin H1 — shipped

At 1440 px the real italic needs 533 px for "Williamson County." in a 511 px column, so the H1 wraps "Williamson" / "County." in the real face and holds the phrase on one line in the narrower tuned fallback: four lines against three, an 84 px jump at the swap, desktop CLS 0.083. The crossover is 1349 px, measured by bisection, not derived. From that width up a `<br class="br-wide">` inside the accent forces the break the real face already took, so the fallback takes it too. Wording, order and the `<em>` are untouched; below 1349 px nothing changes; above it the real face renders exactly as before.

- desktop CLS on `/locations/franklin`: 0.0832 → **0.0003** (flag off), 0.1245 → **0.0003** (flag on — the baseline there carried the ask bar's residue on top of the font reflow); LCP unchanged
- `check:fonts` at 1440: Franklin no longer listed; the only desktop reflow left is the documented `/adults` exception

### 9.2 Ask bar collapse without layout shift — shipped

The collapse was a `width` / `min-height` transition on the real bar, and Chrome counted every frame of it: 0.020 CLS on every route with the assistant on. Before writing anything, Chrome's rule was tested on a scratch page: a layout move compensated by the element's own transform in the same frame still counts (0.015), in both directions; a pure transform or SVG-geometry animation never counts; and a box that is `visibility: hidden` for the frame in which it moves is not tracked at all (`LayoutShiftTracker::NeedsToTrack`).

So the real bar no longer animates its layout. During the 200 ms it keeps its old layout at opacity 0, still taking taps and focus; a decoy — an SVG rect for the capsule (`x`/`y`/`width`/`height`/`rx` transitions), a span for the words, a circle for the arrow, the wave mark — plays the motion with transforms only, from geometry measured off the real bar at that moment. At the end the real bar switches to its new layout inside one `visibility: hidden` frame while the decoy still shows the final pill, and is shown again the next frame. Resting states are the same CSS as before. The 200 ms itself differs in two ways: the pill's shadow is an SVG `drop-shadow` approximation of the box-shadow's −16 px spread, and a long placeholder truncates at the start of the collapse rather than when the shrinking edge reaches it. Frame captures at 30/80/130/180/260 ms, both widths, old against new, are in the session scratchpad; the two sets match within a frame of timing jitter, and the resting and keyboard-focus states are pixel-identical.

- flag on, all 44 routes, check:cwv mobile: CLS **0.0197 on every route → 0 on 40 routes**, and on the other four the values the flag-off baseline already had (`/lens-neurofeedback` 0.0037, `/locations/franklin` 0.0014, `/is-lens-safe` 0.0008, `/locations/nashville` 0.0005 — all font-swap residue, none from the bar)
- LCP, TBT, Lighthouse scores: unchanged within noise (table below)
- `check:layout` 176 combinations: clean, flag on

### 9.3 Serif preload — built, measured, reverted

`preload: false` on Cormorant upright, DM Sans untouched. On the throttled phone it moved real LCP by about −80 ms on every template (e.g. `/` 848 → 716, `/about` 684 → 604). But the face then lands ~350 ms after first paint on that line, and the tuned fallback holds only the headings: the proof band's serif numerals, the step numbers and the pull-quote marks moved in the first viewport. Lighthouse, which does not scroll, attributes every one of these to "Web font loaded …01e4147…": `/brain-map` 0.011, `/locations` 0.002, `/about`, `/how-lens-works`, `/privacy-policy`, `/resources` 0.0014–0.0015, `/concierge`, `/is-lens-safe` 0.0007 — eight of 23 templates — and `check:cwv` saw the same values at load with the flag on. Lighthouse's simulation also serialised the font behind the stylesheet for a uniform +300 ms of FCP on every template (1206 → 1512 ms; Lantern, not real paint, but it is what a Lighthouse report would show). Your acceptance criterion was CLS staying at 0 flag-off; it does not, so the preload is back and the two tags are in the HTML again. My §2.5 figure for this ("−10–30 ms, no CLS") came from five routes and understated both the gain and the cost; this is the 44-route answer.

### 9.4 A note on measurement

The first verification runs of this round were taken while the machine was in use (load average 9, a foreground browser, four dev servers): 180 s evaluate timeouts, TBT of 350–390 ms on pages that measure 0, LCP spreads of 300 ms, CLS of 0.10–0.14 on two concern pages that read 0 before and after. None of it reproduced on an idle machine. The numbers below come from a chain that waits for the one-minute load average to sit under 3.0 for two minutes before each timing phase. Everything in PERF-PASS.md §1–§8 was measured overnight on an idle machine.

### 9.5 Verification (final code: Franklin break + ask bar decoy; preload restored)

| check | flag on | flag off |
|---|---|---|
| `npx tsc --noEmit`, `npm run lint` | clean | clean |
| `npm run build` | ok | ok |
| `check:cwv`, 44 routes | every route inside budget; CLS 0 on 40, pre-existing residue on 4 | every route inside budget; CLS identical to main on all 44 (0 on 40, the same four residues); LCP median −4 ms |
| `check:fonts` | no first-viewport heading reflows at any mobile width; desktop: only `/adults` | same: no first-viewport heading reflows at any mobile width; desktop only `/adults` |
| Lighthouse 12 mobile, 22 templates + Franklin | perf 94–98, a11y/bp/seo 100; unchanged within noise | perf 94–98, a11y/bp/seo 100; unchanged within Lantern noise (a few "before" values from the overnight run read 300–500 ms under those routes' usual figures and are back at them) |
| `check:layout` | 176 combinations clean | 176 combinations clean |

Not run: `check:chat` (writes consultation rows; needs the assistant live with a key) and the model half of `check:answers`; neither path changed.


### 9.6 Before / after for the two shipped changes

### Ask bar collapse (flag on) — CLS and LCP, all 44 routes, check:cwv mobile, before → after

| route | CLS before → after | LCP before → after | TBT before → after |
|---|---|---|---|
| / | 0.0197 → 0 | 848 → 816 (-32) | 42 → 28 |
| /what-we-help-with | 0.0197 → 0 | 688 → 680 (-8) | 0 → 0 |
| /adults | 0.0197 → 0 | 684 → 680 (-4) | 0 → 0 |
| /children-families | 0.0197 → 0 | 684 → 692 (+8) | 3 → 0 |
| /lens-neurofeedback | 0.0234 → 0.0037 | 684 → 684 (+0) | 0 → 7 |
| /how-lens-works | 0.0197 → 0 | 688 → 680 (-8) | 0 → 1 |
| /brain-map | 0.0197 → 0 | 748 → 752 (+4) | 0 → 0 |
| /first-visit | 0.0197 → 0 | 688 → 688 (+0) | 0 → 5 |
| /about | 0.0197 → 0 | 684 → 696 (+12) | 0 → 15 |
| /about/founder | 0.0197 → 0 | 756 → 772 (+16) | 0 → 0 |
| /about/team | 0.0197 → 0 | 680 → 688 (+8) | 0 → 0 |
| /locations | 0.0197 → 0 | 684 → 688 (+4) | 0 → 0 |
| /concierge | 0.0197 → 0 | 772 → 760 (-12) | 0 → 0 |
| /stories | 0.0197 → 0 | 692 → 684 (-8) | 10 → 12 |
| /faq | 0.0197 → 0 | 688 → 684 (-4) | 0 → 0 |
| /is-lens-safe | 0.0204 → 0.0008 | 684 → 688 (+4) | 0 → 0 |
| /contact | 0.0197 → 0 | 684 → 684 (+0) | 0 → 0 |
| /resources | 0.0197 → 0 | 688 → 684 (-4) | 0 → 0 |
| /privacy-policy | 0.0197 → 0 | 680 → 680 (+0) | 0 → 0 |
| /concerns/anxiety | 0.0197 → 0 | 732 → 732 (+0) | 0 → 0 |
| /concerns/focus-adhd | 0.0197 → 0 | 744 → 748 (+4) | 0 → 1 |
| /concerns/sleep | 0.0197 → 0 | 744 → 748 (+4) | 0 → 1 |
| /concerns/emotional-regulation | 0.0197 → 0 | 728 → 732 (+4) | 0 → 2 |
| /concerns/brain-fog | 0.0197 → 0 | 796 → 808 (+12) | 0 → 0 |
| /concerns/stress-resilience | 0.0197 → 0 | 752 → 752 (+0) | 0 → 0 |
| /concerns/children-school | 0.0197 → 0 | 876 → 896 (+20) | 0 → 0 |
| /concerns/trauma | 0.0197 → 0 | 736 → 744 (+8) | 0 → 0 |
| /concerns/performance | 0.0197 → 0 | 740 → 744 (+4) | 0 → 0 |
| /concerns/concussion | 0.0197 → 0 | 688 → 688 (+0) | 0 → 0 |
| /concerns/migraines | 0.0197 → 0 | 684 → 688 (+4) | 0 → 0 |
| /concerns/depression | 0.0197 → 0 | 688 → 680 (-8) | 0 → 0 |
| /locations/nashville | 0.0202 → 0.0005 | 760 → 760 (+0) | 0 → 0 |
| /locations/murfreesboro | 0.0197 → 0 | 684 → 684 (+0) | 0 → 0 |
| /locations/franklin | 0.0211 → 0.0014 | 688 → 688 (+0) | 0 → 0 |
| /resources/homework-battles | 0.0197 → 0 | 744 → 748 (+4) | 0 → 0 |
| /resources/exhausted-after-eight-hours | 0.0197 → 0 | 736 → 732 (-4) | 0 → 0 |
| /resources/the-3am-waking | 0.0197 → 0 | 736 → 740 (+4) | 0 → 2 |
| /resources/when-sleep-hygiene-isnt-it | 0.0197 → 0 | 680 → 680 (+0) | 0 → 0 |
| /resources/bad-at-school | 0.0197 → 0 | 680 → 688 (+8) | 0 → 0 |
| /resources/the-last-ten-percent | 0.0197 → 0 | 748 → 748 (+0) | 0 → 0 |
| /resources/lens-and-medication | 0.0197 → 0 | 756 → 760 (+4) | 0 → 0 |
| /resources/told-to-just-relax | 0.0197 → 0 | 768 → 764 (-4) | 0 → 0 |
| /resources/braced-for-something | 0.0197 → 0 | 740 → 740 (+0) | 0 → 0 |
| /resources/alongside-therapy | 0.0197 → 0 | 760 → 776 (+16) | 0 → 0 |

Median CLS 0.0197 → 0; max 0.0234 → 0.0037; routes at exactly 0: 0 → 40 of 44.

### Franklin H1 (desktop 1440) — check:cwv desktop, before → after

- flag off: CLS 0.0832 → 0.0003, LCP 164 → 156 ms
- flag on: CLS 0.1245 → 0.0003, LCP 168 → 160 ms

### Flag off — CLS stays 0 with the serif preload restored (all 44, mobile)

- /lens-neurofeedback: 0.0037
- /is-lens-safe: 0.0008
- /locations/nashville: 0.0005
- /locations/franklin: 0.0014
- routes over the mobile LCP budget: 0

### Lighthouse 12 mobile, templates — before → after (flag on | flag off)

| route | perf on | LCP on | CLS on | perf off | LCP off | CLS off |
|---|---|---|---|---|---|---|
| / | 94 → 94 | 3074 → 3090 | 0.000 → 0.000 | 94 → 94 | 3062 → 3056 | 0.000 → 0.000 |
| /about | 96 → 96 | 2749 → 2755 | 0.000 → 0.000 | 96 → 96 | 2749 → 2788 | 0.000 → 0.000 |
| /about/founder | 97 → 97 | 2678 → 2686 | 0.000 → 0.000 | 97 → 96 | 2682 → 2696 | 0.000 → 0.000 |
| /about/team | 97 → 97 | 2528 → 2541 | 0.000 → 0.000 | 97 → 97 | 2527 → 2526 | 0.000 → 0.000 |
| /adults | 96 → 96 | 2704 → 2680 | 0.000 → 0.000 | 96 → 96 | 2673 → 2675 | 0.000 → 0.000 |
| /brain-map | 96 → 96 | 2755 → 2756 | 0.000 → 0.000 | 96 → 96 | 2753 → 2752 | 0.000 → 0.000 |
| /children-families | 97 → 97 | 2528 → 2530 | 0.000 → 0.000 | 97 → 97 | 2527 → 2526 | 0.000 → 0.000 |
| /concerns/sleep | 96 → 96 | 2754 → 2757 | 0.000 → 0.000 | 96 → 96 | 2754 → 2754 | 0.000 → 0.000 |
| /concierge | 96 → 96 | 2755 → 2763 | 0.000 → 0.000 | 96 → 96 | 2754 → 2752 | 0.000 → 0.000 |
| /contact | 98 → 98 | 2450 → 2347 | 0.000 → 0.000 | 99 → 98 | 1954 → 2452 | 0.000 → 0.000 |
| /faq | 98 → 98 | 2448 → 2452 | 0.000 → 0.000 | 98 → 98 | 2449 → 2461 | 0.000 → 0.000 |
| /first-visit | 97 → 97 | 2525 → 2536 | 0.000 → 0.000 | 97 → 97 | 2524 → 2560 | 0.000 → 0.000 |
| /how-lens-works | 96 → 96 | 2763 → 2755 | 0.000 → 0.000 | 96 → 96 | 2746 → 2753 | 0.000 → 0.000 |
| /is-lens-safe | 97 → 97 | 2613 → 2604 | 0.001 → 0.001 | 97 → 98 | 2599 → 2459 | 0.001 → 0.001 |
| /lens-neurofeedback | 94 → 95 | 3053 → 2828 | 0.004 → 0.004 | 95 → 95 | 2824 → 2827 | 0.004 → 0.004 |
| /locations | 97 → 97 | 2531 → 2528 | 0.000 → 0.000 | 99 → 97 | 2031 → 2527 | 0.000 → 0.000 |
| /locations/franklin | — → 97 | — → 2605 | — → 0.001 | — → 97 | — → 2602 | — → 0.001 |
| /locations/nashville | 94 → 94 | 3051 → 3059 | 0.001 → 0.001 | 94 → 94 | 3052 → 3053 | 0.001 → 0.001 |
| /privacy-policy | 98 → 98 | 2450 → 2454 | 0.000 → 0.000 | 98 → 98 | 2447 → 2453 | 0.000 → 0.000 |
| /resources | 96 → 96 | 2754 → 2755 | 0.000 → 0.000 | 98 → 97 | 2348 → 2487 | 0.000 → 0.000 |
| /resources/homework-battles | 96 → 96 | 2757 → 2757 | 0.000 → 0.000 | 96 → 96 | 2751 → 2754 | 0.000 → 0.000 |
| /stories | 96 → 96 | 2675 → 2678 | 0.000 → 0.000 | 98 → 96 | 2332 → 2692 | 0.000 → 0.000 |
| /what-we-help-with | 95 → 95 | 2917 → 2902 | 0.000 → 0.000 | 95 → 95 | 2900 → 2903 | 0.000 → 0.000 |

