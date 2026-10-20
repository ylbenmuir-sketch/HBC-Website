/** Row shapes of the giveaway tables (migration 0010), as the code reads them. */

import type { PrizeVersion, Slot } from "./config";
import type { Center } from "./zip";

export type PersonRow = {
  id: string;
  env: string;
  created_at: string;
  email: string;
  email_display: string;
  first_name: string;
  last_name: string;
  zip: string;
  city: string | null;
  nearest_center: Center | null;
  is_existing_client: boolean;
  age_confirmed: boolean;
  rules_accepted_at: string | null;
  rules_version: string | null;
  verified_at: string | null;
  referral_code: string;
  referred_by_person_id: string | null;
  referral_credits: number;
  source_page: string | null;
  ip_hash: string | null;
  ua_hash: string | null;
  marketing_opt_in: boolean;
  marketing_opt_in_wording: string | null;
  marketing_opt_in_at: string | null;
  unsubscribed_at: string | null;
};

export type NotifyRow = {
  id: string;
  env: string;
  created_at: string;
  email: string;
  email_display: string;
  first_name: string;
  last_name: string;
  zip: string;
  is_existing_client: boolean;
  age_confirmed: boolean;
  rules_accepted_at: string | null;
  rules_version: string | null;
  marketing_opt_in: boolean;
  marketing_opt_in_wording: string | null;
  marketing_opt_in_at: string | null;
  verify_token_hash: string | null;
  verified_at: string | null;
  live_token_hash: string | null;
  sent_live_at: string | null;
  reminded_at: string | null;
  tapped_at: string | null;
  person_id: string | null;
  source_page: string | null;
  ip_hash: string | null;
  ua_hash: string | null;
  unsubscribed_at: string | null;
};

export type EntryKind = "base" | "early_bird" | "referral_bonus" | "referred_bonus" | "amoe";

export type EntryRow = {
  id: string;
  env: string;
  created_at: string;
  person_id: string;
  kind: EntryKind;
  referral_person_id: string | null;
  void_reason: string | null;
  voided_at: string | null;
};

export type PrizeRow = {
  id: string;
  env: string;
  slot: Slot;
  version: PrizeVersion;
  name: string;
  description: string;
  retail_value_usd: number;
  practitioner_cost_usd: number;
  tax_form_required: boolean;
  fulfilment_status: string;
};

export type DrawingStatus = "scheduled" | "drawing" | "drawn" | "redrawn" | "void";

export type DrawingRow = {
  id: string;
  env: string;
  slot: Slot;
  kind: "daily" | "grand";
  scheduled_at: string;
  status: DrawingStatus;
  pool_snapshot_hash: string | null;
  pool_size: number | null;
  entries_count: number | null;
  seed: string | null;
  winner_entry_id: string | null;
  winner_person_id: string | null;
  drawn_at: string | null;
  drawn_by: string | null;
  claimed_at: string | null;
};

export type PoolRow = {
  id: number;
  env: string;
  drawing_id: string;
  entry_id: string;
  person_id: string;
  position: number;
};

export type WinnerStatus = "drawn" | "contacted" | "claimed" | "unreachable" | "declined" | "ineligible" | "redrawn";

export type CallAttempt = { at: string; by: string; outcome: string };

export type WinnerRow = {
  id: string;
  env: string;
  created_at: string;
  drawing_id: string;
  person_id: string;
  entry_id: string | null;
  prize_id: string;
  prize_version: PrizeVersion;
  claim_token_hash: string | null;
  phone: string | null;
  status: WinnerStatus;
  claim_deadline_at: string;
  call_attempts: CallAttempt[];
  contacted_at: string | null;
  claimed_at: string | null;
  public_ok: boolean;
  public_ok_at: string | null;
  public_label: string | null;
  tax_form_required: boolean;
  tax_form_received_at: string | null;
  redraw_reason: string | null;
  redrawn_at: string | null;
  notes: string | null;
  seed: string | null;
  pool_excluded: string[];
};

export type OfferRow = {
  id: string;
  env: string;
  person_id: string;
  kind: "free_first_visit";
  code: string;
  issued_at: string;
  expires_at: string;
  redeemed_at: string | null;
  consultation_request_id: string | null;
  redeemed_center: string | null;
};

export type ScheduledSendRow = {
  id: string;
  env: string;
  created_at: string;
  kind: string;
  due_at: string;
  person_id: string | null;
  notify_id: string | null;
  claimed_at: string | null;
  sent_at: string | null;
  skipped_reason: string | null;
  message_id: string | null;
  error: string | null;
};

export type AuditRow = {
  id: number;
  env: string;
  at: string;
  actor: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  reason: string | null;
  before: unknown;
  after: unknown;
  ip_hash: string | null;
};

/** The still-counting statuses: a person with one of these holds a prize. */
export const HOLDING_STATUSES: readonly WinnerStatus[] = ["drawn", "contacted", "claimed"];
