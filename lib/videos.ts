/**
 * Videos (components/VideoEmbed.tsx). Shaped like lib/resources.ts: one
 * record per video, the page reads the record, the schema reads the same
 * record (lib/schema.ts → videoObjectSchema), so the two cannot disagree.
 *
 * ## What a record is, and is not
 *
 * `id` is the YouTube video id and nothing else — the embed URL, the watch
 * URL and the poster's filename are all derived from it below, so there is
 * one string to get right. `posterPath` is a file in `public/images/videos/`
 * fetched once by `npm run fetch:posters` and committed: the page never asks
 * i.ytimg.com for anything at runtime (see the facade note in VideoEmbed).
 *
 * `durationSeconds` and `uploadDate` are Verifiables because they are facts
 * the markup publishes. Every record below is verified from the video's own
 * YouTube watch page (Ben, 2026-10-20: YouTube's data is the source); flip
 * one to unverified and draft renders the gold tag, production drops the
 * duration and the schema leaves both fields out. Never type a guess into
 * either — a wrong `uploadDate` is a wrong claim in the markup.
 *
 * ## Three places a video shows
 *
 * Its watch page, `/videos/<slug>` (app/videos/[slug]) — the video is the
 * page, and the only page whose graph carries its VideoObject, so Google
 * has one URL to list it under (VIDEO-MAP.md). The /videos hub. And its
 * `home`, a content page that embeds it below the fold through VideoBand,
 * with a link to the watch page. /contact's post-submit video predates the
 * watch pages and keeps its own node.
 *
 * ## Why youtube-nocookie.com
 *
 * The embed is served from `www.youtube-nocookie.com`, YouTube's
 * privacy-enhanced host: it sets no advertising cookies until the visitor
 * plays, and nothing before that. The site's privacy notice describes a page
 * that does not hand a visitor to a third party for reading a form, and the
 * ordinary embed host would have done exactly that.
 */

import {
  type Verifiable,
  VIDEO_APPOINTMENT_ONE_DURATION,
  VIDEO_APPOINTMENT_ONE_UPLOAD_DATE,
} from "./site-config";

/** The /videos hub's three shelves, in the order the hub shows them. */
export type VideoGroup = "stories" | "hopeful-brain" | "explainers";

export const VIDEO_GROUPS: { key: VideoGroup; eyebrow: string; heading: string; intro: string }[] = [
  {
    key: "stories",
    eyebrow: "Client stories",
    heading: "In their own words.",
    intro:
      "Clients talking about what they came in with and what changed for them. Individual experiences vary.",
  },
  {
    key: "hopeful-brain",
    eyebrow: "The Hopeful Brain",
    heading: "Longer conversations about the brain.",
    intro: "Our series on what is going on when the brain feels stuck, and what can shift it.",
  },
  {
    key: "explainers",
    eyebrow: "LENS, briefly",
    heading: "Short answers to common questions.",
    intro: "What LENS is, what a first appointment looks like, and how it relates to specific concerns.",
  },
];

/** A plain link on the watch page — a concern page, an article, a step. */
export type VideoLink = { label: string; href: string };

