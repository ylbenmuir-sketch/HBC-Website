# 10-Year Giveaway — the copy deck

Every word the giveaway says, in reading order, for Ben to mark up. The
source of truth is `lib/giveaway/copy.ts`; this file is the same words laid
out as a person will meet them. Facts (prizes, times, counts, codes) are
never typed into the copy — they come from `lib/giveaway/config.ts` and are
filled in at render time. Each block below says which parts are filled in,
and shows one filled example using the real config.

**Status: every string ships as `[DRAFT]`.** In `copy.ts` each string is
wrapped in `D("…")`, which prefixes "[DRAFT] " to it, and the sender
(`lib/giveaway/send.ts`) refuses to send a `[DRAFT]` subject outside a
testing environment. The text below is shown *without* the prefix.

**How approval works.** Mark this deck up. For each string you approve, the
`D("…")` wrapper is removed in `copy.ts` and the plain string stays. When
every `D()` is gone, `COPY_IS_DRAFT` at the top of `copy.ts` is set to
`false`. Until then nothing can be sent for real. Strings you change here are
changed there; nothing else moves.

---

## Voice and claims (how these were written)

- **You are the hero, we are the guide.** Every email opens on the reader
  (their name, their entry, their prize), then says the one thing to do.
- **Lead with the prize and the next drawing.** Subjects name the prize.
  Bodies name the next drawing and when it is.
- **One clear button.** Each email asks for one tap. (The "You're in" email
  carries two — share link and free visit — because the plan puts both in
  it; see the question at the end.)
- **Honest urgency only.** Entering earlier means more drawings, because
  every entry counts in every drawing still to come, and the drawings are on
  fixed days. No countdowns, no "last chance" that isn't.
- **No outcomes, no medical claims.** Prizes are described by what is *in*
  them — a Brain Map, sessions, the vibro chair, a Hoolest device — never by
  what they will do for anyone. The thank-you offer is "a Brain Map and
  consultation", nothing more.
- Plain words, US spelling, straight apostrophes in `copy.ts` (the site's
  HTML uses curly ones; the email templates escape as needed).

---

## Shared fragments (used inside several emails)

