// Unit test for the assistant's six-step booking flow (lib/chat/booking.ts),
// driven turn by turn with no server, no model and no database. Run: npm test
//
// lib/chat imports are extensionless, which Node's ESM resolver will not do
// on its own; the hook appends ".ts" for local specifiers only — the same
// trick scripts/answer-audit.mjs uses. The safety, refusal and hours checks
// the route runs BEFORE the flow are run here too, on every button label, so
// a tap can never be mistaken for one of them.

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

// session.ts builds its store at import; without credentials it warns once.
const warn = console.warn;
console.warn = () => {};
const {
  advanceBooking,
  bookingButtons,
  bookingSuccessReply,
  pendingQuestion,
  startBooking,
} = await import("./chat/booking.ts");
console.warn = warn;
const { CHAT_CONSENT_QUESTION } = await import("./sms-consent.ts");
const { checkRefusal } = await import("./chat/refusals.ts");
const { checkSafety } = await import("./chat/safety.ts");
const { checkPreRetrieval } = await import("./chat/unanswerable.ts");

function session() {
  return {
    id: "t",
    createdAt: 0,
    lastSeenAt: 0,
    turns: 0,
    crisisFlagged: false,
    blockedFromContact: false,
    injectionAttempts: 0,
    step: "idle",
    draft: {},
    bookingOffered: true,
  };
}

/** A conversation: start, then each line; returns the session and transcript. */
function run(lines, page = "/") {
  const s = session();
  const transcript = [startBooking(s)];
  for (const line of lines) transcript.push(advanceBooking(s, line, page));
  return { s, transcript, last: transcript[transcript.length - 1] };
}

const HAPPY = [
  "ben muir 615 987 3628",
  "ben@example.test",
  "Nashville",
  "My son, he can't focus at school",
  "Morning",
];

test("the six questions, in order, in Ben's words", () => {
  const { transcript } = run(HAPPY);
  assert.equal(transcript[0].reply, "What’s your name and the best number to reach you?");
  assert.equal(transcript[1].reply, "What email should we send your confirmation to?");
  assert.equal(transcript[2].reply, "Which center?");
  assert.equal(transcript[3].reply, "Who’s this for, and what’s going on? A sentence is plenty.");
  assert.equal(transcript[4].reply, "Best time to call?");
  assert.equal(
    transcript[5].reply,
    `Here’s what I have: Ben Muir, (615) 987-3628, ben@example.test, Nashville, Morning. ${CHAT_CONSENT_QUESTION}`
  );
});

test("the read-back's consent wording, exactly", () => {
  assert.equal(
    CHAT_CONSENT_QUESTION,
    "Can Harmonized Brain Centers also text you about your appointment and inquiry? Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel. Optional — we'll call you either way. SMS Terms: /sms-terms · Privacy Policy: /privacy-policy"
  );
});

test("buttons: center, best time, read-back, fix", () => {
  assert.deepEqual(bookingButtons("center"), ["Nashville", "Murfreesboro", "Come to me", "Not sure"]);
  assert.deepEqual(bookingButtons("bestTime"), ["Morning", "Afternoon", "Any time"]);
  assert.deepEqual(bookingButtons("confirm"), ["Yes, text me", "No, just call", "Fix something"]);
  assert.deepEqual(bookingButtons("confirmNo"), ["No, just call", "Fix something"]);
  assert.deepEqual(bookingButtons("fix"), ["Name", "Phone", "Email", "Center", "Best time"]);
  for (const step of ["contact", "email", "note", "idle", "submitted"]) {
    assert.equal(bookingButtons(step), undefined, step);
  }
});

test("Yes, text me → submits with consent and the fields the form uses", () => {
  const { last, s } = run([...HAPPY, "Yes, text me"], "/concerns/adhd");
  assert.equal(s.step, "submitted");
  assert.deepEqual(last.submit, {
    type: "consultation",
    source: "chat",
    helping_who: "My child",
    first_name: "ben muir",
    phone: "615 987 3628",
    email: "ben@example.test",
    note: "My son, he can't focus at school",
    best_time: "Morning",
    preferred_center: "Nashville",
    source_page: "/concerns/adhd",
    sms_consent: true,
    sms_consent_text: CHAT_CONSENT_QUESTION,
  });
});

test("No, just call → submits without consent", () => {
  const { last } = run([...HAPPY, "No, just call"]);
  assert.equal(last.submit.sms_consent, false);
  assert.equal(last.submit.sms_consent_text, CHAT_CONSENT_QUESTION);
});

