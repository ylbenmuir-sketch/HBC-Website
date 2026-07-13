import Link from "next/link";
import { LogoName } from "./Logo";
import { DISCLAIMER } from "@/lib/site-config";

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
          <div>
            <h5>Help with</h5>
            <Link href="/concerns/anxiety">Anxiety &amp; stress</Link>
            <Link href="/concerns/focus-adhd">Focus &amp; ADHD</Link>
            <Link href="/concerns/sleep">Sleep</Link>
            <Link href="/concerns/children-school">Children &amp; school</Link>
            <Link href="/what-we-help-with">All concerns</Link>
          </div>
          <div>
            <h5>Learn</h5>
            <Link href="/how-lens-works">How LENS works</Link>
            <Link href="/first-visit">Your first visit</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/resources">Resources</Link>
            <Link href="/stories">Client stories</Link>
          </div>
          <div>
            <h5>Visit</h5>
            <Link href="/locations/nashville">Nashville</Link>
            <Link href="/locations/murfreesboro">Murfreesboro</Link>
            <Link href="/locations/franklin">Franklin — coming soon</Link>
            <Link href="/locations">All locations</Link>
          </div>
          <div>
            <h5>Company</h5>
            <Link href="/about">About</Link>
            <Link href="/about/founder">Our founder</Link>
            <Link href="/about/team">Our team</Link>
            <Link href="/contact">Contact</Link>
          </div>
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
