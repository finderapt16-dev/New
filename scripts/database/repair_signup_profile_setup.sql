-- =============================================================================
-- AptFindr — SIGNUP REPAIR SCRIPT
-- Fixes: "Account registration could not be completed because profile setup
--         failed. No retry is needed until the database configuration is
--         corrected."  (and the follow-up problem: no verification email is
--         ever sent, because the whole signup transaction rolls back)
--
-- HOW TO RUN
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file
--   3. Click "Run"
--   4. Read the result rows in "PART 1 — DIAGNOSTICS"
--   5. Sign up again in the app (use the same email you tested before)
--
-- ORDER: run your master migration FIRST (if you have not), then run THIS
--        file AFTER it. This file is idempotent — safe to re-run.
--
-- WHAT IT DOES
--   PART 0  Guards: stops with a clear message if the master migration was
--           never run; adds any missing enum values / columns.
--   PART 1  Diagnostics: shows exactly which leftover rows or missing pieces
--           block signup (nothing is deleted or changed here).
--   PART 2  THE FIX: recreates handle_new_auth_user so it ADOPTS stale
--           profiles (rows whose auth.users entry was deleted by hand) instead
--           of raising an error. Re-signup then works WITHOUT manually
--           deleting anything.
--   PART 3  Recreates the email-verification sync trigger.
--   PART 4  Adds get_apartment_detail_access_state() — the app calls this RPC
--           (src/services/apartmentsService.js) but the master migration does
--           not define it.
--   PART 5  Guarded username unique index.
--   PART 6  Final verification report.
--   APPENDIX Optional manual cleanup statements (commented out).
-- =============================================================================

