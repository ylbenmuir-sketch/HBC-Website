import type { SafetyStop } from "./safety";

/**
 * Per-conversation state (phase-8-chatbot.md §4, extended by §5).
 *
 * Server-side only. Two things live here, and the distinction matters:
 *
 * 1. **The safety ledger** — whether a crisis disclosure has fired (§4.1) and
 *    whether the visitor has said they are under 18 (§4.2). Both are sticky:
 *    once set they are never cleared, because §4.2's consequence lasts for the
 *    conversation rather than the turn, and a visitor who discloses a crisis
 *    and then asks about parking is still a flagged conversation.
 * 2. **Booking progress** (§5) — which question has been asked, what has been
 *    answered, and whether a read-back is awaiting a yes.
 *
 * The ledger is deliberately authoritative on the server. Keeping it on the
 * client would mean a stripped field could restore contact collection for a
 * visitor who told us they were fourteen, and that is not a failure mode worth
 * the convenience.
 *
 * ## Known limitation — flag before this ships
 *
 * The store is in-process. On a single long-lived server that is exactly
 * right; on serverless (the site deploys to Vercel) instances are not shared
 * and are recycled, so a conversation can land on an instance that has never
 * seen it and lose its state mid-flow. Consequences, worst first:
 *
 * - A booking in progress loses its answers and starts over. That is a lost
 *   lead, and it is the reason this needs deciding rather than discovering.
 * - A minor's `blockedFromContact` flag is lost, and a visitor who disclosed
 *   their age earlier could be asked for a phone number later without
 *   re-disclosing. The per-message check still fires on any new disclosure.
 *
 * The fix is a shared store, which is the same decision as conversation
 * retention (§6, "Ben's call"): both need somewhere durable to live, and
 * neither should be chosen by whoever writes the code. `SessionStore` below is
 * the whole surface a Redis or Supabase-backed implementation has to satisfy.
 */

/** §5 — the booking questions, in the order they are asked. */
export type BookingStep =
  | "idle"
  | "helpingWho"
  | "firstName"
  | "phone"
  | "note"
  | "bestTime"
  | "preferredCenter"
  | "confirm"
  /** Re-asking the number after a failed read-back — never re-asks the note. */
  | "confirmPhone"
  | "submitted"
  | "declined";

/** Exactly what components/ContactForm.tsx collects. Nothing more (§5). */
export type BookingDraft = {
  helpingWho?: string;
  firstName?: string;
  phone?: string;
  note?: string;
  bestTime?: string;
  preferredCenter?: string;
};

export type ChatSession = {
  id: string;
  createdAt: number;
  lastSeenAt: number;
  turns: number;

  /** §4.1 — sticky. A flagged conversation stays flagged. */
  crisisFlagged: boolean;
  /** §4.2 — sticky. No contact details are collected once this is true. */
  blockedFromContact: boolean;
  /** §4.4 — counted for the log only; never changes the reply. */
  injectionAttempts: number;

  /** §5 — booking progress. */
  step: BookingStep;
  draft: BookingDraft;
  /**
   * §5 — whether the previous reply ended with the offer of a call. A bare
   * "yes" starts the booking flow only when something was actually offered,
   * so an agreeable "yes, that makes sense" mid-answer doesn't start
   * collecting a phone number.
   */
  bookingOffered: boolean;
};

export interface SessionStore {
  get(id: string): ChatSession | undefined;
  /** Returns the existing session, or a fresh one. */
  open(id: string): ChatSession;
  save(session: ChatSession): void;
}

/** Conversations idle longer than this are dropped. */
const SESSION_TTL_MS = 60 * 60 * 1000;
/** Backstop so a busy process can't grow without bound. */
const MAX_SESSIONS = 5_000;

function freshSession(id: string, now: number): ChatSession {
  return {
    id,
    createdAt: now,
    lastSeenAt: now,
    turns: 0,
    crisisFlagged: false,
    blockedFromContact: false,
    injectionAttempts: 0,
    step: "idle",
    draft: {},
    bookingOffered: false,
  };
}

class InMemorySessionStore implements SessionStore {
  private sessions = new Map<string, ChatSession>();

  private sweep(now: number) {
    for (const [id, session] of this.sessions) {
      if (now - session.lastSeenAt > SESSION_TTL_MS) this.sessions.delete(id);
    }
    // Oldest-first eviction if the sweep wasn't enough. Map preserves
    // insertion order, and `save` re-inserts, so the front is the stalest.
    while (this.sessions.size > MAX_SESSIONS) {
      const oldest = this.sessions.keys().next();
      if (oldest.done) break;
      this.sessions.delete(oldest.value);
    }
  }

  get(id: string): ChatSession | undefined {
    const session = this.sessions.get(id);
    if (!session) return undefined;
    if (Date.now() - session.lastSeenAt > SESSION_TTL_MS) {
      this.sessions.delete(id);
      return undefined;
    }
    return session;
  }

  open(id: string): ChatSession {
    const now = Date.now();
    this.sweep(now);
    const existing = this.get(id);
    if (existing) {
      existing.lastSeenAt = now;
      existing.turns += 1;
      return existing;
    }
    const session = freshSession(id, now);
    session.turns = 1;
    this.sessions.set(id, session);
    return session;
  }

  save(session: ChatSession): void {
    session.lastSeenAt = Date.now();
    // Re-insert so Map order tracks recency for the eviction above.
    this.sessions.delete(session.id);
    this.sessions.set(session.id, session);
  }
}

/**
 * Module-scope singleton. Next.js keeps this alive across requests within one
 * server instance — see the limitation note above for what that does and
 * doesn't guarantee.
 */
export const sessionStore: SessionStore = new InMemorySessionStore();

/**
 * Apply a §4 stop to the session.
 *
 * This is where "stops everything else" becomes a state change rather than a
 * sentence in a document: a crisis clears the booking draft outright, so there
 * is no half-collected lead sitting in memory and nothing for a later turn to
 * resume. §4.1 says the assistant "does not continue the booking flow" — the
 * flow is not paused, it is gone.
 */
export function applySafetyStop(session: ChatSession, stop: SafetyStop): void {
  if (stop.kind === "crisis") {
    session.crisisFlagged = true;
    session.step = "idle";
    session.draft = {};
    return;
  }
  // A recent head injury or an acute headache ends the turn and clears a
  // half-finished booking — nobody should be answering "which center?" in the
  // same breath as "go to urgent care" — but neither flags the conversation
  // nor closes the door on contact details. The same visitor may well come
  // back to this session asking about later, which is what both pages are
  // for. Matched on the effect rather than the kind, which is what
  // SafetyEffect exists for: the route must not be able to honour the stop
  // and forget its meaning when the next end-turn kind arrives.
  if (stop.effect === "end-turn") {
    session.step = "idle";
    session.draft = {};
    return;
  }
  session.blockedFromContact = true;
  session.step = "idle";
  session.draft = {};
}

/** True when §4.2 forbids asking for contact details in this conversation. */
export function contactCollectionAllowed(session: ChatSession): boolean {
  return !session.blockedFromContact;
}

/** Opaque, unguessable conversation id. Server-issued; never a user value. */
export function newSessionId(): string {
  return crypto.randomUUID();
}
