/**
 * The visitor confirmation email's hero image: the first-visit video's frame
 * with a play button baked in, served from our own domain
 * (/email/first-visit.jpg). An email cannot run a player or a script, so the
 * button has to be part of the picture; and an image on our domain, linked
 * to our own /watch/first-visit redirect, keeps Gmail from adding its own
 * YouTube preview card under the email.
 *
 *   npm run build:email-thumb
 *
 * Source: public/images/videos/FCUyUqzE3Dk.jpg — YouTube's own 1280×720
 * frame for video FCUyUqzE3Dk, already committed by `npm run fetch:posters`.
 * Output: 1040×585 (twice the email's 520 px content width, for sharp
 * phones), JPEG, committed.
 */
import sharp from "sharp";
import { mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "public/images/videos/FCUyUqzE3Dk.jpg");
const OUT = join(ROOT, "public/email/first-visit.jpg");
const W = 1040;
const H = 585;

// The site's navy (app/globals.css --navy) under a white triangle, with a
// soft white ring so it reads on a dark frame and a light one alike.
// Placed in the frame's empty band under the title and above the wordmark,
// left of the practitioner — centred, it covered the "#1" of the title.
const R = 66;
const cx = Math.round(W * 0.3);
const cy = Math.round(H * 0.6);
const tri = 30; // half-height of the triangle
const button = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <filter id="s" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#000" flood-opacity="0.35"/>
    </filter>
  </defs>
  <circle cx="${cx}" cy="${cy}" r="${R + 6}" fill="#ffffff" fill-opacity="0.85" filter="url(#s)"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="#1c2b3a"/>
  <path d="M ${cx - tri * 0.62} ${cy - tri} L ${cx - tri * 0.62} ${cy + tri} L ${cx + tri * 1.05} ${cy} Z" fill="#ffffff"/>
</svg>`);

mkdirSync(dirname(OUT), { recursive: true });
await sharp(SOURCE)
  .resize(W, H, { fit: "cover" })
  // A light wash so the button carries on a busy frame.
  .composite([
    { input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#000" fill-opacity="0.12"/></svg>`) },
    { input: button },
  ])
  .jpeg({ quality: 80, mozjpeg: true })
  .toFile(OUT);
console.log(`wrote ${OUT} (${W}×${H}, ${Math.round(statSync(OUT).size / 1024)} KB)`);
