import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  /**
   * Pin the workspace root to this directory.
   *
   * Turbopack infers the root by walking up for lockfiles, finds a stray
   * 90-byte `package-lock.json` in the home directory — no package.json, no
   * node_modules, an orphan from an `npm install` run in the wrong place —
   * and picks *that* as the root, warning on every build. Naming the root
   * explicitly is the fix that lives in the repo: it holds regardless of what
   * else appears above this directory on anyone's machine.
   */
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    /**
     * AVIF first, WebP second, and the browser takes the first it can decode.
     *
     * Next serves WebP only when this is unset, and every image on the site
     * goes through next/image. Measured on the hero: 46.6 kB JPEG becomes
     * 34.4 kB WebP, and AVIF typically lands 20-30% below WebP again — on the
     * one asset that is the LCP element of the homepage and is preloaded at
     * high priority (SEO-AUDIT-2.md §2.1).
     *
     * Order matters: this array is the order of the <source> elements Next
     * emits, and a browser takes the first format it supports. Safari has
     * shipped AVIF since 16.4 and everything else since 2021, so the WebP
     * entry is the floor rather than the common case.
     *
     * The cost is build time — AVIF encoding is slower than WebP, per image
     * per size — and it is paid once at build for a static site.
     */
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
