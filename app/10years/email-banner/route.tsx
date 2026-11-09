import { renderTenYearsEmailBanner } from "@/lib/og/ten-years";

/**
 * The email header's source (lib/og/ten-years.tsx), rendered at build. The
 * emails link to the compressed copy in public/email/10years-banner.png, made
 * from this by scripts/render-email-banner.mjs — rerun it if the art changes.
 */
export const dynamic = "force-static";

export async function GET() {
  const res = await renderTenYearsEmailBanner();
  return new Response(res.body, { headers: { "Content-Type": "image/png", "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=86400" } });
}
