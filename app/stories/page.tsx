import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import Quote from "@/components/Quote";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";
import { REVIEWS, SAMPLE_QUOTES_NOTE_STORIES } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Client Stories",
  description:
    "No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we'd rather understate than oversell.",
};

const storyQuotes = [
  {
    theme: "Focus · Children",
    text: "For the first time in two years, homework isn't a fight. He sits down, does it, and moves on.",
    attribution: "Parent of a 9-year-old",
    place: "Nashville",
  },
  {
    theme: "Sleep · Adults",
    text: "Nobody oversold anything — they just kept asking how I was sleeping. By week four: better than in years.",
    attribution: "Adult client",
    place: "Murfreesboro",
  },
  {
    theme: "Emotional regulation",
    text: "The meltdowns didn't vanish. They got shorter — and she recovers now. That's the part that changed our house.",
    attribution: "Parent of a 7-year-old",
    place: "Nashville",
  },
  {
    theme: "Stress & resilience",
    text: "Hard days still happen. I just stopped losing the whole next day to them.",
    attribution: "Adult client",
    place: "Nashville",
  },
  {
    theme: "Brain fog",
    text: "I read a full report without restarting the same paragraph. I texted my husband about it. That's where I was.",
    attribution: "Adult client",
    place: "Murfreesboro",
  },
  {
    theme: "School",
    text: "His teacher emailed to ask what changed. First email from school I've ever been happy to open.",
    attribution: "Parent of a 10-year-old",
    place: "Murfreesboro",
  },
];

export default function StoriesPage() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Client stories</div>
          <h1>Small changes. Real weeks. Honest telling.</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            No miracle stories &mdash; just the specific, daily-life changes
            clients report at check-in. Individual experiences vary, and
            we&rsquo;d rather understate than oversell.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="trio-quotes rv">
            {storyQuotes.map((q) => (
              <Quote key={q.text} {...q} />
            ))}
          </div>
          <p className="sample-note rv">{SAMPLE_QUOTES_NOTE_STORIES}</p>
          <div className="review-band rv">
            <div>
              <strong>{REVIEWS.rating} ★</strong>
              <span>Google rating across locations</span>
              <span className="todo">{REVIEWS.ratingTodo}</span>
            </div>
            <div>
              <strong>{REVIEWS.count}</strong>
              <span>Read them unfiltered on Google</span>
              <span className="todo">{REVIEWS.countTodoStories}</span>
            </div>
            <div>
              <strong>Video stories</strong>
              <span>Client interviews in their own words</span>
              <span className="todo">{REVIEWS.videoTodoStories}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap split">
          <div className="rv">
            <PhotoFrame
              src="/images/checkin.jpg"
              alt="A structured check-in conversation at a Harmonized center"
              position="68% 35%"
              height={460}
            />
          </div>
          <div className="rv">
            <div className="eyebrow">Why the stories are specific</div>
            <h2>We track outcomes at every single visit.</h2>
            <p>
              Every session opens with a structured check-in on sleep, mood,
              focus, and energy. That&rsquo;s why our clients talk in specifics
              &mdash; homework, Tuesdays, paragraphs &mdash; instead of vague
              transformations.
            </p>
            <Btn href="/how-lens-works" variant="ghost" arrow>
              How the check-ins work
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
