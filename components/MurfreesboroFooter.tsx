import ChromeLink from "./ChromeLink";
import { DISCLAIMER } from "@/lib/site-config";
import { DBA_NAME, PRIVACY_PATH, SMS_TERMS_PATH } from "@/lib/sms-consent";
import { formattedHours, getLocation } from "@/lib/locations";

/**
 * /murfreesboro's footer (Ben, 2026-11-22; components/RouteFooter.tsx picks
 * it): the practice's name, the Murfreesboro center's own address and
 * hours — read from the record every other page reads (lib/locations.ts) —
 * Privacy, SMS Terms and the disclaimer, verbatim. Nothing else: no menu,
 * no other center, no phone (the header's is the page's one way to call).
 * /start's footer styles (app/globals.css → .start-footer).
 */
export default function MurfreesboroFooter() {
  const center = getLocation("murfreesboro");
  const a = center?.address;
  const hours = center ? formattedHours(center) : [];
  return (
    <footer className="site slim start-footer" data-link-location="footer">
      <div className="start-footer-in">
        <p className="start-footer-id">
          {DBA_NAME}
          {a && (
            <>
              {" "}
              &middot; {a.streetAddress}, {a.addressLocality}, {a.addressRegion} {a.postalCode}
            </>
          )}
          {hours.length > 0 && <> &middot; {hours.join(" · ")}</>}
        </p>
        <p>
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
