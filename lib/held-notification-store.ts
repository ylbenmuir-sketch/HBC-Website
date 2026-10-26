// The Supabase side of lib/held-notification.ts: the HeldStore over
// consultation_requests + lead_job_heartbeats (migration 0009), and the
// Sender that turns a held row into the staff notification. Server-only.
//
// Every write is a follow-up UPDATE on a row that already exists, so nothing
// here can stop a lead from saving. Log lines carry ids and statuses only —
// never a submitted value.

import { supabaseAdmin } from "./consultation";
import { sendLeadNotification, type LeadDetails } from "./lead-notification";
import { notificationSubject } from "./lead-routing";
import type { FailureEntry, HeldRow, HeldStore, HoldState, Sender } from "./held-notification";

const TABLE = "consultation_requests";
const HEARTBEATS = "lead_job_heartbeats";

/** Every column (`*`), not a list: a named column that a pending migration
 *  has not added yet (contact_method, 0011) would fail the whole select, and
 *  with it every release. `*` returns what exists; HeldRow marks the newest
 *  column optional. The rows are small and the caller is the server. */
const ROW_COLUMNS = "*";

/** PostgREST filter value, quoted (an ISO time carries ":" and "."). */
const q = (value: string) => `"${value}"`;

function db() {
  const supabase = supabaseAdmin();
  if (!supabase) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  return supabase;
}

export const supabaseHeldStore: HeldStore = {
  async hold(rowId, { until, env, recipients }) {
    try {
      const { error } = await db()
        .from(TABLE)
        .update({
          notify_hold_state: "held",
          notify_held_until: until.toISOString(),
          notify_hold_env: env,
          notify_route: recipients.route,
          notify_env: recipients.envVar,
          notify_to: recipients.to,
          notify_cc: recipients.cc,
        })
        .eq("id", rowId);
      if (error) {
        console.error(`[held notification] lead=${rowId} hold not written: ${error.message}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error(`[held notification] lead=${rowId} hold threw: ${err instanceof Error ? err.message : "unknown error"}`);
      return false;
    }
  },

  async claim(rowId, { now, staleBefore }) {
    // The one conditional UPDATE. Postgres locks the row for it, so of two
    // callers racing here exactly one gets the row back.
    const { data, error } = await db()
      .from(TABLE)
      .update({ notify_hold_state: "sending", notify_claimed_at: now.toISOString() })
      .eq("id", rowId)
      .or(`notify_hold_state.eq.held,and(notify_hold_state.eq.sending,notify_claimed_at.lt.${q(staleBefore.toISOString())})`)
      .select(ROW_COLUMNS);
    if (error) throw new Error(error.message);
    return ((data?.[0] as HeldRow | undefined) ?? null);
  },

  async released(rowId, { by, result, hadDetails, attempts }) {
    const { error } = await db()
      .from(TABLE)
      .update({
        notify_hold_state: "released",
        notify_released_by: by,
        notify_had_details: hadDetails,
        notify_attempts: attempts,
        notify_claimed_at: null,
        notify_status: result.status,
        notify_message_id: result.messageId,
        notify_error: result.error,
        notify_rfc_message_id: result.rfcMessageId,
      })
      .eq("id", rowId);
    if (error) console.error(`[held notification] lead=${rowId} sent, but not stamped: ${error.message}`);
  },

  async failed(rowId, { state, result, attempts, failures }) {
    const { error } = await db()
      .from(TABLE)
      .update({
        notify_hold_state: state,
        notify_attempts: attempts,
        notify_failures: failures as FailureEntry[],
        notify_claimed_at: null,
        notify_status: result.status,
        notify_message_id: null,
        notify_error: result.error,
      })
      .eq("id", rowId);
    if (error) console.error(`[held notification] lead=${rowId} failure not stamped: ${error.message}`);
  },

  async due({ env, now, staleBefore, limit }) {
    const { data, error } = await db()
      .from(TABLE)
      .select("id")
      .eq("notify_hold_env", env)
      .or(
        `and(notify_hold_state.eq.held,notify_held_until.lte.${q(now.toISOString())}),and(notify_hold_state.eq.sending,notify_claimed_at.lt.${q(staleBefore.toISOString())})`
      )
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => String(r.id));
  },

  async state(rowId) {
    const { data, error } = await db().from(TABLE).select("notify_hold_state").eq("id", rowId).maybeSingle();
    if (error) return undefined;
    return (data?.notify_hold_state as HoldState | null | undefined) ?? null;
  },

  async heartbeat(name) {
    try {
      const { data, error } = await db()
        .from(HEARTBEATS)
        .select("last_run_at, previous_run_at")
        .eq("name", name)
        .maybeSingle();
      if (error) {
        console.error(`[held notification] heartbeat unreadable: ${error.message}`);
        return undefined;
      }
      if (!data) return null;
      return {
        lastRunAt: new Date(data.last_run_at),
        previousRunAt: data.previous_run_at ? new Date(data.previous_run_at) : null,
      };
    } catch (err) {
      console.error(`[held notification] heartbeat threw: ${err instanceof Error ? err.message : "unknown error"}`);
      return undefined;
    }
  },

  async beat(name, now) {
    const supabase = db();
    const { data } = await supabase.from(HEARTBEATS).select("last_run_at, runs").eq("name", name).maybeSingle();
    const { error } = await supabase.from(HEARTBEATS).upsert({
      name,
      last_run_at: now.toISOString(),
      previous_run_at: data?.last_run_at ?? null,
      runs: Number(data?.runs ?? 0) + 1,
    });
    if (error) throw new Error(`heartbeat not written: ${error.message}`);
  },
};

/** The held row as the staff notification's lead. */
export function leadFromRow(row: HeldRow, route: string | null): LeadDetails {
  return {
    source: "form",
    intent: route === "more_info" ? "more_info" : "book",
    rowId: row.id,
    helpingWho: row.helping_who,
    concerns: row.concerns ?? [],
    firstName: row.first_name,
    phone: row.phone,
    email: row.email,
    preferredCenter: row.preferred_center,
    bestTime: row.best_time,
    contactMethod: row.contact_method ?? null,
    note: row.note,
    referredBy: row.referred_by,
    heardAbout: row.heard_about ?? null,
    sourcePage: row.source_page,
    smsConsent: row.sms_consent === true,
    // Never held when the trap was filled (shouldHold), so always false here.
    honeypotFilled: false,
  };
}

/** The staff notification for a held row: its recorded recipients, the
 *  usual subject, and "Received" = when the visitor asked, not when sent. */
export const sendHeldRow: Sender = (row, recipients) =>
  sendLeadNotification(
    leadFromRow(row, recipients.route),
    recipients,
    notificationSubject({
      route: recipients.route,
      source: "form",
      preferredCenter: row.preferred_center,
      name: row.first_name,
      email: row.email,
    }),
    new Date(row.created_at)
  );
