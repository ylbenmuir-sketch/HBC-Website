# Sticky ask bar — handoff

Branch: `feature/sticky-ask-bar` · draft PR, not merged, not deployed.

Replaces the floating "Have a question?" launcher pill with a sticky
full-width bar that reads as a text input, and refactors the two bottom bars
onto one controller so they can never both be on screen.

---

## 0. Second pass — what changed since you last looked

Three things, in the order you asked for them.

**1. A press now does different things depending on what pressed it.** Touch
goes straight to the panel and the panel's composer takes the focus; a mouse
puts a caret in the ask bar itself and keeps typing local until Enter. Decided
per event from `pointerType`, with `(pointer: coarse)` as the fallback — a
pointer question asked as one, never as a width. §5.1 below is rewritten;
that judgement call is now resolved rather than open.

**2. The composer placeholder is fixed, and I audited the rest.**
`#a6adb4` → `var(--slate)`: **2.27:1 → 5.69:1**. Every piece of text and every
placeholder in both the ask bar and the assistant panel now clears 4.5:1,
measured in a browser rather than by eye. Two *non-text* things came back
under 3:1 and I left both alone — see §7, they are yours to call.

**3. The breakpoint sweep found one more real defect, in an image.** All three
JS↔CSS width pairs agree, tested at both sides of each boundary. But
`trisha.jpg` declared `sizes="220px"` while CSS takes it full-bleed below
760px, so phones were fetching a 256px-wide source for a 390px slot. Fixed.
Details in §8.

---

## 1. Look at this first

Run `NEXT_PUBLIC_FEATURE_ASSISTANT=true npm run dev` (it is already `true` in
your `.env.local`), then, in this order:

1. **Homepage at 390px, scroll slowly down.** This is the whole feature in one
   pass: the cream ask bar at rest → collapsing to a pill as you read down →
   the navy "Get a Free Call Today" bar taking the same footprint after the
   hero → the ask bar coming back when you scroll up out of that section →
   the ask bar again over the footer at the end. Watch the *swap*
   specifically. It should read as one bar changing state. If it reads as two
   elements, that is the thing to tell me about.
2. **Desktop, any page.** Judge the hierarchy call. The bar is cream on cream
   with a sage mark and a sage arrow, and I think it sits below the hero CTA
   where it should — but that is a taste judgement and it is yours.
3. **Press the bar with a finger, then with a mouse.** They now do different
   things on purpose, and this is the change most worth eyeballing:
   - *Finger* (or Responsive mode in devtools, or a real phone): anywhere on
     the bar opens the panel and the panel's composer already has the caret
     and the keyboard. No caret ever appears in the bar itself.
   - *Mouse*: clicking the bar — the cream either side of the field counts —
     puts a caret in the bar. Type; nothing opens. Enter sends it and the
     panel opens with your words already posted as the first message. The
     arrow at the right end still sends, because it looks like it should.
   - *Keyboard*: Tab to the field, type, Enter. Same as before, both ways.
4. **Placeholder rotation.** Load a page cold — it must always start on "Does
   this actually work?" — then leave it four seconds. Hover it: it should stop.
5. **The footer at 390px.** Scroll to the very bottom. The last line of the
   disclaimer should clear the bar with room to spare. That is the reserve
   working.

Screenshots from the headless run are in the PR description; they were taken
with the Next dev-tools badge on screen, which is the little "1 Issue" pill
overlapping the bottom-left of the bar in some of them — not part of the site.
(That issue is the pre-existing Turbopack workspace-root warning, unrelated.)

---

## 2. Recon findings

| Question | Answer |
| --- | --- |
| Where was the launcher? | `components/SiteAssistant.tsx`, the `.assistant-launcher` button at the end of the render — a sage pill reading "Have a question?", fixed bottom-right. |
| Where was it mounted? | `app/layout.tsx`, `{FEATURE_ASSISTANT && <SiteAssistant />}`, behind `NEXT_PUBLIC_FEATURE_ASSISTANT`. Dynamically imported so the chunk is not downloaded while the flag is off. |
| Chat provider | **First-party.** `app/api/chat/route.ts` — our own route, our own retrieval stack in `lib/chat/*`, one model call in `lib/chat/answer.ts` via `@anthropic-ai/sdk`. There is no third-party chat widget anywhere in this repo. |
| Prefill supported? | **Yes** — see §3. |
| The sticky call bar | `components/MobileCtaBar.tsx`, mounted in `app/page.tsx:884` (homepage only). Shown once the hero has scrolled past and retired as `.final` approaches. |
| How it hid the launcher | Two independent CSS rules pointing at each other. `MobileCtaBar` set `body[data-cta-bar]`, and a rule inside `@media (max-width: 760px)` stood `.assistant-launcher` down. The launcher set `body[data-assistant-open]`, and a mirrored rule stood `.cta-bar` down. |
| Brand tokens | `app/globals.css` — `:root` custom properties and the Tailwind v4 `@theme` block above it. `--navy` `--ink` `--slate` `--ivory` `--ivory-2` `--line` `--sage` `--sage-soft` `--sage-deep` `--gold` `--gold-soft`; fonts `--serif` (Cormorant Garamond) and `--sans` (DM Sans). |

