import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
 * ## Where it lives
 *
 * On Vercel, requests in one conversation can land on different instances and
 * an instance can be recycled mid-flow, so an in-process Map loses a booking
 * halfway through — a lost lead — and loses a minor's `blockedFromContact`
 * flag with it. The store is therefore Supabase-backed (`chat_sessions`, see
 * supabase/migrations/0003_chat_sessions.sql) whenever the service-role
 * credentials are present, with the in-process Map kept as the fallback for
 * local runs without credentials and for the minutes a Supabase outage lasts.
 * A fallback turn behaves exactly as the whole thing did before: fine on one
 * warm instance, lossy across several. Rows are swept an hour after their
 * last turn, so a draft's name and number live in the table only as long as
 * the conversation does; a completed booking is on consultation_requests by
 * then.
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
  /** Returns the existing session (bumping `turns`), or a fresh one. */
  open(id: string): Promise<ChatSession>;
  save(session: ChatSession): Promise<void>;
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

/** The in-process store. Also the read-through cache and fallback for the
 *  Supabase store below, which is why its methods stay synchronous. */
class InMemorySessionStore {
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

/** One save in this many runs the sweep of rows past SESSION_TTL_MS —
 *  cheap, and traffic is low. */
const SWEEP_EVERY = 25;

class SupabaseSessionStore implements SessionStore {
  private client: SupabaseClient;
  private memory = new InMemorySessionStore();
  private saves = 0;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false },
    });
  }

  async open(id: string): Promise<ChatSession> {
    const now = Date.now();
    try {
      const { data, error } = await this.client
        .from("chat_sessions")
        .select("session")
        .eq("id", id)
        .gt("last_seen_at", new Date(now - SESSION_TTL_MS).toISOString())
        .maybeSingle();
      if (error) throw error;

      if (data?.session) {
        const session = data.session as ChatSession;
        session.lastSeenAt = now;
        session.turns += 1;
        this.memory.save(session);
        return session;
      }
      const session = freshSession(id, now);
      session.turns = 1;
      this.memory.save(session);
      return session;
    } catch (error) {
      // Shape only — a session id is opaque, but the draft is not, and
      // Supabase's `details` can echo values.
      console.error(
        "[chat] session read failed, using in-process store:",
        error instanceof Error ? error.message : "unknown error"
      );
      return this.memory.open(id);
    }
  }

  async save(session: ChatSession): Promise<void> {
    this.memory.save(session);
    try {
      const { error } = await this.client.from("chat_sessions").upsert({
        id: session.id,
        session,
        last_seen_at: new Date(session.lastSeenAt).toISOString(),
      });
      if (error) throw error;

      if (++this.saves % SWEEP_EVERY === 0) {
        const cutoff = new Date(Date.now() - SESSION_TTL_MS).toISOString();
        const { error: sweepError } = await this.client
          .from("chat_sessions")
          .delete()
          .lt("last_seen_at", cutoff);
        if (sweepError) throw sweepError;
      }
    } catch (error) {
      console.error(
        "[chat] session write failed, kept in-process only:",
        error instanceof Error ? error.message : "unknown error"
      );
    }
  }
}

/** The in-process store behind the async interface — local runs without
 *  Supabase credentials. */
class LocalSessionStore implements SessionStore {
  private memory = new InMemorySessionStore();
  async open(id: string): Promise<ChatSession> {
    return this.memory.open(id);
  }
  async save(session: ChatSession): Promise<void> {
    this.memory.save(session);
  }
}

function createSessionStore(): SessionStore {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) return new SupabaseSessionStore(url, key);
  console.warn(
    "[chat] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY unset — conversation state is in-process only."
  );
  return new LocalSessionStore();
}

/**
 * Module-scope singleton. Next.js keeps this alive across requests within one
 * server instance; the Supabase table is what makes it shared across them.
 */
export const sessionStore: SessionStore = createSessionStore();

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
