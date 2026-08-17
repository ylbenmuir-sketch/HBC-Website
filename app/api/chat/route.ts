import { NextResponse } from "next/server";
import { answerFromSite } from "@/lib/chat/answer";
import {
  BOOKING_FAILURE_REPLY,
  advanceBooking,
  bookingActive,
  bookingSuccessReply,
  pendingQuestion,
  startBooking,
  wantsBooking,
} from "@/lib/chat/booking";
import { logTurn, type TurnOutcome } from "@/lib/chat/logging";
import { checkRefusal } from "@/lib/chat/refusals";
import { checkRateLimit, clientKey } from "@/lib/chat/rate-limit";
import { checkSafety, detectInjection } from "@/lib/chat/safety";
import {
  applySafetyStop,
  contactCollectionAllowed,
  newSessionId,
  sessionStore,
} from "@/lib/chat/session";
import { checkPreRetrieval } from "@/lib/chat/unanswerable";
import { FEATURE_ASSISTANT } from "@/lib/site-config";

export const runtime = "nodejs";

/**
 * The site assistant's only endpoint (phase-8-chatbot.md §6).
 *
 * Server-side only: the model API key is read in lib/chat/answer.ts, on this
 * side of the network, and no part of the assistant's logic ships to the
 * browser. The client sends a string and a session id and receives a string.
 *
 * ## The request path, in order
 *
 * Every stage can end the turn. Nothing below a stage runs once it has.
 *
 *   0. FEATURE FLAG      off → 404, as if the route did not exist
 *   1. RATE LIMIT        §6 — 429
 *   2. PARSE + VALIDATE  400
 *   3. SESSION           open or resume; injection noted for the log only
 *   4. SAFETY            §4.1 crisis, §4.2 minors  ← the subject of this note
 *   5. REFUSALS          §3 out-of-scope categories
 *   6. UNANSWERABLE      topics the site has decided not to answer yet
 *   7. BOOKING           §5 state machine, one question per turn
 *   8. RETRIEVAL         §2 BM25 over the content index
 *   9. MODEL             §2 answering — the ONLY stage that calls a model
 *
 * Stages 4, 5 and 6 are the same machine: a deterministic check on the raw
 * message, fixed copy, no model. They differ only in what they mean. Safety is
 * "this must stop"; a refusal is "I must not"; unanswerable is "the practice
 * hasn't settled this yet, and I won't guess on its behalf." Ordering them that
 * way keeps each answer the honest one — a crisis is never a refusal, and a
 * gated fact is never dressed up as an out-of-scope question.
 *
 * ## Where the crisis check sits, and what it stops
 *
 * §4.1 requires the crisis check to run "on every inbound message *before* the
 * model decides what to do", and to be "a check that runs ... not a behavior
 * the model is asked to remember". That is stage 4 above, and its position is
 * load-bearing rather than tidy:
 *
 * - It runs before stage 5, so a message that is both a crisis disclosure and
 *   an out-of-scope question gets the crisis response, not a refusal.
 * - It runs before stage 6, so a disclosure typed into "what's going on?" is
 *   never captured as a lead note, and a disclosure after a phone number has
 *   already been given still stops the flow — applySafetyStop() deletes the
 *   draft rather than pausing it.
 * - It runs before stages 7 and 8, so no retrieval happens and no model call
 *   is made. The response is a constant in lib/chat/safety.ts. There is no
 *   prompt, no temperature, and no failure mode in which a model paraphrases
 *   the 988 number or decides the visitor was joking.
 *
 * The turn then ends. §4.1: "Do not re-engage with booking in the same
 * message" — so nothing is appended, and the reply is returned exactly as
 * written.
 */

const MAX_MESSAGE_LENGTH = 2000;

type ChatRequest = { message?: unknown; sessionId?: unknown; page?: unknown };

function reply(
  body: { reply: string; sessionId: string; ended?: boolean },
  status = 200
) {
  return NextResponse.json(body, { status });
}