| Key | Text |
|---|---|
| `existingClientForward` | Already a client? Forward this to a friend — the code works for whoever books with it. *(Ben's words, decision 15 — verbatim.)* |
| `whyYouGotThis` (marketing emails) | You're getting this because you signed up for the 10-year giveaway at *harmonizedbraincenterstn.com*. |
| `whyYouGotThisTransactional` | You're getting this because you entered the 10-year giveaway at *harmonizedbraincenterstn.com*. |
| `unsubscribe` | Unsubscribe |
| `chairNote` | Every session includes the vibro chair. |
| `partnerLine` | Plus from *{partner}*: *{prize}*. — or, with no prize text: Plus a prize from *{partner}*. *(Only renders once a partner's name is set in config; today none is.)* |
| `offerLine` | A free Brain Map and consultation. Book by *{Dec 5}*; come in any day through *{Dec 31}*. |
| `offerBonus` | Start the in-center *{12}*-session package at that visit and the *{13}*th session is free. |
| `offerConcierge` *(not yet rendered anywhere)* | Concierge visits: the first visit is free too. The travel fee still applies, and the package bonus is in-center only. |
| `yourCode` | Your code |

Every visitor email ends with the identity line from `lib/sms-identity.ts`
(not copy): **Harmonized Brain Centers · 197 Thompson Ln, Suite S,
Nashville, TN 37211**, then the "why you got this" line, then — on marketing
emails only — the Unsubscribe link.

---

## The emails

### 1. Notify-me verification *(transactional; after the notify-me form)*

- **Subject:** Confirm your email — the 10-year giveaway
- **Preview:** One tap and you're on the list.
- **Heading:** *{Sarah}*, you're almost on the list. *(no name: "You're almost on the list.")*
- **Body:** Tap the button to confirm it's you. Then, the moment entries open, you get one email with one button — and that button is your entry.
- **Button:** Confirm my email
- **Small print:** Didn't sign up? Ignore this and nothing happens.
- **Footer:** identity line · transactional "why you got this".
- **From config:** nothing beyond the first name.

### 2. "It's live" *(marketing; Sun Nov 15, 6:00 pm CT, to verified notify-me signups)*

- **Subject:** It's live. Monday's prize: *{Brain Map + 2 sessions}*
- **Preview:** One tap enters you in every drawing this week.
- **Heading:** *{Sarah}*, it's live.
- **Body:** One tap and you're in every drawing this week. First up, *{Monday at noon}*: *{Brain Map + 2 sessions}*.
- **Partner line** *(only when Monday's partner is named)*: Plus from *{partner}*: *{prize}*.
- **Small print 1:** Tap before that first drawing and you get a bonus entry.
- **Button:** Enter me — one tap
- **Small print 2:** Nothing to fill in — your details are already on file from your signup.
- **Footer:** identity line · marketing "why you got this" · Unsubscribe.
- **From config:** the first drawing's day and time (spoken from the schedule), its prize in the reader's version (new client / current client, from the "already a client" box). The word "Monday's" in the *subject* is typed, because the subject builder is handed only the prize name.

### 3. Monday reminder *(marketing; Mon Nov 16, 9:00 am CT, to signups who have not tapped)*

- **Subject:** Today at noon: *{Brain Map + 2 sessions}*. You're not in yet.
- **Preview:** One tap and you're in today's drawing.
- **Heading:** *{Sarah}*, you're not in yet.
- **Body:** *{Monday}*'s drawing is today at noon — *{Brain Map + 2 sessions}*. One tap puts you in it, and in every drawing after.
- **Button:** Enter me — one tap
- **Footer:** identity line · marketing line · Unsubscribe.
- **From config:** the first drawing's day name and prize (reader's version). "Today at noon" is typed: this email is scheduled for the morning of the first drawing, and the engine test checks for that phrase.

### 4. Entry verification *(transactional; after the live entry form)*

- **Subject:** Confirm your entry — the 10-year giveaway
- **Preview:** Tap to confirm and you're in.
- **Heading:** *{Marcus}*, one more tap.
- **Body:** Tap the button and your entry counts in every drawing still to come. Unconfirmed entries can't be drawn.
- **Button:** Confirm my entry
- **Small print:** Didn't enter? Ignore this and nothing happens.
- **Footer:** identity line · transactional line.

### 5. "You're in" *(transactional; after a confirmed entry or a one-tap)*

Tightest email on a phone (796 of 844 px at 390 wide), so these strings may
get shorter but not longer.

- **Subject:** You're in. Here's your share link and your free first visit.
- **Preview:** The next drawing, your share link, your free first visit.
- **Heading:** *{Sarah}*, you're in.
- **Body:** Next drawing: *{Tuesday at noon}* — *{Brain Map + 3 sessions}*. Your entry counts in it and every one after. *(after the last drawing: "Your entry counts in every drawing still to come.")*
- **Partner line** *(only when that drawing's partner is named)*.
- **Bonus line** *(only when they came through a friend's link)*: A friend's link brought you here, so you start with a bonus entry.
- **Panel — heading:** Add entries
- **Panel — body:** Share your link. Each friend who enters and confirms adds *{3}* entries for you and *{1}* for them, up to *{10}* friends.
- **Panel — button:** Share my link *(the link itself is printed under it)*
- **Offer panel — heading:** Your first visit is on us
- **Offer panel — body:** A free Brain Map and consultation. Book by *{Dec 5}*; come in any day through *{Dec 31}*. Start the in-center *{12}*-session package at that visit and the *{13}*th session is free.
- **Offer panel — code:** Your code · *{10Y-R8TN4W}*
- **Offer panel — existing clients only:** Already a client? Forward this to a friend — the code works for whoever books with it.
- **Button:** Book my free first visit
- **Footer:** identity line · transactional line.
- **From config:** next drawing (day, time, prize in the reader's version), referral numbers, offer dates, package size, the personal code, the share link.

### 6. Daily afternoon *(marketing; Mon–Fri 4:00 pm CT, to every subscribed entrant)*

- **Subject:** *{Tuesday}*'s prize: *{Brain Map + 3 sessions}* — Friday's reads *{Saturday}*'s grand prize: *{…}*
- **Preview:** Today's drawing is done. Here's what's next.
- **Heading:** Today's drawing is done and the winner is being called.
- **Body:** Next drawing: *{Tuesday at noon}* — *{Brain Map + 3 sessions}*.
- **Partner line** *(when named)*.
- **Count line:** You have *{4}* entries. Share your link to add more. *(1 → "1 entry")*
- **Button:** Share my link
- **Footer:** identity line · marketing line · Unsubscribe.
- **From config:** next drawing's day, time and prize (reader's version), the reader's entry count.
- Heading, body and count line follow the shape in decision 15 word for word; no winner name anywhere.
- Filled example, Friday's email to a current client: Subject "Saturday's grand prize: 13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner" · Body "Next drawing: Saturday at 5:00 pm — 13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner."

### 7. Winner *(transactional; the moment they are drawn)*

- **Subject:** You won *{Monday}*'s drawing
- **Preview:** We'll call you. Tap to give us the best number.
- **Heading:** *{Sarah}*, you won.
- **Body:** Your prize: *{Brain Map + 2 sessions}*.
- **Partner line** *(when named)*.
- **Small print:** Every session includes the vibro chair.
- **Call line:** We'll call to set it up. Tap below and give us the best number by *{Thu Nov 19, 12:00 PM CT}* — after that, the prize is redrawn.
- **Tax line** *(only when the prize's computed value is over the config threshold)*: Because of this prize's value, a short tax form is part of claiming it. We'll walk you through it on the call.
- **Public line:** On the call we'll ask whether we may post your first name, last initial and city on the winners list. Saying no is fine.
- **Button:** Claim my prize
- **Footer:** identity line · transactional line.
- **From config:** day name, prize in the winner's version, the claim deadline (72 h, or the following Tuesday 5:00 pm CT when it would land on a Sunday or Monday), the tax flag.
- Filled example, the grand prize to a current client: "Your prize: 13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner." · "…give us the best number by Tue Nov 24, 5:00 PM CT…" · tax line shown.

### 8. Thank-you + offer *(marketing; Sun Nov 22, 10:00 am CT, to everyone not holding a prize)*

- **Subject:** Thank you — and your first visit is on us
- **Preview:** A free Brain Map and consultation, with your code.
- **Heading:** *{Sarah}*, thank you.
- **Body:** Ten years in, and this week was one of our favorites. Your name wasn't drawn, and we'd still like to meet you — so your first visit is on us.
- **Offer panel:** as in email 5 (heading, body, code, the forward line for existing clients).
- **Button:** Book my free first visit
- **Footer:** identity line · marketing line · Unsubscribe.

### 9. Staff: winner drawn *(to GIVEAWAY_ALERTS, or GIVEAWAY_ALERTS_OWNER on Monday and Saturday)*

- **Subject:** 10 years — *{Saturday}* GRAND PRIZE — *{Sarah Mitchell}* · daily: 10 years — *{Monday}* winner — *{name}*
- **Preview:** *{name}* · *{prize}*
- **Eyebrow:** *{Saturday}*'s grand prize winner · daily: *{Monday}*'s winner
- **Then:** the winner's name, email, city and ZIP.
- **Fact grid labels:** Prize · Version *(New client / Current client)* · Call by *{Tue Nov 24, 5:00 PM CT}* · Tax form: "Required — mark received in admin" or "Not required" · Partner prize *(when named)*
- **Button:** Open in admin
- **Footer:** Three call attempts, one per day, voicemail each time. Mark contacted in admin after the first conversation. · Drawn *{Mon Nov 16, 12:00 PM CT}*
- Change from the first draft: the tax line no longer types "$600" — the threshold lives in config.

### 10. Staff: Tuesday "call today" *(Tue 8:30 am CT; skipped when Monday's winner is marked contacted)*

- **Subject:** 10 years — Monday's winner still needs a call — *{Sarah Mitchell}*
- **Eyebrow:** Call today: Monday's winner
- **Then:** name, email, city and ZIP.
- **Body:** Monday's winner hasn't been marked contacted yet. Please call this morning, then mark the row in admin.
- **Fact grid:** Prize *{Brain Map + 2 sessions}* · Call by *{Thu Nov 19, 12:00 PM CT}*
- **Button:** Open in admin
- **Footer:** Sent *{Tue Nov 17, 8:30 AM CT}*

---

## The page: /10years

Eyebrow on every giveaway page: **Ten years**

### Mode 1 — notify-me (Nov 9 – Nov 15)

- **H1:** Ten years of Harmonized Brain Centers. A week of prizes to say thank you.
- **Sub:** Entries open *{Sunday at 6:00 pm}*. Sign up now and, the moment they do, one tap puts you in every drawing — with a bonus entry if you tap before the first one. Monday's prize: *{Brain Map + 2 sessions}*.
- **Form title:** Get the one-tap entry
- **Button:** Put me on the list
- **After submit:** Check your inbox — tap the link to confirm, and you're on the list.
- **Already signed up:** You're already on the list. Watch for the one-tap entry when entries open.
- **From config:** the entries-open time, Monday's new-client prize. "Monday's" is typed here (the builder is handed the open time and the prize, not the drawing).

### Mode 2 — live (Nov 15 – Nov 21)

- **H1:** Six drawings this week. One entry counts in every one still to come.
- **Sub:** Next drawing: *{Tuesday at noon}* — *{Brain Map + 3 sessions}*. Enter now and you're in it, and in every drawing after.
- **Form title:** Enter the giveaway
- **Referral note** *(when ?ref= is on the URL)*: You came through a friend's link: confirm your entry and you both get bonus entries.
- **Button:** Enter me
- **After submit:** Check your inbox — tap the link to confirm your entry. Unconfirmed entries can't be drawn.
- **Already in:** You're already in. Watch your inbox each afternoon for the next drawing.
- "Six" is typed (the page has six drawings in config; the heading builder takes no count).

### Mode 3 — closed (Nov 21 – Dec 5)

- **H1:** Entries are closed. Thank you, Tennessee.
- **Sub:** Every entrant has a thank-you in their inbox: a free first visit, any day through *{December 31}*. Winners appear below once they've said we may post their name.
- **Button:** Talk with our team *(to /contact)*

### Mode 4 — thank-you page (after Dec 5, permanent)

- **H1:** Ten years. Thank you.
- **Sub:** Here's who won our anniversary week. The door is always open for a first conversation.
- **Button:** Talk with our team

### The form (modes 1 and 2)

Labels: **First name** · **Last name** · **Email** · **ZIP code (Tennessee)**
Checkboxes: **I'm 18 or older** (required) · **I've read the Official Rules** (required; link text **Official Rules**) · **I'm already an HBC client** · **Yes, send me news from Harmonized Brain Centers after the giveaway**
Hidden honeypot label (never seen): Website

**Error messages**

| When | Text |
|---|---|
| name missing | Please add your first and last name. |
| bad email | That email address doesn't look right. |
| bad ZIP | Please add your five-digit ZIP code. |
| ZIP not Tennessee | Thanks for wanting in — this one's for Tennessee residents. If that's you and we got the ZIP wrong, check the five digits and try again. |
| age unticked | You need to be 18 or older to enter. |
| rules unticked | Please read and accept the Official Rules. |
| rate limited | Too many tries from this connection. Please wait a little and try again. |
| email failed | We couldn't send the confirmation email just now. Please try again in a minute. |
| entries closed | Entries have closed — thank you for wanting in. |
| anything else | The giveaway isn't available right now. Please try again shortly. |

### The prizes section

- **Title:** The prizes
- **Intro:** One winner a day, Monday to Friday, and the grand prize Saturday. Every prize comes in two versions — one for new clients, which starts with a Brain Map, and one for current clients — and every session includes the vibro chair.
- **Column heads:** New client · Current client
- **Partner line under a prize** *(when named)*: Plus from *{partner}*: *{prize}*
- The table rows (day, time, both prize names) come straight from config.
- Change from the first draft: the intro said current clients "get an extra session instead" — true only of the grand prize, so it now just says there are two versions.

### On-page Q&A — "How it works" (stands in for the chat assistant Nov 9 – Dec 5)

1. **How do I enter?** Fill in the form, then tap the link in the email we send you. That's your entry, and it counts in every drawing still to come. Free to enter, nothing to buy. One entry per person; Tennessee residents 18 and over.
2. **How do I get more entries?** Share your personal link. Each friend who enters and confirms gives you *{3}* more entries and gives them *{1}*, up to *{10}* friends.
3. **When are the drawings?** Daily drawings at noon Central: *{Monday, Tuesday, Wednesday, Thursday, Friday}*. The grand prize is drawn *{Saturday at 5:00 pm}*, from every entry of the week.
4. **How will I know if I won?** We email you the moment you're drawn, then call to arrange your prize. You have *{72}* hours to get back to us (a little longer over the weekend); after that, we draw again.
5. **What's the thank-you offer?** Everyone who enters gets a free first visit — a Brain Map and consultation — booked by *{December 5}* for any day through *{December 31}*. Start the in-center *{12}*-session package at that visit and the *{13}*th session is free.

"noon Central" in Q3 is typed; the day list and the grand time are from config.

### Winners list — "This week's winners" (three states, decision 7)

| State | Text |
|---|---|
| named (public OK given) | *{Monday}*: *{Jane D., Franklin}* |
| claimed, no public OK | *{Monday}*'s winner: claimed ✓ |
| drawn, not yet reached | *{Monday}*'s winner has been drawn — we're reaching them now |
| not yet drawn | *{Tuesday}*: drawing *{Tue Nov 17, 12:00 PM CT}* |

The Saturday row is labelled *Saturday (grand prize)*.

### Verify page (/10years/verify, after the email link)

- Notify-me confirmed: You're on the list. When entries open you'll get one email with one button.
- Entry confirmed: You're in with *{1}* entry. Your share link and your thank-you code are in your inbox. *(2+ → "entries")*
- Bad or expired link: That link isn't valid or has expired. Enter again below and we'll send a fresh one.
- Hard-coded on the page, not in copy.ts: the H1 "Confirmed." / "Hmm." and the button "Back to the giveaway".

### One-tap page (/10years/enter/…, from the "It's live" button)

- Tapped: You're in. Your share link is on its way.
- Tapped before the first drawing: You're in — with an early-bird bonus entry. Your share link is on its way.
- Before entries open: Entries aren't open yet — this link works the moment they do.
- After entries close: Entries have closed — thank you for wanting in.
- Hard-coded on the page: the H1 "You're in." / "Not yet." and "Back to the giveaway".

### Claim page (/10years/claim/…, from the winner email)

- **H1:** *{Sarah}*, congratulations.
- **Body:** Your prize: *{Brain Map + 2 sessions}*. Give us the best number to call by *{Thu Nov 19, 12:00 PM CT}* and we'll set it up.
- **Tax line** *(when required)*: Because of this prize's value, a short tax form is part of claiming it — we'll walk you through it on the call.
- **Field label:** Best number to call · **Button:** That's my number
- **Done:** Got it. We'll call you from the center. On the call we'll ask whether we may post your first name, last initial and city.
- **Expired / redrawn:** The claim window for this prize has passed and the prize has been redrawn. Thank you for entering.
- **Bad link:** That claim link isn't valid.
- Hard-coded on the page: the empty-phone error "Please add a phone number we can call."

### Unsubscribe page (/unsubscribe, from any marketing email)

- **Title:** You're unsubscribed
- **Done:** You won't get any more giveaway emails from us. If you win a drawing you've already entered, we'll still reach you about that.
- **Already:** You were already unsubscribed. Nothing more to do.
- **Bad link:** This unsubscribe link isn't valid. It may have been cut short by your email app — try copying the whole link, or reply to any of our emails and we'll take care of it.
- **Unavailable:** Unsubscribing isn't available right now. Please try again in a few minutes, or reply to any of our emails and we'll take care of it.
- **Link:** Back to the site

### Admin screens (staff only; listed for completeness)

Sign in · Work email · Email me a code · "We emailed a six-digit code to *{email}*. It works for ten minutes." · Code · That address isn't on the admin list. · That code didn't work. Check it and try again, or request a new one. · Too many tries. Wait a few minutes and try again. · Signed in as · Sign out · Dashboard · Environment · Schedule (from config) · the two migration-status lines.

### Official Rules placeholder (/10years/rules — counsel's to replace)

Every paragraph is prefixed "[DRAFT — counsel to replace]" and the page
shows the rules version from config. Headings, with the facts each pulls
from config:

1. **Sponsor** — legal entity, DBA, registered address (from `lib/sms-identity.ts`)
2. **No purchase necessary**
3. **Eligibility** — Tennessee, 18+, employees excluded, current clients eligible
4. **Entry period** — entries open and close timestamps
5. **How to enter** — one entry per person; referral numbers (3 / 1 / cap 10); self-referral voids
6. **Drawings** — the six drawings with time and both prize versions; daily winners stay in the grand pool; odds statement
7. **Winner notification and claim** — 72 hours, the Sunday/Monday → Tuesday 5 pm rule, redraw, tax form over $600
8. **Publicity** — first name, last initial, city, only with the winner's OK on the call
9. **Thank-you offer** — free first visit (normally $150), book-by and visit-by dates, 13th-session bonus in-center only
10. **General** — governing law, liability, release, privacy link

---

## Questions for Ben

1. **Two buttons in "You're in".** The plan puts the share link and the free
   visit in the same email, so it has two buttons. If one button matters
   more than the rule's exception, say which comes first and the other goes
   to a text link.
2. **Grand-prize subject length.** Friday's daily email subject is the prize
   name: "Saturday's grand prize: 13 sessions + Hoolest handheld vagus nerve
   stimulator (to keep) + one service from every partner" (about 110
   characters; phones show ~40). A shorter *display* name for the grand
   prize would need a config change, not a copy change.
3. **Typed days and counts.** "Monday's prize" (It's-live subject, notify-me
   sub), "Today at noon" (Monday reminder), "Six drawings" (live H1), "Monday
   to Friday … Saturday" (prizes intro) and "noon Central" (Q&A) are typed
   because those builders are not handed a drawing. They match the schedule
   as decided; a schedule change would need them re-read.
4. **"Free to enter, nothing to buy"** was added to Q&A 1. Counsel's rules
   will carry the formal no-purchase statement; confirm the plain line is
   wanted on the page too.
5. **Marketing opt-in wording** ("Yes, send me news from Harmonized Brain
   Centers after the giveaway") is §8 legal item 5 — yours or counsel's to
   settle.
6. **"Hoolest handheld vagus nerve stimulator"** is the product's own name
   and appears in prize lists from config. It names a device, not a result;
   if you'd rather the public prize list said "Hoolest handheld device", that
   is a config change.
