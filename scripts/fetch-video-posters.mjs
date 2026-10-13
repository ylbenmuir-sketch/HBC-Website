/**
 * Fetch and optimize the poster for every video in lib/videos.ts, once, into
 * public/images/videos/<id>.jpg — then commit the result.
 *
 *   npm run fetch:posters
 *
 * The page never asks YouTube's image host for anything: components/
 * VideoEmbed.tsx is a facade that renders this committed poster and a play
 * button, and loads the player iframe only on click. A runtime request to
 * i.ytimg.com would be a third-party image on a page whose privacy notice
 * describes none, and `next/image` cannot optimize a remote host it has not
 * been told about anyway. So the poster is fetched here, at authoring time,
 * and served from public/ like every other photograph on the site.
 *
 * `maxresdefault.jpg` is 1280×720 when YouTube has it and a 404 when it does
 * not (older or low-resolution uploads); the script falls back to
 * `hqdefault.jpg` (480×360) and says so, because a quietly blurry poster is
 * the kind of thing nobody notices until a visitor does. Output is re-encoded
 * with sharp (already a dependency of next/image) at quality 78, progressive:
 * the raw 1280×720 was 93 kB and lands around 65 kB; next/image then serves
 * AVIF/WebP from it per the usual pipeline.
 *
 * Ids are read out of lib/videos.ts with a regex rather than by importing it:
 * the catalog imports lib/site-config.ts through a TS path alias Node cannot
 * resolve, and a one-line pattern over `id: "<11 chars>"` is less machinery
 * than a loader. Pass `--force` to re-fetch posters that already exist.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "public", "images", "videos");
const force = process.argv.includes("--force");

const catalog = readFileSync(join(ROOT, "lib", "videos.ts"), "utf8");
const ids = [...catalog.matchAll(/^\s*id:\s*"([A-Za-z0-9_-]{11})",/gm)].map((m) => m[1]);
if (ids.length === 0) {
  console.error("lib/videos.ts lists no video ids");
  process.exit(1);
}

mkdirSync(OUT_DIR, { recursive: true });

async function fetchPoster(id) {
  for (const name of ["maxresdefault", "hqdefault"]) {
    const res = await fetch(`https://i.ytimg.com/vi/${id}/${name}.jpg`);
    if (res.ok) return { name, bytes: Buffer.from(await res.arrayBuffer()) };
  }
  return null;
}

let failed = false;
for (const id of ids) {
  const out = join(OUT_DIR, `${id}.jpg`);
  if (existsSync(out) && !force) {
    console.log(`  ${id}  already present — ${out.replace(ROOT + "/", "")} (use --force to refetch)`);
    continue;
  }
  const poster = await fetchPoster(id);
  if (!poster) {
    console.error(`  ${id}  no poster at i.ytimg.com (maxresdefault or hqdefault)`);
    failed = true;
    continue;
  }
  const image = sharp(poster.bytes);
  const meta = await image.metadata();
  const encoded = await image
    .resize({ width: Math.min(meta.width ?? 1280, 1280), withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true, progressive: true })
    .toBuffer({ resolveWithObject: true });
  writeFileSync(out, encoded.data);
  const low = poster.name !== "maxresdefault" ? "  ⚠ low-resolution source (hqdefault)" : "";
  console.log(
    `  ${id}  ${poster.name}.jpg ${meta.width}×${meta.height} (${(poster.bytes.length / 1024).toFixed(0)} kB) → ` +
      `${encoded.info.width}×${encoded.info.height} ${(encoded.info.size / 1024).toFixed(0)} kB${low}`
  );
}
process.exit(failed ? 1 : 0);