**One thing the recon turned up that was already wrong:** `MobileCtaBar`'s
docstring said ≤760px, an existing comment in `globals.css` said the launcher
yielded at ≤760px, but the surrounding `@media` block I first read the
`.cta-bar` rules out of looked like `(max-width: 1060px)`. The rules are
actually inside a `(max-width: 760px)` block that starts at line 664 and runs
to line 916. I built against 1060 first and the self-check caught it at 768px
— the CTA bar was claiming the bottom of the screen at a width where CSS had
it at `display: none`, which blanked the ask bar across the whole homepage
with nothing visibly wrong to see. It is 760 now in both places, and both
places say so in a comment that names the other.

---

## 3. Prefill: yes

The bot is ours, so this is not a vendor API question. The path is:

```
StickyAskBar        openAssistant(draft)          BottomBarContext
   (Enter / tap) ──────────────────────────────▶  { text, nonce }
                                                        │
SiteAssistant  ◀────────────────────────────────────────┘
   effect on assistantRequest → setOpen(true), park text in a ref
   effect on open             → submit(text)  ── the same submit() the
                                                 panel's own composer uses
```

It reaches `/api/chat` as an ordinary visitor message — same shape, same
safety and refusal path, same session handling — because it *is* one. There
is no separate prefill endpoint and no vendor code touched.

The `nonce` is there so asking the same question twice in a session still
fires; the ref is cleared before the send so a re-render mid-flight cannot
post it twice.

---

## 4. Files changed

**New**

| File | What it is |
| --- | --- |
| `components/BottomBarContext.tsx` | The single "which bottom bar is active" source of truth. One reducer, plus the shared scroll listener that drives collapse/expand. |
| `components/BottomBarDock.tsx` | The one fixed footprint. Renders both bars into a single grid cell. |
| `components/StickyAskBar.tsx` | The ask bar: the input, the rotation, the open. |

**Modified**

| File | Change |
| --- | --- |
| `app/layout.tsx` | Wraps the body in `BottomBarProvider`; mounts `BottomBarDock` last. |
| `components/MobileCtaBar.tsx` | Reports to the controller instead of setting a body attribute nobody owned; portals its markup into the dock; reads the 760px breakpoint in JS so it cannot claim a footprint it does not have. Keeps its own scroll logic and its homepage-only scope. |
| `components/SiteAssistant.tsx` | Consumes the open request and the prefill; reports `open` to the controller; launcher retired behind `SHOW_LEGACY_LAUNCHER`. **Second pass:** the composer's focus moved from a passive effect to a layout effect, so it lands inside the tap gesture and iOS actually raises the keyboard. |
| `components/StickyAskBar.tsx` | **Second pass:** `onPress` splits touch from mouse (§5.1). |
| `app/globals.css` | New "BOTTOM BAR DOCK" section at the end (~185 lines). Nothing above it was deleted. **Second pass:** `.assistant-compose input::placeholder` `#a6adb4` → `var(--slate)`. |
| `app/page.tsx` | **Second pass:** `trisha.jpg` `sizes` corrected (§8). |
| `README.md` | New "The bottom of the screen" section; component table updated. |

**Deliberately not deleted:** the launcher button, its CSS
(`.assistant-launcher`, `.assistant-wave`, the parked/hidden rules), the
`AssistantWave` glyph, the arrival timing, the footer-parking observer, and
`body[data-cta-bar]` (which `MobileCtaBar` still sets purely so the old yield
rule still works). Flip `SHOW_LEGACY_LAUNCHER` to `true` in
`components/SiteAssistant.tsx` and the pill comes back.

---

## 5. Judgement calls

Everything here I decided rather than asked. Ordered by how likely you are to
want to change it.

**1. A press is read by input device, not by screen size.** *(Rewritten this
pass — the first version opened the panel for every pointer, which made the
field an affordance a mouse could never type into.)*

`StickyAskBar.onPress` asks one question — was this a finger? — and branches:

