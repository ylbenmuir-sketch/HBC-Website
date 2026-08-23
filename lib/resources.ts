/**
 * Resources / learning center (resources.html). The homework-battles article
 * is seeded from article.html; the rest carry their exact mockup copy.
 *
 * ## The focus & follow-through cluster
 *
 * Four articles support /concerns/focus-adhd, which QUERY-TO-PAGE-MAP.md
 * gives the `adhd help without medication` cluster. None of them targets that
 * query — rule 1 is one cluster, one page, and an article competing with the
 * concern page it exists to feed is the failure mode. Each takes a satellite
 * long-tail the concern page does not own and links up:
 *
 *  - `homework-battles`      → /concerns/focus-adhd  (+ children-school)
 *  - `bad-at-school`         → /concerns/children-school (+ focus-adhd)
 *  - `the-last-ten-percent`  → /concerns/focus-adhd  (+ /adults)
 *  - `lens-and-medication`   → /concerns/focus-adhd  (+ /faq)
 *
 * `bad-at-school` points at children-school first on purpose: the sentence in
 * its title is literally an item in that concern's `recognize` list and its
 * `goals`, so aiming it at focus-adhd would put an article about the exact
 * words one page claims onto a different one.
 *
 * ## The anxiety cluster, and the collision it had to avoid
 *
 * Three more support /concerns/anxiety: `told-to-just-relax`,
 * `braced-for-something` (+ stress-resilience) and `alongside-therapy`
 * (+ /faq). Same rule — none targets `neurofeedback for anxiety`.
 *
 * **`/concerns/anxiety` and `/concerns/sleep` both claim racing thoughts at
 * bedtime**, in words so close that one `goals` string is identical on both
 * pages ("Falling asleep without an hour of ceiling-staring."). The site's
 * existing split is by noun and is asserted in CONCERN_ROUTING: *thoughts* go
 * to anxiety, *sleep / 3am / awake* go to sleep. These articles stay on the
 * right side of it three ways:
 *
 * 1. **No article targets a sleep-onset query.** That half of the demand
 *    belongs to /concerns/sleep and to the sleep cluster's own articles.
 * 2. **`told-to-just-relax` hands off explicitly.** Its "If nights are the
 *    hard part" section names the boundary and sends that reader to
 *    /concerns/sleep — the pattern /lens-neurofeedback §2 uses to hand the
 *    mechanism to /how-lens-works instead of restating it.
 * 3. **The four ranking surfaces stay clear.** "racing thoughts", "won't shut
 *    off at night", "ceiling-staring" and "3 a.m." appear in no `title`,
 *    `metaTitle`, `excerpt` or `metaDescription` here. Those four fields are
 *    where a page declares what it is competing for; body prose may describe
 *    the experience, and does.
 *
 * Retrieval is not a risk in either direction: lib/chat/content-index.ts
 * imports concerns, faq, locations and site-config and never this file, so no
 * article is an indexed passage and no article can move a routing line. The
 * sweep is run against these anyway, as proof rather than as diagnosis.
 *
 * ## The sleep cluster, and the same boundary from the other side
 *
 * Three more behind /concerns/sleep: `exhausted-after-eight-hours`,
 * `the-3am-waking` (+ anxiety) and `when-sleep-hygiene-isnt-it`
 * (+ stress-resilience).
 *
 * The anxiety cluster already conceded the night — `told-to-just-relax` ships
 * with an "If nights are the hard part" section pointing at /concerns/sleep —
 * so the discipline here is the reciprocal, and `the-3am-waking` is where it
 * matters. Waking at three with a racing mind is the exact point the two
 * clusters meet. That article is about the *waking*; where the thoughts are
 * the story it says so and hands off to /concerns/anxiety in a mirror-image
 * section. **The two articles point at each other across the boundary rather
 * than both claiming it**, which is what makes the line visible from both
 * sides instead of only from one.
 *
 * The vocabulary rule runs both ways too, and is checked both ways: no
 * anxiety-owned string ("just relax", "on edge", "braced", "switch off") on a
 * sleep article's four ranking surfaces, and no sleep-owned string ("racing
 * thoughts", "3 a.m.", "won't shut off") on an anxiety article's. The one
 * string the two concern pages share verbatim — "an hour of ceiling-staring",
 * identical in both `goals` arrays — belongs to neither cluster's articles and
 * appears on no surface at all.
 *
 * "Insomnia" appears in no title or metaTitle either. It is a supporting term
 * in QUERY-TO-PAGE-MAP.md and it names a disorder, and /concerns/sleep's own
 * limits note says LENS is not a treatment for sleep disorders — so a title
 * carrying it would target the one framing the page underneath it disclaims.
 *
 * ## Every fact here traces
 *
 * To a verified constant in ./site-config, or to copy already in the site
 * assistant's index (lib/chat/content-index.ts) — the concern entries, the
 * sitewide FAQ, and the mirrored passages from /how-lens-works. Session
 * length interpolates rather than being typed, for the reason every other
 * figure on the site does. Nothing here states an outcome, and nothing
 * describes LENS as an alternative to anything.
 *
 * ## One limitation sentence, in the CTA
 *
 * The /lens-neurofeedback rule, applied here. Body prose carries no caveats
 * bolted onto claims; the scope limit is in each article's `finalSub`, folded
 * into the offer of the call. Two things are deliberately not counted against
 * it: the `note` block, which is the standing wellness disclaimer every
 * article has always carried, and the "varies from person to person" clause,
 * which rides the report claim wherever it appears the way PACKAGE_NOTE rides
 * the package price.
 */

import {
  INFORMATION_SHARING,
  SESSION_LENGTH,
  SITE_NAME,
  verifiedOr,
  type Verifiable,
} from "./site-config";

/**
 * Who wrote an article, and who reviewed it.
 *
 * Structured rather than a string, because a string is what let
 * "By the Harmonized team · Reviewed by [founder], Clinical Director" ship on
 * four production URLs. It named a person, credited her with a review nobody
 * had confirmed, and passed every gate in this repo — `isPublishable` reads
 * brackets, and there were none to read.
 *
 * Two rules, and the type enforces the first:
 *
 * 1. **A named individual can only appear in `reviewer`, which is a
 *    `Verifiable`.** There is nowhere else in this shape to put a person, so
 *    an unconfirmed review credit cannot render in production — `verifiedOr`
 *    drops it. `org` is a publisher, not a byline for a human.
 * 2. **`org` may not smuggle one back in.** A type cannot tell
 *    "Harmonized Brain Centers" from "Sheri Rowney, Clinical Director", so
 *    `npm run check:index` reads it: any roster name, any credential, and any
 *    review verb in `org` fails there. That check is the guard the bracket
 *    gate could not be.
 */
export type Byline = {
  /** The publisher. An organisation — never a person. See rule 2 above. */
  org: string;
  /**
   * The named reviewer and their title, and the only place a person may be
   * credited. Absent until Ben confirms the review actually happened; wrapped
   * so that adding it early still cannot ship it.
   */
  reviewer?: Verifiable<{ name: string; title: string }>;
};

/**
 * The byline as rendered. In production an unverified reviewer disappears and
 * the publisher credit stands alone, which is the true statement either way.
 */
