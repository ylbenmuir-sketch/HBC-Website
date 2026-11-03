-- 0015 — the thank-you gift's per-center cap (fix list rev 2, P1-1; Ben,
-- 2026-11-03).
--
-- The free first visit is capped per center (GIFT_CAP in
-- lib/giveaway/config.ts — Ben supplies the real Brain Map slots for
-- Nov 23 – Dec 31). A booking with a valid code redeems only while the
-- center has spots left; at the cap the lead is still saved, the offer is
-- WAITLISTED instead, and the visitor is told so. If a fallback gift is
-- configured (GIFT_FALLBACK — left blank for now), the code redeems as the
-- fallback instead of waitlisting.
--
--   giveaway_offers.waitlisted_at    when a booking hit a full center
--   giveaway_offers.waitlist_center  which center it wanted
--   giveaway_offers.fallback         true when redeemed as the fallback
--                                    (never counts against the cap)
--   consultation_requests.giveaway_waitlist  the lead row's copy of the
--                                    outcome, for staff
--
-- giveaway_redeem_gift() does the count and the write in ONE transaction
-- under a per-(env, center) advisory lock, so two bookings racing for the
-- last spot produce exactly one redemption and one waitlist entry.
--
-- Additive and idempotent. Apply after 0010 (and 0013, 0014).

alter table public.giveaway_offers
  add column if not exists waitlisted_at timestamptz,
  add column if not exists waitlist_center text,
  add column if not exists fallback boolean not null default false;

alter table public.consultation_requests
  add column if not exists giveaway_waitlist boolean not null default false;

comment on column public.giveaway_offers.waitlisted_at is 'When a booking with this code found its center at the gift cap (GIFT_CAP). Null otherwise.';
comment on column public.giveaway_offers.fallback is 'True when the code was redeemed as the fallback gift after the cap. Fallback redemptions never count against the cap.';
comment on column public.consultation_requests.giveaway_waitlist is 'True when a 10-year giveaway booking found its center''s free-visit spots all claimed.';

-- Returns 'redeemed' | 'fallback' | 'waitlisted' | 'already'.
--   p_cap null       → no cap: redeem.
--   count < p_cap    → redeem.
--   at cap, p_fallback → redeem as the fallback.
--   at cap otherwise → waitlist (the offer stays unredeemed).
create or replace function public.giveaway_redeem_gift(
  p_env text,
  p_offer_id uuid,
  p_center text,
  p_cap integer,
  p_fallback boolean,
  p_consultation_request_id uuid,
  p_now timestamptz
)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_taken integer;
  v_rows integer;
begin
  perform pg_advisory_xact_lock(hashtext('giveaway_gift:' || p_env || ':' || coalesce(p_center, '')));
  if p_cap is not null then
    select count(*) into v_taken
      from public.giveaway_offers
     where env = p_env and redeemed_center = p_center and redeemed_at is not null and not fallback;
  end if;
  if p_cap is null or v_taken < p_cap then
    update public.giveaway_offers
       set redeemed_at = p_now, consultation_request_id = p_consultation_request_id, redeemed_center = p_center, waitlisted_at = null, waitlist_center = null
     where id = p_offer_id and env = p_env and redeemed_at is null;
    get diagnostics v_rows = row_count;
    return case when v_rows > 0 then 'redeemed' else 'already' end;
  end if;
  if p_fallback then
    update public.giveaway_offers
       set redeemed_at = p_now, consultation_request_id = p_consultation_request_id, redeemed_center = p_center, fallback = true
     where id = p_offer_id and env = p_env and redeemed_at is null;
    get diagnostics v_rows = row_count;
    return case when v_rows > 0 then 'fallback' else 'already' end;
  end if;
  update public.giveaway_offers
     set waitlisted_at = coalesce(waitlisted_at, p_now), waitlist_center = p_center, consultation_request_id = coalesce(consultation_request_id, p_consultation_request_id)
   where id = p_offer_id and env = p_env and redeemed_at is null;
  get diagnostics v_rows = row_count;
  return case when v_rows > 0 then 'waitlisted' else 'already' end;
end;
$$;
revoke all on function public.giveaway_redeem_gift(text, uuid, text, integer, boolean, uuid, timestamptz) from public, anon, authenticated;
comment on function public.giveaway_redeem_gift is 'Redeem a thank-you gift code against the per-center cap, atomically (P1-1). Service role only.';
