// Unit test for lib/review-excerpt.ts — the compact-review excerpt rule.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import { reviewExcerpt, splitSentences } from "./review-excerpt.ts";

test("a whole quote under the limit is returned as is, no ellipsis", () => {
  const t = "…It has enabled me to navigate life's circumstances and give me a much needed ability to handle stress.";
  assert.equal(reviewExcerpt(t), t);
});

test("two short sentences fit; the trailing full stop becomes an ellipsis", () => {
  const t = "Our seven-year-old struggled for years to self-regulate. We came in VERY skeptical. Four weeks in we saw nothing.";
  assert.equal(
    reviewExcerpt(t),
    "Our seven-year-old struggled for years to self-regulate. We came in VERY skeptical…",
  );
});

test("a second sentence that would pass the limit is left out", () => {
  const t = "I'm less stressed, I sleep like a baby -- zero insomnia. I get the best REM sleep and never have any trouble falling back to sleep if I have to wake up for a nighttime restroom break in the middle of the night.";
  assert.equal(reviewExcerpt(t), "I'm less stressed, I sleep like a baby -- zero insomnia…");
});

test("never more than two sentences, however short", () => {
  assert.equal(reviewExcerpt("One. Two. Three. Four."), "One. Two…");
});

test("the first sentence is always taken, even over the limit", () => {
  const long = "A".repeat(200) + ". Short.";
  assert.equal(reviewExcerpt(long), "A".repeat(200) + "…");
});

test("an exclamation mark is kept ahead of the ellipsis", () => {
  assert.equal(reviewExcerpt("Wow it worked! And then some. More."), "Wow it worked! And then some…");
});

test("sentence splitting ignores em dashes and slashes", () => {
  assert.deepEqual(
    splitSentences("Since starting, I've noticed better sleep—I feel healthier. Really."),
    ["Since starting, I've noticed better sleep—I feel healthier.", "Really."],
  );
});