| | what a press does | why |
| --- | --- | --- |
| **Touch / pen** | straight to the panel; this field never takes the caret | a finger has no caret and no keyboard of its own, so there is exactly one place worth putting focus, and it is the composer |
| **Mouse on the strip** | focus this field, place a caret | the cream either side of the field *is* the field as far as anyone looking at it is concerned |
| **Mouse on the field** | left entirely alone | so the caret lands where the click did |
| **Mouse on the arrow** | send | it reads as "send" and has to keep meaning it |
| **Keyboard** | untouched | Tab fires no pointer event; Enter sends |

The question is answered from `event.pointerType` first, falling back to a
`(pointer: coarse)` media query when the event will not say. `pointerType` is
the better of the two and it is why it is first: on a touchscreen laptop the
*primary* pointer is a mouse, so the media query answers "fine" for a press
that was a finger — the event knows, and the device profile does not. A width
breakpoint would have been wrong in both directions (a 1280px touchscreen, a
390px browser window on a desktop), which is why there isn't one.

A stylus is grouped with touch. It is precise, but it arrives with a
touchscreen and no keyboard, so the composer is still where its owner wants
the caret to end up. Say the word if you would rather pen behaved as fine.

*Side effect worth knowing:* on touch the press is prevented, so dragging on
the expanded bar does not scroll the page — same as any fixed opaque bar. On
a mouse nothing is prevented over the field itself, so text selection inside
it behaves normally.

**1b. The panel's composer focus is now a layout effect, and that is
load-bearing on iOS.** Safari only raises the on-screen keyboard for a
`focus()` that happens inside a user gesture. React flushes a discrete event's
state update synchronously, so a layout effect still runs inside the
pointerdown that opened the panel, while a passive effect is scheduled for
after paint and lands outside it. With the passive version the caret appeared
and the keyboard did not — precisely the half-working state a bar that looks
like a text field must not produce. `useFocusEffect` in `SiteAssistant.tsx`
swaps to `useEffect` on the server so SSR does not warn.

**2. The bar does not hide at the footer.** The old launcher parked itself as
the footer arrived, because a corner pill sat on the disclaimer. The brief
says the ask bar persists across all pages and scroll and yields only to the
call bar, so it does not park. Instead `footer.site` gains `--bottombar-h` of
bottom padding (via `body[data-bottombar]`, so a build with the flag off and
no call bar lays out exactly as it does today) and every line can be scrolled
clear of the bar. If you want parking back, it is the same
`IntersectionObserver` pattern, now living in the controller rather than in
two components.

**3. Gold appears in exactly one place: the focus ring.** The brief says no
gold. The site's focus ring is gold on every focusable element sitewide, and I
judged one consistent ring worth more than a pure palette here — it is an
accessibility convention rather than an accent. Everything decorative is
`--ivory-2` ground / `--ivory` field / `--slate` placeholder / `--sage-deep`
mark and arrow / `--sage-soft` arrow disc / `--line` borders. No new colour
values anywhere. If you want the ring off gold too, it is one declaration in
the `.askbar:focus-within` rule.

**4. Placeholder colour is `--slate` in both fields now.** The ask bar's is
**5.36:1** on `--ivory`; the assistant composer's, fixed this pass, is
**5.69:1** on white. They were deliberately made the same token so the two
fields read as the same field. Full audit in §7.

**5. The rotation pauses on hover and focus, and stops permanently on typing —
but it also pauses while the call bar has the footprint.** Nothing is
rotating that anyone can see at that moment, and it resumes where it left off.

**6. Collapse/expand is driven by accumulated scroll distance (24px), not a
frame-to-frame delta.** The first version used an 8px jitter epsilon and the
self-check caught it at 390px: a ~10px settle-back after a jump read as
"scrolled up" and popped the full bar open. Scroll anchoring and iOS
rubber-band do the same thing on a real device. Direction now has to be earned
over 24px, and a direction change resets the run.

**7. Under `prefers-reduced-motion` the collapse still happens, it just does
not animate.** The brief mandates no animation, not no behaviour, and freezing
the bar at full height would occlude more, not less.

**8. The CTA bar's entrance changed slightly.** It used to fade *and* rise
14px over 300ms on its own. Now the shared layer crossfades it over 200ms with
no rise — because a rise is exactly what makes a swap read as two elements
rather than one bar changing state. Its resting geometry (12px gutters, 10px
lift, 52px tall, safe area) is unchanged.

**9. Reserved height is a CSS constant (`--bottombar-h: 72px`), not measured.**
It has to stay put while the ask bar collapses, or the page would twitch on
every scroll. 72px is the call bar's natural height (52 + 10 + 10), and the
ask bar is built to it.