-- Commit the enum/value guards before any function that mentions those values
-- is created (same pattern as the master migration's 00_ENUM_PREFLIGHT).
begin;

-- =============================================================================
-- PART 0 — GUARDS
-- =============================================================================

-- 0.1 The master migration must have been applied first.
do $$
begin
  if to_regclass('public.app_users') is null then
    raise exception 'public.app_users was not found. Run the MASTER migration file first, then run this repair script.';
  end if;
  if to_regclass('auth.users') is null then
    raise exception 'auth.users was not found. Supabase Authentication appears to be missing.';
  end if;
  if to_regclass('public.tenant_profiles') is null
     or to_regclass('public.landlord_profiles') is null
     or to_regclass('public.admin_profiles') is null then
    raise exception 'Role profile tables are missing. Run the MASTER migration file first, then run this repair script.';
  end if;
end $$;

-- 0.2 Enum values (created if the type is brand new, then value-guarded).
do $$
begin
  if to_regtype('public.app_user_role') is null then
    create type public.app_user_role as enum ('tenant', 'landlord', 'admin', 'super_admin');
  end if;
exception when duplicate_object then null;
end $$;

alter type public.app_user_role add value if not exists 'tenant';
alter type public.app_user_role add value if not exists 'super_admin';

-- 0.3 Columns the signup trigger writes. Harmless when they already exist.
alter table public.app_users add column if not exists auth_id uuid;
alter table public.app_users add column if not exists username text;
alter table public.app_users add column if not exists middle_initial text;
alter table public.app_users add column if not exists address text;
alter table public.app_users add column if not exists status text default 'active';
alter table public.app_users add column if not exists mobile text;
alter table public.app_users add column if not exists verification_status text;
alter table public.app_users add column if not exists email_verified boolean not null default false;
alter table public.app_users add column if not exists landlord_status text;
alter table public.app_users add column if not exists permit_number text;
alter table public.app_users add column if not exists signup_source text;
alter table public.app_users add column if not exists preferences jsonb not null default '{}'::jsonb;
alter table public.app_users add column if not exists updated_at timestamptz not null default now();

alter table public.landlord_profiles add column if not exists permit_number text;
alter table public.landlord_profiles add column if not exists business_permit_number text;
alter table public.landlord_profiles add column if not exists is_verified boolean not null default false;
alter table public.landlord_profiles add column if not exists verified_at timestamptz;

alter table public.admin_profiles add column if not exists admin_level text;
alter table public.admin_profiles add column if not exists department text;
alter table public.admin_profiles add column if not exists updated_at timestamptz not null default now();

commit;


-- =============================================================================
-- PART 1 — DIAGNOSTICS (read-only)
-- =============================================================================

-- 1.1 Is the signup trigger installed, and which function does it call?
select
  '1.1 signup trigger' as check_name,
  coalesce(t.tgname, 'MISSING') as trigger_name,
  coalesce(p.proname, 'MISSING') as function_name
from (select 1) dummy
left join pg_trigger t
  on t.tgrelid = 'auth.users'::regclass
 and t.tgname = 'on_auth_user_created'
 and not t.tgisinternal
left join pg_proc p on p.oid = t.tgfoid;

-- 1.2 Stale app_users rows — the usual cause of "profile setup failed".
--     Every row below either has never been linked to Supabase Auth, or its
--     auth.users row was deleted by hand. A signup with the same email or
--     username hits these rows and the OLD trigger raises, rolling back the
--     whole signup (so no verification email is sent either).
--     AFTER PART 2 these rows are adopted automatically — no deletion needed.
select
  '1.2 stale profile blocks signup' as check_name,
  u.id,
  u.username,
  u.email,
  u.role::text as role,
  u.auth_id,
  case
    when u.auth_id is null then 'never linked to Auth (expected for the admin bootstrap rows before first login)'
    else 'auth.users row MISSING — this profile blocks re-signup with the same email/username'
  end as note
from public.app_users u
where u.auth_id is null
   or not exists (select 1 from auth.users au where au.id = u.auth_id)
order by u.role::text, u.email;

-- 1.3 Duplicate emails / usernames (case-insensitive).
select '1.3 duplicate email' as check_name, lower(u.email) as key_value, count(*) as copies
from public.app_users u
group by lower(u.email)
having count(*) > 1;

select '1.3 duplicate username' as check_name, lower(u.username) as key_value, count(*) as copies
from public.app_users u
where u.username is not null
group by lower(u.username)
having count(*) > 1;

-- 1.4 Auth users with no application profile, and mislinked profiles.
select '1.4 auth user without profile' as check_name,
       au.id as auth_id, au.email, au.created_at
from auth.users au
where au.email is not null
  and not exists (select 1 from public.app_users u where u.auth_id = au.id)
  and not exists (select 1 from public.app_users u where lower(u.email) = lower(au.email))
order by au.created_at desc;

select '1.4 email mislinked' as check_name,
       au.id as auth_id, au.email, u.id as app_user_id, u.auth_id as app_auth_id
from auth.users au
join public.app_users u on lower(u.email) = lower(au.email)
where u.auth_id is distinct from au.id;

-- 1.5 Enum values present on app_user_role.
select '1.5 app_user_role values' as check_name, e.enumlabel as value_name
from pg_enum e
where e.enumtypid = 'public.app_user_role'::regtype
order by e.enumsortorder;

-- 1.6 Key functions: PRESENT = installed by the master migration.
--     get_apartment_detail_access_state is added by PART 4 below.
select
  '1.6 key functions' as check_name,
  req.proname,
  case when exists (
    select 1 from pg_proc f
    where f.proname = req.proname
      and f.pronamespace = 'public'::regnamespace
  ) then 'PRESENT' else 'MISSING' end as status
from (values
  ('handle_new_auth_user'),
  ('sync_auth_email_verification'),
  ('current_app_user_id'),
  ('current_user_is_admin'),
  ('apartment_is_tenant_visible'),
  ('fn_resolve_username_login'),
  ('get_apartment_detail_access_state')
) as req(proname)
order by req.proname;


-- =============================================================================
-- PART 2 — THE FIX: resilient handle_new_auth_user
-- =============================================================================
-- Differences from the old trigger:
--   * It ADOPTS a stale profile instead of raising:
--       - same email, and the profile's auth_id is NULL or its auth.users row
--         was deleted  -> the new Auth user takes over that profile;
--       - same username on a stale tenant/landlord profile with a different
--         email -> adopted as well.
--   * A dead tenant/landlord row that holds the wanted username (but a
--     different email) is moved aside to a generated username so the signup
--     can continue. Its data is kept — nothing is deleted.
--   * A profile that still belongs to a LIVE Auth user is never stolen:
--     those cases raise the same clear errors as before.
--   * Admin/Super Admin bootstrap rows keep their role, name and username.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', ''));
  v_requested_username text := lower(nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''));
  v_role public.app_user_role;
  v_username text;
  v_name text;
  v_user_id uuid;
  v_existing_id uuid;
  v_existing_role public.app_user_role;
  v_existing_username text;