test("a bare 'no' at the read-back asks which — and only a clear answer moves on", () => {
  let r = run([...HAPPY, "no"]);
  assert.equal(r.last.reply, "No texts, or need to fix something?");
  assert.equal(r.s.step, "confirmNo");
  assert.equal(r.last.submit, undefined);

  r = run([...HAPPY, "no", "nope"]);
  assert.equal(r.last.reply, "No texts, or need to fix something?");
  assert.equal(r.last.submit, undefined);

  r = run([...HAPPY, "no", "No, just call"]);
  assert.equal(r.last.submit.sms_consent, false);

  r = run([...HAPPY, "no", "Fix something"]);
  assert.equal(r.s.step, "fix");

  r = run([...HAPPY, "nah"]);
  assert.equal(r.s.step, "confirmNo");

  // Plain declines typed at the read-back count straight away.
  for (const typed of ["just call", "no texts", "don't text me"]) {
    r = run([...HAPPY, typed]);
    assert.equal(r.last.submit?.sms_consent, false, typed);
  }
});

test("final message: center named for Nashville/Murfreesboro, 'our team' otherwise, never 'today'", () => {
  const sub = (preferred_center) => ({ ...run([...HAPPY, "yes"]).last.submit, preferred_center });
  assert.equal(bookingSuccessReply(sub("Nashville")), "You’re all set, Ben. Someone from our Nashville center will call you soon.");
  assert.equal(bookingSuccessReply(sub("Murfreesboro")), "You’re all set, Ben. Someone from our Murfreesboro center will call you soon.");
  assert.equal(bookingSuccessReply(sub("Concierge")), "You’re all set, Ben. Someone from our team will call you soon.");
  assert.equal(bookingSuccessReply(sub("Not sure")), "You’re all set, Ben. Someone from our team will call you soon.");
  for (const c of ["Nashville", "Concierge"]) assert.doesNotMatch(bookingSuccessReply(sub(c)), /today/i);
});

/* ── Step 1 ─────────────────────────────────────────────────────────── */

test("step 1: only the missing piece is asked for", () => {
  let r = run(["Ben Muir"]);
  assert.equal(r.last.reply, "Thanks, Ben. What’s the best number to reach you?");
  assert.equal(r.s.step, "contact");
  r = run(["Ben Muir", "615-987-3628"]);
  assert.equal(r.s.step, "email");

  r = run(["615-987-3628"]);
  assert.equal(r.last.reply, "Got it. And your full name — first and last?");
  r = run(["615-987-3628", "Ben Muir"]);
  assert.equal(r.s.step, "email");
  assert.equal(r.s.draft.fullName, "Ben Muir");
});

test("step 1: a first name alone is not enough — the last name is asked and joined", () => {
  let r = run(["ben 615-987-3628"]);
  assert.equal(r.last.reply, "Thanks, Ben — and your last name?");
  r = run(["ben 615-987-3628", "muir"]);
  assert.equal(r.s.step, "email");
  assert.equal(r.s.draft.fullName, "ben muir");
});

test("step 1: a short number is called short; nonsense is asked again", () => {
  assert.equal(run(["Ben Muir 555-1234"]).last.reply, "That number looks short — could you type all ten digits?");
  assert.match(run(["why do you need that?"]).last.reply, /full name and the best number/);
});

test("step 1: declining leaves the flow", () => {
  const r = run(["I'd rather not give my number"]);
  assert.equal(r.s.step, "declined");
  assert.match(r.last.reply, /\/contact/);
});

/* ── Step 2 ─────────────────────────────────────────────────────────── */

test("step 2: an invalid email is asked again with an example", () => {
  const r = run(["Ben Muir 6159873628", "ben at gmail"]);
  assert.equal(r.last.reply, "That doesn’t look like an email address — could you type it again, like name@gmail.com?");
  assert.equal(r.s.step, "email");
  const ok = run(["Ben Muir 6159873628", "ben at gmail", "ben@gmail.com"]);
  assert.equal(ok.s.step, "center");
});

/* ── Step 3 ─────────────────────────────────────────────────────────── */

test("step 3: buttons and typos map to fixed values; anything else shows the buttons again", () => {
  const center = (answer) => run([HAPPY[0], HAPPY[1], answer]);
  assert.equal(center("Come to me").s.draft.preferredCenter, "Concierge");
  assert.equal(center("Not sure").s.draft.preferredCenter, "Not sure");
  assert.equal(center("Nashvile").s.draft.preferredCenter, "Nashville");
  assert.equal(center("murfreesbro").s.draft.preferredCenter, "Murfreesboro");
  const lost = center("the one near the mall");
  assert.equal(lost.s.step, "center");
  assert.equal(lost.s.draft.preferredCenter, undefined);
  assert.equal(lost.last.reply, "Sorry, I didn’t catch that — which center? Tap one below.");
  const franklin = center("Franklin");
  assert.equal(franklin.s.step, "center");
  assert.match(franklin.last.reply, /Franklin center isn’t open yet/);
});

