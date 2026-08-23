import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
