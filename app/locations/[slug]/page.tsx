import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import ConfirmTag from "@/components/ConfirmTag";
import { Btn, TalkCta } from "@/components/Buttons";
import JsonLd from "@/components/JsonLd";
import {
  locations,
  formattedHours,
  getLocation,
  hasConfirmedAddress,
  locationReviewCount,
  reviewCountLabel,
  saturdayLabel,
  spacePhotoCount,
} from "@/lib/locations";
import { localBusinessSchema } from "@/lib/schema";
import {
  PHONE_DISPLAY,
  PHONE_TEL,
  PHYSICIAN_REFERRALS,
  SHOW_DRAFT_CONTENT,
  SHOW_PHONE,
  isDraftText,
} from "@/lib/site-config";

export function generateStaticParams() {
  return locations.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const location = getLocation((await params).slug);
  if (!location) return {};
  return {
    title:
      location.metaTitle ??
      (location.comingSoon ? `${location.name} — Coming Soon` : location.name),
    description: location.metaDescription,
  };
}

const firstVisitSteps = [
  { n: "1", h: "Greeted by name", p: "No clipboard queue, no waiting-room limbo." },
  {
    n: "2",
    h: "We talk first",
    p: "What's going on, what you've tried, what you hope changes.",
  },
  {
    n: "3",
    h: "A gentle brain map",
    p: "Brief readings at a series of points — nothing to feel.",
  },
  {
    /**
     * "No packages, no pressure" was false on the first half. The site
     * publishes a {PACKAGE_SESSIONS}-session package at {PACKAGE_PRICE}
     * (lib/site-config.ts) on /lens-neurofeedback and /first-visit, so this
     * step contradicted two other pages and the practice's actual pricing.
     *
     * The fix is to drop the claim, not to relocate the pricing here: the cost
     * cluster belongs to /first-visit (QUERY-TO-PAGE-MAP.md rule 1), and a
     * package price stated on a location page would have to carry PACKAGE_NOTE
     * with it — four times the length of every other step in this list. What
     * survives is the part that was always true, which is also the part a
     * first-time visitor is actually asking about.
     */
    n: "4",
    h: "Plan & honest answers",
    p: "You leave with a written plan you keep. Nothing is booked that day unless you want it to be.",
  },
];

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const location = getLocation((await params).slug);
  if (!location) notFound();

  const addressConfirmed = hasConfirmedAddress(location);
  const showAddressLine = addressConfirmed || SHOW_DRAFT_CONTENT;
  // Draft team members / arrival notes never ship (see site-config).
  const team = location.team.filter(
    (m) => SHOW_DRAFT_CONTENT || (!isDraftText(m.name) && !isDraftText(m.bio))
  );
  // Written from the `hours` data in lib/locations.ts, not from copy stored
  // per page — the same call the LocalBusiness schema and the cards make.
  const hoursLines = formattedHours(location);
  const arrivalLines = location.hero.arrivalLines
    .filter(Boolean)
    .filter((l) => SHOW_DRAFT_CONTENT || !isDraftText(l));
  // This center's reviews, gated and counted in lib/locations.ts. Null for a
  // center with none to publish, which is what keeps the line off Franklin —
  // and the sentence is built once here rather than stored twice as copy, so
  // the two open centers state their different counts in the same words.
  const reviewCount = locationReviewCount(location);
  // "on Google" moved out of the sentence and into the link, where it now
  // names a destination rather than just a source — saying it in both places
  // put "Google" twice in a line of fourteen words.
  const reviewLine =
    reviewCount === null
      ? null
      : `${reviewCountLabel(reviewCount)}, every one of them five stars.`;
  // Nashville's Saturday, promoted out of the hours block into a fact of its
  // own — see saturdayLabel(). Null for every center closed on Saturday, which
  // is what keeps this off the other two pages.
  const saturday = saturdayLabel(location);
  // Prose instead of an empty photo grid, in production, for a center whose
  // photos are all placeholder plates. Draft builds keep the plates so the
  // photography brief stays visible.
  const showSpacePhotos = SHOW_DRAFT_CONTENT || spacePhotoCount(location) > 0;
  const spaceBody = !showSpacePhotos ? location.space.body : undefined;

  return (
    <>
      {/* Open centers only. A coming-soon page ships no LocalBusiness —
          representing an unopened business as operating is against Google's
          guidance, and Franklin has no opening date yet. It comes back with
          the launch package (SEO-AUDIT.md §6.3 item 32). */}
      {!location.comingSoon && <JsonLd data={localBusinessSchema(location)} />}
      <Breadcrumbs
        trail={[
          { label: "Locations", href: "/locations" },
          { label: location.name },
        ]}
      />
      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">{location.hero.eyebrow}</div>
            <h1>
              {location.hero.titleLead}
              <em className="sage">{location.hero.titleAccent}</em>
              {location.hero.titleTail}
            </h1>
            <p className="sub">{location.hero.sub}</p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              {SHOW_PHONE && (
                <Btn href={`tel:${PHONE_TEL}`} variant="ghost">
                  Call {PHONE_DISPLAY}
                </Btn>
              )}
            </div>
            {/* This center's own reviews, beside this center's own CTA — the
                homepage band adds both centers up, and a visitor on this page
                is deciding about this room.

                A `.micro` line and not a fourth `.facts3` cell: that grid is
                three fixed columns in the narrow half of a `.split`, and the
                comment below spells out why three is the budget. A paragraph
                wraps; a fourth column would have orphaned onto a second row.

                Identical wording at both centers, 144 or 15 — see `reviewCount`
                on Murfreesboro in lib/locations.ts. */}
            {reviewLine && (
              <p className="micro" style={{ marginTop: 18 }}>
                {reviewLine}{" "}
                {/* "See them on our Google listing", not "read the reviews":
                    the CID link opens this center's Maps listing with the
                    reviews on it, not a review list on its own, and link text
                    is a promise about where the click lands. The sitewide
                    bands stay unlinked and say "Every one of them public on
                    Google" — 159 is a total that exists on no Google page, so
                    there is nothing honest for it to point at, and the copy
                    there states where the reviews are rather than inviting a
                    click that isn't offered.

                    Same `rel="noopener"` as the two outbound links on the
                    homepage. No `noreferrer`: the referrer carries no secret
                    here, and passing it is what tells the Business Profile
                    this traffic came from the site. */}
                {location.reviewReadUrl && (
                  <a
                    href={location.reviewReadUrl}
                    target="_blank"
                    rel="noopener"
                  >
                    See them on our Google listing &rarr;
                  </a>
                )}
              </p>
            )}
            <div
              className="facts3"
              style={{
                borderTop: "1px solid var(--line)",
                paddingTop: 22,
                fontSize: 14.5,
                color: "var(--slate)",
                marginTop: 40,
              }}
            >
              <HeroFact label={location.comingSoon ? "Status" : "Address"}>
                {location.comingSoon ? (
                  <>
                    Coming soon{" "}
                    <ConfirmTag style={{ fontSize: 11 }}>
                      [Opening date — confirm]
                    </ConfirmTag>
                  </>
                ) : (
                  <>
                    {/* Confirmed addresses render for everyone; an
                        unconfirmed one still shows its [placeholder] in draft
                        mode so it stays visible to whoever has to chase it. */}
                    {showAddressLine && (
                      <>
                        {location.address.streetAddress}
                        <br />
                      </>
                    )}
                    {location.address.addressLocality},{" "}
                    {location.address.addressRegion}{" "}
                    {showAddressLine && location.address.postalCode}
                  </>
                )}
              </HeroFact>
              {/* Omitted entirely for a center with no hours: Franklin's
                  "Status — coming soon" fact above already says what a
                  visitor needs, and an empty Hours label says less. */}
              {hoursLines.length > 0 && (
                <HeroFact label="Hours">
                  {hoursLines.map((l, i) => (
                    <span key={l}>
                      {i > 0 && <br />}
                      {l}
                    </span>
                  ))}
                </HeroFact>
              )}
              {/* Saturday takes the third slot where a center keeps Saturday
                  hours — Nashville, today, and no one else. `.facts3` is a
                  three-column grid and this row is inside the narrow half of a
                  `.split`, so a fourth fact either orphans onto a second row or
                  squeezes four columns into ~500px; three is the budget, and
                  most practices in the category are closed Saturday, so this is
                  what it buys.

                  Arrival gives way rather than Hours: the parking line it
                  carries is stated again under "Getting here" below and on the
                  locations-index card, and the Saturday is stated nowhere else
                  in the hero. Times come from the same `hours` data the Hours
                  fact reads, so the two restate each other and can't disagree. */}
              {/* The times and nothing else. A second line was tried twice and
                  both were wrong: "By appointment" implies the weekdays aren't,
                  and anything about other practices being closed on Saturday is
                  a comparison this site does not publish (/lens-neurofeedback
                  §3). The gold label is the prominence; the fact is the fact. */}
              {saturday ? (
                <HeroFact label="Saturdays">{saturday}</HeroFact>
              ) : (
                arrivalLines.length > 0 && (
                  <HeroFact label={location.comingSoon ? "Waitlist" : "Arrival"}>
                    {arrivalLines.map((l, i) => (
                      <span key={l}>
                        {i > 0 && <br />}
                        {l}
                      </span>
                    ))}
                  </HeroFact>
                )
              )}
            </div>
          </div>
          <div className="rv">
            {location.image ? (
              <PhotoFrame
                src={location.image.src}
                alt={`The ${location.name} center`}
                position={location.image.position}
                height={560}
                className="hero-ph"
              />
            ) : (
              <PlaceholderPlate
                spec={location.plateSpec ?? ""}
                height={560}
                className="hero-ph"
              />
            )}
          </div>
        </div>
      </section>

      {/* The substance section. "Neurofeedback" and "LENS" appeared zero times
          in the body copy of either open center's page before this — the H1,
          the title and the meta description carried them and nothing a reader
          scrolled past did.

          Three beats, and each hands off rather than restating: the definition
          belongs to /lens-neurofeedback and the mechanism to /how-lens-works
          (QUERY-TO-PAGE-MAP.md rule 1). What is genuinely local — who walks
          into *this* center — is the middle paragraph, and it is the one that
          differs most between the two pages. */}
      {location.intro && (
        <section className="sec">
          <div className="wrap" style={{ maxWidth: 820 }}>
            <div className="sec-head rv">
              <div className="eyebrow">{location.intro.eyebrow}</div>
              <h2>{location.intro.heading}</h2>
            </div>
            <div className="rv">
              {location.intro.paragraphs.map((p) => (
                <p key={p} style={{ marginBottom: 18 }}>
                  {p}
                </p>
              ))}
              {/* Location → concern links, moved here from the communities row
                  where they sat under a heading about geography. The lead-in is
                  per center; the three concerns are the ones /faq already names
                  as what people most commonly come in for. */}
              <p style={{ marginBottom: 18 }}>
                {location.intro.concernsLead}{" "}
                <Link href="/concerns/anxiety">anxiety and stress</Link>,{" "}
                <Link href="/concerns/focus-adhd">focus and ADHD</Link>, and{" "}
                <Link href="/concerns/sleep">sleep</Link>.
              </p>
              {/* The referral claim, on the two pages a local search lands on.
                  It sat on /concerns/concussion alone; a doctor-refers-to-us
                  claim is not a concussion fact, and "who else trusts this
                  center" is exactly the question somebody choosing between
                  two Nashville listings is asking. Approved copy, one home —
                  see PHYSICIAN_REFERRALS in lib/site-config.ts. */}
              <p style={{ marginBottom: 18 }}>{PHYSICIAN_REFERRALS}</p>
              <div className="hero-ctas" style={{ marginTop: 26 }}>
                <Btn href="/lens-neurofeedback" variant="ghost" arrow>
                  What LENS is
                </Btn>
                <Btn href="/how-lens-works" variant="ghost" arrow>
                  How a session works
                </Btn>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head split rv">
            <div>
              <div className="eyebrow">The space</div>
              <h2>{location.space.heading}</h2>
            </div>
            <p className="sub" style={{ maxWidth: "40ch" }}>
              {location.space.sub}
            </p>
          </div>
          {/* Photos where there are photos; prose where there are not. A
              production build of Murfreesboro rendered three empty sage
              gradients under a heading about a room — see `space.body`. */}
          {spaceBody ? (
            <div className="rv" style={{ maxWidth: "62ch" }}>
              {spaceBody.map((p) => (
                <p key={p} style={{ marginBottom: 18 }}>
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <div className="trio-feature rv">
              {location.space.photos.map((p, i) =>
                p.kind === "photo" ? (
                  <PhotoFrame
                    key={i}
                    src={p.src}
                    alt={`Inside the ${location.name} center`}
                    position={p.position}
                    height={330}
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                ) : (
                  <PlaceholderPlate key={i} spec={p.spec} height={330} />
                )
              )}
            </div>
          )}
        </div>
      </section>

      {/* Suppressed entirely when no member renders. Murfreesboro's roster is
          two [placeholder] names, so production printed "Trained to one
          standard. Yours from first call to final check-in." above an empty
          grid — a heading promising a team the page then didn't show
          (SEO-AUDIT.md §3.3). The section returns on its own with the first
          confirmed name. */}
      {team.length > 0 && (
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Your {location.name} team</div>
            <h2>
              Trained to one standard. Yours from first call to final check-in.
            </h2>
          </div>
          <div className="team-grid rv">
            {team.map((m) => (
              <div className="member" key={m.name}>
                {m.image ? (
                  <PhotoFrame
                    src={m.image.src}
                    alt={`${m.name}, ${m.role}`}
                    position={m.image.position}
                    height={340}
                    sizes="(max-width: 640px) 100vw, (max-width: 1060px) 50vw, 33vw"
                  />
                ) : (
                  <PlaceholderPlate spec={m.plateSpec ?? ""} height={340} />
                )}
                <h3>{m.name}</h3>
                <div className="role">{m.role}</div>
                {m.bio && <p>{m.bio}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="sec sec-navy">
        <div className="wrap duo" style={{ alignItems: "start" }}>
          <div className="rv">
            <div className="eyebrow">Your first visit here</div>
            <h2 style={{ margin: "20px 0 26px" }}>Know exactly what to expect.</h2>
            <div
              className="lens-seq"
              style={{ borderColor: "rgba(251,248,241,.15)" }}
            >
              {firstVisitSteps.map((s) => (
                <div
                  className="row"
                  key={s.n}
                  style={{ borderColor: "rgba(251,248,241,.15)" }}
                >
                  <div className="n">{s.n}</div>
                  <div>
                    <h3 style={{ color: "var(--ivory)" }}>{s.h}</h3>
                    <p>{s.p}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rv">
            {SHOW_DRAFT_CONTENT ? (
              <>
            <div className="eyebrow">
              From a {location.comingSoon ? "Harmonized" : location.name}{" "}
              family
            </div>
            <div
              className="quote"
              style={{
                background: "transparent",
                borderColor: "rgba(251,248,241,.18)",
                boxShadow: "none",
                marginTop: 20,
              }}
            >
              <p style={{ color: "var(--ivory)" }}>
                &ldquo;{location.quote.text}&rdquo;
              </p>
              <footer style={{ color: "rgba(251,248,241,.55)" }}>
                <b style={{ color: "var(--sage)" }}>
                  {location.quote.attribution}
                </b>{" "}
                &middot; {location.quote.place}
              </footer>
            </div>
            <p className="sample-note" style={{ color: "rgba(251,248,241,.4)" }}>
              Sample copy — replace with a verified client quote.
            </p>
              </>
            ) : (
              <>
                <div className="eyebrow">Good to know</div>
                <div
                  className="quote"
                  style={{
                    background: "transparent",
                    borderColor: "rgba(251,248,241,.18)",
                    boxShadow: "none",
                    marginTop: 20,
                  }}
                >
                  {/* Per center. One sentence hard-coded here put the same
                      three clauses in the same navy box on both pages, which
                      is most of what made them read as one page in
                      production — the draft-only quote above is what varied,
                      and it never ships. */}
                  <p style={{ color: "var(--ivory)" }}>{location.goodToKnow}</p>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <div
            className="rv"
            style={{
              height: 440,
              borderRadius: 4,
              background:
                "linear-gradient(155deg,#E9EDE4 0%,#D6DDCF 60%,#C4CFBC 100%)",
              position: "relative",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: "48%",
                top: "42%",
                width: 16,
                height: 16,
                background: "var(--gold)",
                borderRadius: "50%",
                boxShadow: "0 0 0 8px rgba(169,133,63,.18)",
              }}
            />
            {SHOW_DRAFT_CONTENT && (
              <div
                style={{
                  position: "absolute",
                  left: 22,
                  bottom: 18,
                  fontSize: 10.5,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--sage-deep)",
                  fontWeight: 600,
                }}
              >
                Embedded map — muted sage style
              </div>
            )}
          </div>
          <div className="rv">
            <div className="eyebrow">Planning your visit</div>
            <h2>{location.planning.reachHeading}</h2>
            <div className="lens-seq" style={{ marginTop: 24 }}>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h3>Getting here</h3>
                  {/* Gated like every other confirmed fact, rather than on
                      SHOW_DRAFT_CONTENT. The old ternary sent every production
                      visitor "We'll send simple directions and arrival details
                      when you book" — a non-answer that would have kept
                      shipping after the directions were confirmed, because
                      nothing about confirming them touched the branch. Now
                      real copy renders and only a [placeholder] falls back. */}
                  <p>
                    {isDraftText(location.planning.gettingHere) &&
                    !SHOW_DRAFT_CONTENT
                      ? "We'll send simple directions and arrival details when you book."
                      : location.planning.gettingHere}
                  </p>
                </div>
              </div>
              {/* Nashville's Saturday, Murfreesboro's three clinic days. The
                  hero states the week as times; this states what the week
                  means for someone deciding when — and where — to come. */}
              {location.planning.scheduleNote && (
                <div className="row">
                  <div className="n">—</div>
                  <div>
                    <h3>{location.planning.scheduleNote.heading}</h3>
                    <p>{location.planning.scheduleNote.body}</p>
                  </div>
                </div>
              )}
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h3>Communities served</h3>
                  {/* Ben's client data, and the same array that feeds
                      `areaServed` in the LocalBusiness markup — so the page and
                      the schema list the same towns by construction. The
                      [Confirm list] tag that used to sit here is gone, which is
                      also what let the assistant start answering "do you serve
                      Smyrna?" (lib/chat/content-index.ts). */}
                  <p>{location.planning.communitiesLead}</p>
                  <p style={{ marginTop: 10 }}>
                    {location.planning.communities.join(" · ")}
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h3>Also nearby</h3>
                  <p>{location.planning.alsoNearby}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA heading={location.finalHeading} sub={location.finalSub} />
    </>
  );
}

function HeroFact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <b
        style={{
          display: "block",
          fontSize: 11.5,
          letterSpacing: ".18em",
          textTransform: "uppercase",
          color: "var(--gold)",
          marginBottom: 6,
        }}
      >
        {label}
      </b>
      <span style={{ color: "var(--ink)" }}>{children}</span>
    </div>
  );
}
