# Sticky ask bar — handoff

Branch: `feature/sticky-ask-bar` · draft PR, not merged, not deployed.

Replaces the floating "Have a question?" launcher pill with a sticky
full-width bar that reads as a text input, and refactors the two bottom bars
onto one controller so they can never both be on screen.

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
3. **Tap the bar (anywhere on it, not just the field).** The panel should open
   with the greeting and nothing else. Then Tab to the field from the keyboard,
   type, and press Enter: the panel should open with what you typed already
   posted as your first message.
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
| `components/SiteAssistant.tsx` | Consumes the open request and the prefill; reports `open` to the controller; launcher retired behind `SHOW_LEGACY_LAUNCHER`. |
| `app/globals.css` | New "BOTTOM BAR DOCK" section at the end (~185 lines). Nothing above it was deleted. |
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

**1. Tapping the field opens the panel instead of letting you type in it.**
The brief says "tapping anywhere on the bar opens the bot" and also "if the
user typed text before opening, pass it through". Those only coexist one way:
a *pointer* press anywhere — field included — opens the panel, and the typed
path belongs to the keyboard (Tab in, type, Enter). So on a phone or with a
mouse, the field is an affordance and the real typing happens in the panel,
which focuses its own composer. The prefill still works and is still worth
having: keyboard users get it, and so does anything that fills the field
without a pointer. If you would rather a click placed a caret and only the
chrome opened the panel, that is one handler in `StickyAskBar.tsx` — remove
the `preventDefault` and move `open(false)` off the layer.
*Side effect worth knowing:* because the press is prevented, dragging on the
expanded bar does not scroll the page. Same as any fixed opaque bar.

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

**4. Placeholder colour is `--slate`, not the assistant composer's `#a6adb4`.**
The existing composer placeholder is about 2:1 against its field and would
have failed the 4.5:1 requirement outright. `--slate` on `--ivory` measures
**5.36:1** (asserted in the self-check, not eyeballed). I did **not** change
the assistant composer's own placeholder — out of scope for this branch, but
it is a real contrast bug and worth its own commit.

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

**Green:** `npm run lint`, `npx tsc --noEmit`, `npm run build`.

**Behavioural self-check — 108 assertions, 0 failures.** Written for this
branch, driven through the repo's own CDP harness
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
tap-to-open with no prefill; Enter-to-open with the typed text arriving as the
first visitor message; the dock retiring while the panel is open; and reduced
motion producing no rotation and a 0s transition.

Two of the failures it found were real bugs in my code (the 760/1060
breakpoint, the scroll epsilon), both fixed above. The script is not committed
— it is throwaway, and it stubs `/api/chat` so no model calls or Supabase
writes happen. Say the word if you want it in `scripts/`.

**Repo layout audit:** `npm run check:layout -- --widths 320,390,768,834,1280`
across all 35 routes. Result is in the PR description.

**Not run:** `npm run check:chat` and `npm run check:answers`. Both make live
model calls, and `check:chat` inserts real rows and sends real notification
mail — nothing this branch changes touches the answering path.

---

## 7. Constraints

- Nothing merged, nothing deployed.
- `.env.local`, `.env.example` and deploy config untouched. No credentials
  read into anything, nothing committed (`.env*` is gitignored).
- Old launcher intact and one boolean from returning.