begin
  if new.email is null then
    raise exception 'Email is required to create a profile.';
  end if;

  -- 1) Profile already linked to this exact Auth user (safe re-entry).
  select id, role, username
  into v_existing_id, v_existing_role, v_existing_username
  from public.app_users
  where auth_id = new.id
  limit 1;

  -- 2) Adopt a stale profile that already owns this email:
  --    auth_id was never set, or the auth.users row it pointed to was
  --    deleted manually. Nobody can ever sign in through it again.
  if v_existing_id is null then
    select u.id, u.role, u.username
    into v_existing_id, v_existing_role, v_existing_username
    from public.app_users u
    where lower(u.email) = lower(new.email)
      and (u.auth_id is null
           or not exists (select 1 from auth.users au where au.id = u.auth_id))
    limit 1;
  end if;

  -- 3) Adopt a stale NON-ADMIN profile that holds this username. Admin
  --    profiles are deliberately excluded here: they may only be linked by
  --    their own bootstrap email, never by a typed username.
  if v_existing_id is null and v_requested_username is not null then
    select u.id, u.role, u.username
    into v_existing_id, v_existing_role, v_existing_username
    from public.app_users u
    where lower(u.username) = v_requested_username
      and u.role::text not in ('admin', 'super_admin')
      and (u.auth_id is null
           or not exists (select 1 from auth.users au where au.id = u.auth_id))
    limit 1;
  end if;

  -- Role: an adopted profile keeps its original role (legacy student /
  -- employee rows are normalized to tenant, like the master migration does).
  -- New public signups may only be tenant or landlord — a client cannot
  -- request admin this way.
  if v_existing_id is not null then
    v_role := case
      when v_existing_role::text in ('student', 'employee')
        then 'tenant'::public.app_user_role
      else v_existing_role
    end;
  elsif v_requested_role = 'tenant' then
    v_role := 'tenant'::public.app_user_role;
  elsif v_requested_role = 'landlord' then
    v_role := 'landlord'::public.app_user_role;
  else
    raise exception 'Public signup role must be tenant or landlord';
  end if;

  -- Username: prefer the username the user just typed, except for
  -- admin/super_admin profiles whose bootstrap username must be preserved.
  if v_existing_role in ('admin', 'super_admin') then
    v_username := v_existing_username;
  else
    v_username := coalesce(v_requested_username, v_existing_username);
    if v_username is null or v_username !~ '^[a-z0-9_]{4,30}$' then
      v_username := v_existing_username;
    end if;
  end if;

  if v_username is null or v_username !~ '^[a-z0-9_]{4,30}$' then
    raise exception 'A valid username is required (4-30 letters, numbers, or underscores).';
  end if;

  -- Username uniqueness. If a DEAD profile (auth user deleted) with a
  -- different email squats on the wanted username, move it aside to a
  -- generated username instead of failing the signup. Nothing is deleted.
  if exists (
    select 1
    from public.app_users u
    where lower(u.username) = lower(v_username)
      and u.id is distinct from v_existing_id
      and u.auth_id is distinct from new.id
  ) then
    update public.app_users dead
    set username = 'user_' || substr(replace(dead.id::text, '-', ''), 1, 12),
        updated_at = now()
    where lower(dead.username) = lower(v_username)
      and dead.id is distinct from v_existing_id
      and dead.role::text not in ('admin', 'super_admin')
      and (dead.auth_id is null
           or not exists (select 1 from auth.users au where au.id = dead.auth_id))
      and not exists (
        select 1 from public.app_users taken
        where lower(taken.username) =
              'user_' || substr(replace(dead.id::text, '-', ''), 1, 12)
      );

    if exists (
      select 1
      from public.app_users u
      where lower(u.username) = lower(v_username)
        and u.id is distinct from v_existing_id
        and u.auth_id is distinct from new.id
    ) then
      raise exception 'Username is already in use';
    end if;
  end if;

  -- A LIVE application profile (still reachable through a real Auth user)
  -- already owns this email — never steal it.
  if exists (
    select 1
    from public.app_users u
    where lower(u.email) = lower(new.email)
      and u.id is distinct from v_existing_id
      and u.auth_id is not null
      and exists (select 1 from auth.users au where au.id = u.auth_id)
  ) then
    raise exception 'An application profile already exists for this email';
  end if;

  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    v_username,
    split_part(coalesce(new.email, ''), '@', 1),
    'User'
  );

  if v_existing_id is not null then
    -- Adopt / refresh the existing profile for this Auth user.
    update public.app_users
    set auth_id = new.id,
        email = lower(new.email),
        username = v_username,
        role = v_role,
        -- Keep the name already on the profile (important for the admin
        -- bootstrap rows); only fill it when the stored name is empty.
        name = case
          when nullif(trim(name), '') is not null then name
          else coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), name)
        end,
        email_verified = new.email_confirmed_at is not null,
        verification_status = case
          when new.email_confirmed_at is null then 'pending_email_verification'
          else 'email_verified'
        end,
        permit_number = case
          when role = 'landlord'
            then coalesce(nullif(trim(permit_number), ''),
                          nullif(trim(new.raw_user_meta_data ->> 'permitNumber'), ''))
          else permit_number
        end,
        updated_at = now()
    where id = v_existing_id
    returning id into v_user_id;
  else
    insert into public.app_users (
      auth_id, username, email, name, role, status, mobile, middle_initial, address,
      is_verified, email_verified, verification_status, permit_number, signup_source
    )
    values (
      new.id,
      v_username,
      lower(new.email),
      v_name,
      v_role,
      case when v_role = 'landlord' then 'pending' else 'active' end,
      nullif(new.raw_user_meta_data ->> 'mobile', ''),
      nullif(new.raw_user_meta_data ->> 'middleInitial', ''),
      nullif(new.raw_user_meta_data ->> 'address', ''),
      v_role <> 'landlord',
      new.email_confirmed_at is not null,
      case
        when new.email_confirmed_at is null then 'pending_email_verification'
        else 'email_verified'
      end,
      case
        when v_role = 'landlord'
          then nullif(new.raw_user_meta_data ->> 'permitNumber', '')
        else null
      end,
      'web'
    )
    returning id into v_user_id;
  end if;

  -- Role-specific profile rows.
  if v_role = 'tenant' then
    insert into public.tenant_profiles (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;

  elsif v_role = 'landlord' then
    insert into public.landlord_profiles (
      user_id, permit_number, business_permit_number, is_verified
    )
    values (
      v_user_id,
      nullif(new.raw_user_meta_data ->> 'permitNumber', ''),
      nullif(new.raw_user_meta_data ->> 'permitNumber', ''),
      false
    )
    on conflict (user_id) do update set
      permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
      business_permit_number = coalesce(
        landlord_profiles.business_permit_number,
        excluded.business_permit_number
      );

  elsif v_role in ('admin', 'super_admin') then
    insert into public.admin_profiles (user_id, admin_level, department)
    values (
      v_user_id,
      case when v_role = 'super_admin' then 'Super Administrator' else 'Full Administrator' end,
      'Platform Administration'
    )
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

-- Install as the INSERT-only Auth trigger (replaces any older version).
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();


-- =============================================================================
-- PART 3 — Email verification sync trigger
-- =============================================================================
-- When the user clicks the confirmation link, auth.users.email_confirmed_at is
-- set; this keeps app_users.email_verified / verification_status in sync.

create or replace function public.sync_auth_email_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_users
  set email_verified = new.email_confirmed_at is not null,
      verification_status = case
        when new.email_confirmed_at is null then 'pending_email_verification'
        else 'email_verified'
      end,
      updated_at = now()
  where auth_id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_verified on auth.users;
create trigger on_auth_user_email_verified
  after update of email_confirmed_at on auth.users
  for each row
  when (old.email_confirmed_at is distinct from new.email_confirmed_at)
  execute function public.sync_auth_email_verification();


-- =============================================================================
-- PART 4 — Missing RPC used by the app
-- =============================================================================
-- src/services/apartmentsService.js calls
--   rpc('get_apartment_detail_access_state', { p_apartment_id })
-- when the listing is not visible to the caller. The master migration does
-- not define this function, so the apartment detail page would fail with
-- "Unable to confirm apartment availability." for hidden/unpublished
-- listings.

create or replace function public.get_apartment_detail_access_state(p_apartment_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when a.deleted_at is not null then 'not_found'
        when public.current_user_is_admin()
          or a.landlord_id = public.current_app_user_id() then 'accessible'
        when public.apartment_is_tenant_visible(a.id) then 'accessible'
        else 'unavailable'
      end
      from public.apartments a
      where a.id = p_apartment_id
    ),
    'not_found'
  );
