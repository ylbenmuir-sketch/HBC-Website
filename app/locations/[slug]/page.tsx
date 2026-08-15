import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import ConfirmTag from "@/components/ConfirmTag";
import { Btn, TalkCta } from "@/components/Buttons";
import { locations, getLocation } from "@/lib/locations";
import {
  PHONE_DISPLAY,
  PHONE_TEL,
  SHOW_DRAFT_CONTENT,
  SHOW_PHONE,
  SITE_NAME,
  SITE_URL,
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
    title: location.comingSoon
      ? `${location.name} — Coming Soon`
      : location.name,
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
    n: "4",
    h: "Plan & honest answers",
    p: "Commit only if it feels right. No packages, no pressure.",
  },
];

export default async function LocationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const location = getLocation((await params).slug);
  if (!location) notFound();

  const addressConfirmed =
    !isDraftText(location.address.streetAddress) &&
    !isDraftText(location.address.postalCode);
  // Draft team members / hours / arrival notes never ship (see site-config).
  const team = location.team.filter(
    (m) => SHOW_DRAFT_CONTENT || (!isDraftText(m.name) && !isDraftText(m.bio))
  );
  const hoursLines = location.hoursLines.filter(
    (l) => SHOW_DRAFT_CONTENT || !isDraftText(l)
  );
  const arrivalLines = location.hero.arrivalLines
    .filter(Boolean)
    .filter((l) => SHOW_DRAFT_CONTENT || !isDraftText(l));

  /* LocalBusiness JSON-LD — street address and ZIP are omitted until the
     values in lib/locations.ts are confirmed. */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: `${SITE_NAME} — ${location.name}`,
    url: `${SITE_URL}/locations/${location.slug}`,
    ...(SHOW_PHONE ? { telephone: PHONE_TEL } : {}),
    address: {
      "@type": "PostalAddress",
      ...(addressConfirmed
        ? {
            streetAddress: location.address.streetAddress,
            postalCode: location.address.postalCode,
          }
        : {}),
      addressLocality: location.address.addressLocality,
      addressRegion: location.address.addressRegion,
      addressCountry: "US",
    },
    description: location.metaDescription,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="wrap crumb">
        <Link href="/locations">Locations</Link> &nbsp;/&nbsp; {location.name}
      </div>
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
                    {SHOW_DRAFT_CONTENT && (
                      <>
                        {location.address.streetAddress}
                        <br />
                      </>
                    )}
                    {location.address.addressLocality},{" "}
                    {location.address.addressRegion}{" "}
                    {addressConfirmed && location.address.postalCode}
                  </>
                )}
              </HeroFact>
              <HeroFact label="Hours">
                {hoursLines.map((l, i) => (
                  <span key={l}>
                    {i > 0 && <br />}
                    {l}
                  </span>
                ))}
              </HeroFact>
              {arrivalLines.length > 0 && (
                <HeroFact label={location.comingSoon ? "Waitlist" : "Arrival"}>
                  {arrivalLines.map((l, i) => (
                    <span key={l}>
                      {i > 0 && <br />}
                      {l}
                    </span>
                  ))}
                </HeroFact>
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
        </div>
      </section>

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
                <p>{m.bio}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                    <h4 style={{ color: "var(--ivory)" }}>{s.h}</h4>
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
                  <p style={{ color: "var(--ivory)" }}>
                    The call is free, no referral is needed, and you&rsquo;ll
                    never be asked to commit to a long program up front.
                  </p>
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
            <h2>Easy to reach from anywhere in the metro.</h2>
            <div className="lens-seq" style={{ marginTop: 24 }}>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h4>Getting here</h4>
                  <p>
                    {SHOW_DRAFT_CONTENT
                      ? location.planning.gettingHere
                      : "We'll send simple directions and arrival details when you book."}
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h4>Communities served</h4>
                  <p>
                    {location.planning.communities}{" "}
                    {location.planning.communitiesTag && (
                      <ConfirmTag style={{ fontSize: 11 }}>
                        {location.planning.communitiesTag}
                      </ConfirmTag>
                    )}
                  </p>
                </div>
              </div>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h4>Also nearby</h4>
                  <p>{location.planning.alsoNearby}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA heading={location.finalHeading} />
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
