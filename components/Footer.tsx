import ChromeLink from "./ChromeLink";
import { LogoName } from "./Logo";
import FooterGroup from "./FooterGroup";
import { DISCLAIMER, SHOW_TEAM } from "@/lib/site-config";
import { PRIVACY_PATH, SMS_TERMS_PATH } from "@/lib/sms-consent";
import {
  DBA_SENTENCE,
  REGISTERED_ADDRESS_LINE,
  SUPPORT_PHONE,
} from "@/lib/sms-identity";

const groups = [
  {
    heading: "Help with",
    links: [
      { label: "Anxiety & stress", href: "/concerns/anxiety" },
      { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
      { label: "Sleep", href: "/concerns/sleep" },
      { label: "Children & school", href: "/concerns/children-school" },
      // Added so these two aren't reachable from one page each — trauma had
      // exactly one referring page sitewide before this. Labels are the
      // shortTitle values from lib/concerns.ts, like the four above.
      { label: "Stress & resilience", href: "/concerns/stress-resilience" },
      { label: "Trauma-related stress", href: "/concerns/trauma" },
      { label: "Concussion & TBI", href: "/concerns/concussion" },
      { label: "Performance", href: "/concerns/performance" },
      { label: "Migraines", href: "/concerns/migraines" },
      { label: "Depression & low mood", href: "/concerns/depression" },
      { label: "All concerns", href: "/what-we-help-with" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "LENS neurofeedback", href: "/lens-neurofeedback" },
      { label: "How LENS works", href: "/how-lens-works" },
      { label: "Your first visit", href: "/first-visit" },
      { label: "FAQ", href: "/faq" },
      { label: "Resources", href: "/resources" },
      { label: "Client stories", href: "/stories" },
    ],
  },
  {
    heading: "Visit",
    links: [
      { label: "Nashville", href: "/locations/nashville" },
      { label: "Murfreesboro", href: "/locations/murfreesboro" },
      { label: "Franklin — coming soon", href: "/locations/franklin" },
      { label: "Concierge — at home", href: "/concierge" },
      { label: "All locations", href: "/locations" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Our founder", href: "/about/founder" },
      // Off with the team pages while SHOW_TEAM is (lib/site-config.ts).
      ...(SHOW_TEAM ? [{ label: "Our team", href: "/about/team" }] : []),
      { label: "Contact", href: "/contact" },
      // The footer is where people look for this one, and until now there was
      // nowhere on the site to look. See app/privacy-policy/page.tsx.
      { label: "Privacy", href: "/privacy-policy" },
      { label: "Text message terms", href: SMS_TERMS_PATH },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="site">
      <div className="wrap-wide">
        <div className="foot-grid">
          <div>
            <LogoName color="#FBF8F1" />
            <p style={{ marginTop: 18, maxWidth: "34ch" }}>
              LENS neurofeedback for adults, children, and families
              across Middle Tennessee.
            </p>
          </div>
          {groups.map((g) => (
            <FooterGroup key={g.heading} heading={g.heading}>
              {g.links.map((l) => (
                <ChromeLink key={l.href + l.label} href={l.href}>
                  {l.label}
                </ChromeLink>
              ))}
            </FooterGroup>
          ))}
        </div>
        {/* The registered identity (lib/sms-consent.ts), on every page and
            outside the link groups — those collapse behind a button on
            phones, and a carrier reviewer matching "Harmonized Brain
            Centers" to the texting registration must find it, and the
            terms, without opening anything. Suite S included — the site's
            address is the record (lib/sms-identity.ts). */}
        <p className="foot-identity">
          {DBA_SENTENCE}
          <br />
          {REGISTERED_ADDRESS_LINE} &middot;{" "}
          <a href={`tel:${SUPPORT_PHONE.tel}`}>{SUPPORT_PHONE.display}</a>
          <br />
          <ChromeLink href={PRIVACY_PATH}>Privacy Policy</ChromeLink> &middot;{" "}
          <ChromeLink href={SMS_TERMS_PATH}>SMS Terms</ChromeLink>
        </p>
        <p className="disclaimer">
          {DISCLAIMER} &copy; {new Date().getFullYear()} Harmonized Brain
          Centers &middot; Nashville &middot; Murfreesboro &middot; Franklin
          (coming soon)
        </p>
      </div>
    </footer>
  );
}