**10. The ask bar is server-rendered rather than deferred.** The launcher
deliberately waited for idle + 1400ms so it would not compete with LCP. This
is persistent page chrome, like the header, so it is in the HTML from first
paint — no pop-in, no CLS. The assistant *panel* is still lazy: it does not
exist until it is opened. Bundle cost measured at **+1 kB** first-load JS
(138 → 139 kB shared).

**11. No PHI, as specified.** The field is an unnamed `type="text"` input with
`autocomplete="off"`, `maxlength=2000`, nothing persisted client-side, and its
contents go to `/api/chat` exactly as a message typed into the assistant's own
composer would — through the same `lib/chat/safety.ts` gate.

---

## 6. Verification

**Green:** `npm run lint`, `npx tsc --noEmit`, `npm run build`,
`npm run check:index`.

**Behavioural self-check — 132 assertions, 0 failures** (was 108; the pointer
matrix added 24). Driven through the repo's own CDP harness
(`scripts/layout/cdp.mjs`), at 390 / 768 / 1280 across `/`, `/faq` and
`/first-visit`. It covers: real `<input>` with an aria-label and a rounded
field; first placeholder on every cold load; rotation at 4s; pause on hover
and resume on leave (skipped at touch-emulated widths, which report no hover
at all — the assertion only means something where there is a pointer); typing
stopping it for good; collapse and expand; the reserved height not moving when
it collapses; full-bleed and flush to the bottom; no horizontal overflow;
measured placeholder contrast; the CTA bar taking the footprint and the ask
bar yielding with *both bars measured at the same rect*; never both visible;
the ask bar returning on scroll-up; footer copy clearing the dock at page end;
the dock retiring while the panel is open; and reduced motion producing no
rotation and a 0s transition.

**The pointer matrix runs at every width**, with `pointerType` set explicitly
on each event so the same eight assertions run at 390, 768 and 1280 — this is
a device question, so the test had to be one too, not a width sample. Per
width: touch opens the panel · touch lands focus in the panel's composer ·
touch opens with no prefill when nothing was typed · mouse on the strip does
*not* open · mouse on the strip puts the caret in the bar · typing after a
mouse click stays local · Enter after a mouse click opens · the mouse-typed
text arrives as the first visitor message · mouse on the field itself does not
open · mouse on the arrow does.

**Contrast audit — 14 of 14 text and placeholder colours pass**, in four panel
states. §7.

**Breakpoint audit — 6 of 6**, each pair asserted at both sides of its
boundary. §8.

Three of the failures these found were real bugs in my code — the 760/1060
breakpoint, the scroll epsilon, and the `sizes` attribute — all fixed. None of
the three scripts is committed: they are throwaway, and they stub `/api/chat`
so no model calls or Supabase writes happen. Say the word if you want them in
`scripts/`.

**Repo layout audit:** `npm run check:layout -- --widths 320,390,768,834,1280`
across all 35 routes — 175 combinations, clean.

**Not run, deliberately:** `npm run check:chat` and `npm run check:answers`.
Both hit live models, and `check:chat` inserts real Supabase rows and sends
real notification mail. Nothing on this branch touches the answering path.

---

## 7. Contrast audit — ask bar + assistant panel

Measured in a browser, not by eye: every element in either surface, walked in
four states (bar at rest, panel on the greeting, mid-conversation, and the
`ended` panel), with each colour resolved against the background it is
actually painted on and checked against the threshold WCAG asks for at that
size and weight.

### Fixed

| What | Was | Now |
| --- | --- | --- |
| `.assistant-compose input::placeholder` | `#a6adb4` on white — **2.27:1** | `var(--slate)` — **5.69:1** |

That was the only failing piece of type in either surface. `#a6adb4` is a grey
that arrived with the widget and belongs to no palette here; `--slate` is the
site's own secondary-text token and is what the ask bar's placeholder already
used, so the two fields now match.

### Everything else, passing

`.askbar-input::placeholder` 5.36:1 · `.assistant-sub` 4.92:1 ·
`.assistant-ended` 4.92:1 · `.assistant-chip` 12.33:1 · `.assistant-title`
12.47:1 · assistant bubbles 10.81:1 · visitor bubbles 13.60:1 · inline links
11.91:1 / 12.47:1 · Send button 13.60:1. **14 of 14 text and placeholder
colours clear 4.5:1.**

### Found, not fixed — both non-text, both yours to call

These are graphics, not type, so the bar is 3:1 (SC 1.4.11) rather than 4.5:1,
and both are design decisions rather than oversights. I did not want to
redesign either one inside a branch about the bottom bar.

