/**
 * The real pieces behind /admin/10years (lib/giveaway/admin-auth.ts holds
 * the rules): the Supabase Auth OTP client over the service role, the store,
 * the token secret, and the cookie settings. Server-only; route handlers and
 * the page import this, tests import admin-auth.ts with fakes.
 */

import { createClient } from "@supabase/supabase-js";
import { ADMIN_PATH, PENDING_COOKIE, PENDING_TTL_MS, SESSION_COOKIE, SESSION_TTL_MS, type OtpClient } from "./admin-auth";
import { giveawayEnv, isTestingEnv } from "./env";
import { giveawayStore, type GiveawayStore } from "./store";
import { tokenSecret } from "./tokens";

/**
 * `GIVEAWAY_OTP_MOCK_CODE=<digits>`: no email is sent and that code signs in
 * — for check:giveaway, which must never cause a real email. Honoured only
 * when the giveaway env is local or test; elsewhere it is ignored loudly.
 */
export const OTP_MOCK_ENV = "GIVEAWAY_OTP_MOCK_CODE";

function mockOtpClient(): OtpClient | null {
  const code = process.env[OTP_MOCK_ENV]?.trim();
  if (!code) return null;
  if (!isTestingEnv(giveawayEnv())) {
    console.error(`[giveaway admin] ${OTP_MOCK_ENV} is refused for env "${giveawayEnv()}" — using Supabase Auth`);
    return null;
  }
  return {
    async signInWithOtp(email) {
      console.log(`[giveaway admin] MOCK code for ${email} (no email sent)`);
      return { error: null };
    },
    async verifyOtp(email, given) {
      return given === code ? { email, error: null } : { email: null, error: { message: "mock: wrong code" } };
    },
  };
}

export function otpClient(): OtpClient | null {
  const mock = mockOtpClient();
  if (mock) return mock;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  return {
    async signInWithOtp(email) {
      const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      return { error: error ? { message: error.message } : null };
    },
    async verifyOtp(email, code) {
      const { data, error } = await client.auth.verifyOtp({ email, token: code, type: "email" });
      return { email: data?.user?.email ?? null, error: error ? { message: error.message } : null };
    },
  };
}

export type AdminDeps = { store: GiveawayStore; otp: OtpClient; secret: string };

/** Everything the admin routes need, or the name of what is missing. */
export function adminDeps(): { ok: true; deps: AdminDeps } | { ok: false; missing: string } {
  const store = giveawayStore();
  if (!store) return { ok: false, missing: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" };
  const otp = otpClient();
  if (!otp) return { ok: false, missing: "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY" };
  let secret: string;
  try {
    secret = tokenSecret();
  } catch (err) {
    return { ok: false, missing: err instanceof Error ? err.message : "GIVEAWAY_TOKEN_SECRET" };
  }
  return { ok: true, deps: { store, otp, secret } };
}

const secure = process.env.NODE_ENV === "production";

export const sessionCookie = (value: string) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: ADMIN_PATH,
  maxAge: Math.floor(SESSION_TTL_MS / 1000),
});

export const pendingCookie = (value: string) => ({
  name: PENDING_COOKIE,
  value,
  httpOnly: true,
  secure,
  sameSite: "lax" as const,
  path: ADMIN_PATH,
  maxAge: Math.floor(PENDING_TTL_MS / 1000),
});

export const clearedCookie = (name: string) => ({ name, value: "", httpOnly: true, secure, sameSite: "lax" as const, path: ADMIN_PATH, maxAge: 0 });

/** Whether migration 0010 is on this database: the drawings table answers. */
export async function migrationApplied(store: GiveawayStore): Promise<boolean | null> {
  try {
    const { error } = await store.select("giveaway_drawings", "slot", { count: "exact", head: true });
    return !error;
  } catch {
    return null;
  }
}
