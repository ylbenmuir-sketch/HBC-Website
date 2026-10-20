import ChromeLink from "./ChromeLink";
import { PRIVACY_PATH } from "@/lib/sms-consent";

/** The giveaway pages' footer (components/RouteFooter.tsx picks it). */
export default function SlimFooter() {
  return (
    <footer className="site slim" data-link-location="footer">
      <div className="wrap slim-row">
        <span>&copy; {new Date().getFullYear()} Harmonized Brain Centers</span>
        <nav aria-label="Giveaway">
          <ChromeLink href="/10years/rules#rules">Official Rules</ChromeLink>
          <ChromeLink href={PRIVACY_PATH}>Privacy</ChromeLink>
        </nav>
      </div>
    </footer>
  );
}
