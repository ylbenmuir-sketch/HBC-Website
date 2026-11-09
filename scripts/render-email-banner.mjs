/**
 * Writes public/email/10years-banner.png (the giveaway emails' one image)
 * from /10years/email-banner on a running server, as a small palette PNG.
 *
 *   npx next start -p 3123 &   # any build of this repo
 *   node scripts/render-email-banner.mjs http://localhost:3123
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const base = process.argv[2] ?? "http://localhost:3123";
const res = await fetch(`${base}/10years/email-banner`);
if (!res.ok) throw new Error(`${res.status} from ${base}/10years/email-banner`);
const src = Buffer.from(await res.arrayBuffer());
const out = await sharp(src).png({ palette: true, quality: 90, colors: 96, compressionLevel: 9, effort: 10 }).toBuffer();
writeFileSync(new URL("../public/email/10years-banner.png", import.meta.url), out);
console.log(`source ${src.length} bytes → public/email/10years-banner.png ${out.length} bytes`);
