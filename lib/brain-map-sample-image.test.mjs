// The hero card's sample Brain Map (lib/brain-map-sample-image.ts): a WebP
// of 10 KB or less, 224px square with alpha, the same bytes every time.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import sharp from "sharp";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const { brainMapSampleWebp, SAMPLE_IMAGE_MAX_BYTES, SAMPLE_IMAGE_PX } = await import("./brain-map-sample-image.ts");

test("the sample image is a WebP of 10 KB or less", async () => {
  const bytes = await brainMapSampleWebp();
  assert.equal(SAMPLE_IMAGE_MAX_BYTES, 10240);
  assert.ok(bytes.length <= SAMPLE_IMAGE_MAX_BYTES, `${bytes.length} bytes`);
  assert.equal(Buffer.from(bytes.subarray(0, 4)).toString("latin1"), "RIFF");
  assert.equal(Buffer.from(bytes.subarray(8, 12)).toString("latin1"), "WEBP");
});

test("224px square, transparent outside the head, painted inside it", async () => {
  const bytes = await brainMapSampleWebp();
  const meta = await sharp(bytes).metadata();
  assert.deepEqual([meta.width, meta.height, meta.hasAlpha], [SAMPLE_IMAGE_PX, SAMPLE_IMAGE_PX, true]);
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const px = (x, y) => [...data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4)];
  assert.equal(px(2, 2)[3], 0, "the corner is transparent");
  assert.equal(px(112, 120)[3], 255, "the centre of the head is opaque");
});
