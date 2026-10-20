/**
 * The real side effects of a drawing and of the scheduled sends: the staff
 * alert (lib/giveaway/alerts.ts routes it), the winner's email with the
 * claim link, and the deps the send runner needs to build and deliver each
 * scheduled email. Everything goes through lib/giveaway/send.ts, so the
 * Resend mock in check:giveaway sees every message and nothing else can
 * send one. Server-only.
 */

import { alertRecipients } from "./alerts";
import { drawing } from "./config";
import type { DrawResult, Notifier } from "./drawings";
import { staffWinnerAlertEmail, winnerEmail } from "./emails";
import { PATHS, adminLink, bookLink, footingFor, referralLink, sendGiveawayEmail, siteUrl, tokenLink } from "./send";
import type { SendDeps } from "./sends";
import type { GiveawayStore } from "./store";
import { tokenSecret } from "./tokens";

/** The notifier the cron and the admin "Draw now" / "Redraw" use. */
export function liveNotifier(store: GiveawayStore, now: () => Date, log: Pick<Console, "log" | "error"> = console): Notifier {
  return {
    async winnerDrawn(r: DrawResult) {
      const d = drawing(r.drawing.slot);
      const deadline = new Date(r.winner.claim_deadline_at);
      // 1. Staff first: a winner must never be drawn into silence.
      const to = alertRecipients(d.slot);
      const alert = staffWinnerAlertEmail({
        drawing: d,
        winner: { name: `${r.person.first_name} ${r.person.last_name}`, email: r.person.email_display, zip: r.person.zip, city: r.person.city, isExistingClient: r.person.is_existing_client },
        version: r.winner.prize_version,
        claimDeadline: deadline,
        taxFormRequired: r.winner.tax_form_required,
        adminUrl: adminLink(`/winners`),
        now: now(),
      });
      if (to.to) {
        const sent = await sendGiveawayEmail({ to: to.to, cc: to.cc, email: alert, marketing: false, footing: null });
        if (sent.status !== "sent") log.error(`[giveaway notify] staff alert for ${d.slot} not sent: ${sent.error}`);
      } else {
        log.error(`[giveaway notify] staff alert for ${d.slot}: nobody to send to (set GIVEAWAY_ALERTS / GIVEAWAY_ALERTS_OWNER)`);
      }
      // 2. The winner, with the claim link (the raw code; the row holds its hash).
      if (r.claimToken) {
        const footing = footingFor(r.person.email, store.env, false);
        const email = winnerEmail({
          firstName: r.person.first_name,
          drawing: d,
          version: r.winner.prize_version,
          claimUrl: `${siteUrl()}${PATHS.claim}/${encodeURIComponent(r.claimToken)}`,
          claimDeadline: deadline,
          taxFormRequired: r.winner.tax_form_required,
          footing,
        });
        const sent = await sendGiveawayEmail({ to: r.person.email, email, marketing: false, footing, replyTo: to.to });
        if (sent.status !== "sent") log.error(`[giveaway notify] winner email for ${d.slot} not sent: ${sent.error}`);
        await store.update("giveaway_winners", { notes: sent.status === "sent" ? null : `winner email ${sent.status}: ${sent.error}` }).eq("id", r.winner.id);
      }
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
      adminUrl: adminLink("/winners"),
    },
    staffRecipients: () => {
      const r = alertRecipients("tue");
      return { to: r.to, cc: r.cc };
    },
    log,
  };
}
