-- =============================================================================
-- AptFindr — SIGNUP CONFIRMATION EMAIL DIAGNOSTICS (READ-ONLY)
--
-- Symptom: "nakapag-create ng account pero walang dumating na confirmation email"
--          (an account is created, but no verification email ever arrives)
--
-- HOW TO RUN
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file
--   3. Click "Run"
--   4. Read QUERY 1 and QUERY 2 — they show whether Supabase ever handed a
--      confirmation email to a mailer for each account
--
-- This file only SELECTs. It changes nothing.
-- If a query complains that public.app_users does not exist, run the master
-- migration first, then re-run this file.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- QUERY 1 — Newest 25 accounts: was a confirmation email ever sent?
--
-- confirmation_sent_at IS NULL + email_confirmed_at IS NULL
--   => the account exists but Supabase never recorded a confirmation email.
--      This is the case described in the symptom. Go to "WHAT TO FIX" below.
-- confirmation_sent_at has a value
--   => Supabase did hand the mail to its mailer. The problem is then delivery
--      (spam folder, SMTP rejection) — check Authentication → Logs.
-- -----------------------------------------------------------------------------
select
  u.id,
  u.email,
  u.created_at,
  u.confirmation_sent_at,
  u.email_confirmed_at,
  case
    when u.email_confirmed_at is not null then 'CONFIRMED'
    when u.confirmation_sent_at is null  then 'NO CONFIRMATION EMAIL SENT  <-- see WHAT TO FIX'
    else 'EMAIL SENT — NOT CONFIRMED YET'
  end as email_status,
  p.role,
  p.status
from auth.users u
left join public.app_users p on p.auth_id = u.id
order by u.created_at desc
limit 25;


-- -----------------------------------------------------------------------------
-- QUERY 2 — Totals across the whole project
--
-- stuck_unverified > 0 means accounts are being created without any mail.
-- -----------------------------------------------------------------------------
select
  count(*)                                                                          as total_accounts,
  count(*) filter (where confirmation_sent_at is null)                              as never_sent,
  count(*) filter (where confirmation_sent_at is null and email_confirmed_at is null) as stuck_unverified,
  count(*) filter (where confirmation_sent_at is not null and email_confirmed_at is null) as sent_but_unconfirmed,
  count(*) filter (where email_confirmed_at is not null)                            as confirmed
from auth.users;


-- -----------------------------------------------------------------------------
-- QUERY 3 — Signups from the last 24 hours
-- The default Supabase sender is capped at ~2 messages per hour, so a burst of
-- test signups silently stops delivering mail.
-- -----------------------------------------------------------------------------
select
  id,
  email,
  created_at,
  confirmation_sent_at,
  email_confirmed_at
from auth.users
where created_at > now() - interval '24 hours'
order by created_at desc;


-- -----------------------------------------------------------------------------
-- QUERY 4 — Is the signup trigger installed?
-- MISSING => no app_users profile is created when someone registers.
-- -----------------------------------------------------------------------------
select
  coalesce(t.tgname, 'MISSING') as trigger_name,
  coalesce(p.proname, 'MISSING') as function_name
from (select 1) dummy
left join pg_trigger t
  on t.tgrelid = 'auth.users'::regclass
 and t.tgname = 'on_auth_user_created'
 and not t.tgisinternal
left join pg_proc p on p.oid = t.tgfoid;


-- -----------------------------------------------------------------------------
-- QUERY 5 — Auth accounts with no linked profile
-- Rows here mean the profile trigger never completed (or rolled back).
-- -----------------------------------------------------------------------------
select
  u.id,
  u.email,
  u.created_at,
  u.confirmation_sent_at
from auth.users u
left join public.app_users p on p.auth_id = u.id
where p.id is null
order by u.created_at desc
limit 25;


-- =============================================================================
-- WHAT TO FIX (in the Supabase dashboard — the app cannot send auth email)
--
-- Signup mail is sent by Supabase Auth, not by AptFindr. When no email arrives,
-- it is always one of these, in this order:
--
-- 1. CUSTOM SMTP IS NOT CONFIGURED  <-- the usual cause
--    Authentication → Emails → SMTP Settings → enable custom SMTP.
--    Supabase's built-in sender REFUSES every address that is not a member of
--    the project's team ("Email address not authorized"), is capped at ~2
--    messages per hour, and has no delivery SLA. It is development-only.
--    Any provider works: Resend, Postmark, SendGrid, Brevo, AWS SES, ZeptoMail.
--
-- 2. EMAIL CONFIRMATION IS TURNED OFF
--    Authentication → Sign In / Providers → Email → "Confirm email" must be ON.
--    When it is off, signup returns a session immediately and no mail is sent.
--    AptFindr now detects this and says so on the signup confirmation screen.
--
-- 3. REDIRECT URLS ARE NOT ON THE ALLOW LIST
--    Authentication → URL Configuration
--      Site URL            → https://<your-production-domain>
--      Redirect URLs       → https://<your-production-domain>/auth/callback
--                            https://<your-production-domain>/reset-password
--                            http://localhost:5173/**
--                            https://*-<vercel-account-slug>.vercel.app/**
--    Supabase refuses to build a confirmation link for an origin that is not
--    listed. Set the Vercel environment variable VITE_APP_URL to the public
--    origin if the app should always link back to one canonical domain.
--
-- 4. RATE LIMIT / DELIVERY ERRORS — confirm in the logs
--    Authentication → Logs (or Logs → Auth). Look for:
--      "Email address not authorized"        → cause 1
--      "over_email_send_rate_limit" / 429    → cause 1, or raise the limit in
--                                              Authentication → Rate Limits
--      SMTP 5xx / connection refused         → bad SMTP credentials (cause 1)
--
-- 5. EMAIL TEMPLATE
--    Authentication → Emails → "Confirm signup" must be enabled, and its link
--    must use {{ .ConfirmationURL }} (or {{ .RedirectTo }}) so it points at
--    <your-domain>/auth/callback.
--
-- AFTER FIXING: delete the stuck test users (Authentication → Users) and sign up
-- again with a real external address. Existing unverified users can also use
-- "Didn't receive a verification email?" on the AptFindr sign-in page, which
-- calls supabase.auth.resend({ type: 'signup' }).
-- =============================================================================
