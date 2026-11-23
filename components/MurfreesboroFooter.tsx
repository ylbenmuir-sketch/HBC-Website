import ChromeLink from "./ChromeLink";
import { DISCLAIMER } from "@/lib/site-config";
import { DBA_NAME, PRIVACY_PATH, SMS_TERMS_PATH } from "@/lib/sms-consent";
import { getLocation, locationPhone } from "@/lib/locations";

/**
 * /murfreesboro's footer (Ben, 2026-11-22; to his mockup 2026-11-23;
 * components/RouteFooter.tsx picks it): one row — the practice's name and
 * the center, its address, its phone — read from the record every other
 * page reads (lib/locations.ts); the disclaimer, verbatim; then the © line
 * with Privacy and SMS Terms. Nothing else: no menu, no other center, no
 * hours.
 */
export default function MurfreesboroFooter() {
  const center = getLocation("murfreesboro");
  const a = center?.address;
  const phone = center ? locationPhone(center) : null;
  return (
    <footer className="site slim start-footer mb-footer" data-link-location="footer">
      <div className="start-footer-in">
        <div className="mb-footer-row">
          <p className="mb-footer-id">
            {DBA_NAME}
            {center && <> &middot; {center.name}</>}
          </p>
          {a && (
            <p>
              {a.streetAddress}, {a.addressLocality}, {a.addressRegion} {a.postalCode}
            </p>
          )}
          {phone && (
            <p>
              <a href={`tel:${phone.tel}`}>{phone.display}</a>
            </p>
          )}
        </div>
        <p className="start-footer-disclaimer">{DISCLAIMER}</p>
        <div className="mb-footer-row mb-footer-legal">
          <p>
            &copy; {new Date().getFullYear()} {DBA_NAME}
          </p>
          <p>
            <ChromeLink href={PRIVACY_PATH}>Privacy Policy</ChromeLink>
            <ChromeLink href={SMS_TERMS_PATH}>SMS Terms</ChromeLink>
          </p>
        </div>
      </div>
    </footer>
  );
}
