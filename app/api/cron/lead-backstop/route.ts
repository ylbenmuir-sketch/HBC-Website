import { runReleaseJob } from "@/lib/release-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Once a day (vercel.json): anything still due, no heartbeat. See
 *  lib/release-job.ts. */
export function GET(request: Request) {
  return runReleaseJob(request, "backstop");
}
