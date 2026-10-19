// Unit test for lib/chat/booking-parse.ts — the assistant's booking flow
// reading what the visitor tapped or typed. Run: npm test
//
// .mjs rather than .ts so the Next type-check never sees an import that ends
// in ".ts", which it would reject.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CENTER_BUTTONS,
  CENTER_VALUES,
  CONFIRM_BUTTONS,
  FIX_BUTTONS,
  TIME_BUTTONS,
  extractEmail,
  extractName,
  extractPhone,
  formatPhone,
  isFullName,
  matchBestTime,
  matchCenter,
  matchConfirm,
  matchFixField,
  mentionsFranklin,
} from "./chat/booking-parse.ts";
import { routeFor } from "./lead-routing.ts";

/* ── Step 3: the center ─────────────────────────────────────────────── */

test("each center button maps to its fixed value", () => {
  assert.deepEqual(
    CENTER_BUTTONS.map((b) => matchCenter(b)),
    ["Nashville", "Murfreesboro", "Concierge", "Not sure"]
  );
  assert.deepEqual([...CENTER_VALUES], ["Nashville", "Murfreesboro", "Concierge", "Not sure"]);
});

test("typed centers, any case and punctuation", () => {
  for (const [typed, want] of [
    ["nashville", "Nashville"],
    ["NASHVILLE!", "Nashville"],
    ["Nashville please", "Nashville"],
    ["the nashville one", "Nashville"],
    ["nash", "Nashville"],
    ["murfreesboro", "Murfreesboro"],
    ["Murf.", "Murfreesboro"],
    ["boro", "Murfreesboro"],
    ["come to me", "Concierge"],
    ["Can you come to my house?", "Concierge"],
    ["at home please", "Concierge"],
    ["concierge", "Concierge"],
    ["not sure", "Not sure"],
    ["I don't know", "Not sure"],
    ["idk", "Not sure"],
    ["either is fine", "Not sure"],
    ["no preference", "Not sure"],
  ]) {
    assert.equal(matchCenter(typed), want, typed);
  }
});

test("typos land on the closest center", () => {
  for (const [typed, want] of [
    ["Nashvile", "Nashville"],
    ["nashvill", "Nashville"],
    ["Nahsville", "Nashville"],
    ["nasville", "Nashville"],
    ["Nashvlle", "Nashville"],
    ["Murfreesbro", "Murfreesboro"],
    ["murfeesboro", "Murfreesboro"],
    ["Murfresboro", "Murfreesboro"],
    ["murfreesburo", "Murfreesboro"],
    ["Murfreesbor", "Murfreesboro"],
    ["Murfressboro", "Murfreesboro"],
    ["conceirge", "Concierge"],
    ["consierge", "Concierge"],
  ]) {
    assert.equal(matchCenter(typed), want, typed);
  }
});

test("nothing recognisable → null (the buttons come back); never free text", () => {
  for (const typed of ["Franklin", "Brentwood", "Knoxville", "asdf", "", "   ", "hmm", "the one by the mall"]) {
    assert.equal(matchCenter(typed), null, typed);
  }
});

test("Franklin is recognised as Franklin, so the reply can say it isn't open", () => {
  assert.equal(mentionsFranklin("Franklin"), true);
  assert.equal(mentionsFranklin("franklen please"), true);
  assert.equal(mentionsFranklin("Nashville"), false);
});

test("every center value routes to its own inbox (lib/lead-routing.ts)", () => {
  const route = (preferredCenter) =>
    routeFor({ type: "consultation", source: "chat", preferredCenter });
  assert.equal(route(matchCenter("Nashville")), "nashville");
  assert.equal(route(matchCenter("Nashvile")), "nashville");
  assert.equal(route(matchCenter("Murfreesboro")), "murfreesboro");
  assert.equal(route(matchCenter("Come to me")), "concierge");
  assert.equal(route(matchCenter("Not sure")), "fallback");
});

/* ── Step 1: name and phone ─────────────────────────────────────────── */

test("name and number from one reply, in any order and wording", () => {
  for (const [typed, name, phone] of [
    ["Ben Muir 615-987-3628", "Ben Muir", "615-987-3628"],
    ["ben muir, 6159873628", "ben muir", "6159873628"],
    ["(615) 555-1234 Sarah Mitchell", "Sarah Mitchell", "(615) 555-1234"],
    ["I'm Sarah Mitchell and my number is 615.555.1234", "Sarah Mitchell", "615.555.1234"],
    ["My name is Ana Smith-Jones, best number 615 555 1234", "Ana Smith-Jones", "615 555 1234"],
    ["Hi! It's Mary O'Neil. You can reach me at +1 615 555 1234.", "Mary O'Neil", "+1 615 555 1234"],
    ["Will Best 6155551234", "Will Best", "6155551234"],
  ]) {
    assert.equal(extractName(typed), name, typed);
    assert.equal(extractPhone(typed), phone, typed);
  }
});

