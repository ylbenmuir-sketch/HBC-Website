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
import { bookLink, footingFor, referralLink, sendGiveawayEmail, tokenLink } from "./send";
import type { SendDeps } from "./sends";
import type { GiveawayStore } from "./store";
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
      if (sent.status !== "sent") log.error(`[giveaway notify] staff alert for ${d.slot} not sent: ${sent.error}`);
      await store.update("giveaway_winners", { notes: sent.status === "sent" ? null : `staff alert ${sent.status}: ${sent.error}` }).eq("id", r.winner.id);
    },
  };
}

/** The deps for lib/giveaway/sends.ts → runDueSends. */
export function sendDeps(store: GiveawayStore, log: Pick<Console, "log" | "error"> = console): SendDeps {
  const secret = tokenSecret();
  return {
    send: async ({ to, email, marketing, footing, cc }) => {
      const r = await sendGiveawayEmail({ to, email, marketing, footing, cc });
      return { ok: r.status === "sent", messageId: r.messageId, error: r.error };
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
