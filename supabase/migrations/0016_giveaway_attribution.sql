-- 0016 — where giveaway entrants came from (fix list rev 2, P1-6; due Nov 9).
--
-- First-touch UTM tags from /10years (cleaned: lowercase, [a-z0-9._-], at
-- most 64 characters) and one normalized channel (lib/giveaway/channel.ts)
-- on every notify-me signup and every person; the channel is copied onto a
-- giveaway booking's lead row. Counts by channel feed the stats endpoint.
-- No personal data: tags describe the link, not the person.
--
-- Additive and idempotent. Until applied, signups and bookings save without
-- these columns (the code retries without them) and log that 0016 is missing.

do $$
declare t text;
begin
  foreach t in array array['giveaway_people', 'giveaway_notify'] loop
    execute format('alter table public.%I add column if not exists utm_source text, add column if not exists utm_medium text, add column if not exists utm_campaign text, add column if not exists utm_content text, add column if not exists channel text', t);
    if not exists (select 1 from pg_constraint where conname = t || '_channel_check') then
      execute format('alter table public.%I add constraint %I check (channel is null or channel in (''email'', ''provider'', ''partner'', ''gbp'', ''facebook'', ''instagram'', ''signage'', ''site_banner'', ''referral'', ''direct'', ''other''))', t, t || '_channel_check');
    end if;
  end loop;
end
$$;

alter table public.consultation_requests
  add column if not exists giveaway_channel text;

comment on column public.giveaway_people.channel is 'First-touch channel (lib/giveaway/channel.ts): email, provider, partner, gbp, facebook, instagram, signage, site_banner, referral, direct, other.';
comment on column public.consultation_requests.giveaway_channel is 'For a 10-year giveaway booking: the entrant''s first-touch channel, copied from giveaway_people.';