$$;

revoke all on function public.get_apartment_detail_access_state(uuid) from public;
grant execute on function public.get_apartment_detail_access_state(uuid)
  to anon, authenticated, service_role;

-- Keep the helpers this RPC and the RLS policies depend on executable by the
-- roles that need them (notices instead of errors when the master migration
-- has not defined them yet).
do $$
begin
  begin
    grant execute on function public.apartment_is_tenant_visible(uuid)
      to anon, authenticated, service_role;
  exception when undefined_function then
    raise notice 'apartment_is_tenant_visible(uuid) not found — run the master migration.';
  end;
  begin
    grant execute on function public.current_app_user_id()
      to anon, authenticated, service_role;
  exception when undefined_function then
    raise notice 'current_app_user_id() not found — run the master migration.';
  end;
  begin
    grant execute on function public.current_user_is_admin()
      to anon, authenticated, service_role;
  exception when undefined_function then
    raise notice 'current_user_is_admin() not found — run the master migration.';
  end;
end $$;


-- =============================================================================
-- PART 5 — Username unique index (guarded)
-- =============================================================================
-- Skips (with a NOTICE) instead of failing if legacy duplicate usernames
-- exist; Part 1.3 reports those rows.

do $$
begin
  if not exists (
    select 1
    from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = 'app_users_username_unique'
      and n.nspname = 'public'
      and i.indisunique
  ) then
    begin
      create unique index app_users_username_unique
        on public.app_users (lower(username))
        where username is not null;
    exception when unique_violation then
      raise notice 'Skipped app_users_username_unique: duplicate usernames exist. See check 1.3.';
    end;
  end if;
