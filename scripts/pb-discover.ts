// npm run pb:discover: read-only Practice Better discovery (Ben, 2026-11-24).
// Step 1 of online booking: what staff, services and open slots the API
// exposes. Nothing user-facing is built from this yet.
//
// RULES (lib/practice-better/client.test.mjs checks these against this file):
//   - GET only, through lib/practice-better/client.ts. No other HTTP method.
//   - Only the three paths in ALLOWED_PATHS. Never a client-record or session
//     endpoint, and nothing that reads or prints client data.
//   - Prints staff names, service details and slot counts only. The profile
//     endpoint also returns the API account's email and settings, and those
//     are never printed.
//
// What the API does NOT expose (probed 2026-11-24, every guess 404'd): a
// consultant/team list, office locations, service prices and an
// online-booking flag. Consultants here are the ones that own a service,
// plus the API account itself. Slots carry no location, and the slots
// endpoint ignores a locationId parameter, so counts are per consultant +
// service only. First run (2026-11-24): all 11 services belong to the API
// account itself, so these credentials look scoped to one consultant, and
// no slot was open in the next 7 days (the first open slot was Dec 3).
//
// Env: PB_CLIENT_ID and PB_CLIENT_SECRET from .env.local (vercel env pull).

import { createPbClient, type Query } from "../lib/practice-better/client.ts";

const ALLOWED_PATHS = [
  "/consultant/profile",
  "/consultant/services",
  "/consultant/availability/slots",
] as const;
type AllowedPath = (typeof ALLOWED_PATHS)[number];

const TIME_ZONE = "America/Chicago";
const DAYS_AHEAD = 7;
const PAGE_SIZE = 100;

type Consultant = {
  id: string;
  profile?: { firstName?: string; lastName?: string };
  isPractitioner?: boolean;
};
type Service = {
  id: string;
  name?: string;
  /** Seconds (1800 = the 30-minute slots the availability endpoint returns). */
  duration?: number | string;
  serviceTypes?: string[];
  isGroupService?: boolean;
  consultant?: Consultant;
};
type ServicesPage = { count?: number; hasMore?: boolean; items?: Service[] };
type Profile = {
  id?: string;
  activationStatus?: string;
  isPractitioner?: boolean;
  profile?: { firstName?: string; lastName?: string; timeZone?: string };
};
type Slot = { startDate: string; endDate?: string; duration?: string };

const client = createPbClient();

function read<T>(path: AllowedPath, query?: Query): Promise<T> {
  if (!ALLOWED_PATHS.includes(path)) throw new Error(`pb:discover may not call ${path}`);
  return client.get<T>(path, query);
}

const chicagoDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The next `n` calendar days in Chicago, starting today, as YYYY-MM-DD. */
function nextDays(n: number): string[] {
  const [y, m, d] = chicagoDate.format(new Date()).split("-").map(Number);
  return Array.from({ length: n }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10),
  );
}

function displayName(c?: { profile?: { firstName?: string; lastName?: string } }): string {
  const name = [c?.profile?.firstName, c?.profile?.lastName].filter(Boolean).join(" ").trim();
  return name || "(no name)";
}

function minutes(seconds?: number | string): string {
  const n = Number(seconds);
  return Number.isFinite(n) && n > 0 ? `${Math.round(n / 60)} min` : "?";
}

async function allServices(): Promise<Service[]> {
  const out: Service[] = [];
  for (let skip = 0; ; skip += PAGE_SIZE) {
    const page = await read<ServicesPage>("/consultant/services", { limit: PAGE_SIZE, skip });
    out.push(...(page.items ?? []));
    if (!page.hasMore || !page.items?.length) return out;
  }
}

async function main() {
  const profile = await read<Profile>("/consultant/profile");
  const services = await allServices();

  // Consultants: the API account plus every service owner.
  const consultants = new Map<string, { name: string; active: string }>();
  if (profile.id) {
    consultants.set(profile.id, {
      name: displayName(profile),
      active: profile.activationStatus ? `${profile.activationStatus} (API account)` : "not exposed",
    });
  }
  for (const s of services) {
    const c = s.consultant;
    if (c?.id && !consultants.has(c.id)) {
      consultants.set(c.id, { name: displayName(c), active: "not exposed by the API" });
    }
  }

  console.log(`Practice Better discovery, ${new Date().toISOString()} (GET only)\n`);

  console.log(`CONSULTANTS (${consultants.size}) — the API has no team list; these are the API account and service owners`);
  for (const [id, c] of consultants) console.log(`  ${id}  ${c.name}  active: ${c.active}`);

  console.log(`\nSERVICES (${services.length}) — price and online-booking flag are not in the API`);
  for (const s of services) {
    const type = [...(s.serviceTypes ?? []), s.isGroupService ? "group" : "individual"].join(", ");
    console.log(
      `  ${s.id}  ${s.name ?? "(no name)"}  type: ${type}  duration: ${minutes(s.duration)}  ` +
        `price: not exposed  online booking: not exposed  owner: ${displayName(s.consultant)}`,
    );
  }

  console.log(`\nOFFICE LOCATIONS — not exposed by the API (no locations endpoint exists)`);

  const days = nextDays(DAYS_AHEAD);
  console.log(`\nOPEN SLOTS, ${days[0]} to ${days[days.length - 1]} (${TIME_ZONE} dates; location: not exposed)`);
  for (const s of services) {
    const consultantId = s.consultant?.id;
    if (!consultantId) continue;
    const perDay: number[] = [];
    for (const day of days) {
      // The endpoint returns slots from `day` onward; keep only that day's.
      const slots = await read<Slot[]>("/consultant/availability/slots", {
        as_consultant: consultantId,
        serviceId: s.id,
        day,
      });
      perDay.push(slots.filter((x) => chicagoDate.format(new Date(x.startDate)) === day).length);
    }
    const total = perDay.reduce((a, b) => a + b, 0);
    console.log(
      `  ${displayName(s.consultant)} | ${s.name ?? s.id} | location n/a | ${total} open  [${perDay.join(" ")}]`,
    );
  }
}

main().catch((err: unknown) => {
  // PbApiError messages are built without credentials or tokens.
  console.error(err instanceof Error ? err.message : "pb:discover failed");
  process.exit(1);
});
