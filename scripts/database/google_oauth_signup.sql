-- =============================================================================
-- AptFindr — GOOGLE SIGN-IN SUPPORT ("Continue with Google")
--
-- WHY THIS SCRIPT IS NEEDED
--   The first time someone uses "Continue with Google", Supabase Auth inserts a
--   row into auth.users. That fires on_auth_user_created, and the version of
--   handle_new_auth_user() from the master migration / signup repair script
--   raises 'Public signup role must be tenant or landlord', because Google
--   sends no AptFindr role or username. Supabase then cancels the whole
--   sign-in and sends the person back with
--       error_description=Database error saving new user
--   Existing AptFindr accounts are not affected: Supabase links Google to the
--   existing Auth user with the same verified email, so no new auth.users row
--   is inserted and the trigger does not run.
--
-- WHAT IT CHANGES
--   PART 0  Guards: stops early if the master migration was never applied.
--   PART 1  fn_generate_unique_username(): builds a valid, unused username for
--           accounts that never typed one (Google sign-ups).
--   PART 2  handle_new_auth_user(): email/password sign-ups behave exactly as
--           before. A brand-new Google user no longer makes the trigger fail:
--           the Auth user is created WITHOUT an app profile, and the profile is
--           created once the person chooses Tenant or Landlord (PART 3).
--           Stale profiles that already own the email are still adopted.
--   PART 3  fn_complete_oauth_signup(): called by the app's /auth/callback page
--           after a new Google user chooses Tenant or Landlord and accepts the
--           terms. Creates app_users plus the role profile. It can never create
--           an admin, and it never changes the role of an existing profile.
--   PART 4  Verification report.
--
-- HOW TO RUN
--   Supabase Dashboard → SQL Editor → New query → paste this ENTIRE file → Run.
--   Run it AFTER master_migration_complete.sql (and after
--   repair_signup_profile_setup.sql if you use it). Idempotent — safe to re-run.
--   Re-running the master migration or the repair script later puts back the
--   old trigger; run this file again afterwards.
-- =============================================================================

-- Commit the guards before any function that mentions the enum values is
-- created (same pattern as the signup repair script).
begin;

-- =============================================================================
-- PART 0 — GUARDS
-- =============================================================================

do $$
begin
  if to_regclass('public.app_users') is null then
    raise exception 'public.app_users was not found. Run the MASTER migration file first, then run this script.';
  end if;
  if to_regclass('auth.users') is null then
    raise exception 'auth.users was not found. Supabase Authentication appears to be missing.';
  end if;
  if to_regclass('public.tenant_profiles') is null
     or to_regclass('public.landlord_profiles') is null
     or to_regclass('public.admin_profiles') is null then
    raise exception 'Role profile tables are missing. Run the MASTER migration file first, then run this script.';
  end if;
end $$;

do $$
begin
  if to_regtype('public.app_user_role') is null then
    create type public.app_user_role as enum ('tenant', 'landlord', 'admin', 'super_admin');
  end if;
exception when duplicate_object then null;
end $$;

alter type public.app_user_role add value if not exists 'tenant';
alter type public.app_user_role add value if not exists 'super_admin';

-- Columns written below. Harmless when they already exist.
alter table public.app_users add column if not exists auth_id uuid;
alter table public.app_users add column if not exists username text;
alter table public.app_users add column if not exists middle_initial text;
alter table public.app_users add column if not exists address text;
alter table public.app_users add column if not exists status text default 'active';
alter table public.app_users add column if not exists mobile text;
alter table public.app_users add column if not exists verification_status text;
alter table public.app_users add column if not exists email_verified boolean not null default false;
alter table public.app_users add column if not exists permit_number text;
alter table public.app_users add column if not exists signup_source text;
alter table public.app_users add column if not exists updated_at timestamptz not null default now();

alter table public.landlord_profiles add column if not exists permit_number text;
alter table public.landlord_profiles add column if not exists business_permit_number text;
alter table public.landlord_profiles add column if not exists is_verified boolean not null default false;

alter table public.admin_profiles add column if not exists admin_level text;
alter table public.admin_profiles add column if not exists department text;

commit;


-- =============================================================================
-- PART 1 — USERNAMES FOR ACCOUNTS THAT NEVER TYPED ONE
-- =============================================================================
-- "Juan.Dela-Cruz+rent@gmail.com" -> "juan_dela_cruz_rent" (or, when taken,
-- "juan_dela_cruz_rent_4821"). Always matches ^[a-z0-9_]{4,30}$, which is what
-- the app_users username check and username sign-in expect.