/** Does this reply end with an offer of a call? Drives the bare-"yes" rule. */
function offersCall(text: string): boolean {
  return /want me to set one up\?|set up a call|the free call/i.test(text);
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  // 0. The widget ships disabled. While the flag is off the endpoint does not
  //    acknowledge itself — nothing to probe, nothing to bill.
  if (!FEATURE_ASSISTANT) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // 1. Rate limit (§6).
  const limit = checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "You’re sending messages faster than I can answer. Try again in a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  // 2. Parse and validate.
  let body: ChatRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length === 0 || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : null;

  // 3. Session. A client-supplied id only ever resumes a conversation that
  //    already exists on this server; it can't be used to forge safety state,
  //    because the flags live on the server-side record, not in the request.
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.length <= 64
      ? body.sessionId
      : newSessionId();
  const session = sessionStore.open(sessionId);

  // §4.4 — recorded, never acted on. The turn continues exactly as it would
  // have. The defence is the delimited <message> block in lib/chat/answer.ts.
  const injection = detectInjection(message);
  if (injection) session.injectionAttempts += 1;

  const finish = (
    text: string,
    outcome: TurnOutcome,
    detail?: string,
    passages?: string[]
  ) => {
    session.bookingOffered = offersCall(text);
    sessionStore.save(session);
    logTurn({
      sessionId,
      turn: session.turns,
      outcome,
      detail,
      passages,
      injectionSuspected: Boolean(injection),
      latencyMs: Date.now() - startedAt,
      message,
      reply: text,
    });
    return reply({ reply: text, sessionId, ended: outcome === "crisis" });
  };

  // ------------------------------------------------------------------
  // 4. SAFETY (§4) — before refusals, before booking, before any model.
  // ------------------------------------------------------------------
  const stop = checkSafety(message);
  if (stop) {
    applySafetyStop(session, stop);
    return finish(stop.reply, stop.kind, stop.pattern);
  }

  // ------------------------------------------------------------------
  // 5. REFUSALS (§3)
  // ------------------------------------------------------------------
  // Skipped at the note step on purpose. §4.3 says the assistant asks "what's
  // going on?" once and "accepts whatever the visitor writes in their own
  // words" — a parent who mentions their child's medication there is
  // answering the question, not asking one, and refusing would be both rude
  // and a failure to follow §4.3. Crisis (stage 4) still applies there.
  if (session.step !== "note") {
    const refusal = checkRefusal(message);
    if (refusal) {
      if (bookingActive(session)) {
        // Mid-booking: decline, then re-ask the question still owed. One
        // question in the turn, per §5.
        const question = pendingQuestion(session);
        const text = question
          ? `${refusal.declineOnly} ${question}`
          : refusal.reply;
        return finish(text, "refusal", refusal.kind);
      }
      return finish(refusal.reply, "refusal", refusal.kind);
    }
  }

  // ------------------------------------------------------------------
  // 6. PRE-RETRIEVAL TOPICS
  // ------------------------------------------------------------------
  // Hours, and session length if its Verifiable is ever re-opened. Both are
  // decided here rather than by retrieval because neither is a passage: the
  // hours answer is assembled from the two centers' confirmed weeks, which
  // differ, and a merged week would be true of neither. Retrieval cannot tell
  // a fact held as data from one held as prose — it can only see the index —
  // so the distinction is drawn before scoring.
  //
  // Skipped at the note step for the same §4.3 reason refusals are: "my
  // daughter can't get through a Saturday" is a parent answering "what's going
  // on?", not a question about opening hours.
  if (session.step !== "note") {
    const topic = checkPreRetrieval(message);
    if (topic) {
      if (bookingActive(session)) {
        // Mid-booking: answer the topic, then re-ask what is still owed. One
        // question in the turn, per §5.
        const question = pendingQuestion(session);
        const text = question ? `${topic.bodyOnly} ${question}` : topic.reply;
        return finish(text, "unanswerable", topic.topic);
      }
      return finish(topic.reply, "unanswerable", topic.topic);
    }
  }

  // ------------------------------------------------------------------
  // 7. BOOKING (§5)
  // ------------------------------------------------------------------
  if (bookingActive(session)) {
    const turn = advanceBooking(session, message, page);

    if (turn.submit) {
      const name = turn.submit.first_name;
      try {
        // The request's own origin, never SITE_URL: that constant defaults to
        // the production domain, so a booking tested locally would have
        // POSTed a fake lead into the live Supabase table.
        const origin = new URL(request.url).origin;
        const response = await fetch(`${origin}/api/consultation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(turn.submit),
        });
        if (!response.ok) throw new Error(`consultation route: ${response.status}`);
        return finish(bookingSuccessReply(name), "booking-submitted");
      } catch (error) {
        console.error(
          "[chat] consultation submit failed:",
          error instanceof Error ? error.message : error
        );
        session.step = "confirm";
        return finish(BOOKING_FAILURE_REPLY, "booking-failed");
      }
    }
    return finish(turn.reply, "booking");
  }

  if (wantsBooking(message, session.bookingOffered)) {
    const opened = startBooking(session);
    // Null means §4.2 blocked it — the visitor told us they are under 18.
    return opened
      ? finish(opened.reply, "booking")
      : finish(
          "For anyone under 18 we’d need a parent or guardian to set things up — could you ask them to talk to us, or have them use the contact page: /contact",
          "minor",
          "blocked-from-contact"
        );
  }

  // ------------------------------------------------------------------
  // 7 + 8. RETRIEVAL (§2) and the model
  // ------------------------------------------------------------------
  // Every answer closes by asking for the call — except in the three states
  // where the site has already decided otherwise. §4.2 is the sharpest of
  // them: a visitor who told us they are fourteen must not be asked to set up
  // a call the flow would then refuse to collect a number for. "declined" is
  // §5's let-them-leave, where the assistant has said *I won't ask again* in
  // those words. "submitted" is the turn after a booking landed, where
  // offering to set one up is offering to book a call that exists.
  const answer = await answerFromSite(message, {
    askForCall:
      contactCollectionAllowed(session) &&
      session.step !== "declined" &&
      session.step !== "submitted",
  });
  // "unavailable" logs as an error, not as a content gap: an outage that reads
  // as "the site doesn't cover that" is how a key expiry gets diagnosed as a
  // retrieval bug, and how §8's transcript review draws the wrong conclusion.
  const outcome =
    answer.status === "grounded"
      ? "answered"
      : answer.status === "no-match"
        ? "no-match"
        : "error";
  return finish(answer.reply, outcome, undefined, answer.passageIds);
}