export type Video = {
  /** The YouTube video id — `youtube.com/watch?v=<id>`. */
  id: string;
  /** The watch page: `/videos/<slug>`. */
  slug: string;
  /** The label the page shows — the watch page's H1, the caption, the play
   *  button's name. The YouTube title except where it carries an emoji, a
   *  "| …" search suffix or a hype prefix (VIDEO-MAP.md, flag 5). */
  title: string;
  /** The video's title on YouTube, verbatim. The schema's `name` and the
   *  player iframe's `title`, so the markup matches its source. */
  sourceTitle: string;
  /** One plain sentence: what the video shows. Also the schema's
   *  `description`, so it must describe the video and not sell anything. */
  description: string;
  /** Running time in whole seconds — YouTube's `lengthSeconds`, which is the
   *  file's length; Studio and YouTube's own markup round up (Ben,
   *  2026-10-13, on the first record). */
  durationSeconds: Verifiable<number | null>;
  /** When YouTube published it, ISO 8601 with the offset YouTube gives. */
  uploadDate: Verifiable<string | null>;
  /** Site-root-relative path of the committed poster (`npm run fetch:posters`). */
  posterPath: string;
  /** A client interview — a video story. The "Video stories" badge on the
   *  homepage and /stories shows only while at least one record says so. */
  story?: boolean;
  /** A YouTube Short — vertical, so the 16:9 player pillarboxes it. */
  short?: boolean;
  /** Its shelf on the /videos hub. */
  group: VideoGroup;
  /** The content page that also embeds it, below the fold (VideoBand). At
   *  most one video per page — asserted below. */
  home?: string;
  /** Two or three links under the video on its watch page. */
  related: VideoLink[];
  /** A line under the video, wherever it renders — for the one video whose
   *  title is about medication. */
  note?: string;
};

/**
 * Duration and upload date for the records below, as read from each video's
 * own YouTube watch page on 2026-10-20. Ben approved YouTube's own data as
 * the source (2026-10-20), so they are verified as written; the note is what
 * draft mode would show if one were flipped back.
 */
const fromYouTube = <T,>(value: T, note: string): Verifiable<T> => ({ value, verified: true, note });
const seconds = (n: number) => fromYouTube<number | null>(n, "[Confirm video running time, in seconds]");
const published = (iso: string) => fromYouTube<string | null>(iso, "[Confirm video upload date]");

/** The content date of every watch page — the day their copy was written.
 *  Bump it by hand when that copy changes (lib/pages.ts explains why). */
export const VIDEO_PAGES_DATE = "2026-10-20";

const FIRST_VISIT: VideoLink = { label: "Your first visit", href: "/first-visit" };

/** The site's standing line on medication (lib/resources.ts →
 *  lens-and-medication), under the one video whose title is about it. */
const MEDICATION_NOTE =
  "We never advise on medication. Starting, stopping or changing a dose stays between you and your prescriber.";

