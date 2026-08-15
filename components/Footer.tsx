import Link from "next/link";
import { LogoName } from "./Logo";
import FooterGroup from "./FooterGroup";
import { DISCLAIMER } from "@/lib/site-config";

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
      { label: "All concerns", href: "/what-we-help-with" },
    ],
  },
  {
    heading: "Learn",
    links: [
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
      { label: "All locations", href: "/locations" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Our founder", href: "/about/founder" },
      { label: "Our team", href: "/about/team" },
      { label: "Contact", href: "/contact" },
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
              Gentle LENS neurofeedback for adults, children, and families
              across Middle Tennessee.
            </p>
          </div>
          {groups.map((g) => (
            <FooterGroup key={g.heading} heading={g.heading}>
              {g.links.map((l) => (
                <Link key={l.href + l.label} href={l.href}>
                  {l.label}
                </Link>
              ))}
            </FooterGroup>
          ))}
        </div>
        <p className="disclaimer">
          {DISCLAIMER} &copy; {new Date().getFullYear()} Harmonized Brain
          Centers &middot; Nashville &middot; Murfreesboro &middot; Franklin
          (coming soon)
        </p>
      </div>
    </footer>
  );
}