**1. The typing indicator — `.assistant-typing span`, 1.31:1 at rest.**
Sage-deep at `opacity: 0.22` on the sage bubble. It breathes to `0.72`
(**2.76:1**) and under `prefers-reduced-motion` the animation stops at `0.5`
(**1.94:1**), so it is under 3:1 at every point in its cycle. The information
is also carried by `aria-label="Typing"`, so screen readers are fine — this is
purely about whether a low-vision visitor can see that a reply is coming.
*Proposed fix:* the dots need **0.8** to clear 3:1 (3.16:1), which means
`0%, 72%, 100% { opacity: 0.8 }` and a `1.0` peak — a much more present
indicator than the one that was designed. The `translateY(-2.5px)` bounce
carries most of the "typing" reading anyway, so it would still work. One
number in `@keyframes assistant-breathe` plus the resting value plus the
reduced-motion `0.5`. Say go and it is a two-line change.

**2. The avatar's gold ring — `.assistant-avatar svg`, 2.97:1.** The 0.9px
gold stroke around the sage waveform, on `--ivory-2`. Three hundredths under,
and it is pure decoration next to the word "Assistant", which is what actually
identifies the panel — 1.4.11 exempts decoration explicitly. Clearing it would
mean inventing a darker gold, which is the palette rot the launcher's own
comments warn about. **Recommend leaving it.**

### Found outside the scope you named

`.form input::placeholder, .form textarea::placeholder` is the same
`#a6adb4` at the same **2.27:1**, on the contact form — the site's primary
lead capture. Identical defect, identical one-line fix (`var(--slate)`), but
it is not the ask bar or the assistant panel, so I left it rather than widen
this diff. It is the highest-value of the three unapplied items.

---

## 8. Breakpoint sweep

Every place a width is written in TS and again in CSS is a place the two can
drift with nothing visibly wrong to see. Each pair was tested at **both sides
of its boundary**, asserting the JS behaviour and the CSS rule flip together.

| Pair | JS | CSS | Verdict |
| --- | --- | --- | --- |
| CTA bar visibility | `MobileCtaBar.CALL_BAR_QUERY` | the `@media` block giving `.cta-bar` its `display: flex` | **agree** at 760 and 761 *(this is the one that was broken; fixed last pass)* |
| Assistant body scroll-lock | `matchMedia("(max-width: 760px)")` in `SiteAssistant` | the block turning `.assistant-panel` into a full-height sheet | **agree** at 760 and 761 |
| Assistant short placeholder | `SiteAssistant.NARROW_QUERY` | the `@media (max-width: 360px)` block tightening `.assistant-compose` | **agree** at 360 and 361 |

**No other behavioural gate carries an independent width number.** `Header`
applies `.tucked` / `.scrolled` at every width and lets CSS be the only gate —
safe by construction, nothing to drift. `ConcernRail` measures its own element
rather than the viewport. `BottomBarContext`'s constants are scroll distances,
not widths. The remaining `matchMedia` calls are `prefers-reduced-motion` and
the new `(pointer: coarse)`, neither of which is a width.

### The one other real defect: `sizes` attributes

A `sizes` attribute is a width written in TSX whose counterpart is the CSS
grid, so it is the same class of drift one flight down. I swept every `<img>`
on nine routes at 390 / 834 / 1280, comparing the width `sizes` claims against
the width the stylesheet actually gives the element.

**Fixed — `app/page.tsx`, the Trisha Yearwood video still:**

```
sizes="220px"  →  sizes="(max-width: 760px) 100vw, 220px"
```

220px is only true above 760. Below it, `globals.css` gives `.celeb-video`
`width: auto; align-self: stretch; margin: 0 -24px` and it goes full-bleed. The
browser was fetching a **256px-wide source for a 390px slot** — 780px-worth at
2× DPR — which made it the blurriest image on the site, on a phone, in the
celebrity band. Invisible at desktop, where the attribute was written. Same
breakpoint number as the rule that causes it, stated in a comment beside it.

**Found, not fixed — seven over-declarations.** `founder.jpg` (`200px` for a
106px slot), the Nashville gallery (`33vw` for 204/312px), the About team
portraits (`25vw` for 245px). Over-declaring makes the browser pick a *larger*
source than it needs: bytes, not blur, and in every case the file it lands on
is small. These are a perf pass, not a correctness one, and tuning them
belongs in its own branch. Full list in the PR.

---

## 9. Constraints

- Nothing merged, nothing deployed.
- `.env.local`, `.env.example` and deploy config untouched. No credentials
  read into anything, nothing committed (`.env*` is gitignored).
- Old launcher intact and one boolean from returning.
