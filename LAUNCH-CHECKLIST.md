# Launch checklist — pointing harmonizedbraincenterstn.com at this site

Written 2026-10-14 against `main` (branch `launch/readiness`), from a
production build with the assistant off and `NEXT_PUBLIC_SITE_URL` set to the
apex. Three parts: what was verified and is fine, what was fixed, and what
still has to happen at cutover — in order.

Where it says **Ben**, it is a decision or a value only he has.

---

## 1. Verified — nothing to do

Everything below was checked against the production build served by `next
start`, every sitemap URL (44), plus `/robots.txt`, `/sitemap.xml`,
`/llms.txt`, `/resources/feed.xml`, a 404 and a 410.

| Check | Result |
| --- | --- |
| **noindex** | No route emits `<meta name="robots" content="noindex">` and no response carries `X-Robots-Tag` — except the two that should: the 404 (Next's own `noindex` meta, status 404) and the 410 handler (`X-Robots-Tag: noindex`). `next.config.ts` sets no robots header. |
| **Absolute URLs** | Every canonical, `og:url`, `og:image`, `twitter:image`, RSS discovery link, sitemap `<loc>`, robots `Sitemap:`, llms.txt link, feed link and every JSON-LD `@id` / `url` / `image` / `logo` on all 44 routes is `https://harmonizedbraincenterstn.com/...`. Nothing on `*.vercel.app`, nothing on `localhost`, nothing on `http://`. (The scanner's only hits were the YouTube embed URL and two XML namespace URIs — correct as they are.) |
| **One source for the domain** | `SITE_URL` in `lib/site-config.ts`: `NEXT_PUBLIC_SITE_URL` with the apex as the fallback. Every emitter imports it (`app/layout.tsx` `metadataBase`, `app/robots.ts`, `app/sitemap.ts`, `app/llms.txt`, `app/resources/feed.xml`, `lib/schema.ts`). The one hardcoded copy — the 410 body in `app/api/gone/route.ts` — now reads it too (fixed below). Comments and docs mention the domain; code does not. |
| **robots.txt** | `User-Agent: *` → `Allow: /`, `Disallow: /api/`, `Disallow: /guides/`; the same for the named AI agents (allowed, Ben's decision Oct 2026); `Sitemap: https://harmonizedbraincenterstn.com/sitemap.xml`. `/guides/` is still disallowed and the HTML guide still carries its own `noindex, nofollow`. |
| **Redirects** | `check:redirects`: 94 legacy URLs × 2 slash forms — 56 redirects, 36 gone. Every row answers in one hop; every destination answers 200; no source listed twice. |
| **404** | Status 404, `noindex`, in the site chrome: "That page isn't here." with four routing buttons (what we help with, what LENS is, locations, contact) and a homepage link. |
| **Old site** | No `Divi`, `etdevs`, `wp-content`, `wp-json` or `elegantthemes` anywhere in `app/`, `lib/`, `components/`, `public/` or the built HTML. The only mentions of WordPress are redirect-map comments and the audit docs. The `zaib.sandbox.etdevs.com` demo image is gone. |
| **Mixed content** | No `http://` in any built page, feed, sitemap or llms.txt (XML namespaces aside). |
| **Icons** | `/favicon.ico` (16 + 32), `/icon.png` (192×192, a multiple of 48 as Google asks), `/apple-icon.png` (180×180), all linked from `<head>` by the Next file convention and all answering 200. There is no web manifest and no 512px icon — only needed for "add to home screen" as an app, which this site does not offer. |
| **Headers** | `X-Powered-By` off; `nosniff`, `Referrer-Policy`, `Permissions-Policy` set. HSTS comes from Vercel (`max-age=63072000; includeSubDomains; preload` — observed on the current deployment). |
| **Build gates** | `REQUIRE_VERIFIED_CONTENT=true next build` fails on exactly the six known facts (§3). A normal build passes and warns about the same six, plus the two missing lead-notification settings (§3). |
| **Structured data** | `check:schema`: 44 routes, one `@graph` each, anchored, typed, every reference named. |
| **Links** | `check:links`: 44 routes, every one with at least two in-content inbound links; nothing broken. |
| **Content index** | `check:index`: 32 mirrored passages match; 12 [CONFIRM] tags accounted for; the static guide still matches site-config. |
| **Chart** | `BrainMapChart` hides the 21 site labels below 920px (already on main as d183307). Measured at 768, 834, 919, 920 and 390 on `/` and `/brain-map`: the SVG never exceeds its box, the document never scrolls sideways, labels are hidden below 920 and back at 920. |
| **Layout / CWV / fonts / contact** | See the results block at the end of this file. |

Supabase answered (401 without a key — live, not paused). The GitHub repo
already has a Vercel project deploying Production on every push to `main`
(30 deployments; latest is `95bfba1`).

## 2. Fixed in this batch

- **410 body** — `app/api/gone/route.ts` wrote the domain as a string
  literal; it now builds the sentence from `SITE_NAME` and `SITE_URL`. The
  response is unchanged on the apex.
- **Murfreesboro exterior** — `public/images/murfreesboro-exterior.jpg`
  (1300×975, JPEG q78 progressive via sharp, like the other photographs),
  shown beside "Getting here" on `/locations/murfreesboro` as
  `arrivalPhoto` with alt and caption that say what to look for: a white
  cottage with striped awnings, the brain logo in the front window. It
  **replaces the sage-gradient "embedded map" placeholder** that sat in that
  slot (the gradient-with-a-gold-dot block; Nashville and Franklin keep it).
  The "Murfreesboro exterior — entrance signage" placeholder plate was
  removed from the photography brief in the space grid, since the shot now
  exists. The photo also joins the LocalBusiness `image` list and is the
  page's `primaryImageOfPage` until a hero photo exists. The page date
  bumped to 2026-10-14. Nothing on the page was AI-generated — the hero
  still renders its (unlabeled) plate in production, by Ben's call that the
  photo is for recognition, not atmosphere.

## 3. Findings for Ben — reported, not fixed

1. **Vercel Deployment Protection is on.** Every `*.vercel.app` URL for the
   project — the per-deployment URL, the `-git-main` alias and the
   production alias `hbc-website-ylbenmuir-9529s-projects.vercel.app` —
   answers `302 → vercel.com/sso-api` with `X-Robots-Tag: noindex`. That is
   what a crawler sees today, and it is fine *for those URLs*. What matters
   is the setting's scope: Project → Settings → Deployment Protection →
   Vercel Authentication must be **Standard Protection** (protects
   deployment URLs, not custom production domains) or **Only Preview
   Deployments**. If it is **All Deployments**, the apex will be
   login-walled the moment DNS moves. Check this before DNS; verify after
   (§4 step 9).
2. **Nobody is told about a lead.** The build warns: `RESEND_API_KEY` and
   `LEADS_NOTIFY_EMAIL` are unset in the environment that built. Leads save
   to Supabase either way, but until those two are set in Vercel →
   Production (and the sending domain is verified in Resend), a form
   submission notifies no one. The email is the lead while the platform is
   in testing — this is the one item on the list that loses business if
   missed.
3. **Six facts are still unverified** and render their fallbacks in
   production (the strict build names them): founder quote sign-off;
   response-time claim; start-timing claim; Franklin opening date; Brain
   Map differentiator claim; whether the 12-session package applies to
   concierge. None blocks launch — each hides itself — but each is a
   sentence the site could be saying and isn't. `CONTENT-CHECKLIST.md`.
4. **Search Console and Bing verification are inert.** `app/layout.tsx`
   renders `<meta name="google-site-verification">` and
   `<meta name="msvalidate.01">` only when `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
   / `NEXT_PUBLIC_BING_SITE_VERIFICATION` are set at build time; both are
   empty, so neither tag ships. Two ways to make them real — §4 step 11.
5. **Old WordPress sitemaps will 404.** The live site advertises
   `/video-sitemap.xml`, `/sitemap.xml`, `/sitemap.rss`, and answers
   `/post-sitemap.xml`, `/page-sitemap.xml`, `/sitemap_index.xml` (302 →
   `/sitemap.xml`) and `/feed/`. After cutover only `/sitemap.xml` exists
   (same path, new content — Search Console's submitted entry keeps
   working). The rest 404, which is correct; remove them in Search Console
   so the report does not fill with "couldn't fetch". If you would rather
   redirect `/feed/` → `/resources/feed.xml` and `/sitemap_index.xml` →
   `/sitemap.xml`, it is two rows in `next.config.ts` **and** two in
   `scripts/check-redirects.mjs` — not done, because the redirect table is
   a decided list.
6. **Two headings reflow on the font swap** — `check:fonts`: the `/contact`
   H1 at 390 and 412px is ~50px taller in the fallback face, so the form
   under it moves when Cormorant lands. Pre-existing on `main` (the H1
   changed with the three-step form); fixing it means re-deriving the
   fallback metrics with `--sweep`, not adjusting by eye. Reported, not
   gated.
7. **Murfreesboro's cards on `/` and `/locations` still show a plate** in
   production (the exterior photo is scoped to the location page, as
   briefed). If you want the card to carry the street view too, it is one
   line per card — `image` on the Murfreesboro record would also make it
   the hero, which was ruled out, so it would need its own card prop.
8. **SPF has `+a`.** The domain's TXT record authorizes whatever the apex A
   record points at to send mail. After cutover that becomes Vercel's IP,
   which never sends mail for you. Harmless, but `+a` was there for the
   WordPress host's form mailer and can be dropped at the same time as the
   `dnssmarthost` include if SiteGround is cancelled. Mail itself is Google
   Workspace (MX → aspmx.l.google.com) and is untouched by any of this.

## 4. Cutover — in order

Facts about the domain today: nameservers at **SiteGround** (`ns1/ns2.
siteground.net`); apex and `www` both A → `35.212.22.77` (SiteGround);
`www` already 301s to the apex; MX → Google Workspace; TXT → SPF +
`apple-domain-verification`. Only the two A records change.

**Before touching DNS**

1. Merge and push `launch/readiness` to `main`. Vercel builds Production
   automatically; wait for it to finish.
2. Vercel → Project → Settings → **Environment Variables**, scope
   Production. Required: `NEXT_PUBLIC_SITE_URL=https://harmonizedbraincenterstn.com`
   (the fallback is the same value, but set it so a preview-scope override
   can never leak into production), `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `LEADS_NOTIFY_EMAIL`
   (and `LEADS_NOTIFY_FROM` on a Resend-verified domain),
   `NEXT_PUBLIC_FEATURE_CELEBRITY=true`. **Leave unset:**
   `NEXT_PUBLIC_FEATURE_ASSISTANT`, `NEXT_PUBLIC_SHOW_DRAFT_CONTENT`,
   `REQUIRE_VERIFIED_CONTENT`. Optional now or later: `NEXT_PUBLIC_GA_ID`,
   `DIALPAD_*`, `BOOKING_CALENDAR_URL`, `INQUIRY_API_BASE` +
   `INQUIRY_INTAKE_SECRET`. `NEXT_PUBLIC_*` is inlined at build time —
   after setting any of them, **Redeploy** (Deployments → ⋯ → Redeploy).
3. Resend: verify `harmonizedbraincenterstn.com` (or whichever domain
   `LEADS_NOTIFY_FROM` uses) — DKIM/SPF records at SiteGround's DNS. Until
   this is done the sender is Resend's test address, which only delivers to
   the Resend account owner.
4. Vercel → Settings → **Deployment Protection**: confirm Vercel
   Authentication is *Standard Protection* or *Only Preview Deployments* —
   not *All Deployments* (§3 item 1).
5. Vercel → Settings → **Domains**: add `harmonizedbraincenterstn.com` and
   `www.harmonizedbraincenterstn.com`; on `www` choose **Redirect to**
   the apex with **301**. Vercel shows the records it wants: apex `A
   76.76.21.21`, `www` `CNAME cname.vercel-dns.com`. The domains sit in
   "Invalid configuration" until step 7 — that is expected.
6. Send one test through the contact form on the production deployment
   (use the Vercel login to get past protection) and confirm the lead
   email arrives and the row lands in Supabase.

**DNS**

7. SiteGround → Site Tools → Domain → **DNS Zone Editor**. Change **only**:
   - `@` A `35.212.22.77` → `76.76.21.21`
   - `www` A `35.212.22.77` → delete, add `www` CNAME `cname.vercel-dns.com`
   Do **not** touch MX, the SPF TXT, the `apple-domain-verification` TXT,
   or the nameservers. Lowering the A record's TTL to 300 an hour ahead
   shortens the overlap. (Moving nameservers to Vercel is a separate,
   bigger change — not needed, and it would require re-creating the mail
   records by hand.)
8. Vercel issues the certificate once it sees the records (minutes).
   Domains go green.

**Verify — within the hour**

9. From a terminal:
   ```
   curl -sI https://harmonizedbraincenterstn.com/ | grep -iE 'HTTP|x-robots|server|strict-transport'
   curl -sI https://www.harmonizedbraincenterstn.com/ | grep -iE 'HTTP|location'
   curl -s  https://harmonizedbraincenterstn.com/robots.txt
   curl -sI https://harmonizedbraincenterstn.com/what-is-lens/ | grep -iE 'HTTP|location'
   curl -sI https://harmonizedbraincenterstn.com/vibro-acoustic-chair/ | grep -iE 'HTTP'
   ```
   Expect: `200`, `server: Vercel`, **no `x-robots-tag`**, HSTS present;
   `www` → `301` to the apex; robots as in §1; `/what-is-lens/` → `301` to
   `/lens-neurofeedback`; the chair → `410`. If the apex answers `302
   vercel.com/sso-api`, protection is on *All Deployments* — change it
   (step 4), no redeploy needed.
10. Open the site on a phone off wifi (real DNS), submit the form once
    more with the texts box ticked, confirm the lead email and the
    confirmation text (if Dialpad is set and A2P 10DLC is approved).

**Search Console and Bing — same day**

11. **Verify ownership.** Two options; pick one.
    - *DNS (recommended — no code, no rebuild, survives every deploy):*
      Search Console → Add property → **Domain** →
      `harmonizedbraincenterstn.com` → copy the `google-site-verification=…`
      TXT and add it at SiteGround beside the existing TXT records. Bing
      Webmaster Tools → Add site → **Import from Google Search Console**
      (or its own CNAME/TXT method). Leave the two `NEXT_PUBLIC_*` tokens
      unset forever.
    - *HTML tag:* Search Console → URL-prefix property → HTML tag → copy
      **only the `content` value** into `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`;
      Bing → HTML meta tag → `content` value into
      `NEXT_PUBLIC_BING_SITE_VERIFICATION`; both in Vercel → Production;
      **Redeploy**; then click Verify. Build-time variables — setting them
      without a redeploy renders nothing.
12. Search Console → Sitemaps: `/sitemap.xml` is probably already listed
    from the WordPress site; it now returns the new file, so just confirm
    it reads 44 URLs. Remove `/video-sitemap.xml`, `/sitemap.rss`,
    `/post-sitemap.xml`, `/page-sitemap.xml` and any `sitemap_index`
    entry. Bing: submit `https://harmonizedbraincenterstn.com/sitemap.xml`.
13. URL Inspection → request indexing for `/`, `/lens-neurofeedback`,
    `/locations/nashville`, `/locations/murfreesboro`, `/contact`. (The
    rest follows from the sitemap and the 301s.)
14. Google Business Profile for each center: website URL stays the apex;
    the Murfreesboro listing may now also use `/locations/murfreesboro`.

**After**

15. Keep SiteGround alive for 30 days — DNS stays there regardless, and the
    old site is the fallback if something is wrong. Then cancel hosting,
    not the domain or the DNS zone.
16. Week one: Search Console → Pages → "Not found (404)" — anything with
    real impressions that is not in the redirect map gets a row (and a row
    in `scripts/check-redirects.mjs`).
17. When Ben wants measurement: `NEXT_PUBLIC_GA_ID` in Vercel → Production,
    redeploy. Until then nothing loads and nothing is counted.

---

## Results block — the suite, production build, 2026-10-14

Production build (`next build`, assistant off, `NEXT_PUBLIC_SITE_URL` = apex),
served by `next start -p 3123`. The two assistant checks ran on a second
build with the flag on, as the flag is in `.env.local` here.

| Check | Result |
| --- | --- |
| `REQUIRE_VERIFIED_CONTENT=true next build` | Throws, as designed, naming the six facts in §3. |
| `next build` (production) | Passes, 44 routes; warns on the six facts and the two lead-notification settings. |
| `tsc --noEmit`, `eslint` | Clean. |
| `check:index` | 32 mirrored passages match; 12 [CONFIRM] tags accounted for; guide matches site-config. |
| launch scan (noindex, absolute URLs, robots, 404, 410, icons, headers, mixed content) | Clean — §1. |
| `check:redirects` | 94 × 2 forms, one hop each, every destination live. |
| `check:links` | 44 routes, no broken link, ≥2 in-content inbound links each. |
| `check:schema` | 44 routes, one `@graph` each, every reference typed and named. |
| `check:fonts` | No gated failure. Reported: `/contact` H1 reflows at 390/412px (§3 item 6); 14 below-the-fold rewraps, not gated. |
| `check:layout` — full sweep | 44 routes × 320, 390, 414, 834 = 176 combinations: no clipped text, no overlap, nothing past the viewport. |
| `check:layout` — `/locations/murfreesboro` | 4 of 4 clean, flag off and flag on. |
| chart fit (`/`, `/brain-map` × 390, 768, 834, 919, 920) | Fits its box, no sideways scroll; labels hidden <920, shown at 920. |
| `check:cwv` — `/locations/murfreesboro`, `/brain-map`, `/` | Mobile LCP 700 / 708 / 816 ms, CLS 0, TBT 20 / 20 / 64 ms, 419 / 330 / 536 kB — every route inside the mobile budget. Desktop LCP 164 / 164 / 212 ms. |
| `check:contact` | 363 / 363 passed against the real project with Resend, Dialpad and the platform mocked; 8 of 8 test rows cleaned up. |
| `check:answers` (assistant on) | 38 / 40 framing, guardrails hold. Two "process detail she didn't ask about" ("Is this safe for kids?", "Does it hurt?") and one retrieval gap (years-old trauma, phrased without the word). The assistant ships **off**; none of this is in the production build. |
| `check:chat` | **Not run.** It inserts two lead-shaped rows and refuses while `consultation_requests` on the production project holds real rows (8 today). It needs an empty table or a local Supabase stack. |