create or replace function public.fn_generate_unique_username(
  p_email text,
  p_seed uuid default null
)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_base text;
  v_candidate text;
  v_attempt int := 0;
begin
  v_base := lower(split_part(coalesce(p_email, ''), '@', 1));
  v_base := regexp_replace(v_base, '[^a-z0-9_]+', '_', 'g');
  v_base := regexp_replace(v_base, '_{2,}', '_', 'g');
  v_base := trim(both '_' from left(trim(both '_' from v_base), 24));

  if length(v_base) < 4 then
    v_base := trim(trailing '_' from left('user_' || v_base, 24));
  end if;

  v_candidate := v_base;
  while exists (
    select 1 from public.app_users u where lower(u.username) = v_candidate
  ) loop
    v_attempt := v_attempt + 1;
    if v_attempt > 25 then
      v_candidate := 'user_' || substr(replace(coalesce(p_seed, gen_random_uuid())::text, '-', ''), 1, 12);
      if exists (select 1 from public.app_users u where lower(u.username) = v_candidate) then
        v_candidate := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 20);
      end if;
      return v_candidate;
    end if;
    v_candidate := v_base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
  end loop;

  return v_candidate;
end;
$$;

-- Internal helper: only the SECURITY DEFINER functions below call it.
revoke all on function public.fn_generate_unique_username(text, uuid) from public;
revoke all on function public.fn_generate_unique_username(text, uuid) from anon, authenticated;


-- =============================================================================
-- PART 2 — AUTH TRIGGER THAT ALLOWS GOOGLE SIGN-UPS
-- =============================================================================
-- Identical to the repair-script version for email/password sign-ups. The only
-- differences are the two blocks marked "Google / social sign-in".

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested_role text := lower(coalesce(new.raw_user_meta_data ->> 'role', ''));
  v_requested_username text := lower(nullif(trim(coalesce(new.raw_user_meta_data ->> 'username', '')), ''));
  -- 'email' for email/password sign-ups; 'google' for "Continue with Google".
  v_provider text := lower(coalesce(nullif(new.raw_app_meta_data ->> 'provider', ''), 'email'));
  v_is_social boolean;
  v_role public.app_user_role;
  v_username text;
  v_name text;
  v_user_id uuid;
  v_existing_id uuid;
  v_existing_role public.app_user_role;
  v_existing_username text;
begin
  v_is_social := v_provider not in ('email', 'phone');

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

  -- Google / social sign-in by a brand-new person: the provider sends no
  -- AptFindr role or username. Create the Auth user WITHOUT an application
  -- profile; the app finishes it through fn_complete_oauth_signup() once the
  -- person chooses Tenant or Landlord and accepts the terms.
  if v_existing_id is null
     and v_is_social
     and v_requested_role not in ('tenant', 'landlord') then
    return new;
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

  -- Google / social sign-in never types a username: generate one instead of
  -- failing (only reached when a profile is adopted or a role was supplied).
  if v_is_social and (v_username is null or v_username !~ '^[a-z0-9_]{4,30}$') then
    v_username := public.fn_generate_unique_username(new.email, new.id);
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
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
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
      case when v_is_social then v_provider else 'web' end
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
-- PART 3 — FINISH A GOOGLE SIGN-UP (called by /auth/callback)
-- =============================================================================
-- Runs as the signed-in user (auth.uid()). Messages raised with the default
-- SQLSTATE (P0001) are shown to the person as-is by the app; 42501 means the
-- sign-in itself is missing or no longer valid.

drop function if exists public.fn_complete_oauth_signup(text, boolean, boolean, text, text, text, text);

create function public.fn_complete_oauth_signup(
  p_role text,
  p_terms_accepted boolean,
  p_landlord_verification_accepted boolean default false,
  p_name text default null,
  p_mobile text default null,
  p_address text default null,
  p_permit_number text default null
)
returns public.app_users
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_auth_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_metadata jsonb;
  v_provider text;
  v_role public.app_user_role;
  v_profile public.app_users;
  v_username text;
  v_name text;
  v_attempt int;
  v_given_name text := nullif(trim(coalesce(p_name, '')), '');
  v_mobile text := nullif(trim(coalesce(p_mobile, '')), '');
  v_address text := nullif(trim(coalesce(p_address, '')), '');
  v_permit text := nullif(trim(coalesce(p_permit_number, '')), '');
