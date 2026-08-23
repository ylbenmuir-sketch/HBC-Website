# Handoff — concern passages, and the tie nobody is breaking

Written Aug 2026, after `/concerns/concussion` shipped. **Nothing here is a
bug report.** Everything described works, every link the assistant offers is
the right page, and no check in the repo fails. It is a record of a decision
not to fix something, so that whoever hits the threshold at the bottom knows
the trade was made deliberately and what it costs.

---

## What happens

Every passage of a concern carries that concern's **entire** alias list. A
concern with 22 aliases puts all 22 on its signs passage, its approach
passage, its limits note, its goals, and each of its FAQ answers. So for a
query that reduces to one alias term — which is what a search-box visitor
types — every passage of that concern scores almost identically, and the
winner is decided by BM25 length normalization rather than by relevance.

Measured across the index as it stands:

| | |
|---|---|
| Concern passages | 66 |
| Alias slots across them | ~1,523 |
| Distinct alias terms | 189 |
| Single-alias queries decided by length, not relevance | **144 of 168 (86%)** |
| Typical winning margin | **0.01–0.30** on scores of 3–5 |

Some are exact ties. `startle`, `jumpy`, `flashback` and `trigger` all reach
`concern:trauma:faq:1` at 4.17 over `concern:trauma:faq:3` at 4.17. The code
picks one; nothing about the picking is meaningful.

Which kind of passage wins a bare topic word:

```
faq             100
signs            45
goals            11
approach         10
limits            1
medical-first     1
```

`signs` is the passage that actually describes the concern — the hero line,
the who, the recognize list. It wins a minority of the time. A visitor typing
`whiplash` reaches "Do I need a referral?"; a visitor typing `ptsd` reaches
the wellness-service boundary note.

**What is not affected.** Every full concern name still reaches its `signs`
passage — all nine, checked. So does every multi-term symptom description in
the `CONCERN_ROUTING` sweep. The problem is specific to one- and two-term
queries, and it never sends anyone to the wrong *page*: all four retrieved
passages are the right concern, and the link the assistant offers is right.
This is answer quality, not correctness, which is exactly why it degrades
without anyone noticing.

---

## The four ways out, and why none of them was taken

**A. Split the alias list by role.** `CONCERN_ALIASES` becomes structured per
concern — symptom words to `signs`, boundary words to `limits`, and so on.
Correct, and the largest: 189 terms hand-sorted across 9 concerns into ~5
buckets each, plus a `concernPassages` rewrite. Changes term frequency *and*
document frequency for every alias, so every routing case in the audit moves
and has to be re-measured. Multi-day, with a full sweep per concern.

**B. Aliases on `signs` only; everything else gets the concern name.** About
five lines in `concernPassages`. Cheap, and the one to be most careful of:
**10 of 29 audit routing lines currently top an FAQ passage**, and **24 of 29
carry an FAQ somewhere in their four**. Those FAQs are reachable *because*
they hold the alias list — "I can't switch off", "My son can't sit still long
enough to finish anything", "My daughter melts down over the smallest change
of plan", "I reread the same paragraph over and over", "I'm jumpy and startle
at everything", and five more. This option breaks the thing phase 11c was
built to fix.

**C. Change the tie-break in `retrieve()`** — lower `b`, or prefer prose over
Q&A within an epsilon. Smallest diff, widest blast radius: it touches all 117
passages including locations, policies and `/faq`, and every threshold in
`RETRIEVAL` was tuned against the current normalization.

**D. Give `signs` a small explicit precedence.** A flag on the passage that
describes the concern, worth a few percent, breaking ties toward it. One
field, one line in `scoreOf`, no keyword edits. Moves roughly a hundred
length-decided bare-word queries from an FAQ answer to the passage that
actually describes the concern, and leaves multi-term symptom routing — which
is working — untouched. Regression surface is the 10 routing lines above;
each wins on a *symptom phrase* rather than a bare topic word, so most should
hold, but each has to be checked. Half a day plus a full sweep.

**D is the recommendation.** It was scoped and deliberately not implemented,
because the phase it came out of was already large and the failure it fixes is
a quality one with no wrong page behind it. That is the whole of the reason.

---

## When it stops being optional

**If any concern passes about 12 passages.**

The problem scales with passages per concern, not with concerns. Concussion
went from 4 passages to 10 when its FAQs shipped, and its alias ties went from
4-way to 10-way in the same edit: 25 of 25 of its measurable alias queries are
now length-decided, the worst of the nine. Every concern that gains FAQs
inherits the same curve.

At ~12 passages a bare topic word is choosing between a dozen near-identical
scores, and `signs` will essentially never win — at which point the passage
that describes the concern has become unreachable by the concern's own name in
anything but its full form. **Do D before crossing that line, not after.**

---

## Related, and already done

Two collisions of a different kind came out of the same sweep and *were*
fixed, because those had a wrong answer behind them rather than an arbitrary
one:

- A concern FAQ whose question duplicated a sitewide question took it
  outright — question text is weighted ×3 and the shorter passage wins. Two
  instances, both from the concussion page. `PAGE_ROUTING` in
  `scripts/answer-audit.mjs` now asserts where ten sitewide questions land.
- `DUPLICATE_QUESTIONS_ALLOWED` in the same file compares every question in
  the index against every other and fails at 0.6 similarity, so the next one
  is caught when it is written rather than when somebody notices a wrong
  answer. Twelve pairs are allowlisted with the reason each stays; a pair that
  stops duplicating fails too, so the table cannot rot.

Five further collisions were found and deliberately left: they are ties
between passages that say compatible things, and asserting a winner would
freeze whichever passage happens to be shorter today rather than fix anything.
They are the concern-vs-concern entries at the foot of
`DUPLICATE_QUESTIONS_ALLOWED`.
