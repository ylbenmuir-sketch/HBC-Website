-- 0008 — the other emails, recorded on the lead like the first (Ben, 2026-10-14).
--
-- lib/lead-notification.ts now sends four emails in one design. 0006 recorded
-- the staff notification (notify_*); this adds:
--
--   notify_rfc_message_id  the RFC Message-ID Resend gave the staff
--                          notification ("<…@…>", read back after the send).
--                          The page-two update's In-Reply-To / References
--                          point at it, so the update lands in the same
--                          Gmail thread. notify_message_id stays Resend's own
--                          id, for the Resend dashboard.
--   confirm_email_*        the visitor's "We got your request" email: sent,
--                          failed or not_configured, Resend's id, the error.
--                          A failure here never touches the lead or what the
--                          visitor was shown — it is only written down.
--   details_email_*        the "Details added" update, sent when a visitor
--                          saves the contact form's second page.
--
-- Written by follow-up UPDATEs, never the insert, so none of these can be the
-- reason a lead fails to save. All nullable; older rows read null.

alter table public.consultation_requests
  add column if not exists notify_rfc_message_id text,
  add column if not exists confirm_email_status text,
  add column if not exists confirm_email_message_id text,
  add column if not exists confirm_email_error text,
  add column if not exists details_email_status text,
  add column if not exists details_email_message_id text,
  add column if not exists details_email_error text;

alter table public.consultation_requests
  drop constraint if exists consultation_requests_confirm_email_status_check,
  drop constraint if exists consultation_requests_details_email_status_check;

alter table public.consultation_requests
  add constraint consultation_requests_confirm_email_status_check
    check (confirm_email_status is null or confirm_email_status in ('sent', 'failed', 'not_configured')),
  add constraint consultation_requests_details_email_status_check
    check (details_email_status is null or details_email_status in ('sent', 'failed', 'not_configured'));

comment on column public.consultation_requests.notify_rfc_message_id is
  'RFC Message-ID of the staff notification as delivered (read back from Resend). The page-two update threads under it.';
comment on column public.consultation_requests.confirm_email_status is
  'Visitor confirmation email: sent / failed / not_configured. Null: not sent (guide, no address, spam trap, or before 2026-10-14).';
comment on column public.consultation_requests.details_email_status is
  'Page-two "Details added" email: sent / failed / not_configured. Null: page two not saved.';