begin
  if v_auth_id is null then
    raise exception 'Sign in with Google again to finish creating your account.'
      using errcode = '42501';
  end if;

  -- One completion at a time per person (double clicks, two open tabs).
  perform pg_advisory_xact_lock(hashtext('fn_complete_oauth_signup:' || v_auth_id::text));

  select lower(nullif(trim(au.email), '')),
         au.email_confirmed_at,
         coalesce(au.raw_user_meta_data, '{}'::jsonb),
         lower(coalesce(nullif(au.raw_app_meta_data ->> 'provider', ''), 'email'))
  into v_email, v_email_confirmed_at, v_metadata, v_provider
  from auth.users au
  where au.id = v_auth_id;

  if not found then
    raise exception 'Your sign-in is no longer valid. Sign in with Google again.'
      using errcode = '42501';
  end if;

  if v_email is null then
    raise exception 'Your Google account did not share an email address, so an AptFindr account cannot be created.';
  end if;

  if v_email_confirmed_at is null then
    raise exception 'Verify your email address before finishing your AptFindr account.';
  end if;

  -- Already finished (another tab, a retry, or an account that already had a
  -- profile): return it unchanged. The role of an existing profile is never
  -- changed here.
  select * into v_profile from public.app_users where auth_id = v_auth_id limit 1;
  if found then
    return v_profile;
  end if;

  v_role := case lower(trim(coalesce(p_role, '')))
    when 'tenant' then 'tenant'::public.app_user_role
    when 'landlord' then 'landlord'::public.app_user_role
    else null
  end;

  if v_role is null then
    raise exception 'Choose Tenant or Landlord to finish creating your account.';
  end if;

  if coalesce(p_terms_accepted, false) is not true then
    raise exception 'You must agree to the Terms of Use and Privacy Policy to continue.';
  end if;

  if v_role = 'landlord' then
    if coalesce(p_landlord_verification_accepted, false) is not true then
      raise exception 'You must agree to the Terms of Use and Landlord Verification Policy to continue.';
    end if;
    if v_given_name is null then
      raise exception 'Full name is required.';
    end if;
    if v_mobile is null then
      raise exception 'Mobile number is required.';
    end if;
    if v_address is null then
      raise exception 'Home address is required.';
    end if;
    if v_permit is null then
      raise exception 'Business permit number is required.';
    end if;
  else
    -- Tenants are not asked for landlord details.
    v_mobile := null;
    v_address := null;
    v_permit := null;
  end if;

  if length(coalesce(v_given_name, '')) > 120
     or length(coalesce(v_mobile, '')) > 32
     or length(coalesce(v_address, '')) > 300
     or length(coalesce(v_permit, '')) > 80 then
    raise exception 'One of the details is too long. Shorten it and try again.';
  end if;

  -- Never take over a profile that still belongs to another live Auth user.
  if exists (
    select 1
    from public.app_users u
    where lower(u.email) = v_email
      and u.auth_id is not null
      and u.auth_id <> v_auth_id
      and exists (select 1 from auth.users au where au.id = u.auth_id)
  ) then
    raise exception 'An AptFindr account already uses this email. Sign in with your username and password instead.';
  end if;

  -- A stale profile with this email (never linked, or its Auth user was
  -- deleted) is adopted — the same rule handle_new_auth_user() applies. It
  -- keeps its own role.
  select * into v_profile
  from public.app_users u
  where lower(u.email) = v_email
    and (u.auth_id is null
         or not exists (select 1 from auth.users au where au.id = u.auth_id))
  limit 1;

  if found then
    update public.app_users
    set auth_id = v_auth_id,
        email = v_email,
        email_verified = true,
        verification_status = 'email_verified',
        updated_at = now()
    where id = v_profile.id
    returning * into v_profile;
  else
    v_name := left(coalesce(
      v_given_name,
      nullif(trim(v_metadata ->> 'full_name'), ''),
      nullif(trim(v_metadata ->> 'name'), ''),
      split_part(v_email, '@', 1),
      'User'
    ), 120);

    for v_attempt in 1..3 loop
      v_username := public.fn_generate_unique_username(v_email, v_auth_id);
      begin
        insert into public.app_users (
          auth_id, username, email, name, role, status, mobile, address,
          is_verified, email_verified, verification_status, permit_number, signup_source
        )
        values (
          v_auth_id,
          v_username,
          v_email,
          v_name,
          v_role,
          case when v_role = 'landlord' then 'pending' else 'active' end,
          v_mobile,
          v_address,
          v_role <> 'landlord',
          true,
          'email_verified',
          v_permit,
          case when v_provider in ('email', 'phone') then 'web' else v_provider end
        )
        returning * into v_profile;
        exit;
      exception when unique_violation then
        -- Someone took the generated username a moment ago; pick another.
        if v_attempt >= 3 then
          raise exception 'We could not finish creating your account. Please try again.';
        end if;
      end;
    end loop;
  end if;

  -- Role-specific profile row (same shape as handle_new_auth_user()).
  if v_profile.role = 'tenant' then
    insert into public.tenant_profiles (user_id)
    values (v_profile.id)
    on conflict (user_id) do nothing;

  elsif v_profile.role = 'landlord' then
    insert into public.landlord_profiles (
      user_id, permit_number, business_permit_number, is_verified
    )
    values (v_profile.id, v_permit, v_permit, false)
    on conflict (user_id) do update set
      permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
      business_permit_number = coalesce(
        landlord_profiles.business_permit_number,
        excluded.business_permit_number
      );

  elsif v_profile.role in ('admin', 'super_admin') then
    insert into public.admin_profiles (user_id, admin_level, department)
    values (
      v_profile.id,
      case when v_profile.role = 'super_admin' then 'Super Administrator' else 'Full Administrator' end,
      'Platform Administration'
    )
    on conflict (user_id) do nothing;
  end if;

  -- Keep the same record an email sign-up leaves in user_metadata (role,
  -- username and the terms acceptance) so both kinds of account look alike.
  begin
    update auth.users
    set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_strip_nulls(
      jsonb_build_object(
        'role', v_profile.role::text,
        'username', v_profile.username,
        'termsAccepted', true,
        'landlordVerificationAccepted', case when v_profile.role = 'landlord' then true end,
        'termsAcceptedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      )
    )
    where id = v_auth_id;
  exception when insufficient_privilege then
    raise warning 'fn_complete_oauth_signup: could not record the terms acceptance in auth.users metadata.';
  end;

  return v_profile;
end;
$$;

revoke all on function public.fn_complete_oauth_signup(text, boolean, boolean, text, text, text, text) from public;
revoke all on function public.fn_complete_oauth_signup(text, boolean, boolean, text, text, text, text) from anon;
grant execute on function public.fn_complete_oauth_signup(text, boolean, boolean, text, text, text, text) to authenticated;

-- Let the Supabase API (PostgREST) see the new function right away.
notify pgrst, 'reload schema';


-- =============================================================================
-- PART 4 — VERIFICATION
-- =============================================================================

select
  '4. signup trigger installed' as check_name,
  coalesce(
    (select p.proname
     from pg_trigger t join pg_proc p on p.oid = t.tgfoid
     where t.tgrelid = 'auth.users'::regclass
       and t.tgname = 'on_auth_user_created'
       and not t.tgisinternal),
    'MISSING'
  ) as function_name;

select
  '4. functions' as check_name,
  req.proname,
  case when exists (
    select 1 from pg_proc f
    where f.proname = req.proname
      and f.pronamespace = 'public'::regnamespace
  ) then 'PRESENT' else 'MISSING' end as status
from (values
  ('handle_new_auth_user'),
  ('fn_generate_unique_username'),
  ('fn_complete_oauth_signup')
) as req(proname)
order by req.proname;

select
  '4. signed-in users can finish a Google sign-up' as check_name,
  has_function_privilege(
    'authenticated',
    'public.fn_complete_oauth_signup(text, boolean, boolean, text, text, text, text)',
    'execute'
  ) as granted;

select
  '4. Google users who have not chosen Tenant/Landlord yet' as check_name,
  count(*) as users
from auth.users au
where lower(coalesce(au.raw_app_meta_data ->> 'provider', 'email')) not in ('email', 'phone')
  and not exists (select 1 from public.app_users u where u.auth_id = au.id);

-- =============================================================================
-- AFTER RUNNING THIS SCRIPT
--   1. Enable Google in Supabase → Authentication → Sign In / Providers (see
--      the README section "Google sign-in").
--   2. Click "Continue with Google" in the app. New accounts are asked to
--      choose Tenant or Landlord before their AptFindr profile is created.
-- =============================================================================