export const videos: Video[] = [
  // --- Client stories --------------------------------------------------
  {
    id: "0UCoTkcBaIE",
    slug: "anns-story",
    title: "From Depression & Memory Loss to Joy: Ann's LENS Journey",
    sourceTitle: "From Depression & Memory Loss to Joy: Ann's LENS Journey",
    description:
      "Ann, a client later in life, talks about the depression and memory trouble she came in with and how she has felt since her LENS sessions.",
    durationSeconds: seconds(117),
    uploadDate: published("2025-03-20T09:55:00-07:00"),
    posterPath: "/images/videos/0UCoTkcBaIE.jpg",
    story: true,
    group: "stories",
    home: "/concerns/depression",
    related: [
      { label: "Depression & low mood", href: "/concerns/depression" },
      { label: "Brain fog & memory", href: "/concerns/brain-fog" },
      FIRST_VISIT,
    ],
  },
  {
    id: "sy1c02U2z5Y",
    slug: "rachels-concussion-story",
    title: "From Concussion Fog to Crystal Clarity: Rachel's LENS Story",
    sourceTitle: "From Concussion Fog to Crystal Clarity: Rachel's LENS Story",
    description:
      "Rachel describes the brain fog that followed her concussion and what changed for her over her LENS sessions at Harmonized Brain Centers.",
    durationSeconds: seconds(211),
    uploadDate: published("2025-03-20T10:01:52-07:00"),
    posterPath: "/images/videos/sy1c02U2z5Y.jpg",
    story: true,
    group: "stories",
    home: "/concerns/concussion",
    related: [
      { label: "Concussion & TBI", href: "/concerns/concussion" },
      { label: "Good days and bad days after a concussion", href: "/resources/good-days-bad-days-after-concussion" },
      FIRST_VISIT,
    ],
  },
  {
    id: "IRouWa7dLfE",
    slug: "hope-in-the-midst-of-anxiety",
    title: "Discovering Hope in the Midst of Debilitating Anxiety",
    sourceTitle: "Discovering Hope in the Midst of Debilitating Anxiety",
    description:
      "A young woman talks about living with severe anxiety and what she noticed after starting LENS at Harmonized Brain Centers.",
    durationSeconds: seconds(80),
    uploadDate: published("2025-03-20T09:38:46-07:00"),
    posterPath: "/images/videos/IRouWa7dLfE.jpg",
    story: true,
    group: "stories",
    home: "/concerns/anxiety",
    related: [
      { label: "Anxiety & stress", href: "/concerns/anxiety" },
      { label: "Always on guard", href: "/resources/always-on-guard" },
      FIRST_VISIT,
    ],
  },
  {
    id: "AmvsepFDmqY",
    slug: "off-antidepressants-after-20-years",
    // The YouTube title opens "Life-Changing Transformation:"; the label
    // drops that prefix and keeps the client's own words (VIDEO-MAP.md flag 3).
    title: "How LENS Neurofeedback Helped Me Ditch Antidepressants After 20 Years",
    sourceTitle:
      "Life-Changing Transformation: How LENS Neurofeedback Helped Me Ditch Antidepressants After 20 Years",
    description:
      "A client who had taken antidepressants for twenty years talks about their experience with LENS neurofeedback at Harmonized Brain Centers.",
    durationSeconds: seconds(95),
    uploadDate: published("2025-03-31T09:19:06-07:00"),
    posterPath: "/images/videos/AmvsepFDmqY.jpg",
    story: true,
    group: "stories",
    home: "/resources/lens-and-medication",
    note: MEDICATION_NOTE,
    related: [
      { label: "Can you do LENS while you’re on medication?", href: "/resources/lens-and-medication" },
      { label: "Depression & low mood", href: "/concerns/depression" },
      FIRST_VISIT,
    ],
  },
  {
    id: "fEEIHDzeMEw",
    slug: "after-32-surgeries",
    title: "How She Overcame 32 Surgeries to Dominate Real Estate with LENS",
    sourceTitle: "How She Overcame 32 Surgeries to Dominate Real Estate with LENS",
    description:
      "A real estate agent who has been through thirty-two surgeries talks about stress, focus and her work since starting LENS.",
    durationSeconds: seconds(180),
    uploadDate: published("2025-03-20T09:31:48-07:00"),
    posterPath: "/images/videos/fEEIHDzeMEw.jpg",
    story: true,
    group: "stories",
    home: "/concerns/performance",
    related: [
      { label: "Performance", href: "/concerns/performance" },
      { label: "Trauma-related stress", href: "/concerns/trauma" },
      FIRST_VISIT,
    ],
  },
  {
    id: "iTLXETj8htk",
    slug: "ellie-holcomb-brain-fog",
    // Emoji and "GONE?!" dropped from the label (VIDEO-MAP.md flag 5).
    title: "Ellie Holcomb on Brain Fog and LENS",
    sourceTitle: "Ellie Holcomb’s Brain Fog… GONE?! 🤯 | Her HBC Breakthrough",
    description:
      "Ellie Holcomb talks about the brain fog she came in with and how her thinking and creativity have felt since LENS at Harmonized Brain Centers.",
    durationSeconds: seconds(135),
    uploadDate: published("2025-12-02T13:30:49-08:00"),
    posterPath: "/images/videos/iTLXETj8htk.jpg",
    story: true,
    short: true,
    group: "stories",
    home: "/concerns/brain-fog",
    related: [
      { label: "Brain fog", href: "/concerns/brain-fog" },
      { label: "Client stories", href: "/stories" },
      FIRST_VISIT,
    ],
  },

  // --- The Hopeful Brain -----------------------------------------------
  {
    id: "CnQgJRqFDEo",
    slug: "when-the-brain-feels-out-of-balance",
    title: "When the Brain Feels Out of Balance",
    sourceTitle: "When the Brain Feels Out of Balance",
    description:
      "The first episode of The Hopeful Brain: a conversation about what it looks like when a child's or adult's brain is overloaded, and why it shows up differently in everyone.",
    durationSeconds: seconds(284),
    uploadDate: published("2026-03-11T21:47:50-07:00"),
    posterPath: "/images/videos/CnQgJRqFDEo.jpg",
    group: "hopeful-brain",
    home: "/concerns/emotional-regulation",
    related: [
      { label: "Emotional regulation", href: "/concerns/emotional-regulation" },
      { label: "Stress & resilience", href: "/concerns/stress-resilience" },
      FIRST_VISIT,
    ],
  },
  {
    id: "9_3_EByrX6A",
    slug: "understanding-the-adhd-brain",
    title: "Understanding the ADHD Brain",
    sourceTitle: "Understanding the ADHD Brain",
    description:
      "An episode of The Hopeful Brain on how the ADHD brain handles stimulation, why settling can be hard, and what families miss when they look only at behavior.",
    durationSeconds: seconds(309),
    uploadDate: published("2026-03-11T21:47:39-07:00"),
    posterPath: "/images/videos/9_3_EByrX6A.jpg",
    group: "hopeful-brain",
    home: "/children-families",
    related: [
      { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
      { label: "Homework battles", href: "/resources/homework-battles" },
      { label: "Children & families", href: "/children-families" },
    ],
  },
  {
    id: "YX4yNxhdnUM",
    slug: "what-is-low-energy-neurofeedback",
    title: "What Is Low Energy Neurofeedback — And How Is It Different?",
    sourceTitle: "What Is Low Energy Neurofeedback — And How Is It Different?",
    description:
      "An episode of The Hopeful Brain explaining low energy neurofeedback in plain terms: how it differs from traditional neurofeedback and what a session feels like.",
    durationSeconds: seconds(278),
    uploadDate: published("2026-03-13T04:15:59-07:00"),
    posterPath: "/images/videos/YX4yNxhdnUM.jpg",
    group: "hopeful-brain",
    home: "/lens-neurofeedback",
    related: [
      { label: "LENS neurofeedback", href: "/lens-neurofeedback" },
      { label: "LENS vs. traditional neurofeedback", href: "/resources/lens-vs-traditional-neurofeedback" },
      FIRST_VISIT,
    ],
  },
  {
    id: "THKM7Euo9Uo",
    slug: "how-neurofeedback-helps-reset-the-brain",
    title: "How Neurofeedback Helps Reset the Brain",
    sourceTitle: "How Neurofeedback Helps Reset the Brain",
    description:
      "An episode of The Hopeful Brain on what it means to “reset” the brain, what people tend to notice first, and why changes show up in daily life rather than during sessions.",
    durationSeconds: seconds(315),
    uploadDate: published("2026-03-16T04:13:28-07:00"),
    posterPath: "/images/videos/THKM7Euo9Uo.jpg",
    group: "hopeful-brain",
    home: "/how-lens-works",
    related: [
      { label: "How LENS works", href: "/how-lens-works" },
      { label: "What we help with", href: "/what-we-help-with" },
      FIRST_VISIT,
    ],
  },

  // --- LENS, briefly ---------------------------------------------------
  {
    id: "6Pm8eiJR38A",
    slug: "find-yourself-again",
    title: "Find Yourself Again with LENS at Harmonized Brain Centers",
    sourceTitle: "Find Yourself Again with LENS at Harmonized Brain Centers",
    description:
      "An introduction to Harmonized Brain Centers: how brainwaves and stress affect the brain, what LENS neurofeedback is, who it is for and how the process works.",
    durationSeconds: seconds(138),
    uploadDate: published("2025-02-21T07:59:20-08:00"),
    posterPath: "/images/videos/6Pm8eiJR38A.jpg",
    group: "explainers",
    home: "/locations/nashville",
    related: [
      { label: "LENS neurofeedback", href: "/lens-neurofeedback" },
      { label: "Our Nashville center", href: "/locations/nashville" },
      FIRST_VISIT,
    ],
  },
  {
    id: "FCUyUqzE3Dk",
    slug: "your-first-appointment",
    // Ben's label for the site (Oct 2026); the schema carries the channel's
    // own title (Ben, 2026-10-13: the markup should match the source).
    title: "What to Expect: Appointment #1",
    sourceTitle: "Your First Appointment at Harmonized Brain Centers: What to Expect",
    description:
      "A walk through a first appointment at Harmonized Brain Centers, from the practice's own channel — what the visit looks like before anyone decides anything.",
    durationSeconds: VIDEO_APPOINTMENT_ONE_DURATION,
    uploadDate: VIDEO_APPOINTMENT_ONE_UPLOAD_DATE,
    posterPath: "/images/videos/FCUyUqzE3Dk.jpg",
    group: "explainers",
    home: "/first-visit",
    related: [
      FIRST_VISIT,
      { label: "The Brain Map", href: "/brain-map" },
      { label: "Is LENS safe?", href: "/is-lens-safe" },
    ],
  },
  {
    id: "9vcfvxKd19I",
    slug: "how-long-until-you-feel-a-difference",
    title: "LENS Neurofeedback: How Long Until You Feel a Difference?",
    sourceTitle: "LENS Neurofeedback: How Long Until You Feel a Difference?",
    description:
      "A short explanation of the usual timeline for noticing change with LENS neurofeedback, and why every brain responds at its own pace.",
    durationSeconds: seconds(103),
    uploadDate: published("2025-05-15T21:07:19-07:00"),
    posterPath: "/images/videos/9vcfvxKd19I.jpg",
    group: "explainers",
    home: "/faq",
    related: [
      { label: "Questions we hear often", href: "/faq" },
      { label: "How LENS works", href: "/how-lens-works" },
      FIRST_VISIT,
    ],
  },
  {
    id: "Ky6CMY3L9ek",
    slug: "relief-from-add-adhd",
    title: "Relief from ADD + ADHD",
    sourceTitle: "Relief from ADD + ADHD",
    description:
      "A short explainer on how LENS neurofeedback approaches ADD and ADHD, and what clients look for in focus, calm and clarity.",
    durationSeconds: seconds(93),
    uploadDate: published("2025-03-18T13:21:13-07:00"),
    posterPath: "/images/videos/Ky6CMY3L9ek.jpg",
    group: "explainers",
    home: "/concerns/focus-adhd",
    related: [
      { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
      { label: "The last ten percent", href: "/resources/the-last-ten-percent" },
      FIRST_VISIT,
    ],
  },
  {
    id: "qbl_MpWq1LA",
    slug: "how-lens-helps-with-stress-and-anxiety",
    title: "How LENS Helps with Stress & Anxiety",
    sourceTitle: "How LENS Helps with Stress & Anxiety",
    description:
      "A short explainer on how LENS neurofeedback approaches stress and anxiety, and what a calmer baseline can look like day to day.",
    durationSeconds: seconds(115),
    uploadDate: published("2025-03-18T07:47:20-07:00"),
    posterPath: "/images/videos/qbl_MpWq1LA.jpg",
    group: "explainers",
    home: "/concerns/stress-resilience",
    related: [
      { label: "Stress & resilience", href: "/concerns/stress-resilience" },
      { label: "Anxiety & stress", href: "/concerns/anxiety" },
      FIRST_VISIT,
    ],
  },
  {
    id: "xtx4g3tbtd4",
    slug: "can-lens-help-you-sleep-better",
    // "| Real Results Explained" dropped from the label (VIDEO-MAP.md flag 5).
    title: "Can LENS Neurofeedback Help You Sleep Better?",
    sourceTitle: "Can LENS Neurofeedback Help You Sleep Better? | Real Results Explained",
    description:
      "A short explainer on how LENS neurofeedback may help with trouble falling asleep, restless nights and frequent waking, without medication.",
    durationSeconds: seconds(68),
    uploadDate: published("2025-05-14T13:08:04-07:00"),
    posterPath: "/images/videos/xtx4g3tbtd4.jpg",
    group: "explainers",
    home: "/concerns/sleep",
    related: [
      { label: "Sleep", href: "/concerns/sleep" },
      { label: "The 3 a.m. waking", href: "/resources/the-3am-waking" },
      FIRST_VISIT,
    ],
  },
];

// One video per content page, and one record per id and slug — a duplicate
// is a build error, not a page that quietly shows the first match.
for (const key of ["id", "slug", "home"] as const) {
  const seen = new Set<string>();
  for (const v of videos) {
    const value = v[key];
    if (!value) continue;
    if (seen.has(value)) throw new Error(`lib/videos.ts: two videos share ${key} "${value}"`);
    seen.add(value);
  }
}

/**
 * Whether there is anything behind the "Video stories — client interviews in
 * their own words" badge (Ben, 2026-10-15: it showed with no videos). False
 * until a record with `story: true` is added above; then the badge returns
 * on its own, on both pages.
 */
export const HAS_STORY_VIDEOS = videos.some((v) => v.story === true);

/** The record for an id. Throws rather than returning undefined: a page
 *  asking for a video that is not in the catalog is a build error, not a
 *  runtime "nothing rendered". */
export function getVideo(id: string): Video {
  const video = videos.find((v) => v.id === id);
  if (!video) throw new Error(`lib/videos.ts has no video with id "${id}"`);
  return video;
}

/** The record for a watch-page slug, or undefined (the route 404s). */
export function getVideoBySlug(slug: string): Video | undefined {
  return videos.find((v) => v.slug === slug);
}

/** The watch page. */
export function videoPath(video: Video): string {
  return `/videos/${video.slug}`;
}

/** The video a content page embeds below the fold, if any. */
export function videoForPage(path: string): Video | undefined {
  return videos.find((v) => v.home === path);
}

/** 2025-03-20T09:55:00-07:00 → "March 20, 2025" — the calendar day YouTube
 *  published it, in the offset YouTube gave, not the reader's timezone. */
export function formatUploadDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** The privacy-enhanced embed. `autoplay` is added only by the facade, on
 *  click — the schema's `embedUrl` is the bare player. `rel=0` keeps the
 *  end screen to this channel's videos. */
export function embedUrl(video: Video, { autoplay = false } = {}): string {
  const params = new URLSearchParams({ rel: "0" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${video.id}?${params}`;
}

/** The public watch page — for a plain link, never for an iframe. */
export function watchUrl(video: Video): string {
  return `https://www.youtube.com/watch?v=${video.id}`;
}

/** Verified running time in seconds, else null (draft mode shows the tag). */
export function videoDuration(video: Video): number | null {
  const seconds = video.durationSeconds.verified ? video.durationSeconds.value : null;
  return seconds && seconds > 0 ? seconds : null;
}

/** Verified upload date, else null. */
export function videoUploadDate(video: Video): string | null {
  return video.uploadDate.verified ? video.uploadDate.value : null;
}

/** 192 → "3:12"; 3725 → "1:02:05". For the caption. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** 192 → "PT3M12S" — schema.org `duration` is ISO 8601. */
export function isoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}${s > 0 || (h === 0 && m === 0) ? `${s}S` : ""}`;
}

/** The draft-mode tags for whatever is still unconfirmed on a record. */
export function videoConfirmTags(video: Video): string[] {
  return [video.durationSeconds, video.uploadDate]
    .filter((v) => !v.verified)
    .map((v) => v.note ?? "[CONFIRM]");
}
