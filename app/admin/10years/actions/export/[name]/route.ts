import { NextResponse } from "next/server";
import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { buildExport, isExportName } from "@/lib/giveaway/admin-data";
import { giveawayNow } from "@/lib/giveaway/clock";
import { requireAdminAction } from "../../_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /admin/10years/actions/export/<people|entries|offers|winners> — the
 * CSV, as an attachment, never cached. buildExport audits export_csv with
 * the admin's email and the row count.
 */
export async function GET(request: Request, { params }: { params: Promise<{ name: string }> }) {
  const guard = await requireAdminAction(request);
  if (!guard.ok) return guard.response;
  const { name } = await params;
  if (!isExportName(name)) return NextResponse.redirect(new URL(`${ADMIN_PATH}/exports?error=unknown-export`, request.url), 303);
  try {
    const { filename, csv } = await buildExport(guard.ctx.store, name, guard.ctx.admin, giveawayNow());
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch (err) {
    console.error(`[giveaway admin] export ${name} by ${guard.ctx.admin}: ${err instanceof Error ? err.message : "unknown"}`);
    return NextResponse.redirect(new URL(`${ADMIN_PATH}/exports?error=export-failed`, request.url), 303);
  }
}