end $$;


-- =============================================================================
-- PART 6 — FINAL VERIFICATION
-- =============================================================================

select
  '6. signup trigger installed' as check_name,
  coalesce(
    (select p.proname
     from pg_trigger t join pg_proc p on p.oid = t.tgfoid
     where t.tgrelid = 'auth.users'::regclass
       and t.tgname = 'on_auth_user_created'
       and not t.tgisinternal),
    'MISSING'
  ) as function_name;

select
  '6. functions' as check_name,
  req.proname,
  case when exists (
    select 1 from pg_proc f
    where f.proname = req.proname
      and f.pronamespace = 'public'::regnamespace
  ) then 'PRESENT' else 'MISSING' end as status
from (values
  ('handle_new_auth_user'),
  ('sync_auth_email_verification'),
  ('get_apartment_detail_access_state')
) as req(proname)
order by req.proname;

select
  '6. anon can execute apartment access RPC' as check_name,
  has_function_privilege('anon', 'public.get_apartment_detail_access_state(uuid)', 'execute') as granted;


-- =============================================================================
-- APPENDIX — OPTIONAL MANUAL CLEANUP
-- =============================================================================
-- You do NOT need this: after PART 2, stale rows are adopted automatically on
-- the next signup with the same email/username. Only run the statements below
-- if you explicitly want to destroy dead profiles (their favorites, reports
-- and history are removed with them). ALWAYS add a WHERE clause limiting it
-- to one specific email first.
--
-- -- Preview what a cleanup would remove:
-- select id, username, email, role::text
-- from public.app_users u
-- where (u.auth_id is null
--        or not exists (select 1 from auth.users au where au.id = u.auth_id))
--   and u.role::text in ('tenant', 'landlord')
--   and u.email = 'CHANGE-ME@example.com'
--   and not exists (select 1 from public.apartments a where a.landlord_id = u.id)
--   and not exists (select 1 from public.favorites f where f.user_id = u.id)
--   and not exists (select 1 from public.reports r
--                   where r.reporter_id = u.id or r.user_id = u.id);
--
-- -- Then delete exactly those rows:
-- -- delete from public.app_users u where u.id in ( ...same select... );
--
-- =============================================================================
-- AFTER RUNNING THIS SCRIPT
--   1. In the browser, sign out / clear site data.
--   2. Sign up again with the SAME email + username you tested before.
--      Expected: "Account created. A verification link was requested for ...".
--   3. Check the inbox AND spam folder for the Supabase confirmation email.
--   4. If signup still fails: Supabase Dashboard → Logs → Auth, filter around
--      the signup time — the exact database error is logged there. Also
--      re-run PART 1 of this file and check for rows.
--   5. Email not arriving after a SUCCESSFUL signup?
--      → Dashboard → Authentication → Providers → Email: "Confirm email"
--        must be ON (this app requires it).
--      → Dashboard → Authentication → Email Templates: confirm-signup
--        template enabled.
--      → Free projects use Supabase's built-in SMTP with rate limits; a few
--        signups per hour is normal to hit. Wait and use "Resend
--        Verification Email" on the sign-in page.
-- =============================================================================
