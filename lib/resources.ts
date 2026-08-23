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

import { FOUNDER_DISPLAY_NAME, SESSION_LENGTH } from "./site-config";

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
  byline: string;
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

const DRAFT_FINAL_SUB =
  "Tell us what’s going on. We’ll listen, answer honestly, and tell you plainly whether LENS is a fit — on the phone, before you book anything.";

import { isDraftText } from "./site-config";

/** A resource is publishable once its lede and body carry no [draft] notes. */
export function isPublishable(r: Resource): boolean {
  return (
    !isDraftText(r.lede) &&
    !isDraftText(r.byline) &&
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
    byline:
      `By the Harmonized team · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director`, // [Confirm byline & review date]
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
    byline:
      `By [Practitioner name] · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director · [Month Year]`,
    lede: "[Draft lede — sleep quantity isn't sleep quality; what a wired-but-tired nervous system looks like from the inside.]",
    body: [
      {
        type: "p",
        text: "[Draft article — plain, non-clinical language. Cite sources where claims are made; keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: DRAFT_FINAL_SUB,
    metaTitle: "Tired After 8 Hours’ Sleep: Why Quantity Isn’t Quality",
    metaDescription:
      "Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.",
  },
  {
    slug: "lens-vs-traditional-neurofeedback",
    tag: "How it works",
    title: "LENS vs. traditional neurofeedback: an honest comparison",
    crumbLabel: "LENS vs. traditional neurofeedback",
    excerpt: "Active training vs. passive feedback — and who tends to prefer which.",
    image: { src: "/images/glass-head.jpg", position: "center 40%" },
    readTime: "6 min read",
    byline:
      `By [Practitioner name] · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director · [Month Year]`,
    lede: "[Draft lede — active training vs. passive feedback, explained without jargon or salesmanship.]",
    body: [
      {
        type: "p",
        text: "[Draft article — an honest comparison; keep the no-hype standard and note where each approach tends to fit.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: DRAFT_FINAL_SUB,
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
    byline:
      `By the Harmonized team · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director`, // [Confirm byline & review date]
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
    byline:
      `By the Harmonized team · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director`, // [Confirm byline & review date]
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
    tag: "How it works",
    title: "Can you do LENS while you’re on medication?",
    crumbLabel: "LENS and medication",
    excerpt: "The short answer is yes. The longer answer is about what we don’t do.",
    image: { src: "/images/checkin.jpg", position: "center 40%" },
    readTime: "4 min read",
    byline:
      `By the Harmonized team · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director`, // [Confirm byline & review date]
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
    slug: "brain-fog-after-55",
    tag: "Adults 55+",
    title: "Brain fog after 55: what's normal, what's worth attention",
    crumbLabel: "Brain fog after 55",
    excerpt:
      "A calm, non-alarmist guide to cognitive change — and when to talk to your doctor.",
    image: { src: "/images/ear-clip-senior.jpg", position: "center 45%" },
    readTime: "7 min read",
    byline:
      `By [Practitioner name] · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director · [Month Year]`,
    lede: "[Draft lede — a calm, non-alarmist guide to cognitive change after 55, and when it's worth a conversation with your doctor.]",
    body: [
      {
        type: "p",
        text: "[Draft article — non-alarmist, sourced, and clear about when to seek medical evaluation. Keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: DRAFT_FINAL_SUB,
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
    byline:
      `By [Practitioner name] · Reviewed by ${FOUNDER_DISPLAY_NAME}, Clinical Director · [Month Year]`,
    lede: "[Draft lede — a plain tour of the LENS system: what the sensors read, what the feedback signal is, and what the equipment never does.]",
    body: [
      {
        type: "p",
        text: "[Draft article — sensors, signals, and safety, explained without jargon. Keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The best way to understand LENS is to talk with someone who does it every day.",
    finalSub: DRAFT_FINAL_SUB,
    metaTitle: "What LENS Neurofeedback Equipment Actually Does",
    metaDescription:
      "A tour of the LENS system — what the sensors read, what the feedback signal is, and what the equipment never does.",
  },
];

export function getResource(slug: string): Resource | undefined {
  return resources.find((r) => r.slug === slug);
}