export function bylineText(b: Byline): string {
  const reviewer = b.reviewer ? verifiedOr(b.reviewer) : null;
  return reviewer
    ? `By ${b.org} · Reviewed by ${reviewer.name}, ${reviewer.title}`
    : `By ${b.org}`;
}

/**
 * The publisher credit every article carries today.
 *
 * `SITE_NAME`, not "the Harmonized team": the second asserts that staff wrote
 * the piece, which is a claim about people and is not confirmed. The practice
 * published it, which is true without qualification and is what a publisher
 * byline says.
 */
const HBC_BYLINE: Byline = { org: SITE_NAME };

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "note"; text: string }
  /**
   * The handoff out of an article, rendered as ghost buttons.
   *
   * Buttons rather than inline anchors because `globals.css` gives links a
   * distinguishing colour per context (`details.faq .a a`, `.lens-seq p a`,
   * `.crumb a`) and has no rule for one inside `.article p` — an inline link
   * here renders as plain body text with nothing to mark it clickable. That
   * is the same reason /lens-neurofeedback hands off with a ghost button, and
   * the same reason not to add a rule for it.
   *
   * `text` is the lead-in sentence, and carries the field name the rest of
   * the union uses so `isPublishable` still sees every block.
   */
  | {
      type: "links";
      text: string;
      items: { href: string; label: string }[];
    };

export type Resource = {
  slug: string;
  tag: string;
  title: string;
  crumbLabel: string;
  excerpt: string;
  image?: { src: string; position: string };
  plateSpec?: string;
  readTime: string;
  byline: Byline;
  /**
   * Finished copy deliberately held back, and who it is waiting on.
   *
   * Deliberately not the bracket gate. A `[Draft]` article is one nobody has
   * written; a held one is written, checked, and waiting on a named person to
   * read it. Bracketing it to keep it out of the build would make `[Draft]`
   * mean two things and would hide a decision behind a placeholder — and the
   * article would come back the moment somebody "finished" it.
   *
   * Set it and the article does not build, does not enter the sitemap, and
   * 404s, exactly as a draft does. Delete the line to publish.
   *
   * **Unset on every article is the correct state, not a disabled one.** It
   * held `lens-and-medication` until Ben read it; he approved the copy as
   * written and it shipped. The field stays because the next piece that needs
   * one specific person's eyes should not have to borrow the bracket gate.
   */
  hold?: string;
  lede: string;
  body: ArticleBlock[];
  finalHeading: string;
  finalSub: string;
  /**
   * <title> for the article. Required, and separate from the display `title`
   * above for the reason `metaTitle` exists on Concern: the on-page headline
   * is written to be read ("Homework battles: what's really happening in a
   * stuck brain") and targets nothing a person types. Required so a new
   * article can't ship without one.
   *
   * Must not restate the primary target of the concern page it feeds. These
   * are satellites — see the cluster note at the top of this file.
   */
  metaTitle: string;
  metaDescription: string;
};

const STANDARD_NOTE =
  "This article is educational and isn't medical advice. LENS is a wellness service and doesn't diagnose or treat any condition. If you're concerned about your child, talk with their pediatrician.";

const ADULT_NOTE =
  "This article is educational and isn't medical advice. LENS is a wellness service and doesn't diagnose or treat any condition. If you have health concerns, talk with your doctor.";

/**
 * The default closing sub, and the one limitation sentence for any article
 * that has no more specific one. Renamed from `DRAFT_FINAL_SUB` when
 * `exhausted-after-eight-hours` shipped carrying it: a constant with "DRAFT"
 * in its name sitting under live copy invites somebody to treat the copy as
 * provisional, and this sentence is neither draft nor placeholder.
 */
const STANDARD_FINAL_SUB =
  "Tell us what’s going on. We’ll listen, answer honestly, and tell you plainly whether LENS is a fit — on the phone, before you book anything.";

import { isDraftText } from "./site-config";

/**
 * A resource is publishable once its lede and body carry no [draft] notes.
 *
 * The byline is checked structurally rather than for brackets: an unverified
 * reviewer does not gate the article, it simply doesn't render, so a piece
 * still publishes under its publisher credit while a review is pending. What
 * must never happen is the credit rendering, and `bylineText` is what stops
 * that, with `check:index` watching `org`.
 */
export function isPublishable(r: Resource): boolean {
  return (
    !r.hold &&
    !isDraftText(r.lede) &&
    !isDraftText(r.byline.org) &&
    !isDraftText(r.byline.reviewer?.value.name) &&
    r.body.every((b) => !isDraftText(b.text))
  );
}

