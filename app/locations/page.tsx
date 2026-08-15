import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import LocationCard from "@/components/LocationCard";
import FinalCTA from "@/components/FinalCTA";
import ConfirmTag from "@/components/ConfirmTag";
import {
  locations,
  hasConfirmedAddress,
  practitionerNames,
} from "@/lib/locations";
import {
  CONCIERGE_TAG,
  SHOW_DRAFT_CONTENT,
  SHOW_PHONE,
  isDraftText,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Locations",
  description:
    "Every Harmonized center runs the same care model, the same training, and the same honest policies. Nashville, Murfreesboro, and Franklin (coming soon).",
};

export default function LocationsPage() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Locations</div>
          <h1>One organization. The same care, closer to home.</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            Every Harmonized center runs the same care model, the same
            training, and the same honest policies. Your plan travels with you
            between centers.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="loc-grid rv">
            {locations.map((loc) => (
              <LocationCard
                key={loc.slug}
                location={loc}
                imageHeight={260}
                meta={
                  loc.comingSoon ? (
                    <>
                      <b>
                        Coming soon{" "}
                        <ConfirmTag style={{ fontSize: 11 }}>
                          [Opening date — confirm]
                        </ConfirmTag>
                      </b>
                      <br />
                      {(SHOW_DRAFT_CONTENT || !isDraftText(loc.cardExtra)) &&
                        loc.cardExtra}
                      {loc.waitlistLine && (
                        <>
                          <br />
                          {loc.waitlistLine}
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Reads the address from lib/locations.ts rather than
                          restating it — these lines were hard-coded copies of
                          the placeholders and would not have picked up a
                          confirmed address on their own. */}
                      <b>
                        {(hasConfirmedAddress(loc) || SHOW_DRAFT_CONTENT) && (
                          <>{loc.address.streetAddress}, </>
                        )}
                        {loc.address.addressLocality},{" "}
                        {loc.address.addressRegion}
                        {(hasConfirmedAddress(loc) || SHOW_DRAFT_CONTENT) && (
                          <> {loc.address.postalCode}</>
                        )}
                      </b>
                      <br />
                      Mon–Fri 9a–6p &middot; Sat by appointment
                      <br />
                      {/* Joined rather than concatenated with a trailing
                          separator: Murfreesboro's cardExtra is still a
                          [placeholder], which used to leave a dangling "·"
                          after the phone number. */}
                      {[
                        SHOW_PHONE ? loc.phone : null,
                        SHOW_DRAFT_CONTENT || !isDraftText(loc.cardExtra)
                          ? loc.cardExtra
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                      {practitionerNames(loc).length > 0 && (
                        <>
                          <br />
                          Practitioners: {practitionerNames(loc).join(", ")}
                        </>
                      )}
                    </>
                  )
                }
              />
            ))}
          </div>

          <div
            className="rv half-row"
            style={{
              marginTop: 60,
              border: "1px solid var(--line)",
              borderRadius: 4,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div style={{ padding: "48px 52px" }}>
              <div className="eyebrow">Concierge sessions at home</div>
              <h3 style={{ margin: "16px 0 12px" }}>
                For some families, we come to you.
              </h3>
              <p style={{ color: "var(--slate)", fontSize: 15.5 }}>
                Our concierge service brings the same practitioners and the
                same equipment to your home &mdash; helpful for packed family
                schedules and clients who settle best in their own space.{" "}
                <ConfirmTag>{CONCIERGE_TAG}</ConfirmTag>
              </p>
            </div>
            <PhotoFrame
              src="/images/concierge.jpg"
              alt="A practitioner bringing LENS equipment to a client's home"
              position="center 38%"
              style={{ height: 280, borderRadius: 0 }}
              sizes="(max-width: 1060px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <FinalCTA
        heading="Not sure which center is closest? Tell us where you are."
        sub="We’ll match you with the nearest center — or the concierge service — in one quick conversation."
      />
    </>
  );
}