test("one piece missing: the other is still read", () => {
  assert.equal(extractName("Ben Muir"), "Ben Muir");
  assert.equal(extractPhone("Ben Muir"), null);
  assert.equal(extractName("615-555-1234"), null);
  assert.equal(extractPhone("615-555-1234"), "615-555-1234");
  assert.equal(extractName("Ben 615-555-1234"), "Ben");
  assert.equal(isFullName("Ben"), false);
  assert.equal(isFullName("Ben Muir"), true);
});

test("a sentence or a question is not a name", () => {
  for (const typed of [
    "why do you need that?",
    "what do you need",
    "I don't want to say",
    "can you just call me",
    "12345",
    "this is a very long sentence that is not a name at all",
  ]) {
    assert.equal(extractName(typed), null, typed);
  }
});

test("too few or too many digits is not a phone", () => {
  assert.equal(extractPhone("555-1234"), null);
  assert.equal(extractPhone("615 555 12345 678"), null);
});

test("phone formatting for the read-back", () => {
  assert.equal(formatPhone("6155551234"), "(615) 555-1234");
  assert.equal(formatPhone("615.555.1234"), "(615) 555-1234");
  assert.equal(formatPhone("+1 615 555 1234"), "(615) 555-1234");
  assert.equal(formatPhone("(615) 555-1234"), "(615) 555-1234");
  assert.equal(formatPhone("+44 20 7946 0958"), "+44 20 7946 0958");
});

/* ── Step 2: email ──────────────────────────────────────────────────── */

test("email: found in a sentence, trailing period dropped, junk refused", () => {
  assert.equal(extractEmail("ben@gmail.com"), "ben@gmail.com");
  assert.equal(extractEmail("it's bshep.muir+guide@gmail.com."), "bshep.muir+guide@gmail.com");
  assert.equal(extractEmail("Sure — Sarah.M@Example.co.uk"), "Sarah.M@Example.co.uk");
  for (const typed of ["ben at gmail", "ben@gmail", "@gmail.com", "ben gmail.com", "no", ""]) {
    assert.equal(extractEmail(typed), null, typed);
  }
});

/* ── Step 5: best time ──────────────────────────────────────────────── */

test("best time: buttons and typed answers", () => {
  assert.deepEqual(TIME_BUTTONS.map((b) => matchBestTime(b)), ["Morning", "Afternoon", "Any time"]);
  for (const [typed, want] of [
    ["mornings", "Morning"],
    ["Mornign", "Morning"],
    ["in the afternoon", "Afternoon"],
    ["afternoons please", "Afternoon"],
    ["aftenoon", "Afternoon"],
    ["anytime", "Any time"],
    ["whenever", "Any time"],
    ["morning or afternoon", "Any time"],
    ["after 3pm", "Afternoon"],
    ["2:30 p.m.", "Afternoon"],
    ["before 10am", "Morning"],
    ["9am-5pm", "Any time"],
    ["after 6pm", null],
    ["evening", null],
    ["asdf", null],
  ]) {
    assert.equal(matchBestTime(typed), want, typed);
  }
});

/* ── Step 6: the read-back ──────────────────────────────────────────── */

test("read-back: buttons map to yes / no / fix", () => {
  assert.deepEqual(CONFIRM_BUTTONS.map((b) => matchConfirm(b)), ["yes", "no", "fix"]);
});

test("read-back: typed answers; a doubtful yes is a no, a wrong is a fix", () => {
  for (const [typed, want] of [
    ["yes", "yes"],
    ["Yes please", "yes"],
    ["sure, text me", "yes"],
    ["yes that's correct", "yes"],
    // Only a plain decline declines (Ben, 2026-10-14); a bare "no" is asked about.
    ["no", "unclear-no"],
    ["nope", "unclear-no"],
    ["no thanks", "unclear-no"],
    ["not sure", "unclear-no"],
    ["no texts", "no"],
    ["No texts please", "no"],
    ["just call", "no"],
    ["just call me", "no"],
    ["don't text me", "no"],
    ["yes but don't text me", "no"],
    ["no, that's wrong", "fix"],
    ["the email is wrong", "fix"],
    ["can I change something", "fix"],
    ["hmm", null],
  ]) {
    assert.equal(matchConfirm(typed), want, typed);
  }
});

test("fix: which field", () => {
  assert.deepEqual(
    FIX_BUTTONS.map((b) => matchFixField(b)),
    ["name", "phone", "email", "center", "bestTime"]
  );
  assert.equal(matchFixField("my last name is spelled wrong"), "name");
  assert.equal(matchFixField("wrong number"), "phone");
  assert.equal(matchFixField("the email"), "email");
  assert.equal(matchFixField("Murfreesboro instead"), "center");
  assert.equal(matchFixField("call in the morning"), "bestTime");
});