export const resources: Resource[] = [
  {
    slug: "homework-battles",
    tag: "For parents",
    title: "Homework battles: what's really happening in a stuck brain",
    crumbLabel: "Homework battles",
    excerpt: "Why “try harder” backfires — and what helps instead.",
    image: { src: "/images/child-session.jpg", position: "60% 30%" },
    readTime: "6 min read",
    byline: HBC_BYLINE,
    lede: "Your child is bright. You know it, their teacher knows it — and yet a worksheet that should take twenty minutes just consumed the whole evening and everyone's patience. Here's what's often happening underneath, and why “try harder” tends to make it worse.",
    body: [
      { type: "h2", text: "It usually isn't a motivation problem" },
      {
        type: "p",
        text: "Start with the fact you already have, because it is the most useful one in the room: your child can do this. You have watched them do it. Some evenings the worksheet takes fifteen minutes and nobody cries. That evening isn’t the proof that the other evenings are a choice — it’s the thing that has to be explained.",
      },
      {
        type: "p",
        text: "The pattern parents describe to us is narrow and consistent. Struggling to stay on task. Overwhelmed by anything with several steps in it. Losing track mid-task, mid-sentence, mid-plan. And procrastinating hardest on the things the child genuinely cares about. That last one is the tell, because not caring doesn’t look like this. Not caring looks like shrugging. What’s happening across the kitchen table looks a great deal more like distress.",
      },
      {
        type: "p",
        text: "What runs short on the hard evenings isn’t willingness. It’s the capacity to hold a plan in mind, keep the steps in order, and come back to the work after each interruption — while the work itself is boring. Those jobs fail before effort does, and they fail quietly enough that what you see is a bright child staring at a page.",
      },
      {
        type: "blockquote",
        text: "A brain stuck in high alert can't also be a brain that plans, sequences, and follows through. Those systems take turns.",
      },
      {
        type: "p",
        text: "It’s also why the evening escalates so reliably. A request repeated more firmly is more input, and more input is what a system near its limit handles worst. The volume goes up, what’s available goes down, and a twenty-minute worksheet becomes the whole night. Nobody in that kitchen is doing anything wrong. The effort is just aimed at the part that isn’t the problem.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Put the structure outside the child. Anything that depends on them remembering to use it is competing for the resource that has already run out. A visible list beats a remembered one. The same sequence every night beats a decision made fresh at seven o’clock. An alarm beats an intention.",
      },
      {
        type: "p",
        text: "Lower the demand before it fails rather than after. A request postponed by fifteen minutes often succeeds; the same request pressed through a rising state usually costs the next hour, and the argument that follows is rarely about the worksheet.",
      },
      {
        type: "p",
        text: "Use fewer words in the difficult moment. Explanation is input too, and a child at the edge of what they’ve got can’t process an explanation of why they should be able to do this. Offering one there tends to buy the opposite of what it’s for.",
      },
      {
        type: "p",
        text: "And treat sleep, food and unbroken recovery time as the intervention rather than the background. They are unglamorous and they are the largest lever most families have. Some of this picture is also medical — sleep problems, iron, thyroid, mood and anxiety all produce evenings like these, and they’re found by testing rather than by inference. If nobody has looked, that’s the thing worth doing first. We can’t do it, and neither can an article.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is one gentle option among several, and it belongs after the paragraphs above rather than instead of them. It’s a wellness service — small sensors, a very low-energy feedback signal, and nothing asked of the person in the chair. There’s nothing a child has to get right in a session: no sitting perfectly still, no concentrating, no being corrected. Kids read, draw, or just be kids while it runs, and a parent stays for the whole thing.",
      },
      {
        type: "p",
        text: `What we track is the part you actually care about. Every visit opens with a structured check-in on focus, follow-through and how the week really went — homework, mornings, the everyday specifics — and the plan follows that rather than a template. Sessions run ${SESSION_LENGTH.value}. Clients commonly report sleeping more easily, feeling steadier, or thinking more clearly over a series of visits; how much changes varies from person to person, which is why we ask at every visit instead of predicting.`,
      },
      {
        type: "links",
        text: "If the evenings above sound like yours, these two pages go further.",
        items: [
          { href: "/concerns/focus-adhd", label: "Focus, ADHD & follow-through" },
          { href: "/concerns/children-school", label: "Children, school & transitions" },
        ],
      },
      { type: "note", text: STANDARD_NOTE },
    ],
    finalHeading: "Wondering whether this describes your child? Ask us.",
    finalSub:
      "A free phone call with a practitioner — honest answers, no pressure, and a plain “not a fit” if that’s the truth.",
    metaTitle: "ADHD Homework Battles: Why “Try Harder” Backfires",
    metaDescription:
      "Why “try harder” backfires for bright kids stuck in homework battles — and what helps instead. A plain-language guide for parents.",
  },
  {
    slug: "exhausted-after-eight-hours",
    tag: "Sleep",
    title: "Why you're exhausted after eight hours of sleep",
    crumbLabel: "Exhausted after eight hours",
    excerpt:
      "Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.",
    image: { src: "/images/relax.jpg", position: "center 40%" },
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "You were in bed for eight hours. You didn’t wake in the night, or if you did you don’t remember it. And you got up feeling as though you’d been awake for most of it. The number was fine. The night wasn’t.",
    body: [
      { type: "h2", text: "Quantity is the wrong measure" },
      {
        type: "p",
        text: "Hours in bed is the figure everyone tracks, because it is the one that is easy to count. It is also the one that explains the least. What people arrive describing is eight hours that feel like four, waking exhausted no matter how long they slept, and nights that are simply inconsistent — different every week, with nothing obvious separating a good one from a bad one.",
      },
      {
        type: "p",
        text: "What that pattern points at isn’t duration. Attention difficulty, emotional reactivity, poor sleep and mental fatigue co-occur at rates far above chance, and it is more useful to read that as one problem with several outputs than as four separate ones. Sleep is one of the outputs. Counting hours measures the bed; it doesn’t measure the system that was supposed to be using it.",
      },
      { type: "h2", text: "A wired evening doesn’t stand down because the lights went out" },
      {
        type: "p",
        text: "The most common version of this is an evening that never came down. A wired, on-alert evening doesn’t stand down just because the lights went out — the room changed and the system didn’t. Sleep then happens on top of a state that was never going to be slept through, and the morning reports on that rather than on the clock.",
      },
      {
        type: "blockquote",
        text: "Eight hours spent on top of a system that never came down is eight hours of the wrong thing.",
      },
      {
        type: "p",
        text: "It is also why the same person gets a good night and a bad one with no change in routine. Regulation is a capacity that depletes and recovers, and what was available on Tuesday is not what is available on Thursday. Nothing about the bedtime got harder. What was there to meet it got smaller.",
      },
      { type: "h2", text: "Have the ordinary causes ruled out first" },
      {
        type: "p",
        text: "This belongs before anything else on this page, and one item belongs before the rest of it. Sleep apnea produces exactly this picture — a full night, every morning, unrefreshing — and it is common, it is identified by testing rather than by inference, and it is not something to reason your way past. Thyroid problems, low iron, medication effects, and mood and anxiety disorders all produce it too. If nobody has looked, that is the first move. We can’t test for any of it, and neither can an article.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Address the load rather than the night. Food, unbroken recovery time and what the day actually asked of you are not the soft version of sleep advice — they are the largest single lever most people have, and the one most often skipped for being unglamorous.",
      },
      {
        type: "p",
        text: "Lower the demand on the evening before it fails. What the last two hours before bed contain matters more than what happens in the final ten minutes, and a decision made at nine o’clock is a great deal easier than one made at eleven.",
      },
      {
        type: "p",
        text: "And be careful about the conclusion when the standard advice doesn’t work. Most strategies for regulation require the very capacity that is in short supply — they work when you don’t need them and fail when you do. That is an argument against the conclusion, not against the strategies.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is a wellness service, not a treatment for sleep disorders, and it belongs after the rule-out above rather than instead of it. Sessions are quiet and passive — small sensors, a very low-energy feedback signal, nothing to perform and nothing to practise between visits.",
      },
      {
        type: "p",
        text: `Sessions run ${SESSION_LENGTH.value} in a comfortable chair. Sleep is one of the first things we ask about at every visit, because it is often where clients notice change earliest, and the plan follows what your nights are actually telling us — falling asleep, staying asleep, and how the mornings feel. How much changes varies from person to person.`,
      },
      {
        type: "links",
        text: "Where this goes next.",
        items: [
          { href: "/concerns/sleep", label: "Sleep difficulties" },
          { href: "/concerns/brain-fog", label: "Brain fog, memory & mental fatigue" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: STANDARD_FINAL_SUB,
    metaTitle: "Tired After 8 Hours’ Sleep: Why Quantity Isn’t Quality",
    metaDescription:
      "Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.",
  },
  {
    slug: "the-3am-waking",
    tag: "Sleep",
    title: "The 3 a.m. waking, and why it isn’t random",
    crumbLabel: "The 3 a.m. waking",
    excerpt: "Waking in the small hours for no reason, and no way back down.",
    image: { src: "/images/recline.jpg", position: "center 55%" },
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "You didn’t wake for a reason. No noise, no bad dream you can recall, nothing to do. You were simply awake, at more or less the hour you were awake yesterday — and then you were awake for another ninety minutes.",
    body: [
      { type: "h2", text: "It is rarely the noise, or the temperature, or the bathroom" },
      {
        type: "p",
        text: "The first thing most people do is look for the cause in the room. Sometimes it is there. More often the trigger turns out to be incidental — something small that a lighter night let through and a heavier one would not have noticed at all.",
      },
      {
        type: "p",
        text: "What people describe to us is waking frequently, or at 3 a.m. for no reason, on nights that are otherwise unremarkable. The consistency is the interesting part. A system waking at roughly the same point most nights is doing something regular, and regular things tend to have a mechanism rather than a cause you can name from inside them at the time.",
      },
      { type: "h2", text: "Getting back down is the harder half" },
      {
        type: "p",
        text: "The waking is usually not what costs the night. The ninety minutes afterwards are. Going up and coming back down are two different jobs, and at three in the morning the second one is being attempted with whatever is left after a full day — which is not much.",
      },
      {
        type: "blockquote",
        text: "Waking is a moment. The hour and a half afterwards is the part that costs you tomorrow.",
      },
      {
        type: "p",
        text: "It is also why the advice that works at bedtime does so little here. Regulation is a capacity that depletes and recovers, and what you had at eleven o’clock is not what you have at three. Holding yourself to the version of you that fell asleep easily sets a standard the system cannot meet at that hour.",
      },
      { type: "h2", text: "If the thoughts are the main event" },
      {
        type: "p",
        text: "For some people the waking is incidental and the mind is the whole story — awake, and immediately going through everything. That is a different subject with a different page behind it. If the same circling is there in the afternoon, with nothing in particular setting it off, the nights are one symptom rather than the problem, and the anxiety page is the better place to start. The link is at the foot of this one.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Make the plan before you need it. What you do at three in the morning is best decided at nine in the evening, because deciding anything at three is precisely the thing that isn’t available.",
      },
      {
        type: "p",
        text: "Lower the stakes on the waking itself. A night interrupted once is an ordinary night. The arithmetic people do about how much sleep is left is usually what turns it into a bad one.",
      },
      {
        type: "p",
        text: "And treat the load as the intervention. Food, unbroken recovery time, and what the day asked of you shape the night more than anything that happens in the last ten minutes before bed.",
      },
      { type: "h2", text: "Have it looked at" },
      {
        type: "p",
        text: "Waking repeatedly at night is one of the things a doctor should hear about directly. Sleep apnea is the common one and it is identified by testing rather than by inference; thyroid problems, low iron, medication effects, and mood and anxiety disorders all produce broken nights too. They are common, and none of them is something to reason your way past. We can’t test for any of it, and neither can an article — if nobody has looked, that is the first move rather than the last.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is a wellness service, not a treatment for sleep disorders, and it belongs after the paragraph above rather than instead of it. Sessions are quiet and passive — small sensors, a very low-energy feedback signal, nothing to perform and nothing to keep up with at home.",
      },
      {
        type: "p",
        text: `A session runs ${SESSION_LENGTH.value} in a comfortable chair. Sleep is one of the first things we ask about at every visit, and what we track is specific: falling asleep, staying asleep, and how the mornings actually feel. The plan follows that rather than a template, and how much changes varies from person to person.`,
      },
      {
        type: "links",
        text: "The two pages this one sits closest to.",
        items: [
          { href: "/concerns/sleep", label: "Sleep difficulties" },
          { href: "/concerns/anxiety", label: "Anxiety & nervous-system overload" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Tell us what your nights actually look like.",
    finalSub:
      "We’ll listen, answer honestly, and say plainly if LENS isn’t the right fit — on the phone, before you book anything.",
    metaTitle: "Waking at 3 A.M. Every Night — Why It Isn’t Random",
    metaDescription:
      "Waking in the small hours with no reason and no way back to sleep — what tends to be underneath it, and what to have checked.",
  },
  {
    slug: "when-sleep-hygiene-isnt-it",
    tag: "Sleep",
    title: "When sleep hygiene isn’t the problem",
    crumbLabel: "When sleep hygiene isn’t it",
    excerpt: "You’ve done the blackout blind and the no-screens rule. It’s worth knowing what that does and doesn’t rule out.",
    plateSpec: "Bedside table at night — book, lamp, no phone — still life",
    readTime: "4 min read",
    byline: HBC_BYLINE,
    lede: "The room is dark. The phone charges in the kitchen. Caffeine stops at noon, and the routine has been the same for six weeks. The nights are exactly as they were. That is worth something — just not what it feels like it’s worth.",
    body: [
      { type: "h2", text: "What the advice is actually for" },
      {
        type: "p",
        text: "Sleep hygiene is a set of conditions. It removes the obstacles that would stop a working system from sleeping — light, stimulation, a schedule that moves every night, caffeine at the wrong end of the day. For a great many people that is enough, and it is the right first thing to try precisely because it is cheap and it often works.",
      },
      {
        type: "p",
        text: "What it does not do is supply the capacity to fall asleep. So when six honest weeks change nothing, the useful conclusion is not that you did it wrong. It is that obstacles were not what was in the way.",
      },
      {
        type: "blockquote",
        text: "Sleep hygiene clears the runway. It was never the engine.",
      },
      { type: "h2", text: "Why failing at it feels personal" },
      {
        type: "p",
        text: "Most strategies for regulation require the very capacity that is in short supply — they work when you don’t need them and fail when you do. A wind-down routine needs you to have something left to wind down with. “Don’t clock-watch” requires not doing the thing you are already doing.",
      },
      {
        type: "p",
        text: "None of that makes the advice wrong. It makes the conclusion wrong, and the conclusion people reach is almost always about themselves — that they didn’t commit properly, or that they are uniquely bad at something everybody else manages.",
      },
      { type: "h2", text: "What the six weeks did tell you" },
      {
        type: "p",
        text: "Something real, and it is worth collecting. You now know the nights are not being produced by light, screens, caffeine or an irregular schedule, because those are gone and the nights are not. That is a result, and it narrows what is left.",
      },
      {
        type: "p",
        text: "What is left divides in two. Some of it is medical: sleep apnea, thyroid problems, low iron, medication effects, and mood and anxiety disorders all produce nights like this, they are common, and they are identified by testing rather than by inference. If nobody has looked, that is the next move, and it is not ours to do.",
      },
      {
        type: "p",
        text: "The rest is the load itself — food, unbroken recovery time, and what the day is asking of you. That is the largest single lever most people have and the one most often skipped for being unglamorous. A few honest weeks there tells you what remains underneath.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "After both of those, rather than instead of either. LENS is a wellness service and not a treatment for sleep disorders. Sessions are quiet and passive — small sensors, a very low-energy feedback signal, nothing to perform, and nothing to keep up with at home, which is worth saying plainly to somebody who has just spent six weeks keeping something up.",
      },
      {
        type: "p",
        text: `A session runs ${SESSION_LENGTH.value} in a comfortable chair. Sleep is one of the first things we ask about at every visit, and the plan follows what your nights are telling us rather than a template. How much changes varies from person to person.`,
      },
      {
        type: "links",
        text: "Where this goes next.",
        items: [
          { href: "/concerns/sleep", label: "Sleep difficulties" },
          { href: "/concerns/stress-resilience", label: "Stress & resilience" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Already tried the obvious things? Say so on the call.",
    finalSub:
      "We’ll listen, answer honestly, and say plainly if LENS isn’t the right fit — before you book anything.",
    metaTitle: "Sleep Hygiene Not Working? What That Does and Doesn’t Rule Out",
    metaDescription:
      "You’ve done the routine, the blackout blind and the no-screens rule, and the nights are the same. What that tells you, and what to do next.",
  },
  {
    slug: "lens-vs-traditional-neurofeedback",
    tag: "How it works",
    title: "LENS vs. traditional neurofeedback: an honest comparison",
    crumbLabel: "LENS vs. traditional neurofeedback",
    excerpt: "Active training vs. passive feedback — and who tends to prefer which.",
    image: { src: "/images/glass-head.jpg", position: "center 40%" },
    readTime: "6 min read",
    byline: HBC_BYLINE,
    lede: "[Draft lede — active training vs. passive feedback, explained without jargon or salesmanship.]",
    body: [
      {
        type: "p",
        text: "[Draft article — an honest comparison; keep the no-hype standard and note where each approach tends to fit.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: STANDARD_FINAL_SUB,
    metaTitle: "LENS vs. Traditional Neurofeedback: An Honest Comparison",
    metaDescription:
      "Active training vs. passive feedback — an honest comparison of LENS and traditional neurofeedback.",
  },
  {
    slug: "bad-at-school",
    tag: "For parents",
    title: "When a bright kid starts saying “I'm just bad at school”",
    crumbLabel: "“Bad at school”",
    excerpt: "The self-story problem — and how to interrupt it early.",
    plateSpec: "Parent and teen talking at kitchen table — candid",
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "It usually arrives as a throwaway line, mid-argument, and it’s easy to hear as self-pity. It’s closer to a conclusion. Somewhere in the last year or two your child ran an experiment, over and over, and this is the result they believe it produced.",
    body: [
      { type: "h2", text: "It’s a conclusion, not a mood" },
      {
        type: "p",
        text: "A child who says “I’m just bad at school” usually isn’t fishing and usually isn’t being dramatic. They’re reporting a finding. They tried on Tuesday and it worked. They tried on Thursday, harder, and it didn’t. Nobody could tell them why, so they supplied the only explanation available to a nine-year-old — that the variable was them.",
      },
      {
        type: "p",
        text: "That inference is wrong, and it isn’t stupid. It fits the evidence they have. What they can’t see is that Thursday didn’t start with the same amount in the tank as Tuesday. A short night, a hard morning, a noisy classroom and the accumulated cost of holding it together all week all subtract from it. The work didn’t get harder. What was available to meet it got smaller.",
      },
      { type: "h2", text: "Why the encouragement stops landing" },
      {
        type: "p",
        text: "Most of what adults say at this point is a version of “you could do it if you tried” — and the child has evidence that appears to confirm it, because they did do it, on a good day. So praise aimed at effort lands as a request for more of the thing that already failed, and being told they’re smart lands as a contradiction of their own experiment. Both are kindly meant. Both argue with their data rather than explaining it.",
      },
      {
        type: "blockquote",
        text: "This is where a difficulty with regulation quietly becomes a story about character — and the story is the harder of the two to undo.",
      },
      {
        type: "p",
        text: "The distinction worth defending is between a hard thing and a permanent thing. “This is hard for me” leaves a door open. “I’m bad at this” closes it — and a closed door stops a child from trying in exactly the situations where trying would have worked.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Argue with the generalisation, not the difficulty. Agreeing that Thursday was genuinely hard costs nothing and buys credibility; disagreeing that they’re bad at school is then a claim they have some reason to consider. Denying both at once gets both rejected.",
      },
      {
        type: "p",
        text: "Describe the pattern out loud, in plain terms — that the good days and the bad days differ in what was available, not in how much they cared. It’s a smaller comfort than “you’re so smart,” and unlike that one it survives contact with the next bad day.",
      },
      {
        type: "p",
        text: "Then change what the day asks before it fails. A morning routine that runs without their attention, a worksheet someone else breaks into pieces, a request postponed by fifteen minutes — each one removes a place where the experiment gets run again and comes back with the same answer.",
      },
      {
        type: "p",
        text: "And check the ordinary causes. Sleep, vision and hearing, iron, thyroid, mood and anxiety all produce a bright kid who can’t show what they know, and all of them are found by testing rather than by inference. That belongs with a pediatrician. We can’t do it, and neither can an article.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is a wellness service and one gentle option among several. There’s nothing a child has to get right in a session — no sitting perfectly still, no concentrating, no being corrected — which matters more here than it may sound, because a child who has already concluded they’re bad at things does not need one more room where they can fail.",
      },
      {
        type: "p",
        text: `A parent stays for the whole session and joins every check-in, and what we track at those check-ins is what happens at home: mornings, homework, sleep, and how your child talks about themselves. Sessions run ${SESSION_LENGTH.value}. We coordinate happily with teachers, therapists and pediatricians. How much changes varies from person to person, and the check-ins are how anyone finds out.`,
      },
      {
        type: "links",
        text: "The two pages this one sits closest to.",
        items: [
          { href: "/concerns/children-school", label: "Children, school & transitions" },
          { href: "/concerns/focus-adhd", label: "Focus, ADHD & follow-through" },
        ],
      },
      { type: "note", text: STANDARD_NOTE },
    ],
    finalHeading: "Wondering whether this describes your child? Ask us.",
    finalSub:
      "A free phone call with a practitioner — honest answers, no pressure, and a plain “not a fit” if that’s the truth.",
    metaTitle: "“I’m Just Bad at School” — Helping a Bright Kid Who’s Given Up",
    metaDescription:
      "The self-story problem — what to do when a bright kid starts saying “I'm just bad at school,” and how to interrupt it early.",
  },
  {
    slug: "the-last-ten-percent",
    tag: "For adults",
    title: "The last ten percent: why finishing is a different job from starting",
    crumbLabel: "The last ten percent",
    excerpt: "Work that stalls at 90 percent isn’t unfinished for the reason it looks like.",
    image: { src: "/images/sensors-adult.jpg", position: "center 40%" },
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "The work is done. What’s left is the formatting, the send, the one phone call — an hour at most, and it has been three weeks. It’s one of the patterns people name when they call us, and it’s almost never the discipline problem it looks like from outside.",
    body: [
      { type: "h2", text: "Ninety percent is not almost done" },
      {
        type: "p",
        text: "From outside, the remaining ten percent looks like the easy part. The thinking is finished, the decisions are made, nothing hard is left. That reading is exactly what makes the stall impossible to explain to anyone, yourself included: it treats the whole thing as one continuous job that you inexplicably stopped doing near the end.",
      },
      {
        type: "p",
        text: "It isn’t one job. Starting is carried along by interest, and the last stretch has almost none left to draw on — by then the problem is solved and what remains is administration. Holding attention steady on something that has stopped being interesting is a different demand from following something that pulls you forward. And it arrives precisely when whatever carried you this far has been spent.",
      },
      {
        type: "blockquote",
        text: "Starting is paid for by interest. Finishing is paid for out of whatever is left.",
      },
      {
        type: "p",
        text: "Which is why the shape of it is so consistent. Not abandonment — circling. The file gets opened. The list gets rewritten. Something adjacent and slightly harder gets done instead, often well. Then the day ends. Nothing in that sequence looks like not caring, and people who don’t care don’t circle. They close the file.",
      },
      { type: "h2", text: "Why it gets read as character" },
      {
        type: "p",
        text: "The evidence available to everyone else is the finished ninety percent, which proves you can do this, and the missing ten, which is small. Put those two facts together and the only inference left is about you. Most people reach it themselves years before anyone says it out loud, and it does more damage than the missed deadline ever did.",
      },
      {
        type: "p",
        text: "The more accurate reading is duller. The capacity to hold a boring task steady varies — between people, and within the same person across a week. A Tuesday when it took forty minutes and a Thursday when it took the whole day aren’t evidence of two attitudes. They’re two different amounts of the same thing.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Give the last ten percent its own slot. Not “finish the report” at the end of a list, but a named, scheduled thing with nothing queued behind it. The reason it never happens is that it is always the tail of something else, and tails are what get cut when the day runs short.",
      },
      {
        type: "p",
        text: "Make the structure external. A deadline someone else is expecting, a call already in the calendar, a document shared before it’s ready — anything that moves the finishing out of your own head and into somewhere that doesn’t depend on you caring about it at four in the afternoon.",
      },
      {
        type: "p",
        text: "Decide in advance what counts as done. A good deal of the last ten percent isn’t work at all; it’s reluctance to hand over something imperfect. Settling that question while you still have the capacity to settle anything takes the negotiation out of the moment you’ll have least.",
      },
      {
        type: "p",
        text: "And look at the load underneath. Sleep, food and unbroken recovery time change what’s available for this more than any productivity system does, and a few weeks of honest attention there tells you what’s left underneath. Some of this picture is medical, too — sleep, thyroid, iron, mood and anxiety all produce it, and all of them are found by testing rather than by inference. That belongs with your doctor.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is a wellness service — small sensors, a very low-energy feedback signal, and nothing to practise between visits. There’s nothing to perform in a session and no homework to keep up with, which is worth stating plainly to an audience whose whole difficulty is that the last thing they need is one more system to maintain.",
      },
      {
        type: "p",
        text: `Regular sessions run ${SESSION_LENGTH.value} in a comfortable chair; many clients read or simply rest. Focus and follow-through are what we track at every check-in — deadlines, the everyday specifics — and the plan follows what’s actually changing rather than a template. Clients commonly report feeling steadier or thinking more clearly over a series of visits, and how much changes varies from person to person.`,
      },
      {
        type: "links",
        text: "Where this goes next.",
        items: [
          { href: "/concerns/focus-adhd", label: "Focus, ADHD & follow-through" },
          { href: "/adults", label: "LENS for adults" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Not sure whether this is you? That’s what the call is for.",
    finalSub:
      "Tell us what’s actually stalling. We’ll listen, answer honestly, and say plainly if LENS isn’t the right fit — on the phone, before you book anything.",
    metaTitle: "Can’t Finish What You Start? The Last Ten Percent, Explained",
    metaDescription:
      "Work that stalls at 90 percent isn’t unfinished for the reason it looks like — a plain-language look at why finishing draws on something starting doesn’t.",
  },
  {
    slug: "lens-and-medication",
    // Held for Ben's read while it was the one article whose whole subject is
    // the boundary around medication. Read and approved as written, Aug 2026 —
    // the hold is gone, the copy is unchanged.
    tag: "How it works",
    title: "Can you do LENS while you’re on medication?",
    crumbLabel: "LENS and medication",
    excerpt: "The short answer is yes. The longer answer is about what we don’t do.",
    image: { src: "/images/checkin.jpg", position: "center 40%" },
    readTime: "4 min read",
    byline: HBC_BYLINE,
    lede: "It’s one of the first questions people ask on the phone, and it usually arrives carefully — as though there might be a wrong answer. There isn’t. But the question underneath it deserves a straighter reply than yes.",
    body: [
      { type: "h2", text: "The short answer" },
      {
        type: "p",
        text: "Yes. LENS is routinely used alongside other care, and taking medication is not a reason we’d turn anyone away or ask them to wait. If you’re already seeing a doctor, a psychiatrist or a therapist, please keep seeing them — we’re glad to coordinate with providers you already trust.",
      },
      { type: "h2", text: "What we don’t do" },
      {
        type: "p",
        text: "We never advise on medication. Not whether to start it, not whether to stop it, not whether to change a dose, and not whether this looks like a good moment to try. That stays between you and your prescriber, and it stays there regardless of anything anyone notices over a course of sessions.",
      },
      {
        type: "p",
        text: "This isn’t caution for its own sake. Harmonized is a wellness practice, not a medical clinic. LENS doesn’t diagnose or treat medical or psychiatric conditions, and it isn’t a substitute for care from your doctor or therapist. A practice that can’t diagnose has no business holding an opinion about a prescription.",
      },
      {
        type: "blockquote",
        text: "Anyone offering a wellness service who suggests you might not need your medication has told you something about themselves, not about your medication.",
      },
      { type: "h2", text: "Why people ask" },
      {
        type: "p",
        text: "Usually one of three things. Some want to know whether what they’re taking will interfere with the sessions. Some are hoping to hear that LENS is a way off it. And some have been told somewhere that the two can’t be combined.",
      },
      {
        type: "p",
        text: "To the first: nothing about a session requires you to be off anything, or on anything. Small sensors sit on the scalp, the system returns a brief very low-energy feedback signal, and there’s nothing to perform. Most people, including young children, feel nothing at all.",
      },
      {
        type: "p",
        text: "To the second: LENS is not an alternative to medication, and we won’t describe it as one. It never replaces your doctor, your therapist, or school supports. If you want to change what you’re taking, that conversation belongs with the person who prescribed it — and it belongs there whether or not you ever call us.",
      },
      {
        type: "p",
        text: "To the third: we can’t speak for what another practice does or requires. What we can tell you plainly is what happens here.",
      },
      { type: "h2", text: "How it works in practice" },
      {
        type: "p",
        text: "You tell us what you’re taking because it’s part of what’s going on, the same as sleep and stress and the shape of your week — not because it changes what we do. Every visit opens with a structured check-in on how things are actually going, and your plan follows that. If something you notice seems worth raising with your prescriber, we’ll say so, and then it’s theirs.",
      },
      {
        type: "p",
        text: "And if you’d like your prescriber to know what we’re doing, we’re happy to explain it to them directly. That’s a normal request, not an awkward one.",
      },
      {
        type: "links",
        text: "Where to read more.",
        items: [
          { href: "/concerns/focus-adhd", label: "Focus, ADHD & follow-through" },
          { href: "/faq", label: "The full FAQ" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Bring the question to the call. We’ll answer it straight.",
    finalSub:
      "Tell us what’s going on, including what you’re already doing. We’ll answer honestly and say plainly if LENS isn’t the right fit — before you book anything.",
    metaTitle: "Can You Do LENS Neurofeedback While on Medication?",
    metaDescription:
      "Yes — LENS is routinely used alongside other care. What we do and don’t do about medication, stated plainly.",
  },
  {
    slug: "told-to-just-relax",
    tag: "For adults",
    title: "Why you can’t relax when there’s nothing to relax about",
    crumbLabel: "“Just relax”",
    excerpt: "Being told to relax assumes the problem is that you haven’t tried.",
    image: { src: "/images/session-room.jpg", position: "center 45%" },
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "Life is fine. The week is ordinary, nothing is wrong, and you are still braced for something. Then somebody tells you to relax — and the advice is so obviously correct that failing at it starts to feel like a verdict.",
    body: [
      { type: "h2", text: "The advice assumes the problem is effort" },
      {
        type: "p",
        text: "“Just relax” isn’t really an instruction. It’s a description of the desired outcome, handed over as though naming it were the hard part. If relaxing were available you would have done it, which is the whole of why the sentence lands badly — and why the people saying it are usually surprised by the reaction.",
      },
      {
        type: "p",
        text: "The mismatch is between what the phrase assumes and what is actually in short supply. It assumes calm is a choice you keep declining to make. What people describe instead is a body that stays on alert long after the moment has passed: constantly on edge, braced for something, struggling to relax even when life is objectively calm. That last clause is the one that matters. The difficulty isn’t proportionate to what’s happening, which is exactly why arguing about what’s happening doesn’t move it.",
      },
      { type: "h2", text: "Why calm isn’t a decision" },
      {
        type: "p",
        text: "Your nervous system has a range it works well inside. Above it you are reactive; below it you are flat. Most of what gets called a focus problem, a temper problem or a motivation problem is a system operating outside that range — and so is a good deal of what gets called not being able to relax. Arousal regulation is a measurable property of the nervous system, and it varies, across people and within the same person across a day.",
      },
      {
        type: "p",
        text: "It also isn’t fixed. Regulation is a capacity that depletes and recovers, which is why an ordinary Tuesday evening is manageable one week and not the next. Nothing about the week got harder; what was available to meet it got smaller. Consistency is the wrong benchmark, and holding yourself to your own best day sets a standard the system cannot meet.",
      },
      {
        type: "blockquote",
        text: "Being told to relax is being asked to spend the thing that has already run out.",
      },
      {
        type: "p",
        text: "It is also why the standard advice underperforms. Most strategies for regulation require the very capacity that is in short supply — they work when you don’t need them and fail when you do. “Notice it before it escalates” requires the noticing. None of that makes the strategies wrong. It makes the conclusion wrong, and the conclusion is usually that you didn’t try hard enough.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Put the structure outside yourself. Something that runs without your attention beats something that needs it — the same sequence every evening, an alarm rather than an intention, a decision made in the morning about what the evening is allowed to contain.",
      },
      {
        type: "p",
        text: "Lower the demand before it fails rather than after. A thing postponed by fifteen minutes often goes fine; the same thing pushed through a rising state usually costs the next hour, and the argument afterwards is rarely about the thing.",
      },
      {
        type: "p",
        text: "Treat the load as the intervention rather than the background. Sleep, food and unbroken recovery time are not the soft version of this — they are the largest single lever most people have and the first thing dropped when the week fills up. A few weeks of honest attention there tells you what is left underneath.",
      },
      {
        type: "p",
        text: "And rule out the ordinary causes, because several of them produce exactly this. Thyroid problems, low iron, sleep apnea, medication effects, and mood and anxiety disorders are common, and they are identified by testing rather than by inference. If nobody has looked, that is the thing to do first. We can’t do it, and neither can an article.",
      },
      { type: "h2", text: "If nights are the hard part" },
      {
        type: "p",
        text: "Evenings are when most people notice this, and not being able to switch off at bedtime is one of the most common things anyone tells us. Sleep is its own subject though, with its own page and its own answer: a mind that won’t settle at bedtime and a body braced at two in the afternoon are not one problem wearing different clothes. If the nights are the main event for you, start there instead — the link is at the foot of this page.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is a wellness service and one gentle option among several. An anxious nervous system often feels like a system working harder than it needs to, and a session asks nothing of it — small sensors, a very low-energy feedback signal, nothing to perform and nothing to practise between visits. Most people, including young children, feel nothing at all.",
      },
      {
        type: "p",
        text: `Sessions run ${SESSION_LENGTH.value} in a comfortable chair, and many clients read or simply rest. It is one of the calmest hours of most clients’ week, which is worth stating plainly to somebody who has spent years being told to relax: there is nothing here to get right. Clients commonly report feeling steadier over a series of visits, and how much changes varies from person to person, which is why we ask at every visit rather than predicting.`,
      },
      {
        type: "links",
        text: "Where this goes next.",
        items: [
          { href: "/concerns/anxiety", label: "Anxiety & nervous-system overload" },
          { href: "/concerns/sleep", label: "Sleep difficulties" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Tell us what it actually feels like. We’ll be straight with you.",
    finalSub:
      "Bring the version you don’t say out loud. We’ll listen, answer honestly, and say plainly if LENS isn’t the right fit — before you book anything.",
    metaTitle: "Can’t Relax When Nothing’s Wrong? Why “Just Relax” Doesn’t Work",
    metaDescription:
      "Being told to relax assumes the problem is that you haven’t tried. A plain-language look at why an ordinary week doesn’t produce a settled body.",
  },
  {
    slug: "braced-for-something",
    tag: "For adults",
    title: "Why your body stays braced when nothing is happening",
    crumbLabel: "A body that stays braced",
    excerpt: "The physical half of it — jaw, shoulders, gut — and why it outlasts whatever caused it.",
    image: { src: "/images/ear-clip-adult.jpg", position: "center 40%" },
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "The meeting ended two hours ago. The jaw is still set, the shoulders are still somewhere up near the ears, and the stomach has its own opinion about all of it. Nothing is happening. The body has not been told.",
    body: [
      { type: "h2", text: "Bracing is a state, not a mood" },
      {
        type: "p",
        text: "People describe this to us in physical terms far more often than emotional ones — carrying stress in the jaw, the shoulders, the gut; unable to recover after a difficult day; functioning perfectly well and quietly running on empty. The word “anxiety” sometimes never comes up, because it doesn’t present as a feeling. It presents as a body doing something nobody asked it to.",
      },
      {
        type: "p",
        text: "That is a reasonable way to describe it rather than a euphemism for one. Arousal regulation is a measurable property of the nervous system, and it varies — across people, and within the same person across a day. Above the range you are reactive; below it you are flat. Bracing is what the top half looks like from the inside, and it has physical outputs because the system producing it is a physical one.",
      },
      { type: "h2", text: "Why it outlasts what caused it" },
      {
        type: "p",
        text: "The part people find hardest to explain is the lag. The stressful thing is over, sometimes by hours, and the body is still braced for it. What that describes is a system not moving between states cleanly, rather than one stuck at a setting — going up and coming back down are two different jobs, and the second one has its own cost.",
      },
      {
        type: "blockquote",
        text: "A body still braced two hours after the meeting is not reacting to the meeting. It is still finishing it.",
      },
      {
        type: "p",
        text: "It is also why the physical and the mental versions of this travel together. Attention difficulty, emotional reactivity, poor sleep and mental fatigue co-occur at rates far above chance, and it is more useful to read that as one problem with several outputs than as four separate ones. Returning to baseline after a spike is one of those outputs. None of which makes the physical part less real or more psychological — it makes it the same event, read from the other end.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "Address the load rather than the incident. Sleep, food and unbroken recovery time are not soft interventions; they are the largest single lever most people have, and the one most often skipped for being unglamorous.",
      },
      {
        type: "p",
        text: "Lower the demand before it fails, not after. A hard conversation postponed by fifteen minutes often goes fine. The same conversation pushed through a rising state usually costs the evening as well.",
      },
      {
        type: "p",
        text: "And be careful about the conclusion when the usual advice doesn’t land. Most strategies for regulation require the very capacity that is in short supply — they work when you don’t need them and fail when you do. That is an argument against the conclusion people draw from failing at them, not against the strategies.",
      },
      { type: "h2", text: "Have it looked at" },
      {
        type: "p",
        text: "This belongs first rather than last. Thyroid problems, low iron, sleep apnea, medication effects, and mood and anxiety disorders all produce this picture; they are common; and they are identified by testing rather than by inference. A jaw that won’t unclench and a gut that won’t settle are also exactly the kind of thing a doctor should hear about directly. We can’t test for any of it, and neither can an article — if nobody has looked, that is where to start.",
      },
      { type: "h2", text: "Where LENS fits" },
      {
        type: "p",
        text: "LENS is a wellness service, not a treatment for anything, and it belongs after the paragraph above rather than instead of it. Sessions are quiet and passive — small sensors, a very low-energy feedback signal, nothing to perform and nothing to keep up with at home.",
      },
      {
        type: "p",
        text: `A session runs ${SESSION_LENGTH.value} in a comfortable chair. What we check at every visit is what you would actually notice: sleep, tension, reactivity, and how the day after a hard day goes — and the plan follows that rather than a template. Clients commonly report feeling steadier over a series of visits, and how much changes varies from person to person.`,
      },
      {
        type: "links",
        text: "The two pages this one sits closest to.",
        items: [
          { href: "/concerns/anxiety", label: "Anxiety & nervous-system overload" },
          { href: "/concerns/stress-resilience", label: "Stress & resilience" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Describe it in whatever words you’ve got. We’ll be straight with you.",
    finalSub:
      "Including the physical part nobody asks about. We’ll listen, answer honestly, and say plainly if LENS isn’t the right fit — before you book anything.",
    metaTitle: "Why Your Body Stays Braced When Nothing Is Wrong",
    metaDescription:
      "Jaw, shoulders, gut — the physical half of nervous-system overload, why it outlasts whatever caused it, and when to have it checked.",
  },
  {
    slug: "alongside-therapy",
    tag: "How it works",
    title: "Can you do LENS while you’re seeing a therapist?",
    crumbLabel: "LENS and therapy",
    excerpt: "Yes — and we’d rather you did. What coordinating actually looks like.",
    image: { src: "/images/session-wide.jpg", position: "center 40%" },
    readTime: "4 min read",
    byline: HBC_BYLINE,
    lede: "This one usually arrives with an apology attached, as though asking might be disloyal to somebody. It isn’t, and the answer is short. What takes longer is why we mean it.",
    body: [
      { type: "h2", text: "The short answer" },
      {
        type: "p",
        text: "Yes, and please keep seeing them. LENS is routinely used alongside other care, and we’re glad to coordinate with providers you already trust. Nobody here is going to ask you to choose.",
      },
      { type: "h2", text: "Why we’d rather you kept your therapist" },
      {
        type: "p",
        text: "Partly because of what LENS is not. It is not a medical treatment, a diagnosis or a cure, and it is not a replacement for your doctor, your therapist, or school supports.",
      },
      {
        type: "blockquote",
        text: "Anything positioning itself as the alternative to your therapist has told you what it thinks of your therapist, not what it can do for you.",
      },
      {
        type: "p",
        text: "And partly because the two do different work. Therapy is where you think about what happened and what it means. A LENS visit opens with a structured check-in on how the week actually went — sleep, tension, reactivity — and then you sit in a comfortable chair with nothing to do and nothing to get right. Those are not the same hour, and neither one is a lighter version of the other.",
      },
      { type: "h2", text: "What coordinating actually looks like" },
      {
        type: "p",
        text: "Undramatic, mostly. You tell us who you’re working with, because it’s part of what’s going on — the same as sleep and stress and the shape of your week. If you’d like your therapist to know what we’re doing, we’re happy to explain it to them directly. That’s a normal request rather than an awkward one, and we coordinate happily with therapists, teachers and pediatricians.",
      },
      {
        type: "p",
        text: `What that amounts to is a conversation about what the service is and what your check-ins are tracking. ${INFORMATION_SHARING}`,
      },
      { type: "h2", text: "What we don’t do" },
      {
        type: "p",
        text: "We don’t advise on medication; that stays between you and your prescriber. We don’t have opinions about what your therapy is for, or about when you’re finished with it. And we don’t diagnose or treat medical or psychiatric conditions — Harmonized is a wellness practice, not a medical clinic, which is the same reason your therapist’s work is theirs and not ours.",
      },
      {
        type: "p",
        text: "And if what you describe on the phone sounds like a job for the person you’re already seeing, we’ll say so then, rather than after you’ve booked.",
      },
      {
        type: "links",
        text: "Where to read more.",
        items: [
          { href: "/concerns/anxiety", label: "Anxiety & nervous-system overload" },
          { href: "/faq", label: "The full FAQ" },
        ],
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "Bring your therapist’s questions too. We’ll answer them straight.",
    finalSub:
      "Tell us what’s going on and who you’re already working with. We’ll answer honestly and say plainly if LENS isn’t the right fit — before you book anything.",
    metaTitle: "Can You Do LENS Neurofeedback Alongside Therapy?",
    metaDescription:
      "Yes — LENS is routinely used alongside other care. Why we’d rather you kept your therapist, and what coordinating actually involves.",
  },
  {
    slug: "brain-fog-after-55",
    tag: "Adults 55+",
    title: "Brain fog after 55: what's normal, what's worth attention",
    crumbLabel: "Brain fog after 55",
    excerpt:
      "A calm, non-alarmist guide to cognitive change — and when to talk to your doctor.",
    image: { src: "/images/ear-clip-senior.jpg", position: "center 45%" },
    readTime: "7 min read",
    byline: HBC_BYLINE,
    lede: "[Draft lede — a calm, non-alarmist guide to cognitive change after 55, and when it's worth a conversation with your doctor.]",
    body: [
      {
        type: "p",
        text: "[Draft article — non-alarmist, sourced, and clear about when to seek medical evaluation. Keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: STANDARD_FINAL_SUB,
    metaTitle: "Brain Fog After 55: What’s Normal, What’s Worth Attention",
    metaDescription:
      "A calm, non-alarmist guide to brain fog after 55 — what's normal, what's worth attention, and when to talk to your doctor.",
  },
  {
    slug: "what-the-equipment-does",
    tag: "How it works",
    title: "What the equipment actually does (and doesn't do)",
    crumbLabel: "The equipment",
    excerpt: "A tour of the LENS system — sensors, signals, and safety.",
    image: { src: "/images/lens-device.jpg", position: "center" },
    readTime: "5 min read",
    byline: HBC_BYLINE,
    lede: "[Draft lede — a plain tour of the LENS system: what the sensors read, what the feedback signal is, and what the equipment never does.]",
    body: [
      {
        type: "p",
        text: "[Draft article — sensors, signals, and safety, explained without jargon. Keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The best way to understand LENS is to talk with someone who does it every day.",
    finalSub: STANDARD_FINAL_SUB,
    metaTitle: "What LENS Neurofeedback Equipment Actually Does",
    metaDescription:
      "A tour of the LENS system — what the sensors read, what the feedback signal is, and what the equipment never does.",
  },
];

export function getResource(slug: string): Resource | undefined {
  return resources.find((r) => r.slug === slug);
}
