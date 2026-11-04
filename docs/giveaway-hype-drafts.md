# Drawing-week hype emails — DRAFTS for Ben (Nov 3, 2026)

> **BUILT (Nov 4, 2026).** These became the countdown emails: `EMAILS.hype`
> in `lib/giveaway/copy.ts` and `hypeEmail()` in `lib/giveaway/emails.ts`, on
> the Mon–Fri 4 pm and Sat 9 am jobs. GIVEAWAY-COPY.md §6 has the final words.
> Everything below is history.

**Not built (at the time).** Ben asked to see these before anything changes. Email only.

> **Rev 3 (Nov 3, latest): Ben's mockup.** The body is only: badge (5 DAYS,
> 4 DAYS, 3 DAYS, 2 DAYS, TOMORROW, TODAY, which are calendar days to Sat Nov 21) +
> $2,838.85 + "Grand prize · Saturday 5 PM"; photo slot; one bold opener of 8
> words or fewer; the 5-item checklist every day; a "Tomorrow · Noon" row
> (Mon–Thu); "You have {n} entries", "Share and get 3 more entries", one hint.
> Subjects: "5/4/3/2 days to the $2,838.85 grand prize", "Tomorrow at 5 PM: …",
> "Today at 5 PM: …". The footer is the address and Unsubscribe only. The
> wording is in `scripts/render-hype-previews.mjs`. The rev 2 note and the
> rev 1 text below are superseded.
>
> **Rev 2 (Nov 3, later):** the current wording and layout are in
> `scripts/render-hype-previews.mjs`, which is the source until Ben approves.
> It adds a $2,838.85 hero with a countdown badge, a prize photo slot, one
> opener per day, the checklist (Mon/Wed/Sat) or a one-line summary
> (Tue/Thu/Fri), a "Tomorrow at noon" card, "You have {n} entries" above
> "Share and get 3 more entries", and Friday's new sentence. Thursday's subject
> and heading changed to fit its 1 DAY badge. Render it with
> `node scripts/render-hype-previews.mjs` → `docs/hype-previews/index.html`
> (git-ignored). The text below is rev 1.
No winner names anywhere. Facts are from `lib/giveaway/config.ts`; `{n}` is
the entrant's own entry count and `[Share my link]` is their referral link,
as in today's daily email.

## What the existing "daily" email does today

- **When:** Mon–Fri at 4:00 PM CT (Nov 16–20), drained by the per-minute cron.
  No daily email goes out on Saturday.
- **To:** every verified entrant who hasn't unsubscribed (marketing email,
  with the unsubscribe link). Notify-me signups who never tapped their entry
  link aren't entrants, so they don't get it.
- **Says:** subject = the next drawing's prize ("Tuesday's prize: Brain Map +
  Skye Chiropractic gift + 1 BrainMD bottle"); heading "Today's drawing is
  done and the winner is being called."; "Next drawing: Tuesday at noon — …";
  the partner line when there is one; "You have {n} entries. Share your link
  to add more."; a **Share my link** button.
- **Problems:** it never mentions the grand prize or its value until Friday,
  and Thursday's and Friday's subjects are the full prize names (Friday's is
  200+ characters).

## The drafts (they replace the daily email's words; same send times)

Every one keeps the share button and the entry count. The "Tomorrow at
noon" line keeps the next daily prize in view.

### Mon Nov 16, 4:00 PM — 4 days to go

- **Subject:** 4 days until the $2,838.85 grand prize
- **Preview:** You're entered. It's drawn Saturday at 5 PM.
- **Heading:** You're in for Saturday.
- **Body:**
  Today's drawing is done, and we're reaching the winner now. Your entry is
  still in every drawing left, including the grand prize.

  On Saturday at 5:00 PM we draw the grand prize, worth $2,838.85: a Brain
  Map, 12 LENS sessions with a vibro chair session each, a Hoolest VeRelief
  vagus nerve stimulator, 3 Assisted Lymphatic Therapy sessions with Victoria
  Bailey of Envision Thermography & Wellness, and 3 BrainMD supplement
  bottles.

  Tomorrow at noon: a Brain Map, a $250 gift from Skye Chiropractic and a
  BrainMD bottle ($444.95).

  You have {n} entries. For each friend who enters through your link and
  confirms, you get 3 more entries (up to 10 friends) and they get a bonus
  entry.
- **Button:** Share my link

### Tue Nov 17, 4:00 PM — 3 days to go

