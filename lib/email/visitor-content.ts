import { locationPhone, locations } from "../locations";
import { DBA_NAME } from "../sms-consent";
import { REGISTERED_ADDRESS_LINE } from "../sms-identity";
import { PHONE, SITE_URL } from "../site-config";
import { formatDuration, getVideo, videoDuration, watchUrl } from "../videos";
import { firstName } from "../first-name";
import type { visitorConfirmation } from "./templates";

/**
 * Everything the visitor's confirmation needs that is a fact about the
 * practice rather than about her — read from the same records the pages use,
 * so the email cannot print a number or a title the site does not:
 *
 * - the center's own line (lib/locations.ts, gated like the pages): the
 *   Nashville or Murfreesboro number for those routes, Nashville's for
 *   Concierge and Not sure (Ben, 2026-10-14);
 * - the "What to Expect: Appointment #1" video (lib/videos.ts), as its
 *   public watch link;
 * - the registered identity line (lib/sms-identity.ts), the same one the
 *   footer and /sms-terms carry.
 */
export function visitorContent(fullName: string | null, route: string): Parameters<typeof visitorConfirmation>[0] {
  const slug = route === "murfreesboro" ? "murfreesboro" : "nashville";
  const center = locations.find((l) => l.slug === slug);
  const phone = (center && locationPhone(center)) ?? PHONE.value;
  const video = getVideo("FCUyUqzE3Dk");
  const seconds = videoDuration(video);
  return {
    firstName: firstName(fullName ?? ""),
    route,
    centerPhone: { label: center?.name ?? "Nashville", display: phone.display, tel: `tel:${phone.tel}` },
    video: { title: video.title, url: watchUrl(video), duration: seconds ? formatDuration(seconds) : null },
    identityLine: `${DBA_NAME} · ${REGISTERED_ADDRESS_LINE}`,
    siteUrl: SITE_URL,
  };
}
