/**
 * The real side effects of a drawing and of the scheduled sends: the staff
 * alert (lib/giveaway/alerts.ts routes it) and the deps the send runner
 * needs to build and deliver each scheduled email. Winners get no automated
 * email (Ben, 2026-11-03): staff reach them by phone and email from the
 * alert. Everything goes through lib/giveaway/send.ts, so the Resend mock in
 * check:giveaway sees every message and nothing else can send one.
 * Server-only.
 */

import { alertRecipients } from "./alerts";
import { drawing } from "./config";
import type { DrawResult, Notifier } from "./drawings";
import { staffWinnerAlertEmail } from "./emails";
import { reportEmailFailure } from "./failure-alert";
import type { PersonRow, WinnerRow } from "./rows";
import { bookLink, footingFor, listSentEmails, referralLink, sendGiveawayEmail, tokenLink } from "./send";
import type { SendDeps } from "./sends";
import type { GiveawayStore } from "./store";
import { supabaseAdmin } from "../consultation";
import { tokenSecret } from "./tokens";

/** The notifier the cron and the admin "Draw now" / "Redraw" use. */
export function liveNotifier(store: GiveawayStore, now: () => Date, log: Pick<Console, "log" | "error"> = console): Notifier {
  return {
    async winnerDrawn(r: DrawResult) {
      const d = drawing(r.drawing.slot);
      // A winner must never be drawn into silence: the alert is the only notice.
      const to = alertRecipients(d.slot);
      const alert = staffWinnerAlertEmail({
        drawing: d,
        winner: { name: `${r.person.first_name} ${r.person.last_name}`, email: r.person.email_display, zip: r.person.zip, city: r.person.city, phone: r.person.phone ?? null },
        taxFormRequired: r.winner.tax_form_required,
        now: now(),
      });
      if (!to.to) {
        log.error(`[giveaway notify] staff alert for ${d.slot}: nobody to send to (set GIVEAWAY_ALERTS / GIVEAWAY_ALERTS_OWNER)`);
        await store.update("giveaway_winners", { notes: "staff alert not sent: no recipient" }).eq("id", r.winner.id);
        return;
      }
      const sent = await sendGiveawayEmail({ to: to.to, cc: to.cc, email: alert, marketing: false, footing: null });
      if (sent.status === "skipped") log.log(`[giveaway notify] staff alert for ${d.slot} skipped: ${sent.error}`);
      else if (sent.status !== "sent") {
        log.error(`[giveaway notify] staff alert for ${d.slot} not sent: ${sent.error}`);
        await reportEmailFailure(store, { what: `staff winner alert (${d.slot})`, error: sent.error ?? "unknown", willRetry: false }, { now: now() });
      }
      await store.update("giveaway_winners", { notes: sent.status === "sent" ? null : `staff alert ${sent.status}: ${sent.error}` }).eq("id", r.winner.id);
    },
  };
}

/** Resend answers two requests a second; a broadcast keeps under that. */
const SEND_GAP_MS = 550;

/** The deps for lib/giveaway/sends.ts → runDueSends. */
export function sendDeps(store: GiveawayStore, log: Pick<Console, "log" | "error"> = console): SendDeps {
  const secret = tokenSecret();
  let lastSend = 0;
  return {
    send: async ({ to, email, marketing, footing, cc, idempotencyKey }) => {
      const wait = lastSend + SEND_GAP_MS - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastSend = Date.now();
      const r = await sendGiveawayEmail({ to, email, marketing, footing, cc, idempotencyKey });
      return { ok: r.status === "sent", messageId: r.messageId, error: r.error, skipped: r.status === "skipped" };
    },
    onFailure: async ({ kind, failed, error, willRetry }) => {
      await reportEmailFailure(store, { what: `scheduled email ${kind}`, count: failed, error, willRetry });
    },
    sentLog: (since) => listSentEmails(since),
    // Who has sent a lead form since a time (the spots-left update, 2026-11-23). Reads only; throws rather than answer "nobody".
    leadEmailsSince: async (since) => {
      const db = supabaseAdmin();
      if (!db) throw new Error("lead reader: database not configured");
      const out: string[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from("consultation_requests").select("email").gte("created_at", since.toISOString()).not("email", "is", null).order("id").range(from, from + 999);
        if (error) throw new Error(`lead reader: ${error.message}`);
        const rows = (data ?? []) as Array<{ email: string | null }>;
        for (const r of rows) if (r.email) out.push(r.email);
        if (rows.length < 1000) return out;
      }
    },
    // The Monday alert again (2026-11-16): the same email the drawing sends, from the rows as they stand. Reads only.
    staffAlert: async (slot) => {
      const d = drawing(slot as Parameters<typeof drawing>[0]);
      const { data: row } = await store.select("giveaway_drawings", "id, drawn_at").eq("slot", d.slot).maybeSingle();
      const drawingId = (row as { id: string } | null)?.id;
      const drawnAt = (row as { drawn_at: string | null } | null)?.drawn_at;
      if (!drawingId) return null;
      const { data: winners } = await store.select("giveaway_winners", "*").eq("drawing_id", drawingId).neq("status", "redrawn").order("created_at", { ascending: false }).limit(1);
      const winner = ((winners ?? []) as WinnerRow[])[0];
      if (!winner) return null;
      const { data: p } = await store.select("giveaway_people", "*").eq("id", winner.person_id).maybeSingle();
      const person = p as PersonRow | null;
      const to = alertRecipients(d.slot);
      if (!person || !to.to) return null;
      const email = staffWinnerAlertEmail({
        drawing: d,
        winner: { name: `${person.first_name} ${person.last_name}`, email: person.email_display, zip: person.zip, city: person.city, phone: person.phone ?? null },
        taxFormRequired: winner.tax_form_required,
        // The footer reads "Drawn …": the drawing's own time, not the resend's.
        now: new Date(drawnAt ?? winner.created_at),
      });
      return { personId: person.id, to: to.to, cc: to.cc, email };
    },
    footingFor: (email, marketing) => footingFor(email, store.env, marketing, secret),
    links: {
      enterUrl: (notifyId) => tokenLink("live_tap", notifyId, store.env, { secret }),
      referralUrl: referralLink,
      bookUrl: bookLink,
    },
    log,
  };
}