- **Subject:** 3 days to the grand prize. Bring a friend in early.
- **Preview:** A friend who joins today is in four drawings.
- **Heading:** 3 days to go.
- **Body:**
  Today's drawing is done, and we're reaching the winner now. You're still
  entered for Saturday's $2,838.85 grand prize, drawn at 5:00 PM.

  Why share today: a friend who enters now is in four drawings, Wednesday
  through Saturday. Every friend who confirms adds 3 entries to yours.

  Tomorrow at noon: a Brain Map, 3 LENS sessions and a BrainMD bottle
  ($569.95).

  You have {n} entries.
- **Button:** Share my link

### Wed Nov 18, 4:00 PM — halfway

- **Subject:** Halfway there: $2,838.85 is drawn Saturday at 5 PM
- **Preview:** 2 days to go, and you're entered.
- **Heading:** Halfway there.
- **Body:**
  Today's drawing is done, and we're reaching the winner now. Three daily
  drawings down, two to go, then the grand prize on Saturday at 5:00 PM.

  Here's what's in it: 12 LENS sessions, each with a vibro chair session, a
  Brain Map, a Hoolest VeRelief vagus nerve stimulator, 3 Assisted Lymphatic
  Therapy sessions with Envision Thermography & Wellness, and 3 BrainMD
  bottles. $2,838.85 in all.

  Know someone who's been curious about a Brain Map? Send them your link.
  They get a bonus entry, and you get 3 more.

  Tomorrow at noon: a Brain Map, 3 LENS sessions, a Hoolest Mini vagus nerve
  stimulator and a BrainMD bottle ($668.95).

  You have {n} entries.
- **Button:** Share my link

### Thu Nov 19, 4:00 PM — 2 days to go

- **Subject:** 2 days to go: the grand prize is drawn Saturday at 5 PM
- **Preview:** You have {n} entries. Friends can add up to 30 more.
- **Heading:** 2 days to go.
- **Body:**
  Today's drawing is done, and we're reaching the winner now. One daily
  drawing left, then the $2,838.85 grand prize.

  You have {n} entries. Ten friends through your link would add up to 30
  more for Saturday.

  Tomorrow at noon: a Brain Map, 3 LENS sessions, a 90-minute women's health
  and life coaching session with Amabel Luers of Be Well with Amabel (the
  winner may gift it to a woman of their choice), and a BrainMD bottle
  ($819.95).
- **Button:** Share my link

### Fri Nov 20, 4:00 PM — tomorrow

- **Subject:** Tomorrow at 5 PM: the $2,838.85 grand prize
- **Preview:** Last full day for friends to get in.
- **Heading:** Tomorrow at 5.
- **Body:**
  Today's drawing is done, and we're reaching the winner now. That was the
  last daily drawing. Tomorrow at 5:00 PM we draw the grand prize from every
  entry of the week, yours included.

  Last chance to share: friends must enter and confirm before 5:00 PM
  tomorrow to be in the drawing and add their 3 entries to yours.

  Then on Saturday at 7 PM, every entrant gets a thank-you gift by email.

  You have {n} entries.
- **Button:** Share my link

### Optional: Sat Nov 21, 9:00 AM — today (a NEW send, not built)

The daily email doesn't go out on Saturday today, so this would be one new
scheduled job. Say yes or no.

- **Subject:** Today at 5 PM: the $2,838.85 grand prize
- **Preview:** You're entered with {n} entries.
- **Heading:** Today's the day.
- **Body:**
  The grand prize is drawn at 5:00 PM today: 12 LENS sessions, each with a
  vibro chair session, a Brain Map, a Hoolest VeRelief vagus nerve
  stimulator, 3 Assisted Lymphatic Therapy sessions with Envision
  Thermography & Wellness, and 3 BrainMD bottles. $2,838.85 in all.

  You're entered with {n} entries. Friends can still get in until 5:00 PM.
  If you win, our team will call and email you.

  At 7 PM tonight, look for your thank-you gift.
- **Button:** Share my link

## Notes for the build (once approved)

- The values, times, day counts and prize names come from config, not typed.
  "4 days" etc. would be computed from the send time to the grand drawing.
- "We're reaching the winner now" replaces "the winner is being called"
  (staff call and email; no winner email).
- The thank-you gift is still unnamed before the reveal (standing rule 5).
- Short subjects also fix the 200-character Friday subject (handoff open
  item 7).
