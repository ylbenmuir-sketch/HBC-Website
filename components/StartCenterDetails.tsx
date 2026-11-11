"use client";

import { useStartCenter, type StartCenterSlug } from "@/lib/start-center";
import type { StartCenterInfo } from "@/lib/start-centers";

/**
 * Under /start's form (Ben, 2026-11-11): where the center is, and Call and
 * Text buttons on that center's own line. Follows the center chip picked in
 * the form (lib/start-center.ts); until one is picked it shows the center
 * the link named (?center=murfreesboro), else Nashville. `local_page` is the
 * location contact_link_click and the tap log record for these two links.
 */
export default function StartCenterDetails({
  centers,
  initial,
  showPhone,
}: {
  centers: Record<StartCenterSlug, StartCenterInfo>;
  initial: StartCenterSlug;
  showPhone: boolean;
}) {
  const c = centers[useStartCenter(initial)];
  return (
    <div className="start-ways" data-link-location="local_page">
      <p className="start-address">{c.addressLine}</p>
      {showPhone && (
        <>
          <p className="contact-ways-line">Rather talk now?</p>
          <div className="contact-ways">
            <a className="contact-way" href={`tel:${c.phone.tel}`} aria-label={`Call ${c.phone.display}`}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="contact-way-title">Call {c.phone.display}</span>
            </a>
            <a className="contact-way" href={`sms:${c.phone.tel}`} aria-label={`Text ${c.phone.display}`}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5v-9z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="contact-way-title">Text us</span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
