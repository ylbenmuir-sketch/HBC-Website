import { runReleaseJob } from "@/lib/release-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Every minute (vercel.json): the heartbeat, then every held staff
 *  notification that is due. See lib/release-job.ts. */
export function GET(request: Request) {
  return runReleaseJob(request, "minute");
}
