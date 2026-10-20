# Privacy policy — proposed giveaway section (draft for Ben)

A proposed addition to `/privacy-policy` (`app/privacy-policy/page.tsx`)
for the 10-year giveaway, GIVEAWAY-PLAN.md §6. **The live page is not
edited by this draft.** When it goes in, it goes in the same commit as the
notify-me page (Phase 2), and `PRIVACY_EFFECTIVE_DATE` in
`lib/site-config.ts` moves to that day.

Written the way the live page is written: everything descriptive is read
off the code (`lib/giveaway/people.ts`, `rows.ts`, `emails.ts`, `send.ts`,
`drawings.ts`, `offers.ts`, the 0010 migration), and everything promissory
is marked **[PROPOSAL — Ben to confirm]** so nothing is published that
nobody decided. There is no sentence on this page that ties sharing to
consent, permission or a request — the live page's rule, kept here.

**Where it slots in.** One new `<h2>` section, "The 10-year giveaway", after
"Text messages" and before "Who else sees it". "Who else sees it" needs no
new name: Vercel, Supabase and Resend are already listed, and the giveaway
sends personal data to nothing else. One sentence is added under "How long
we keep it".

---

## The 10-year giveaway

*(From November 9 to December 5, 2026, and for as long as the giveaway's
records are kept.)*

**What we collect.** If you sign up or enter, we take your first and last
name, your email address and your five-digit ZIP code; that you confirmed
you are 18 or older; that you accepted the Official Rules, and which version
of them was on the page when you did; whether you ticked "I'm already an
HBC client"; and whether you ticked the box asking for news from us after
the giveaway — with the wording of that box and the time you ticked it. If
you came through a friend's link, we record whose link it was, and if a
friend comes through yours, we record that too; that is how bonus entries
are counted. From your ZIP code we work out your city and which of our two
centers is nearer. We also keep a scrambled version (a hash) of your IP
address and of your browser's description — not the address itself, and not
in a form we can read back.

If you win, the claim page asks for one more thing: the phone number you
want us to call. Nothing on the giveaway asks for a phone number before
that.

**Why.** To run the drawings and count entries; to email you about the
week; to call you if you win; to send you the thank-you offer and your
personal code; and to stop cheating — the hashes are what let us notice
when one person enters many times, or refers themselves.

**The emails.** Entering means emails. Two kinds. Confirmations go to the
address you gave: one to confirm your email when you sign up or enter, one
saying you're in (with your share link and your code), and one if you win.
Then the week's emails: one when entries open (to people who signed up
early), one reminder the next morning if you have not yet tapped the entry
button, one each weekday afternoon saying the day's drawing is done and
what is next, and one thank-you with the offer after the last drawing.
Every one of the week's emails carries an unsubscribe link, and one tap on
it stops them; if you have already won something, we will still reach you
about that. Ticking the news box is separate: it is about what we send
*after* the giveaway, and you can say no to it and still enter.

**No text messages.** The giveaway sends none, and does not ask to. The
only phone number it ever holds is the one a winner gives us to be called.

**Winners.** When you win, a member of our team calls you. If you say on
that call that we may post your first name, last initial and city on the
winners list, we do; otherwise the list says only that the day's prize was
claimed. Prizes with a retail value over $600 come with a tax form, which
we walk you through on the call. **[Ben and the accountant to confirm:
which form, what it collects (name, address, taxpayer ID), who prepares it,
and that it goes to the IRS as the law requires — the sentence should say
exactly that and no more.]**

**The thank-you offer.** Your code is yours alone; it stops working at the
end of the offer window. Using it means booking a first visit through our
contact form, and that booking is a call request like any other on this
page — same people, same emails, same retention — with a note that it came
from the giveaway and which code was used, so we can see the code was
redeemed.

**Who sees it.** The people at Harmonized who run the giveaway and would be
calling a winner. Our staff sign in to the giveaway's admin pages with a
one-time code emailed to an approved address, and every sign-in and every
drawing is written to a log we keep. The services are the ones already
named below: **Supabase** stores the records, in a database only our own
server can read; **Resend** delivers the emails, so it handles what is in
them; **Vercel** hosts the page. Nothing about the giveaway goes to any
other service. We never sell any of it and never share it with third
parties or affiliates for marketing or promotional purposes.

---

## Under "How long we keep it" — one added sentence

> Giveaway records — entries, drawings, winners, codes — are kept until
> December 31, 2027, so prizes, tax paperwork and any question about a
> drawing can be answered, and are then deleted. The scrambled IP and
> browser records are deleted 90 days after entries close.

**[PROPOSAL — Ben to confirm both periods.]** Neither is implemented in
code — same as the live retention sentence, this describes a practice
someone carries out: a dated SQL delete of the `giveaway_*` tables for the
production env after Dec 31, 2027, and a null-out of `ip_hash` and
`ua_hash` on `giveaway_people` and `giveaway_notify` around Feb 19, 2027
(90 days after Nov 21, 2026). The audit log (`giveaway_audit`) holds staff
emails and row ids, not entrant details beyond those ids; propose it goes
with the rest.

If a code is redeemed, the resulting consultation request lives under the
existing 24-month rule, not this one.

---

## Notes for Ben

- **Public winner names.** The sentence above says what we do and when
  ("if you say on that call… we do"). It is about publishing a name, not
  about handing data to a third party, and it avoids the words "consent",
  "permission" and "share". If Dialpad's A2P reviewer ever re-scans the
  page, this is the one sentence to read with their rule in mind; it can be
  cut to "The winners list shows a first name, last initial and city only
  for winners who have said yes to that on the call" if you want it even
  flatter.
- **Age.** The page says 18+ because the form does; if counsel changes
  eligibility, the form, the rules and this sentence change together.
- **The access paragraph** on the live page ("You can ask us what we hold
  about you…") already covers giveaway data; no new route is needed.
- **No new processor.** Decision 10 (no Turnstile) holds; the giveaway adds
  no third party, which is why "Who else sees it" is unchanged.
