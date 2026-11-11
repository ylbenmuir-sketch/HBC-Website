import ChromeLink from "./ChromeLink";
import { DISCLAIMER } from "@/lib/site-config";
import { DBA_NAME, PRIVACY_PATH, SMS_TERMS_PATH } from "@/lib/sms-consent";
import { REGISTERED_ADDRESS_LINE } from "@/lib/sms-identity";

/**
 * /start's footer (Ben, 2026-11-11; components/RouteFooter.tsx picks it):
 * the practice's name and address, Privacy, SMS Terms and the disclaimer —
 * verbatim, as everywhere. No site menu: the page has one thing to do.
 */
export default function StartFooter() {
  return (
    <footer className="site slim start-footer" data-link-location="footer">
      <div className="wrap">
        <p className="start-footer-id">
          {DBA_NAME} &middot; {REGISTERED_ADDRESS_LINE}
          <br />
          <ChromeLink href={PRIVACY_PATH}>Privacy Policy</ChromeLink> &middot;{" "}
          <ChromeLink href={SMS_TERMS_PATH}>SMS Terms</ChromeLink>
        </p>
        <p className="start-footer-disclaimer">
          {DISCLAIMER} &copy; {new Date().getFullYear()} {DBA_NAME}
        </p>
      </div>
    </footer>
  );
}
