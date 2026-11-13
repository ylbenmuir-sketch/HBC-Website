import ChromeLink from "./ChromeLink";
import StartCenterDetails from "./StartCenterDetails";
import { DISCLAIMER } from "@/lib/site-config";
import { DBA_NAME, PRIVACY_PATH, SMS_TERMS_PATH } from "@/lib/sms-consent";
import { REGISTERED_ADDRESS_LINE } from "@/lib/sms-identity";
import { startCenters } from "@/lib/start-centers";

/**
 * /start's footer (Ben, 2026-11-11; components/RouteFooter.tsx picks it):
 * the practice's name and address, Privacy, SMS Terms and the disclaimer —
 * verbatim, as everywhere. No site menu: the page has one thing to do.
 * Since 2026-11-13 it also carries the picked center's address when that is
 * Murfreesboro (components/StartCenterDetails.tsx).
 */
export default function StartFooter() {
  return (
    <footer className="site slim start-footer" data-link-location="footer">
      <div className="start-footer-in">
        <p className="start-footer-id">
          {DBA_NAME} &middot; {REGISTERED_ADDRESS_LINE} &middot;{" "}
          <ChromeLink href={PRIVACY_PATH}>Privacy Policy</ChromeLink> &middot;{" "}
          <ChromeLink href={SMS_TERMS_PATH}>SMS Terms</ChromeLink>
        </p>
        <StartCenterDetails centers={startCenters()} />
        <p className="start-footer-disclaimer">
          {DISCLAIMER} &copy; {new Date().getFullYear()} {DBA_NAME}
        </p>
      </div>
    </footer>
  );
}