/* ── Steps 4 and 5 ──────────────────────────────────────────────────── */

test("step 4: who it's for is read from the sentence; the sentence is the note", () => {
  const who = (answer) => run([HAPPY[0], HAPPY[1], HAPPY[2], answer]).s.draft;
  assert.equal(who("For me — I can't sleep").helpingWho, "Myself");
  assert.equal(who("my wife, anxiety").helpingWho, "Someone else");
  assert.equal(who("my daughter").helpingWho, "My child");
  assert.equal(who("trouble focusing").helpingWho, undefined);
  assert.equal(who("trouble focusing").note, "trouble focusing");
  assert.equal(who("skip").note, undefined);
});

test("step 5: unknown time asks again with the buttons", () => {
  const r = run([HAPPY[0], HAPPY[1], HAPPY[2], HAPPY[3], "evenings"]);
  assert.equal(r.s.step, "bestTime");
  assert.equal(r.last.reply, "Sorry — morning, afternoon, or any time? Tap one below.");
  const ok = run([HAPPY[0], HAPPY[1], HAPPY[2], HAPPY[3], "anytime"]);
  assert.equal(ok.s.draft.bestTime, "Any time");
});

/* ── Step 6: Fix something ──────────────────────────────────────────── */

test("Fix something → which field → new value → the read-back again", () => {
  let r = run([...HAPPY, "Fix something"]);
  assert.equal(r.last.reply, "No problem — what would you like to change?");
  assert.equal(r.s.step, "fix");

  r = run([...HAPPY, "Fix something", "Email", "new@example.test"]);
  assert.equal(r.s.step, "confirm");
  assert.match(r.last.reply, /^Here’s what I have: Ben Muir, \(615\) 987-3628, new@example\.test, Nashville, Morning\. Can Harmonized Brain Centers also text you/);

  r = run([...HAPPY, "Fix something", "Center", "Come to me"]);
  assert.match(r.last.reply, /, Concierge, Morning\./);

  r = run([...HAPPY, "Fix something", "Phone", "615 555 1234"]);
  assert.match(r.last.reply, /Ben Muir, \(615\) 555-1234,/);

  r = run([...HAPPY, "Fix something", "Name", "Benjamin muir"]);
  assert.match(r.last.reply, /^Here’s what I have: Benjamin Muir,/);

  r = run([...HAPPY, "Fix something", "Best time", "Afternoon"]);
  assert.match(r.last.reply, /, Nashville, Afternoon\./);

  // The change typed straight in, no field step.
  r = run([...HAPPY, "Fix something", "it should be Murfreesboro"]);
  assert.match(r.last.reply, /, Murfreesboro, Morning\./);

  // And then the booking still completes.
  r = run([...HAPPY, "Fix something", "Email", "new@example.test", "Yes, text me"]);
  assert.equal(r.last.submit.email, "new@example.test");
  assert.equal(r.last.submit.sms_consent, true);
});

test("read-back: a typed correction is taken instead of a yes", () => {
  const r = run([...HAPPY, "yes but it's 615-555-9999"]);
  assert.equal(r.s.step, "confirm");
  assert.match(r.last.reply, /\(615\) 555-9999/);
  assert.equal(r.last.submit, undefined);
});

test("a question re-asked after an interruption is the pending one", () => {
  const { s } = run(HAPPY);
  assert.match(pendingQuestion(s), /^Here’s what I have/);
  const mid = run([HAPPY[0]]).s;
  assert.equal(pendingQuestion(mid), "What email should we send your confirmation to?");
});

test("a session saved by the old flow restarts at step 1", () => {
  const s = session();
  s.step = "firstName";
  s.draft = { helpingWho: "Myself" };
  const turn = advanceBooking(s, "Ben", "/");
  assert.equal(s.step, "contact");
  assert.equal(turn.reply, "What’s your name and the best number to reach you?");
});

test("no button label trips the safety, refusal or hours checks that run first", () => {
  const labels = [
    ...bookingButtons("center"),
    ...bookingButtons("bestTime"),
    ...bookingButtons("confirm"),
    ...bookingButtons("fix"),
  ];
  for (const label of labels) {
    assert.equal(checkSafety(label), null, `safety: ${label}`);
    assert.equal(checkRefusal(label), null, `refusal: ${label}`);
    assert.equal(checkPreRetrieval(label), null, `pre-retrieval: ${label}`);
  }
});
