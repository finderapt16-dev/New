create extension if not exists pgcrypto;

begin;

do $$ begin
  create type public.app_user_role as enum (
    'tenant',
    'landlord',
    'admin',
    'super_admin'
  );
exception when duplicate_object then null;
end $$;

alter type public.app_user_role add value if not exists 'tenant';
alter type public.app_user_role add value if not exists 'super_admin';

do $$ begin
  create type public.report_status as enum ('pending', 'resolved', 'dismissed');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.report_severity as enum ('low', 'med', 'high');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.auth_event_type as enum (
    'sign_up', 'sign_in', 'sign_out', 'password_reset', 'verify_landlord'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.violation_mode as enum ('violation', 'notice');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.appeal_status as enum (
    'pending',
    'under_review',
    'needs_information',
    'approved',
    'rejected',
    'dismissed'
  );
exception when duplicate_object then null;
end $$;

alter type public.appeal_status add value if not exists 'needs_information';
alter type public.appeal_status add value if not exists 'dismissed';

commit;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid unique,
  legacy_id text unique,
  username text,
  email text not null unique,
  name text not null,
  middle_initial text,
  address text,
  role public.app_user_role not null,
  status text not null default 'active',
  mobile text,
  avatar_url text,
  bio text,
  language text not null default 'en',
  timezone text not null default 'Asia/Manila',
  is_verified boolean not null default false,
  email_verified boolean not null default false,
  verification_status text,
  landlord_status text,
  permit_number text,
  department text,
  admin_level text,
  signup_source text,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_users add column if not exists auth_id uuid;
alter table public.app_users add column if not exists legacy_id text;
alter table public.app_users add column if not exists username text;
alter table public.app_users add column if not exists middle_initial text;
alter table public.app_users add column if not exists address text;
alter table public.app_users add column if not exists status text default 'active';
alter table public.app_users add column if not exists verification_status text;
alter table public.app_users add column if not exists email_verified boolean not null default false;
alter table public.app_users add column if not exists landlord_status text;
alter table public.app_users add column if not exists permit_number text;
alter table public.app_users add column if not exists department text;
alter table public.app_users add column if not exists admin_level text;
alter table public.app_users add column if not exists signup_source text;
alter table public.app_users add column if not exists preferences jsonb not null default '{}'::jsonb;

with normalized as (
  select
    id,
    lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) as base_username
  from public.app_users
  where username is null
),
unique_bases as (
  select base_username
  from normalized
  where base_username ~ '^[a-z0-9_]{4,30}$'
  group by base_username
  having count(*) = 1
)
update public.app_users app_user
set username = normalized.base_username
from normalized
join unique_bases using (base_username)
where app_user.id = normalized.id
  and app_user.username is null
  and not exists (
    select 1
    from public.app_users existing
    where existing.username is not null
      and lower(existing.username) = normalized.base_username
      and existing.id <> app_user.id
  );

update public.app_users
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
where username is null;

alter table public.app_users drop constraint if exists app_users_username_format_check;
alter table public.app_users add constraint app_users_username_format_check
check (
  username is null
  or username ~ '^[A-Za-z0-9_]{4,30}$'
);

alter table public.app_users drop column if exists password;

create unique index if not exists app_users_legacy_id_key on public.app_users (legacy_id) where legacy_id is not null;
create unique index if not exists app_users_username_unique
  on public.app_users (lower(username))
  where username is not null;
create index if not exists idx_app_users_username on public.app_users (username);
create index if not exists idx_app_users_role on public.app_users (role);
create index if not exists idx_app_users_email on public.app_users (email);
create index if not exists idx_app_users_status on public.app_users (status);
create index if not exists idx_app_users_legacy on public.app_users (legacy_id);

create table if not exists public.signups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users (id) on delete cascade,
  auth_id uuid,
  email text,
  role public.app_user_role,
  source text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.logins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users (id) on delete cascade,
  auth_id uuid,
  event public.auth_event_type not null,
  success boolean not null default true,
  user_agent text,
  ip text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tenant_profiles (
  user_id uuid primary key references public.app_users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.landlord_profiles (
  user_id uuid primary key references public.app_users (id) on delete cascade,
  permit_number text,
  business_permit_number text,
  verified_at timestamptz,
  verification_document_url text,
  id_document_url text,
  is_verified boolean not null default false,
  organization text,
  business_name text,
  tin_number text,
  id_type text,
  id_number text,
  permit_expiry date,
  business_type text,
  years_active int,
  total_units int,
  service_areas text,
  deposit_months int,
  advance_months int,
  min_lease_months int,
  pet_policy text,
  smoking_policy text,
  maintenance_response_hours int,
  listing_visibility text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.landlord_profiles add column if not exists business_name text;
alter table public.landlord_profiles add column if not exists tin_number text;
alter table public.landlord_profiles add column if not exists id_type text;
alter table public.landlord_profiles add column if not exists id_number text;
alter table public.landlord_profiles add column if not exists permit_expiry date;
alter table public.landlord_profiles add column if not exists business_type text;
alter table public.landlord_profiles add column if not exists years_active int;
alter table public.landlord_profiles add column if not exists total_units int;
alter table public.landlord_profiles add column if not exists service_areas text;
alter table public.landlord_profiles add column if not exists deposit_months int;
alter table public.landlord_profiles add column if not exists advance_months int;
alter table public.landlord_profiles add column if not exists min_lease_months int;
alter table public.landlord_profiles add column if not exists pet_policy text;
alter table public.landlord_profiles add column if not exists smoking_policy text;
alter table public.landlord_profiles add column if not exists maintenance_response_hours int;
alter table public.landlord_profiles add column if not exists listing_visibility text;
alter table public.landlord_profiles add column if not exists verification_document_url text;
alter table public.landlord_profiles add column if not exists id_document_url text;

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.app_users (id) on delete cascade,
  admin_level text,
  department text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.apartments (
  id uuid primary key default gen_random_uuid(),
  legacy_id text unique,
  landlord_id uuid not null references public.app_users (id) on delete cascade,
  title text not null,
  description text,
  price numeric(12, 2) not null default 0,
  bedrooms int not null default 0,
  bathrooms int not null default 0,
  sqft int,
  address text,
  city text,
  state text,
  zip text,
  lat double precision,
  lng double precision,
  pet_friendly boolean not null default false,
  parking boolean not null default false,
  furnished boolean not null default false,
  utilities text[] default array[]::text[],
  amenities text[] default array[]::text[],
  features jsonb not null default '{}'::jsonb,
  is_published boolean not null default false,
  approval_status text not null default 'pending',
  published_at timestamptz,
  published_by uuid references public.app_users (id) on delete set null,
  is_archived boolean not null default false,
  deleted_at timestamptz,
  status text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.apartments add column if not exists legacy_id text;
alter table public.apartments add column if not exists status text not null default 'available';
alter table public.apartments add column if not exists approval_status text not null default 'pending';
alter table public.apartments add column if not exists published_at timestamptz;
alter table public.apartments add column if not exists published_by uuid references public.app_users (id) on delete set null;
alter table public.apartments add column if not exists is_archived boolean not null default false;
alter table public.apartments add column if not exists deleted_at timestamptz;
alter table public.apartments alter column is_published set default false;
alter table public.apartments alter column features set default '{}'::jsonb;
alter table public.apartments drop constraint if exists apartments_status_check;
alter table public.apartments add constraint apartments_status_check check (status in ('available', 'occupied', 'reserved', 'maintenance'));
alter table public.apartments drop constraint if exists apartments_approval_status_check;
alter table public.apartments add constraint apartments_approval_status_check check (approval_status in ('pending', 'approved', 'rejected'));

update public.apartments
set approval_status = 'approved'
where is_published = true
  and approval_status = 'pending';

create unique index if not exists apartments_legacy_id_key on public.apartments (legacy_id) where legacy_id is not null;
create index if not exists idx_apartments_landlord on public.apartments (landlord_id);
create index if not exists idx_apartments_city on public.apartments (city);
create index if not exists idx_apartments_published on public.apartments (is_published);
create index if not exists idx_apartments_status on public.apartments (status);
create index if not exists idx_apartments_approval on public.apartments (approval_status);
create index if not exists idx_apartments_published_by on public.apartments (published_by);
create index if not exists idx_apartments_legacy on public.apartments (legacy_id);
drop index if exists public.idx_apartments_browse;
create index idx_apartments_browse on public.apartments (is_published, approval_status, is_archived, status, city, price);
create index if not exists idx_apartments_gis_coordinates on public.apartments (lat, lng)
where lat is not null and lng is not null and lat <> 0 and lng <> 0;
create index if not exists idx_apartments_tenant_visibility on public.apartments (is_published, approval_status, is_archived, status, landlord_id, created_at)
where is_published = true and approval_status = 'approved' and is_archived = false and deleted_at is null and status = 'available';

create table if not exists public.apartment_images (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  url text not null,
  caption text,
  is_primary boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_apartment_images_apartment on public.apartment_images (apartment_id);

create table if not exists public.apartment_rooms (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  name text,
  room_type text,
  sqft int,
  max_occupants int not null default 1,
  price numeric(12, 2) not null default 0,
  has_private_bath boolean not null default false,
  bathroom_type text,
  shared_bath_location text,
  has_ac boolean not null default false,
  is_occupied boolean not null default false,
  status text not null default 'available',
  description text,
  images text[] not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.apartment_rooms add column if not exists name text;
alter table public.apartment_rooms add column if not exists price numeric(12, 2) not null default 0;
alter table public.apartment_rooms add column if not exists rent numeric(12, 2) not null default 0;
alter table public.apartment_rooms add column if not exists bathroom_type text;
alter table public.apartment_rooms add column if not exists shared_bath_location text;
alter table public.apartment_rooms add column if not exists has_ac boolean not null default false;
alter table public.apartment_rooms add column if not exists status text not null default 'available';
alter table public.apartment_rooms add column if not exists description text;
alter table public.apartment_rooms add column if not exists images text[] not null default '{}';
alter table public.apartment_rooms add column if not exists created_at timestamptz not null default now();
alter table public.apartment_rooms drop constraint if exists apartment_rooms_status_check;
alter table public.apartment_rooms add constraint apartment_rooms_status_check check (status in ('available', 'occupied', 'reserved', 'maintenance'));

update public.apartment_rooms
set rent = price
where coalesce(rent, 0) = 0 and coalesce(price, 0) > 0;

create or replace function public.sync_apartment_room_rent_columns()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if coalesce(new.rent, 0) > 0 then new.price := new.rent;
    elsif coalesce(new.price, 0) > 0 then new.rent := new.price;
    end if;
  elsif new.rent is distinct from old.rent then
    new.price := new.rent;
  elsif new.price is distinct from old.price then
    new.rent := new.price;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_apartment_room_rent_columns on public.apartment_rooms;
create trigger trg_sync_apartment_room_rent_columns
before insert or update on public.apartment_rooms
for each row execute function public.sync_apartment_room_rent_columns();

create index if not exists idx_apartment_rooms_apartment on public.apartment_rooms (apartment_id);
create index if not exists idx_apartment_rooms_status on public.apartment_rooms (status);
create index if not exists idx_apartment_rooms_available_by_apartment on public.apartment_rooms (apartment_id, rent)
where status = 'available' and is_occupied = false;

create table if not exists public.apartment_views (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  viewer_id uuid references public.app_users (id) on delete set null,
  view_count integer not null default 1,
  viewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  viewer_role text,
  view_date date not null default ((now() at time zone 'Asia/Manila')::date)
);

alter table public.apartment_views add column if not exists viewer_role text;
alter table public.apartment_views add column if not exists view_date date;
update public.apartment_views
set view_date = (viewed_at at time zone 'Asia/Manila')::date
where view_date is null;
update public.apartment_views views
set viewer_role = users.role
from public.app_users users
where views.viewer_id = users.id and views.viewer_role is null;
alter table public.apartment_views alter column view_date set default ((now() at time zone 'Asia/Manila')::date);
alter table public.apartment_views alter column view_date set not null;
alter table public.apartment_views drop constraint if exists apartment_views_apartment_id_viewer_id_key;
drop index if exists public.apartment_views_one_per_user_per_day;

create index if not exists idx_apartment_views_apartment on public.apartment_views (apartment_id);
create index if not exists idx_apartment_views_viewer on public.apartment_views (viewer_id);
create index if not exists idx_apartment_views_viewed_at on public.apartment_views (viewed_at);
create index if not exists idx_apartment_views_view_date on public.apartment_views (view_date);
create index if not exists idx_apartment_views_apartment_recent on public.apartment_views (apartment_id, viewed_at desc);

insert into storage.buckets (id, name, public)
values ('apartment-images', 'apartment-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values
  ('user-avatars', 'user-avatars', true),
  ('report-evidence', 'report-evidence', false),
  ('verification-documents', 'verification-documents', false)
on conflict (id) do update set public = excluded.public;

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, apartment_id)
);

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'favorites'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'favorites' and column_name = 'id'
  ) then
    alter table public.favorites add column id uuid default gen_random_uuid();
    update public.favorites set id = gen_random_uuid() where id is null;
    alter table public.favorites alter column id set not null;
    alter table public.favorites drop constraint if exists favorites_pkey;
    alter table public.favorites add primary key (id);
    begin
      alter table public.favorites
        add constraint favorites_user_apartment_unique unique (user_id, apartment_id);
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create index if not exists idx_favorites_user on public.favorites (user_id);
create index if not exists idx_favorites_apartment on public.favorites (apartment_id);

create table if not exists public.apartment_ratings (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  tenant_id uuid not null references public.app_users (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, apartment_id)
);
create index if not exists idx_apartment_ratings_apartment on public.apartment_ratings (apartment_id);
create index if not exists idx_apartment_ratings_created on public.apartment_ratings (created_at);
alter table public.apartment_ratings replica identity full;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.app_users (id) on delete set null,
  user_id uuid references public.app_users (id) on delete set null,
  apartment_id uuid references public.apartments (id) on delete set null,
  reporter_role text,
  issue_type text,
  reason text,
  category text,
  tags text[] default array[]::text[],
  details text,
  contact text,
  date_of_incident date,
  severity public.report_severity not null default 'med',
  submitted_at timestamptz not null default now(),
  status public.report_status not null default 'pending',
  resolved_at timestamptz,
  landlord_id uuid references public.app_users (id) on delete set null,
  has_evidence boolean not null default false,
  evidence_count integer default 0,
  last_action_at timestamptz default now(),
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reports add column if not exists user_id uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists issue_type text;
alter table public.reports add column if not exists reporter_role text;
alter table public.reports add column if not exists tags text[] default array[]::text[];
alter table public.reports add column if not exists contact text;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists category text;
alter table public.reports add column if not exists date_of_incident date;
alter table public.reports add column if not exists landlord_id uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists has_evidence boolean not null default false;
alter table public.reports add column if not exists evidence_count integer default 0;
alter table public.reports add column if not exists last_action_at timestamptz default now();
alter table public.reports add column if not exists reviewed_by uuid references public.app_users (id) on delete set null;
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists is_archived boolean not null default false;
alter table public.reports add column if not exists archived_at timestamptz;
alter table public.reports add column if not exists archived_by uuid references public.app_users (id) on delete set null;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reports'
      and column_name = 'reporter_role'
      and udt_name = 'app_user_role'
  ) then
    alter table public.reports alter column reporter_role type text using reporter_role::text;
  end if;
end $$;

create index if not exists idx_reports_apartment on public.reports (apartment_id);
create index if not exists idx_reports_status on public.reports (status);
create index if not exists idx_reports_reporter on public.reports (reporter_id);
create index if not exists idx_reports_user on public.reports (user_id);
create index if not exists idx_reports_category on public.reports (category);
create index if not exists idx_reports_landlord on public.reports (landlord_id);
create index if not exists idx_reports_has_evidence on public.reports (has_evidence);
create index if not exists idx_reports_last_action_at on public.reports (last_action_at);
create index if not exists idx_reports_reviewed_by on public.reports (reviewed_by);
create index if not exists idx_reports_archived on public.reports (is_archived, archived_at desc);
create index if not exists idx_reports_status_submitted on public.reports (status, submitted_at desc);

create table if not exists public.violations (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.app_users (id) on delete cascade,
  admin_id uuid references public.app_users (id) on delete set null,
  mode public.violation_mode not null default 'violation',
  type text,
  message text,
  issued_at timestamptz not null default now(),
  expires_at timestamptz,
  related_report_id uuid references public.reports (id) on delete set null,
  apartment_id uuid references public.apartments (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.violations add column if not exists apartment_id uuid;

create index if not exists idx_violations_landlord on public.violations (landlord_id);
create index if not exists idx_violations_active on public.violations (active);
create index if not exists idx_violations_apartment on public.violations (apartment_id);
create index if not exists idx_violations_landlord_active on public.violations (landlord_id, active);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.app_users (id) on delete cascade,
  type text not null default 'info',
  title text,
  message text,
  payload jsonb default '{}'::jsonb,
  read boolean not null default false,
  is_deleted boolean not null default false,
  deleted_at timestamptz default null,
  action_url text,
  action_target_id uuid,
  action_target_type text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'notifications'
      and column_name = 'type'
      and udt_name = 'notification_type'
  ) then
    alter table public.notifications alter column type type text using type::text;
  end if;
end $$;

alter table public.notifications add column if not exists is_deleted boolean not null default false;
alter table public.notifications add column if not exists deleted_at timestamptz default null;
alter table public.notifications add column if not exists action_url text;
alter table public.notifications add column if not exists action_target_id uuid;
alter table public.notifications add column if not exists action_target_type text;
alter table public.notifications add column if not exists read_at timestamptz;

create index if not exists idx_notifications_user on public.notifications (user_id);
create index if not exists idx_notifications_read on public.notifications (read);
create index if not exists idx_notifications_deleted on public.notifications (is_deleted);
create index if not exists idx_notifications_user_deleted on public.notifications (user_id, is_deleted);
create index if not exists idx_notifications_user_unread on public.notifications (user_id, read, is_deleted);
create index if not exists idx_notifications_action_target on public.notifications (action_target_type, action_target_id);

do $$
declare
  unique_index record;
  index_columns text[];
begin
  for unique_index in
    select idx.indexrelid, cls.relname as index_name, con.conname as constraint_name
    from pg_index idx
    join pg_class cls on cls.oid = idx.indexrelid
    left join pg_constraint con on con.conindid = idx.indexrelid
    where idx.indrelid = 'public.notifications'::regclass
      and idx.indisunique
  loop
    select array_agg(att.attname order by keys.ordinality)
    into index_columns
    from unnest((select indkey from pg_index where indexrelid = unique_index.indexrelid)) with ordinality as keys(attnum, ordinality)
    join pg_attribute att on att.attrelid = 'public.notifications'::regclass and att.attnum = keys.attnum;

    if index_columns @> array['user_id', 'type']::text[]
       and not index_columns @> array['action_target_id']::text[] then
      if unique_index.constraint_name is not null then
        execute format('alter table public.notifications drop constraint if exists %I', unique_index.constraint_name);
      else
        execute format('drop index if exists public.%I', unique_index.index_name);
      end if;
    end if;
  end loop;
end $$;

create table if not exists public.apartment_verification_documents (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  landlord_id uuid not null references public.app_users (id) on delete cascade,
  document_type text not null,
  file_name text not null,
  mime_type text not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apartment_id, document_type)
);

create index if not exists idx_apartment_verification_documents_apartment
  on public.apartment_verification_documents (apartment_id);
create index if not exists idx_apartment_verification_documents_landlord
  on public.apartment_verification_documents (landlord_id);

create or replace function public.notify_admins_of_verification_document_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_document public.apartment_verification_documents%rowtype;
  v_property public.apartments%rowtype;
  v_landlord_name text;
  v_action text;
begin
  v_document := case when tg_op = 'DELETE' then old else new end;
  select * into v_property from public.apartments where id = v_document.apartment_id;

  if v_property.created_at >= now() - interval '1 minute' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select coalesce(nullif(name, ''), 'A landlord') into v_landlord_name
  from public.app_users where id = v_document.landlord_id;
  v_action := case tg_op when 'DELETE' then 'removed' when 'UPDATE' then 'replaced' else 'uploaded' end;

  insert into public.notifications (
    user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type
  )
  select
    admin_user.id,
    'verification_documents_updated',
    'Verification documents updated',
    format('%s %s a verification document for "%s".', v_landlord_name, v_action, coalesce(v_property.title, 'a property')),
    jsonb_build_object(
      'apartment_id', v_document.apartment_id,
      'landlord_id', v_document.landlord_id,
      'action', 'verification_documents_updated'
    ),
    false,
    '/admin/apartment/' || v_document.apartment_id::text || '#admin-verification',
    v_document.apartment_id,
    'apartment'
  from public.app_users admin_user
  where admin_user.role in ('admin', 'super_admin')
    and not exists (
      select 1 from public.notifications recent
      where recent.user_id = admin_user.id
        and recent.type = 'verification_documents_updated'
        and recent.payload ->> 'apartment_id' = v_document.apartment_id::text
        and recent.created_at >= now() - interval '15 seconds'
    );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_notify_admins_verification_document_change on public.apartment_verification_documents;
create trigger trg_notify_admins_verification_document_change
after insert or update or delete on public.apartment_verification_documents
for each row execute function public.notify_admins_of_verification_document_change();

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users (id) on delete cascade,
  topic text not null,
  message text not null,
  contact text,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  assigned_admin_id uuid references public.app_users (id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets (user_id);
create index if not exists idx_support_tickets_status_created on public.support_tickets (status, created_at desc);

create table if not exists public.property_drafts (
  user_id uuid primary key references public.app_users (id) on delete cascade,
  draft_data jsonb not null,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_property_drafts_expires_at
on public.property_drafts (expires_at);

create table if not exists public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text not null,
  mime_type text,
  file_size integer,
  uploaded_by uuid references public.app_users (id) on delete set null,
  uploaded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_report_evidence_report on public.report_evidence (report_id);
create index if not exists idx_report_evidence_uploaded_by on public.report_evidence (uploaded_by);

create table if not exists public.report_audit_log (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  admin_id uuid references public.app_users (id) on delete set null,
  action text not null,
  description text,
  changes jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_report_audit_log_report on public.report_audit_log (report_id);
create index if not exists idx_report_audit_log_admin on public.report_audit_log (admin_id);
create index if not exists idx_report_audit_log_created_at on public.report_audit_log (created_at);

create table if not exists public.report_responses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  respondent_id uuid not null references public.app_users (id) on delete cascade,
  response_text text not null,
  response_type text not null default 'appeal',
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.app_users (id) on delete set null,
  reviewed_at timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

create index if not exists idx_report_responses_report on public.report_responses (report_id);
create index if not exists idx_report_responses_respondent on public.report_responses (respondent_id);

create table if not exists public.report_duplicate_check (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.app_users (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  issue_type text,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(reporter_id, apartment_id, issue_type)
);

create index if not exists idx_report_duplicate_check_reporter on public.report_duplicate_check (reporter_id);
create index if not exists idx_report_duplicate_check_apartment on public.report_duplicate_check (apartment_id);

create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  landlord_id uuid not null references public.app_users (id) on delete cascade,
  report_id uuid references public.reports (id) on delete set null,
  violation_id uuid references public.violations (id) on delete set null,
  reason text not null,
  description text,
  supporting_docs jsonb default '[]'::jsonb,
  status public.appeal_status not null default 'pending',
  admin_response text,
  admin_id uuid references public.app_users (id) on delete set null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  is_archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid references public.app_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.appeals add column if not exists is_archived boolean not null default false;
alter table public.appeals add column if not exists archived_at timestamptz;
alter table public.appeals add column if not exists archived_by uuid references public.app_users (id) on delete set null;

create index if not exists idx_appeals_landlord on public.appeals (landlord_id);
create index if not exists idx_appeals_report on public.appeals (report_id);
create index if not exists idx_appeals_violation on public.appeals (violation_id);
create index if not exists idx_appeals_status on public.appeals (status);
create index if not exists idx_appeals_archived on public.appeals (is_archived, archived_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.app_users (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_admin on public.audit_logs (admin_id);
create index if not exists idx_audit_logs_target on public.audit_logs (target_type, target_id, created_at desc);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);

create or replace function public.notify_admins_of_landlord_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role public.app_user_role;
  v_landlord_name text;
  v_landlord_id uuid;
  v_property_name text;
  v_room_id uuid;
  v_room_name text;
  v_status text;
  v_action_type text := new.action;
  v_title text;
  v_message text;
  v_action_url text;
  v_changed_fields text;
  v_old_image_count int := 0;
  v_new_image_count int := 0;
begin
  select role, coalesce(nullif(name, ''), 'A landlord')
    into v_actor_role, v_landlord_name
  from public.app_users where id = new.admin_id;

  if v_actor_role is distinct from 'landlord'::public.app_user_role
     or new.action not in (
       'apartment_created', 'apartment_updated', 'apartment_deleted', 'apartment_status_updated', 'apartment_images_updated',
       'apartment_room_created', 'apartment_room_updated',
       'apartment_room_status_updated', 'apartment_room_deleted'
     ) then
    return new;
  end if;

  select landlord_id, coalesce(nullif(title, ''), 'Untitled property'), status
    into v_landlord_id, v_property_name, v_status
  from public.apartments where id = new.target_id;
  v_landlord_id := coalesce(v_landlord_id, new.admin_id);
  v_property_name := coalesce(v_property_name, nullif(new.details ->> 'property_name', ''), 'a property');

  begin
    v_room_id := nullif(new.details ->> 'room_id', '')::uuid;
  exception when invalid_text_representation then
    v_room_id := null;
  end;
  if v_room_id is not null then
    select coalesce(nullif(name, ''), nullif(room_type, ''), 'Room') into v_room_name
    from public.apartment_rooms where id = v_room_id;
  end if;
  v_room_name := coalesce(
    v_room_name,
    nullif(new.details #>> '{changes,room,new,name}', ''),
    nullif(new.details #>> '{changes,room,old,name}', ''),
    'Room'
  );
  v_status := coalesce(
    nullif(new.details ->> 'status', ''),
    nullif(new.details #>> '{changes,room_status,new}', ''),
    nullif(new.details #>> '{changes,room,new,status}', ''),
    v_status
  );

  if jsonb_typeof(new.details -> 'changed_fields') = 'array' then
    select string_agg(replace(field_name, '_', ' '), ', ')
      into v_changed_fields
    from jsonb_array_elements_text(new.details -> 'changed_fields') as fields(field_name);
  elsif jsonb_typeof(new.details -> 'changes') = 'object' then
    select string_agg(replace(field_name, '_', ' '), ', ')
      into v_changed_fields
    from jsonb_object_keys(new.details -> 'changes') as fields(field_name);
  end if;

  if new.action = 'apartment_room_updated' then
    if jsonb_typeof(new.details #> '{changes,room,old,images}') = 'array' then
      v_old_image_count := jsonb_array_length(new.details #> '{changes,room,old,images}');
    end if;
    if jsonb_typeof(new.details #> '{changes,room,new,images}') = 'array' then
      v_new_image_count := jsonb_array_length(new.details #> '{changes,room,new,images}');
    end if;
    if new.details -> 'changed_fields' = '["images"]'::jsonb then
      v_action_type := case
        when v_new_image_count > v_old_image_count then 'room_images_uploaded'
        when v_new_image_count < v_old_image_count then 'room_images_deleted'
        else 'room_images_reordered'
      end;
    end if;
  end if;

  v_title := case v_action_type
    when 'apartment_created' then 'New landlord property submitted'
    when 'apartment_updated' then 'Property updated'
    when 'apartment_deleted' then 'Property deleted'
    when 'apartment_status_updated' then 'Property status updated'
    when 'apartment_images_updated' then 'Property images updated'
    when 'apartment_room_created' then 'Room added'
    when 'apartment_room_updated' then 'Room updated'
    when 'apartment_room_status_updated' then 'Room status updated'
    when 'apartment_room_deleted' then 'Room deleted'
    when 'room_images_uploaded' then 'Room images uploaded'
    when 'room_images_deleted' then 'Room images deleted'
    when 'room_images_reordered' then 'Room images reordered'
    else 'Landlord activity'
  end;

  v_message := case v_action_type
    when 'apartment_created' then format('%s submitted %s for review.', v_landlord_name, v_property_name)
    when 'apartment_updated' then format('%s updated %s%s.', v_landlord_name, v_property_name, case when v_changed_fields is null then '' else ' (' || v_changed_fields || ')' end)
    when 'apartment_deleted' then format('%s deleted %s.', v_landlord_name, v_property_name)
    when 'apartment_status_updated' then format('%s updated the status of %s%s.', v_landlord_name, v_property_name, case when v_status is null then '' else ' to ' || initcap(v_status) end)
    when 'apartment_images_updated' then format('%s updated property images for %s (%s images now).', v_landlord_name, v_property_name, coalesce(new.details ->> 'image_count', '0'))
    when 'apartment_room_created' then format('%s added %s to %s.', v_landlord_name, v_room_name, v_property_name)
    when 'apartment_room_updated' then format('%s updated %s at %s%s.', v_landlord_name, v_room_name, v_property_name, case when v_changed_fields is null then '' else ' (' || v_changed_fields || ')' end)
    when 'apartment_room_status_updated' then format('%s marked %s at %s as %s.', v_landlord_name, v_room_name, v_property_name, initcap(coalesce(v_status, 'updated')))
    when 'apartment_room_deleted' then format('%s deleted %s from %s.', v_landlord_name, v_room_name, v_property_name)
    when 'room_images_uploaded' then format('%s uploaded room images for %s at %s (%s images now).', v_landlord_name, v_room_name, v_property_name, v_new_image_count)
    when 'room_images_deleted' then format('%s removed room images from %s at %s (%s images remain).', v_landlord_name, v_room_name, v_property_name, v_new_image_count)
    when 'room_images_reordered' then format('%s reordered room images for %s at %s.', v_landlord_name, v_room_name, v_property_name)
    else format('%s updated %s.', v_landlord_name, v_property_name)
  end;

  v_action_url := case
    when new.action = 'apartment_deleted' then '/dashboard?section=apartments'
    when new.action = 'apartment_created' then '/admin/apartment/' || new.target_id::text || '#admin-verification'
    when v_room_id is not null then '/admin/apartment/' || new.target_id::text || '#admin-room-' || v_room_id::text
    else '/admin/apartment/' || new.target_id::text
  end;

  insert into public.notifications (
    user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type
  )
  select
    admin_user.id,
    'landlord_activity',
    v_title,
    v_message,
    jsonb_build_object(
      'category', 'landlord_activity',
      'activity_type', v_action_type,
      'audit_log_id', new.id,
      'landlord_id', v_landlord_id,
      'landlord_name', v_landlord_name,
      'apartment_id', new.target_id,
      'property_name', v_property_name,
      'room_id', v_room_id,
      'room_name', case when v_room_id is null then null else v_room_name end,
      'status', v_status,
      'changed_fields', coalesce(new.details -> 'changed_fields', '[]'::jsonb)
    ),
    false,
    v_action_url,
    new.target_id,
    case when v_room_id is null then 'apartment' else 'room' end
  from public.app_users admin_user
  where admin_user.role in ('admin', 'super_admin')
    and not exists (
      select 1 from public.notifications existing
      where existing.user_id = admin_user.id
        and existing.type = 'landlord_activity'
        and existing.payload ->> 'audit_log_id' = new.id::text
    );

  return new;
end;
$$;

drop trigger if exists trg_notify_admins_landlord_activity on public.audit_logs;
create trigger trg_notify_admins_landlord_activity
after insert on public.audit_logs
for each row execute function public.notify_admins_of_landlord_activity();

create or replace function public.app_set_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.trigger_set_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_report_fields()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.user_id is null and new.reporter_id is not null then
    new.user_id := new.reporter_id;
  end if;
  if new.reporter_id is null and new.user_id is not null then
    new.reporter_id := new.user_id;
  end if;
  if new.reason is null and new.issue_type is not null then
    new.reason := new.issue_type;
  end if;
  if new.issue_type is null and new.reason is not null then
    new.issue_type := new.reason;
  end if;
  return new;
end;
$$;

create or replace function public.create_report_audit_on_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.report_audit_log (report_id, action, description)
  values (new.id, 'submitted', 'Report submitted by ' || coalesce(new.reporter_role, 'user'));
  return new;
end;
$$;

create or replace function public.update_duplicate_check_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.report_duplicate_check (reporter_id, apartment_id, issue_type)
  values (new.reporter_id, new.apartment_id, coalesce(new.issue_type, new.category))
  on conflict (reporter_id, apartment_id, issue_type)
  do update set submitted_at = excluded.submitted_at;
  return new;
end;
$$;

create or replace function public.fn_notify_landlord_on_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_landlord_id uuid;
  v_apartment_title text;
begin
  select landlord_id, title into v_landlord_id, v_apartment_title
  from public.apartments
  where id = new.apartment_id;

  if v_landlord_id is not null then
    insert into public.notifications (
      user_id, type, title, message, payload
    ) values (
      v_landlord_id,
      'property_reported',
      'Property Report Filed',
      'Your listing "' || coalesce(v_apartment_title, 'Property') || '" has been reported',
      jsonb_build_object(
        'report_id', new.id, 'apartment_id', new.apartment_id,
        'apartment_title', v_apartment_title, 'reason', new.reason,
        'severity', new.severity, 'issue_type', new.issue_type
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.fn_notify_landlord_on_violation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (
    user_id, type, title, message, payload
  ) values (
    new.landlord_id,
    case when new.mode = 'notice' then 'notice_issued' else 'violation_issued' end,
    case when new.mode = 'notice' then 'Official Notice: ' else 'Account Notice: ' end || coalesce(new.type, 'Update'),
    new.message,
    jsonb_build_object(
      'violation_id', new.id, 'mode', new.mode, 'type', new.type,
      'expires_at', new.expires_at, 'related_report_id', new.related_report_id,
      'apartment_id', new.apartment_id,
      'apartment_title', (select title from public.apartments where id = new.apartment_id),
      'status', 'open', 'category', 'reports'
    )
  );
  return new;
end;
$$;

create or replace function public.fn_notify_admin_on_appeal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_ids uuid[];
  v_admin_id uuid;
  v_landlord_name text;
begin
  select name into v_landlord_name from public.app_users where id = new.landlord_id;
  select array_agg(id) into v_admin_ids from public.app_users where role in ('admin', 'super_admin');

  if v_admin_ids is not null and array_length(v_admin_ids, 1) > 0 then
    foreach v_admin_id in array v_admin_ids loop
      insert into public.notifications (
        user_id, type, title, message, payload
      ) values (
        v_admin_id,
        'appeal_submitted',
        'New Appeal Submitted',
        'Landlord ' || coalesce(v_landlord_name, 'Unknown') || ' submitted an appeal',
        jsonb_build_object(
          'appeal_id', new.id, 'landlord_id', new.landlord_id,
          'landlord_name', v_landlord_name, 'report_id', new.report_id,
          'violation_id', new.violation_id, 'reason', new.reason
        )
      );
    end loop;
  end if;
  return new;
end;
$$;

create or replace function public.fn_notify_landlord_on_appeal_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_messages text;
begin
  if old.status != new.status or old.admin_response is distinct from new.admin_response then
    case new.status::text
      when 'under_review' then v_status_messages := 'Your appeal is now under review by our team.';
      when 'needs_information' then v_status_messages := 'The administrator requested more information for your appeal.';
      when 'approved' then v_status_messages := 'Good news! Your appeal has been approved.';
      when 'rejected' then v_status_messages := 'Your appeal has been reviewed and rejected.';
      when 'dismissed' then v_status_messages := 'Your appeal has been dismissed.';
      else v_status_messages := 'Your appeal status has been updated.';
    end case;

    insert into public.notifications (
      user_id, type, title, message, payload
    ) values (
      new.landlord_id,
      'appeal_status_updated',
      'Appeal Status Updated',
      v_status_messages,
      jsonb_build_object(
        'appeal_id', new.id, 'status', new.status,
        'admin_response', new.admin_response, 'reviewed_at', new.reviewed_at
      )
    );
  end if;
  return new;
end;
$$;

create or replace function public.fn_notification_read_timestamp()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.read = true and old.read = false then
    new.read_at := now();
  elsif new.read = false then
    new.read_at := null;
  end if;
  return new;
end;
$$;

create or replace function public.fn_notify_admin_on_support_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_requester_name text;
begin
  select name into v_requester_name from public.app_users where id = new.user_id;
  insert into public.notifications (user_id, type, title, message, payload)
  select id, 'support_request', 'New support request',
    coalesce(v_requester_name, 'A user') || ' requested help with ' || new.topic || '.',
    jsonb_build_object('ticket_id', new.id, 'topic', new.topic)
  from public.app_users where role in ('admin', 'super_admin');
  return new;
end;
$$;

drop trigger if exists trg_reports_sync_fields on public.reports;
create trigger trg_reports_sync_fields before insert or update on public.reports for each row execute function public.sync_report_fields();

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at before update on public.app_users for each row execute function public.app_set_timestamp();

drop trigger if exists trg_apartments_updated_at on public.apartments;
create trigger trg_apartments_updated_at before update on public.apartments for each row execute function public.app_set_timestamp();

drop trigger if exists trg_violations_updated_at on public.violations;
create trigger trg_violations_updated_at before update on public.violations for each row execute function public.app_set_timestamp();

drop trigger if exists trg_appeals_updated_at on public.appeals;
create trigger trg_appeals_updated_at before update on public.appeals for each row execute function public.app_set_timestamp();

drop trigger if exists trg_tenant_profiles_updated_at on public.tenant_profiles;
create trigger trg_tenant_profiles_updated_at
before update on public.tenant_profiles
for each row execute function public.app_set_timestamp();

drop trigger if exists trg_landlord_profiles_updated_at on public.landlord_profiles;
create trigger trg_landlord_profiles_updated_at before update on public.landlord_profiles for each row execute function public.app_set_timestamp();

drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at before update on public.admin_profiles for each row execute function public.app_set_timestamp();

drop trigger if exists trg_support_tickets_updated_at on public.support_tickets;
create trigger trg_support_tickets_updated_at before update on public.support_tickets for each row execute function public.app_set_timestamp();

drop trigger if exists trg_create_report_audit_on_insert on public.reports;
create trigger trg_create_report_audit_on_insert after insert on public.reports for each row execute function public.create_report_audit_on_insert();

drop trigger if exists trg_update_duplicate_check_on_report on public.reports;
create trigger trg_update_duplicate_check_on_report after insert on public.reports for each row execute function public.update_duplicate_check_on_report();

drop trigger if exists trg_notify_landlord_on_report on public.reports;
create trigger trg_notify_landlord_on_report after insert on public.reports for each row execute function public.fn_notify_landlord_on_report();

drop trigger if exists trg_notify_landlord_on_violation on public.violations;
create trigger trg_notify_landlord_on_violation after insert on public.violations for each row execute function public.fn_notify_landlord_on_violation();

drop trigger if exists trg_notify_admin_on_appeal on public.appeals;
create trigger trg_notify_admin_on_appeal after insert on public.appeals for each row execute function public.fn_notify_admin_on_appeal();

drop trigger if exists trg_notify_landlord_on_appeal_status on public.appeals;
create trigger trg_notify_landlord_on_appeal_status before update on public.appeals for each row execute function public.fn_notify_landlord_on_appeal_status();

drop trigger if exists trg_notification_read_timestamp on public.notifications;
create trigger trg_notification_read_timestamp before update on public.notifications for each row execute function public.fn_notification_read_timestamp();

drop trigger if exists trg_notify_admin_on_support_ticket on public.support_tickets;
create trigger trg_notify_admin_on_support_ticket after insert on public.support_tickets for each row execute function public.fn_notify_admin_on_support_ticket();

create or replace function public.fn_mark_notification_read(p_notification_id uuid)
returns boolean language plpgsql security invoker set search_path = public as $$
declare v_updated int;
begin
  update public.notifications set read = true where id = p_notification_id;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

create or replace function public.fn_mark_all_notifications_read(p_user_id uuid)
returns int language plpgsql security invoker set search_path = public as $$
declare v_updated int;
begin
  update public.notifications set read = true where user_id = p_user_id and read = false;
  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

create or replace function public.fn_get_unread_notification_count(p_user_id uuid)
returns int language plpgsql security invoker set search_path = public as $$
declare v_count int;
begin
  select count(*) into v_count from public.notifications
  where user_id = p_user_id and read = false and is_deleted = false;
  return v_count;
end;
$$;

create or replace function public.current_app_user_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_users where auth_id = auth.uid() limit 1
$$;

create or replace function public.fn_resolve_username_login(p_username text)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_username text := lower(trim(coalesce(p_username, '')));
  v_email text;
begin
  if v_username !~ '^[a-z0-9_]{4,30}$' then
    return null;
  end if;

  select u.email
  into v_email
  from public.app_users u
  where lower(u.username) = v_username
    and u.status <> 'disabled'
    and u.auth_id is not null
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.fn_resolve_username_login(text) from public;
grant execute on function public.fn_resolve_username_login(text) to anon, authenticated, service_role;

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where auth_id = auth.uid() and role in ('admin', 'super_admin') and status <> 'disabled'
  )
$$;

create or replace function public.fn_submit_appeal_followup(
  p_appeal_id uuid,
  p_description text,
  p_supporting_docs jsonb default '[]'::jsonb
)
returns public.appeals
language plpgsql
security definer
set search_path = public
as $$
declare
  v_appeal public.appeals;
begin
  if nullif(trim(p_description), '') is null then
    raise exception 'Additional appeal information is required.';
  end if;

  update public.appeals
  set description = concat_ws(E'\n\n', nullif(description, ''), 'Additional information:', trim(p_description)),
      supporting_docs = coalesce(supporting_docs, '[]'::jsonb) || coalesce(p_supporting_docs, '[]'::jsonb),
      updated_at = now()
  where id = p_appeal_id
    and landlord_id = public.current_app_user_id()
    and status::text = 'needs_information'
  returning * into v_appeal;

  if v_appeal.id is null then
    raise exception 'This appeal is not awaiting additional information.';
  end if;

  insert into public.notifications (user_id, type, title, message, payload)
  select id, 'appeal_information_submitted', 'Appeal Information Submitted',
    'A landlord submitted additional information for an appeal.',
    jsonb_build_object('appeal_id', v_appeal.id, 'landlord_id', v_appeal.landlord_id, 'category', 'appeals')
  from public.app_users where role in ('admin', 'super_admin');

  return v_appeal;
end;
$$;

create or replace function public.record_landlord_apartment_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_app_user_id();
  v_actor_role public.app_user_role;
  v_apartment public.apartments%rowtype;
  v_action text;
begin
  v_apartment := case when tg_op = 'DELETE' then old else new end;
  select role into v_actor_role from public.app_users where id = v_actor_id;
  if v_actor_role is distinct from 'landlord'::public.app_user_role
     or v_apartment.landlord_id is distinct from v_actor_id then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  v_action := case when tg_op = 'DELETE' then 'apartment_deleted' else 'apartment_created' end;
  insert into public.audit_logs (admin_id, action, target_type, target_id, details)
  values (
    v_actor_id,
    v_action,
    'apartment',
    v_apartment.id,
    jsonb_build_object(
      'actor_id', v_actor_id,
      'landlord_id', v_apartment.landlord_id,
      'property_name', v_apartment.title,
      'status', case when tg_op = 'DELETE' then v_apartment.status else v_apartment.approval_status end,
      'changes', jsonb_build_object(
        'apartment', jsonb_build_object(
          'old', case when tg_op = 'DELETE' then to_jsonb(old) else null end,
          'new', case when tg_op = 'INSERT' then to_jsonb(new) else null end
        )
      )
    )
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists trg_record_landlord_apartment_activity on public.apartments;
create trigger trg_record_landlord_apartment_activity
after insert or delete on public.apartments
for each row execute function public.record_landlord_apartment_activity();

create or replace function public.fn_merge_user_preference_section(
  p_user_id uuid,
  p_section text,
  p_value jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare v_preferences jsonb;
begin
  if p_user_id is distinct from public.current_app_user_id() and not public.current_user_is_admin() then
    raise exception 'Not authorized to update these preferences';
  end if;
  if p_section is null or p_section !~ '^[a-zA-Z][a-zA-Z0-9_]{0,63}$' then
    raise exception 'Invalid preference section';
  end if;

  update public.app_users
  set preferences = jsonb_set(coalesce(preferences, '{}'::jsonb), array[p_section], coalesce(p_value, '{}'::jsonb), true)
  where id = p_user_id
  returning preferences into v_preferences;
  return v_preferences;
end;
$$;

create or replace function public.fn_delete_my_account()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare v_auth_id uuid := auth.uid();
begin
  if v_auth_id is null then
    raise exception 'Authentication required';
  end if;
  delete from auth.users where id = v_auth_id;
  return found;
end;
$$;

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

  select id, role, username
  into v_existing_id, v_existing_role, v_existing_username
  from public.app_users
  where auth_id = new.id
  limit 1;

  if v_existing_id is null then
    select u.id, u.role, u.username
    into v_existing_id, v_existing_role, v_existing_username
    from public.app_users u
    where lower(u.email) = lower(new.email)
      and (u.auth_id is null
           or not exists (select 1 from auth.users au where au.id = u.auth_id))
    limit 1;
  end if;

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
    update public.app_users
    set auth_id = new.id,
        email = lower(new.email),
        username = v_username,
        role = v_role,
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.sync_auth_email_verification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.app_users
  set email_verified = new.email_confirmed_at is not null,
      verification_status = case when new.email_confirmed_at is null then 'pending_email_verification' else 'email_verified' end
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

update public.app_users app_user
set
  email_verified = auth_user.email_confirmed_at is not null,
  verification_status = case
    when auth_user.email_confirmed_at is null then 'pending_email_verification'
    else 'email_verified'
  end,
  updated_at = now()
from auth.users auth_user
where app_user.auth_id = auth_user.id;

update public.app_users app_user
set
  auth_id = auth_user.id,
  email_verified = auth_user.email_confirmed_at is not null,
  verification_status = case
    when auth_user.email_confirmed_at is null then 'pending_email_verification'
    else 'email_verified'
  end,
  updated_at = now()
from auth.users auth_user
where app_user.auth_id is null
  and lower(app_user.email) = lower(auth_user.email)
  and not exists (
    select 1
    from public.app_users auth_owner
    where auth_owner.auth_id = auth_user.id
      and auth_owner.id <> app_user.id
  );

insert into public.app_users (
  auth_id,
  username,
  email,
  name,
  role,
  status,
  is_verified,
  email_verified,
  verification_status,
  signup_source
)
select
  auth_user.id,
  case
    when lower(coalesce(auth_user.raw_user_meta_data ->> 'username', ''))
      ~ '^[a-z0-9_]{4,30}$'
      then lower(auth_user.raw_user_meta_data ->> 'username')
    else 'user_' || substr(replace(auth_user.id::text, '-', ''), 1, 12)
  end,
  auth_user.email,
  coalesce(
    nullif(trim(auth_user.raw_user_meta_data ->> 'name'), ''),
    split_part(coalesce(auth_user.email, ''), '@', 1),
    'User'
  ),
  case
    when auth_user.raw_user_meta_data ->> 'role' = 'landlord'
      then 'landlord'::public.app_user_role
    when auth_user.raw_user_meta_data ->> 'role' in ('admin', 'super_admin')
      then (auth_user.raw_user_meta_data ->> 'role')::public.app_user_role
    else 'tenant'::public.app_user_role
  end,
  case
    when auth_user.raw_user_meta_data ->> 'role' = 'landlord' then 'pending'
    else 'active'
  end,
  coalesce(auth_user.raw_user_meta_data ->> 'role', 'tenant') <> 'landlord',
  auth_user.email_confirmed_at is not null,
  case
    when auth_user.email_confirmed_at is null then 'pending_email_verification'
    else 'email_verified'
  end,
  'auth_backfill'
from auth.users auth_user
where auth_user.email is not null
  and not exists (
    select 1
    from public.app_users existing_by_auth
    where existing_by_auth.auth_id = auth_user.id
  )
  and not exists (
    select 1
    from public.app_users existing_by_email
    where lower(existing_by_email.email) = lower(auth_user.email)
  );

update public.app_users app_user
set permit_number = nullif(auth_user.raw_user_meta_data ->> 'permitNumber', '')
from auth.users auth_user
where app_user.auth_id = auth_user.id
  and app_user.role = 'landlord'
  and nullif(app_user.permit_number, '') is null
  and nullif(auth_user.raw_user_meta_data ->> 'permitNumber', '') is not null;

insert into public.tenant_profiles (user_id)
select id
from public.app_users
where role = 'tenant'
on conflict (user_id) do nothing;

insert into public.landlord_profiles (
  user_id, permit_number, business_permit_number, is_verified, verified_at
)
select
  id, permit_number, permit_number, is_verified,
  case when is_verified then now() else null end
from public.app_users
where role = 'landlord'
on conflict (user_id) do update set
  permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
  business_permit_number = coalesce(landlord_profiles.business_permit_number, excluded.business_permit_number),
  is_verified = excluded.is_verified,
  verified_at = case
    when excluded.is_verified then coalesce(landlord_profiles.verified_at, now())
    else null
  end,
  updated_at = now();

drop view if exists public.reports_with_evidence cascade;
create view public.reports_with_evidence with (security_invoker = true) as
select
  r.id, r.reporter_id, r.apartment_id, r.landlord_id, r.category, r.issue_type,
  r.details, r.severity, r.status, r.submitted_at, r.last_action_at,
  r.reviewed_by, r.reviewed_at,
  coalesce(e.evidence_count, 0) as evidence_count,
  au.name as reporter_name, au.email as reporter_email,
  apt.title as apartment_title, apt.address as apartment_address,
  ll.name as landlord_name
from public.reports r
left join public.app_users au on r.reporter_id = au.id
left join public.apartments apt on r.apartment_id = apt.id
left join public.app_users ll on r.landlord_id = ll.id
left join (select report_id, count(*) as evidence_count from public.report_evidence group by report_id) e on r.id = e.report_id;

drop view if exists public.vw_app_users_by_role cascade;
create view public.vw_app_users_by_role with (security_invoker = true) as
select u.id, u.username, u.email, u.name, u.role, u.status, u.mobile, u.is_verified, u.permit_number, u.created_at, u.updated_at
from public.app_users u;

create or replace function public.get_public_landlords()
returns table (
  id uuid,
  email text,
  name text,
  role public.app_user_role,
  status text,
  mobile text,
  avatar_url text,
  is_verified boolean,
  verification_status text,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email, u.name, u.role, u.status, u.mobile, u.avatar_url,
         u.is_verified, u.verification_status, u.created_at, u.updated_at
  from public.app_users u
  where u.role = 'landlord' and u.status <> 'disabled'
$$;

revoke all on function public.get_public_landlords() from public;

create or replace view public.public_landlords
with (security_barrier = true, security_invoker = true) as
select * from public.get_public_landlords();
alter view public.public_landlords set (security_barrier = true, security_invoker = true);

create or replace function public.apartment_is_tenant_visible(p_apartment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.apartments a
    join public.app_users landlord on landlord.id = a.landlord_id
    where a.id = p_apartment_id
      and a.is_published = true
      and a.approval_status = 'approved'
      and a.is_archived = false
      and a.deleted_at is null
      and a.status = 'available'
      and landlord.role = 'landlord'
      and landlord.is_verified = true
      and landlord.status <> 'disabled'
      and exists (
        select 1
        from public.apartment_rooms room
        where room.apartment_id = a.id
          and coalesce(room.status, case when room.is_occupied then 'occupied' else 'available' end) = 'available'
          and coalesce(room.is_occupied, false) = false
      )
  );
$$;

create or replace function public.get_apartment_view_counts()
returns table (
  apartment_id uuid,
  view_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select views.apartment_id,
         coalesce(sum(greatest(coalesce(views.view_count, 1), 1)), 0)::bigint as view_count
  from public.apartment_views views
  join public.apartments apartment on apartment.id = views.apartment_id
  where public.current_user_is_admin()
     or apartment.landlord_id = public.current_app_user_id()
     or public.apartment_is_tenant_visible(apartment.id)
  group by views.apartment_id
$$;

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

create or replace function public.sync_landlord_verification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'landlord' then
    insert into public.landlord_profiles (
      user_id, permit_number, business_permit_number, is_verified, verified_at, updated_at
    ) values (
      new.id, new.permit_number, new.permit_number, new.is_verified,
      case when new.is_verified then now() else null end,
      now()
    )
    on conflict (user_id) do update set
      permit_number = coalesce(landlord_profiles.permit_number, excluded.permit_number),
      business_permit_number = coalesce(landlord_profiles.business_permit_number, excluded.business_permit_number),
      is_verified = excluded.is_verified,
      verified_at = case
        when excluded.is_verified then coalesce(landlord_profiles.verified_at, now())
        else null
      end,
      updated_at = now();

    update public.apartments set updated_at = now() where landlord_id = new.id;

    if old.is_verified is distinct from new.is_verified then
      insert into public.notifications (
        user_id, type, title, message, payload, read, is_deleted
      ) values (
        new.id,
        case when new.is_verified then 'verification_approved' else 'verification_revoked' end,
        case when new.is_verified then 'Account Verified' else 'Verification Revoked' end,
        case
          when new.is_verified then 'Your landlord account has been verified by the Admin. You can now publish and manage apartment listings.'
          else 'Your landlord verification has been revoked by the Admin. Please review your account requirements.'
        end,
        jsonb_build_object(
          'action', case when new.is_verified then 'verification_approved' else 'verification_revoked' end,
          'verified', new.is_verified,
          'changed_at', now(),
          'admin_id', public.current_app_user_id()
        ),
        false,
        false
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sync_landlord_verification_state on public.app_users;
create trigger trg_sync_landlord_verification_state
after update of is_verified, status, verification_status, landlord_status on public.app_users
for each row
when (
  old.is_verified is distinct from new.is_verified
  or old.status is distinct from new.status
  or old.verification_status is distinct from new.verification_status
  or old.landlord_status is distinct from new.landlord_status
)
execute function public.sync_landlord_verification_state();

create or replace function public.protect_landlord_verification_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_verified is distinct from new.is_verified
     and auth.uid() is not null
     and not public.current_user_is_admin()
     and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Only an administrator can change landlord verification' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_landlord_verification_state on public.app_users;
create trigger trg_protect_landlord_verification_state
before update of is_verified on public.app_users
for each row
when (old.is_verified is distinct from new.is_verified)
execute function public.protect_landlord_verification_state();

create or replace function public.fn_set_landlord_verification(
  p_landlord_id uuid,
  p_verified boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.current_user_is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;

  update public.app_users
  set is_verified = p_verified,
      verification_status = case when p_verified then 'verified' else 'pending' end,
      landlord_status = case when p_verified then 'verified' else 'pending' end,
      status = case when p_verified then 'verified' else 'pending' end,
      updated_at = now()
  where id = p_landlord_id
    and role = 'landlord';

  if not found then
    raise exception 'Landlord account not found' using errcode = 'P0002';
  end if;

  return true;
end;
$$;

create or replace function public.protect_apartment_visibility_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or coalesce(auth.role(), '') = 'service_role' or public.current_user_is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.is_published
       or new.approval_status <> 'pending'
       or new.is_archived
       or new.deleted_at is not null then
      raise exception 'New apartment listings must await administrator approval' using errcode = '42501';
    end if;
    return new;
  end if;

  if old.approval_status is distinct from new.approval_status then
    raise exception 'Only an administrator can change property approval' using errcode = '42501';
  end if;

  if new.is_published and not old.is_published and (
    new.approval_status <> 'approved'
    or new.is_archived
    or new.deleted_at is not null
  ) then
    raise exception 'Only an approved, active property can be published' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_protect_apartment_visibility_state on public.apartments;
create trigger trg_protect_apartment_visibility_state
before insert or update on public.apartments
for each row execute function public.protect_apartment_visibility_state();

create or replace function public.fn_set_apartment_publication(
  p_apartment_id uuid,
  p_published boolean
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_app_user_id();
  v_is_admin boolean := public.current_user_is_admin();
  v_landlord_id uuid;
  v_approval_status text;
  v_is_archived boolean;
  v_deleted_at timestamptz;
  v_status text;
  v_landlord_role text;
  v_landlord_is_verified boolean;
  v_landlord_status text;
  v_landlord_verification_status text;
  v_landlord_account_status text;
begin
  select
    apartment.landlord_id,
    apartment.approval_status,
    apartment.is_archived,
    apartment.deleted_at,
    apartment.status,
    landlord.role,
    landlord.is_verified,
    landlord.status,
    landlord.verification_status,
    landlord.landlord_status
  into
    v_landlord_id,
    v_approval_status,
    v_is_archived,
    v_deleted_at,
    v_status,
    v_landlord_role,
    v_landlord_is_verified,
    v_landlord_status,
    v_landlord_verification_status,
    v_landlord_account_status
  from public.apartments apartment
  left join public.app_users landlord on landlord.id = apartment.landlord_id
  where apartment.id = p_apartment_id
  for update of apartment;

  if not found then
    raise exception 'Apartment not found' using errcode = 'P0002';
  end if;

  if not v_is_admin and v_actor_id is distinct from v_landlord_id then
    raise exception 'Not authorized to manage this apartment' using errcode = '42501';
  end if;

  if p_published and v_status <> 'available' then
    raise exception 'Only an active, available apartment can be published' using errcode = '23514';
  end if;

  if p_published and (
    v_landlord_id is null
    or v_landlord_role is distinct from 'landlord'
    or v_landlord_is_verified is distinct from true
    or lower(coalesce(v_landlord_status, '')) in ('pending', 'unverified', 'rejected', 'suspended', 'disabled')
    or lower(coalesce(v_landlord_verification_status, '')) in ('pending', 'unverified', 'rejected', 'suspended', 'disabled')
    or lower(coalesce(v_landlord_account_status, '')) in ('pending', 'unverified', 'rejected', 'suspended', 'disabled')
  ) then
    raise exception 'This apartment cannot be published because the landlord has not been verified.' using errcode = '42501';
  end if;

  if p_published and not v_is_admin and (
    v_approval_status <> 'approved' or v_is_archived or v_deleted_at is not null
  ) then
    raise exception 'This apartment must be approved by an administrator before publishing' using errcode = '42501';
  end if;

  update public.apartments
  set is_published = p_published,
      approval_status = case
        when v_is_admin and p_published then 'approved'
        when v_is_admin and not p_published then 'pending'
        else approval_status
      end,
      published_at = case
        when p_published then now()
        else null
      end,
      published_by = case
        when p_published then v_actor_id
        else null
      end,
      is_archived = case when v_is_admin and p_published then false else is_archived end,
      deleted_at = case when v_is_admin and p_published then null else deleted_at end,
      updated_at = now()
  where id = p_apartment_id;

  return true;
end;
$$;

create or replace function public.notify_listing_publication_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := public.current_app_user_id();
  v_actor_role public.app_user_role;
  v_title text := coalesce(nullif(new.title, ''), 'Untitled property');
  v_landlord_name text;
begin
  if old.is_published is not distinct from new.is_published then return new; end if;
  select role into v_actor_role from public.app_users where id = v_actor_id;
  select coalesce(nullif(name, ''), 'A landlord') into v_landlord_name from public.app_users where id = new.landlord_id;

  if v_actor_role in ('admin', 'super_admin') then
    insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
    values (
      new.landlord_id,
      case when new.is_published then 'property_published' else 'property_unpublished' end,
      case when new.is_published then 'Property published' else 'Property unpublished' end,
      format('Your property "%s" was %s by an administrator.', v_title, case when new.is_published then 'published' else 'unpublished' end),
      jsonb_build_object('apartment_id', new.id, 'action', case when new.is_published then 'property_published' else 'property_unpublished' end),
      false,
      '/apartment/' || new.id::text,
      new.id,
      'apartment'
    );
  elsif v_actor_role = 'landlord' then
    insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
    select id,
      case when new.is_published then 'property_published' else 'property_unpublished' end,
      case when new.is_published then 'Landlord published a property' else 'Landlord unpublished a property' end,
      format('%s %s "%s".', v_landlord_name, case when new.is_published then 'published' else 'unpublished' end, v_title),
      jsonb_build_object(
        'apartment_id', new.id,
        'landlord_id', new.landlord_id,
        'landlord_name', v_landlord_name,
        'property_name', v_title,
        'category', 'landlord_activity',
        'activity_type', case when new.is_published then 'property_published' else 'property_unpublished' end,
        'status', case when new.is_published then 'published' else 'unpublished' end,
        'action', case when new.is_published then 'property_published' else 'property_unpublished' end
      ),
      false, '/admin/apartment/' || new.id::text, new.id, 'apartment'
    from public.app_users where role in ('admin', 'super_admin');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_listing_publication_change on public.apartments;
create trigger trg_notify_listing_publication_change
after update of is_published on public.apartments
for each row execute function public.notify_listing_publication_change();

create or replace function pg_temp.ensure_public_fk(
  child_table text, child_column text, constraint_name text,
  parent_table text, parent_column text, on_delete_sql text, on_delete_code "char"
) returns void language plpgsql as $$
declare fk record; has_expected_fk boolean := false;
begin
  for fk in
    select c.conname, pn.nspname as parent_schema, pt.relname as parent_table,
           pa.attname as parent_column, c.confdeltype as delete_code
    from pg_constraint c
    join pg_class ct on ct.oid = c.conrelid
    join pg_namespace cn on cn.oid = ct.relnamespace
    join unnest(c.conkey) with ordinality child_cols(attnum, ord) on true
    join pg_attribute ca on ca.attrelid = c.conrelid and ca.attnum = child_cols.attnum
    join pg_class pt on pt.oid = c.confrelid
    join pg_namespace pn on pn.oid = pt.relnamespace
    join unnest(c.confkey) with ordinality parent_cols(attnum, ord) on parent_cols.ord = child_cols.ord
    join pg_attribute pa on pa.attrelid = c.confrelid and pa.attnum = parent_cols.attnum
    where c.contype = 'f' and cn.nspname = 'public' and ct.relname = child_table and ca.attname = child_column
  loop
    if fk.parent_schema = 'public' and fk.parent_table = parent_table and
       fk.parent_column = parent_column and fk.delete_code = on_delete_code then
      has_expected_fk := true;
    else
      execute format('alter table public.%I drop constraint %I', child_table, fk.conname);
    end if;
  end loop;

  if not has_expected_fk then
    execute format('alter table public.%I add constraint %I foreign key (%I) references public.%I (%I) on delete %s not valid',
      child_table, constraint_name, child_column, parent_table, parent_column, on_delete_sql);
  end if;
end;
$$;

select pg_temp.ensure_public_fk('signups', 'user_id', 'signups_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('logins', 'user_id', 'logins_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('tenant_profiles', 'user_id', 'tenant_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('landlord_profiles', 'user_id', 'landlord_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('admin_profiles', 'user_id', 'admin_profiles_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartments', 'landlord_id', 'apartments_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_images', 'apartment_id', 'apartment_images_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_rooms', 'apartment_id', 'apartment_rooms_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_views', 'apartment_id', 'apartment_views_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('apartment_views', 'viewer_id', 'apartment_views_viewer_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('favorites', 'user_id', 'favorites_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('favorites', 'apartment_id', 'favorites_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('reports', 'reporter_id', 'reports_reporter_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'user_id', 'reports_user_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'apartment_id', 'reports_apartment_id_apartments_fkey', 'apartments', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'landlord_id', 'reports_landlord_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('reports', 'reviewed_by', 'reports_reviewed_by_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'landlord_id', 'violations_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('violations', 'admin_id', 'violations_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'related_report_id', 'violations_related_report_id_reports_fkey', 'reports', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('violations', 'apartment_id', 'violations_apartment_id_apartments_fkey', 'apartments', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('notifications', 'user_id', 'notifications_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('audit_logs', 'admin_id', 'audit_logs_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('appeals', 'landlord_id', 'appeals_landlord_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('appeals', 'report_id', 'appeals_report_id_reports_fkey', 'reports', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('appeals', 'violation_id', 'appeals_violation_id_violations_fkey', 'violations', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('appeals', 'admin_id', 'appeals_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_evidence', 'report_id', 'report_evidence_report_id_reports_fkey', 'reports', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_evidence', 'uploaded_by', 'report_evidence_uploaded_by_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_audit_log', 'report_id', 'report_audit_log_report_id_reports_fkey', 'reports', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_audit_log', 'admin_id', 'report_audit_log_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_responses', 'report_id', 'report_responses_report_id_reports_fkey', 'reports', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_responses', 'respondent_id', 'report_responses_respondent_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_responses', 'reviewed_by', 'report_responses_reviewed_by_app_users_fkey', 'app_users', 'id', 'set null', 'n');
select pg_temp.ensure_public_fk('report_duplicate_check', 'reporter_id', 'report_duplicate_check_reporter_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('report_duplicate_check', 'apartment_id', 'report_duplicate_check_apartment_id_apartments_fkey', 'apartments', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('support_tickets', 'user_id', 'support_tickets_user_id_app_users_fkey', 'app_users', 'id', 'cascade', 'c');
select pg_temp.ensure_public_fk('support_tickets', 'assigned_admin_id', 'support_tickets_assigned_admin_id_app_users_fkey', 'app_users', 'id', 'set null', 'n');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.app_users'::regclass
      and conname = 'app_users_auth_id_auth_users_fkey'
  ) then
    alter table public.app_users
      add constraint app_users_auth_id_auth_users_fkey
      foreign key (auth_id) references auth.users (id) on delete cascade not valid;
  end if;
end $$;

select 'apartments missing app_users landlord' as check_name, a.id, a.landlord_id
from public.apartments a left join public.app_users u on u.id = a.landlord_id where u.id is null;

select 'favorites missing app_users user' as check_name, f.id, f.user_id
from public.favorites f left join public.app_users u on u.id = f.user_id where u.id is null;

alter table public.app_users enable row level security;
alter table public.apartments enable row level security;
alter table public.apartment_images enable row level security;
alter table public.apartment_rooms enable row level security;
alter table public.apartment_views enable row level security;
alter table public.favorites enable row level security;
alter table public.apartment_ratings enable row level security;
alter table public.reports enable row level security;
alter table public.violations enable row level security;
alter table public.notifications enable row level security;
alter table public.apartment_verification_documents enable row level security;
alter table public.signups enable row level security;
alter table public.logins enable row level security;
alter table public.tenant_profiles enable row level security;
alter table public.landlord_profiles enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.appeals enable row level security;
alter table public.report_evidence enable row level security;
alter table public.report_audit_log enable row level security;
alter table public.report_responses enable row level security;
alter table public.report_duplicate_check enable row level security;
alter table public.support_tickets enable row level security;
alter table public.property_drafts enable row level security;

do $$
declare p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'app_users', 'apartments', 'apartment_images', 'apartment_rooms',
        'apartment_views', 'favorites', 'reports', 'violations', 'notifications',
        'apartment_verification_documents',
        'signups', 'logins', 'tenant_profiles',
        'landlord_profiles', 'admin_profiles', 'audit_logs', 'appeals',
        'report_evidence', 'report_audit_log', 'report_responses',
        'report_duplicate_check', 'support_tickets', 'property_drafts'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

drop policy if exists "dev_app_users_select" on public.app_users;
drop policy if exists "dev_app_users_insert" on public.app_users;
drop policy if exists "dev_app_users_update" on public.app_users;
drop policy if exists "dev_app_users_delete" on public.app_users;
drop policy if exists "dev_apartments_all" on public.apartments;
drop policy if exists "dev_apartment_images_all" on public.apartment_images;
drop policy if exists "dev_apartment_rooms_all" on public.apartment_rooms;
drop policy if exists "dev_apartment_views_all" on public.apartment_views;
drop policy if exists "dev_apartment_storage_all" on storage.objects;
drop policy if exists "apartment_storage_public_read" on storage.objects;
drop policy if exists "apartment_storage_owner_write" on storage.objects;
drop policy if exists "avatar_storage_public_read" on storage.objects;
drop policy if exists "avatar_storage_owner_write" on storage.objects;
drop policy if exists "evidence_storage_read_related" on storage.objects;
drop policy if exists "evidence_storage_create_reporter" on storage.objects;
drop policy if exists "evidence_storage_delete_admin" on storage.objects;
drop policy if exists "verification_storage_read_related" on storage.objects;
drop policy if exists "verification_storage_owner_write" on storage.objects;
drop policy if exists "dev_favorites_all" on public.favorites;
drop policy if exists "dev_reports_all" on public.reports;
drop policy if exists "dev_violations_all" on public.violations;
drop policy if exists "dev_notifications_all" on public.notifications;
drop policy if exists "dev_signups_all" on public.signups;
drop policy if exists "dev_logins_all" on public.logins;
drop policy if exists "dev_landlord_profiles_all" on public.landlord_profiles;
drop policy if exists "dev_admin_profiles_all" on public.admin_profiles;
drop policy if exists "dev_audit_logs_all" on public.audit_logs;
drop policy if exists "dev_appeals_all" on public.appeals;
drop policy if exists "dev_report_evidence_all" on public.report_evidence;
drop policy if exists "dev_report_audit_log_all" on public.report_audit_log;
drop policy if exists "dev_report_responses_all" on public.report_responses;
drop policy if exists "dev_report_duplicate_check_all" on public.report_duplicate_check;

create policy "app_users_read_authorized" on public.app_users for select to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_admin());
create policy "app_users_update_own_or_admin" on public.app_users for update to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_admin())
  with check (id = public.current_app_user_id() or public.current_user_is_admin());
create policy "app_users_delete_own_or_admin" on public.app_users for delete to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_admin());

create policy "apartments_public_read" on public.apartments for select to anon
  using (public.apartment_is_tenant_visible(id));
create policy "apartments_authenticated_read" on public.apartments for select to authenticated
  using (public.apartment_is_tenant_visible(id) or landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "apartments_owner_insert" on public.apartments for insert to authenticated
  with check (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "apartments_owner_update" on public.apartments for update to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "apartments_owner_delete" on public.apartments for delete to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "apartment_images_visible_listing" on public.apartment_images for select to anon, authenticated
  using (public.apartment_is_tenant_visible(apartment_id) or exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "apartment_images_owner_write" on public.apartment_images for all to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())))
  with check (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));

create policy "apartment_rooms_visible_listing" on public.apartment_rooms for select to anon, authenticated
  using (public.apartment_is_tenant_visible(apartment_id) or exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "apartment_rooms_owner_write" on public.apartment_rooms for all to authenticated
  using (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())))
  with check (exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));

create policy "verification_documents_read_related" on public.apartment_verification_documents for select to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "verification_documents_owner_insert" on public.apartment_verification_documents for insert to authenticated
  with check (
    landlord_id = public.current_app_user_id()
    and exists (select 1 from public.apartments a where a.id = apartment_id and a.landlord_id = public.current_app_user_id())
  );
create policy "verification_documents_owner_update" on public.apartment_verification_documents for update to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "verification_documents_owner_delete" on public.apartment_verification_documents for delete to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "apartment_views_read_related" on public.apartment_views for select to authenticated
  using (viewer_id = public.current_app_user_id() or public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id = apartment_id and a.landlord_id = public.current_app_user_id()));
create policy "apartment_views_record_self" on public.apartment_views for insert to authenticated
  with check (viewer_id = public.current_app_user_id());
create policy "apartment_views_update_self" on public.apartment_views for update to authenticated
  using (viewer_id = public.current_app_user_id()) with check (viewer_id = public.current_app_user_id());

create policy "favorites_read_related" on public.favorites for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id = apartment_id and a.landlord_id = public.current_app_user_id()));
create policy "favorites_manage_self" on public.favorites for all to authenticated
  using (user_id = public.current_app_user_id()) with check (user_id = public.current_app_user_id());

drop policy if exists "apartment_ratings_read_related" on public.apartment_ratings;
drop policy if exists "apartment_ratings_manage_self" on public.apartment_ratings;
create policy "apartment_ratings_read_related" on public.apartment_ratings for select to authenticated
  using (public.current_user_is_admin() or tenant_id = public.current_app_user_id() or exists (select 1 from public.apartments a where a.id = apartment_id and (a.landlord_id = public.current_app_user_id() or public.apartment_is_tenant_visible(a.id))));
create policy "apartment_ratings_manage_self" on public.apartment_ratings for all to authenticated
  using (tenant_id = public.current_app_user_id())
  with check (tenant_id = public.current_app_user_id() and exists (select 1 from public.app_users u where u.id = tenant_id and u.role = 'tenant'));

create policy "reports_read_related" on public.reports for select to authenticated
  using (reporter_id = public.current_app_user_id() or landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "reports_create_self" on public.reports for insert to authenticated
  with check (reporter_id = public.current_app_user_id());
create policy "reports_admin_update" on public.reports for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "violations_read_related" on public.violations for select to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "violations_admin_write" on public.violations for all to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "notifications_read_own_or_admin" on public.notifications for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "notifications_update_own_or_admin" on public.notifications for update to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "notifications_delete_own_or_admin" on public.notifications for delete to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "notifications_create_authorized" on public.notifications for insert to authenticated
  with check (public.current_user_is_admin() or user_id = public.current_app_user_id() or exists (select 1 from public.app_users u where u.id = user_id and u.role in ('admin', 'super_admin')));

create policy "signups_read_own_or_admin" on public.signups for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "signups_create_own" on public.signups for insert to authenticated
  with check (user_id = public.current_app_user_id());
create policy "logins_read_own_or_admin" on public.logins for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "logins_create_own" on public.logins for insert to authenticated
  with check (user_id = public.current_app_user_id());

create policy "tenant_profiles_own_or_admin"
on public.tenant_profiles
for all
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.current_user_is_admin()
)
with check (
  user_id = public.current_app_user_id()
  or public.current_user_is_admin()
);

create policy "landlord_profiles_read_own_or_admin" on public.landlord_profiles for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "landlord_profiles_write_own_or_admin" on public.landlord_profiles for all to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "admin_profiles_own_or_admin" on public.admin_profiles for all to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin())
  with check (user_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "appeals_read_related" on public.appeals for select to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "appeals_create_self" on public.appeals for insert to authenticated
  with check (landlord_id = public.current_app_user_id());
create policy "appeals_admin_update" on public.appeals for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "appeals_delete_self_or_admin" on public.appeals for delete to authenticated
  using (landlord_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated using (public.current_user_is_admin());
create policy "audit_logs_actor_insert" on public.audit_logs for insert to authenticated
  with check (admin_id = public.current_app_user_id() or public.current_user_is_admin());

drop policy if exists "report_evidence_reporter_view" on public.report_evidence;
drop policy if exists "report_evidence_reporter_insert" on public.report_evidence;
create policy "report_evidence_read_related" on public.report_evidence for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and (r.reporter_id = public.current_app_user_id() or r.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "report_evidence_create_reporter" on public.report_evidence for insert to authenticated
  with check (uploaded_by = public.current_app_user_id() and exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = public.current_app_user_id()));
create policy "report_evidence_admin_delete" on public.report_evidence for delete to authenticated using (public.current_user_is_admin());

create policy "report_audit_read_related" on public.report_audit_log for select to authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and (r.reporter_id = public.current_app_user_id() or r.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "report_audit_admin_insert" on public.report_audit_log for insert to authenticated with check (public.current_user_is_admin());
create policy "report_responses_read_related" on public.report_responses for select to authenticated
  using (respondent_id = public.current_app_user_id() or public.current_user_is_admin() or exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = public.current_app_user_id()));
create policy "report_responses_create_self" on public.report_responses for insert to authenticated with check (respondent_id = public.current_app_user_id());
create policy "report_responses_admin_update" on public.report_responses for update to authenticated using (public.current_user_is_admin()) with check (public.current_user_is_admin());
create policy "duplicate_checks_read_self" on public.report_duplicate_check for select to authenticated using (reporter_id = public.current_app_user_id() or public.current_user_is_admin());

create policy "support_tickets_read_related" on public.support_tickets for select to authenticated
  using (user_id = public.current_app_user_id() or public.current_user_is_admin());
create policy "support_tickets_create_self" on public.support_tickets for insert to authenticated
  with check (user_id = public.current_app_user_id());
create policy "support_tickets_admin_update" on public.support_tickets for update to authenticated
  using (public.current_user_is_admin()) with check (public.current_user_is_admin());

create policy "property_drafts_read_own_unexpired" on public.property_drafts for select to authenticated
  using (user_id = public.current_app_user_id() and expires_at > now());
create policy "property_drafts_insert_own" on public.property_drafts for insert to authenticated
  with check (user_id = public.current_app_user_id());
create policy "property_drafts_update_own" on public.property_drafts for update to authenticated
  using (user_id = public.current_app_user_id())
  with check (user_id = public.current_app_user_id());
create policy "property_drafts_delete_own" on public.property_drafts for delete to authenticated
  using (user_id = public.current_app_user_id());

create policy "apartment_storage_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'apartment-images');
create policy "apartment_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'apartment-images' and (public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id::text = (storage.foldername(name))[1] and a.landlord_id = public.current_app_user_id())))
  with check (bucket_id = 'apartment-images' and (public.current_user_is_admin() or exists (select 1 from public.apartments a where a.id::text = (storage.foldername(name))[1] and a.landlord_id = public.current_app_user_id())));
create policy "avatar_storage_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'user-avatars');
create policy "avatar_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'user-avatars' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text))
  with check (bucket_id = 'user-avatars' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text));
create policy "evidence_storage_read_related" on storage.objects for select to authenticated
  using (bucket_id = 'report-evidence' and exists (select 1 from public.reports r where r.id::text = (storage.foldername(name))[1] and (r.reporter_id = public.current_app_user_id() or r.landlord_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "evidence_storage_create_reporter" on storage.objects for insert to authenticated
  with check (bucket_id = 'report-evidence' and exists (select 1 from public.reports r where r.id::text = (storage.foldername(name))[1] and r.reporter_id = public.current_app_user_id()));
create policy "evidence_storage_delete_admin" on storage.objects for delete to authenticated
  using (bucket_id = 'report-evidence' and exists (select 1 from public.reports r where r.id::text = (storage.foldername(name))[1] and (r.reporter_id = public.current_app_user_id() or public.current_user_is_admin())));
create policy "verification_storage_read_related" on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text));
create policy "verification_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'verification-documents' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text))
  with check (bucket_id = 'verification-documents' and (public.current_user_is_admin() or (storage.foldername(name))[1] = public.current_app_user_id()::text));

do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['app_users', 'tenant_profiles', 'apartments', 'apartment_images', 'apartment_rooms', 'apartment_views', 'favorites', 'apartment_ratings', 'reports', 'violations', 'notifications', 'apartment_verification_documents', 'appeals', 'audit_logs', 'support_tickets'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

grant usage on schema public to postgres, anon, authenticated, service_role;
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
grant select on public.apartments, public.apartment_images, public.apartment_rooms to anon;
grant select on public.app_users to anon;
grant select on public.public_landlords to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public grant execute on functions to authenticated, service_role;

grant execute on function public.fn_mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.fn_mark_all_notifications_read(uuid) to authenticated, service_role;
grant execute on function public.fn_get_unread_notification_count(uuid) to authenticated, service_role;
grant execute on function public.fn_submit_appeal_followup(uuid, text, jsonb) to authenticated, service_role;
grant execute on function public.fn_merge_user_preference_section(uuid, text, jsonb) to authenticated, service_role;
revoke execute on function public.fn_set_landlord_verification(uuid, boolean) from public, anon;
grant execute on function public.fn_set_landlord_verification(uuid, boolean) to authenticated, service_role;
revoke execute on function public.fn_set_apartment_publication(uuid, boolean) from public, anon;
grant execute on function public.fn_set_apartment_publication(uuid, boolean) to authenticated, service_role;
grant execute on function public.apartment_is_tenant_visible(uuid) to anon, authenticated, service_role;
grant execute on function public.get_apartment_detail_access_state(uuid) to anon, authenticated, service_role;
grant execute on function public.get_public_landlords() to anon, authenticated, service_role;
grant execute on function public.get_apartment_view_counts() to authenticated, service_role;
grant execute on function public.fn_delete_my_account() to authenticated;
grant execute on function public.fn_resolve_username_login(text) to anon, authenticated, service_role;
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable'
      and pg_get_function_identity_arguments(p.oid) = ''
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
    grant execute on function public.rls_auto_enable() to service_role;
  end if;
end $$;

update public.app_users landlord
set is_verified = true,
    status = 'verified',
    verification_status = 'verified',
    landlord_status = 'verified',
    updated_at = now()
from public.landlord_profiles profile
where landlord.id = profile.user_id
  and landlord.role = 'landlord'
  and landlord.is_verified = false
  and (
    profile.is_verified = true
    or lower(coalesce(landlord.status, '')) in ('verified', 'approved')
    or lower(coalesce(landlord.verification_status, '')) in ('verified', 'approved')
    or lower(coalesce(landlord.landlord_status, '')) in ('verified', 'approved')
  );

insert into public.notifications (
  user_id, type, title, message, payload, read, is_deleted
)
select
  landlord.id,
  'verification_approved',
  'Account Verified',
  'Your landlord account has been verified by the Admin. You can now publish and manage apartment listings.',
  jsonb_build_object('action', 'verification_approved', 'verified', true, 'backfilled', true),
  false,
  false
from public.app_users landlord
where landlord.role = 'landlord'
  and landlord.is_verified = true
  and not exists (
    select 1
    from public.notifications notification
    where notification.user_id = landlord.id
      and notification.type = 'verification_approved'
  );

update public.app_users set
  signup_source = coalesce(nullif(signup_source, ''), 'web'),
  verification_status = case when role = 'landlord' and is_verified then 'verified' when role = 'landlord' then 'pending' else coalesce(nullif(verification_status, ''), 'verified') end,
  landlord_status = case when role = 'landlord' then case when is_verified then 'verified' else coalesce(nullif(status, ''), 'pending') end else landlord_status end;

update public.landlord_profiles profile
set is_verified = landlord.is_verified,
    verified_at = case when landlord.is_verified then coalesce(profile.verified_at, now()) else null end,
    updated_at = now()
from public.app_users landlord
where landlord.id = profile.user_id
  and landlord.role = 'landlord'
  and profile.is_verified is distinct from landlord.is_verified;

create table if not exists public.user_backup_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.app_users(id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now(),
  used_at timestamptz,
  revoked boolean not null default false
);

create index if not exists user_backup_codes_active_idx
  on public.user_backup_codes (user_id, revoked, used_at);

alter table public.user_backup_codes enable row level security;
revoke all on public.user_backup_codes from anon, authenticated;

create or replace function public.fn_generate_backup_codes()
returns text[]
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  app_user_id uuid;
  raw_codes text[] := array[]::text[];
  raw_code text;
  counter integer;
begin
  select id into app_user_id
  from public.app_users
  where auth_id = auth.uid();

  if app_user_id is null then
    raise exception 'Authenticated profile not found';
  end if;

  update public.user_backup_codes
  set revoked = true
  where user_id = app_user_id and used_at is null and revoked = false;

  for counter in 1..10 loop
    raw_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 12));
    insert into public.user_backup_codes (user_id, code_hash)
    values (app_user_id, crypt(raw_code, gen_salt('bf', 12)));
    raw_codes := array_append(raw_codes, raw_code);
  end loop;

  return raw_codes;
end;
$$;

create or replace function public.fn_consume_backup_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  app_user_id uuid;
  matched_id uuid;
begin
  select id into app_user_id
  from public.app_users
  where auth_id = auth.uid();

  if app_user_id is null or nullif(trim(p_code), '') is null then
    return false;
  end if;

  select id into matched_id
  from public.user_backup_codes
  where user_id = app_user_id
    and used_at is null
    and revoked = false
    and code_hash = crypt(upper(trim(p_code)), code_hash)
  limit 1
  for update;

  if matched_id is null then
    return false;
  end if;

  update public.user_backup_codes
  set used_at = now()
  where id = matched_id;

  return true;
end;
$$;

revoke all on function public.fn_generate_backup_codes() from public;
revoke all on function public.fn_consume_backup_code(text) from public;
grant execute on function public.fn_generate_backup_codes() to authenticated;
grant execute on function public.fn_consume_backup_code(text) to authenticated;

begin;

alter table public.app_users
  add column if not exists username text;

update public.app_users
set
  role = 'tenant'::public.app_user_role,
  updated_at = now()
where role::text in ('student', 'employee');

insert into public.tenant_profiles (user_id)
select id
from public.app_users
where role = 'tenant'
on conflict (user_id) do nothing;

drop table if exists public.student_profiles cascade;
drop table if exists public.employee_profiles cascade;

alter table public.app_users drop constraint if exists app_users_tenant_type_check;
alter table public.app_users drop constraint if exists app_users_other_occupation_check;
drop index if exists public.idx_app_users_tenant_type;

alter table public.app_users drop column if exists tenant_type cascade;
alter table public.app_users drop column if exists other_occupation cascade;
alter table public.app_users drop column if exists other_organization cascade;
alter table public.app_users drop column if exists other_workplace cascade;

update public.app_users
set username = 'user_' || substr(replace(id::text, '-', ''), 1, 12)
where username is null;

alter table public.app_users drop constraint if exists app_users_username_format_check;
alter table public.app_users add constraint app_users_username_format_check
check (username ~ '^[A-Za-z0-9_]{4,30}$');

create unique index if not exists app_users_username_unique
  on public.app_users (lower(username));

alter table public.app_users alter column username set not null;

insert into public.app_users (
  username,
  email,
  name,
  role,
  status,
  is_verified,
  email_verified,
  verification_status,
  signup_source,
  admin_level,
  department
)
values
  (
    'admin',
    'admin@aptfindr.com',
    'AptFindr Administrator',
    'admin'::public.app_user_role,
    'active',
    true,
    false,
    'pending_auth_link',
    'manual_admin_bootstrap',
    'Full Administrator',
    'Platform Administration'
  ),
  (
    'superadmin',
    'superadmin@aptfindr.com',
    'Super Administrator',
    'super_admin'::public.app_user_role,
    'active',
    true,
    false,
    'pending_auth_link',
    'manual_super_admin_bootstrap',
    'Super Administrator',
    'Platform Administration'
  )
on conflict (email) do update set
  username = case
    when app_users.role in ('admin', 'super_admin') then excluded.username
    else app_users.username
  end,
  name = case
    when app_users.role in ('admin', 'super_admin') then excluded.name
    else app_users.name
  end,
  status = case
    when app_users.role in ('admin', 'super_admin') then 'active'
    else app_users.status
  end,
  admin_level = case
    when app_users.role in ('admin', 'super_admin') then excluded.admin_level
    else app_users.admin_level
  end,
  department = case
    when app_users.role in ('admin', 'super_admin') then excluded.department
    else app_users.department
  end,
  signup_source = case
    when app_users.role in ('admin', 'super_admin') then excluded.signup_source
    else app_users.signup_source
  end;

insert into public.admin_profiles (user_id, admin_level, department)
select
  u.id,
  case when u.role = 'super_admin' then 'Super Administrator' else 'Full Administrator' end,
  coalesce(nullif(u.department, ''), 'Platform Administration')
from public.app_users u
where lower(u.email) in ('admin@aptfindr.com', 'superadmin@aptfindr.com')
  and u.role in ('admin', 'super_admin')
on conflict (user_id) do update set
  admin_level = excluded.admin_level,
  department = excluded.department,
  updated_at = now();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where auth_id = auth.uid()
      and role in ('admin', 'super_admin')
      and status <> 'disabled'
  )
$$;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_users
    where auth_id = auth.uid()
      and role = 'super_admin'
      and status <> 'disabled'
  )
$$;

create or replace function public.current_app_user_role()
returns public.app_user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.app_users where auth_id = auth.uid() limit 1
$$;

drop policy if exists "app_users_update_own_or_admin" on public.app_users;
create policy "app_users_update_own_or_admin" on public.app_users for update to authenticated
  using (
    id = public.current_app_user_id()
    or public.current_user_is_super_admin()
    or (public.current_user_is_admin() and role not in ('admin', 'super_admin'))
  )
  with check (
    (id = public.current_app_user_id() and role = public.current_app_user_role())
    or public.current_user_is_super_admin()
    or (public.current_user_is_admin() and role not in ('admin', 'super_admin'))
  );

drop policy if exists "app_users_delete_own_or_admin" on public.app_users;
create policy "app_users_delete_own_or_admin" on public.app_users for delete to authenticated
  using (id = public.current_app_user_id() or public.current_user_is_super_admin());

drop policy if exists "admin_profiles_own_or_admin" on public.admin_profiles;
drop policy if exists "admin_profiles_own_or_super_admin" on public.admin_profiles;

create policy "admin_profiles_own_or_super_admin"
on public.admin_profiles
for all
to authenticated
using (
  user_id = public.current_app_user_id()
  or public.current_user_is_super_admin()
)
with check (
  user_id = public.current_app_user_id()
  or public.current_user_is_super_admin()
);

grant execute on function public.current_user_is_super_admin() to authenticated, service_role;
grant execute on function public.current_app_user_role() to authenticated, service_role;

select
  id,
  auth_id,
  username,
  email,
  name,
  role,
  status,
  email_verified,
  verification_status,
  admin_level,
  department
from public.app_users
where lower(email) in ('admin@aptfindr.com', 'superadmin@aptfindr.com')
order by case role when 'super_admin' then 0 else 1 end;

create table if not exists public.platform_status (
  id boolean primary key default true check (id),
  status text not null default 'operational' check (status in ('operational', 'maintenance')),
  title text not null default 'AptFindr is operational',
  message text not null default 'All systems are running normally.',
  expected_end_at timestamptz,
  started_at timestamptz,
  started_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.platform_status (id) values (true) on conflict (id) do nothing;

create table if not exists public.maintenance_history (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  started_by uuid references public.app_users(id) on delete set null,
  started_at timestamptz not null default now(),
  expected_end_at timestamptz,
  ended_at timestamptz,
  ended_by uuid references public.app_users(id) on delete set null
);
create index if not exists idx_maintenance_history_started on public.maintenance_history(started_at desc);

alter table public.platform_status enable row level security;
alter table public.maintenance_history enable row level security;
drop policy if exists "platform_status_authenticated_read" on public.platform_status;
create policy "platform_status_authenticated_read" on public.platform_status for select to authenticated using (true);
drop policy if exists "maintenance_history_super_admin_read" on public.maintenance_history;
create policy "maintenance_history_super_admin_read" on public.maintenance_history for select to authenticated using (public.current_user_is_super_admin());
grant select on public.platform_status to authenticated, service_role;
grant select on public.maintenance_history to authenticated, service_role;
grant all on public.platform_status, public.maintenance_history to service_role;

create or replace function public.block_writes_during_maintenance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if exists (
    select 1
    from public.platform_status
    where id = true and status = 'maintenance'
  )
  and not public.current_user_is_super_admin() then
    raise exception 'AptFindr is temporarily under maintenance';
  end if;

  return coalesce(new, old);
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['app_users','tenant_profiles','apartments','apartment_rooms','apartment_images','apartment_verification_documents','reports','appeals','violations','favorites','apartment_ratings','support_tickets'] loop
    execute format('drop trigger if exists trg_maintenance_write_guard on public.%I', table_name);
    execute format('create trigger trg_maintenance_write_guard before insert or update or delete on public.%I for each row execute function public.block_writes_during_maintenance()', table_name);
  end loop;
end $$;

revoke all on function public.block_writes_during_maintenance() from public, anon, authenticated;
grant execute on function public.block_writes_during_maintenance() to service_role;

create or replace function public.fn_upsert_my_super_admin_profile(
  p_name text,
  p_department text default null,
  p_avatar_url text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.app_users
  where auth_id = auth.uid()
    and role = 'super_admin'
    and status <> 'disabled';

  if v_user_id is null then
    raise exception 'Super Admin access required';
  end if;
  if nullif(trim(p_name), '') is null or length(trim(p_name)) > 120 then
    raise exception 'Full Name is required and must be 120 characters or fewer';
  end if;
  if p_department is not null and length(trim(p_department)) > 120 then
    raise exception 'Department must be 120 characters or fewer';
  end if;
  if p_avatar_url is not null and length(p_avatar_url) > 2048 then
    raise exception 'Avatar URL is too long';
  end if;

  update public.app_users
  set name = trim(p_name),
      department = nullif(trim(p_department), ''),
      avatar_url = nullif(trim(p_avatar_url), ''),
      updated_at = now()
  where id = v_user_id;

  insert into public.admin_profiles (user_id, admin_level, department)
  values (v_user_id, 'Super Administrator', nullif(trim(p_department), ''))
  on conflict (user_id) do update
  set department = excluded.department,
      admin_level = 'Super Administrator',
      updated_at = now();

  insert into public.audit_logs (admin_id, action, target_type, target_id, details)
  values (v_user_id, 'super_admin_profile_updated', 'super_admin_profile', v_user_id, jsonb_build_object('department', nullif(trim(p_department), '')));
  return true;
end;
$$;

revoke all on function public.fn_upsert_my_super_admin_profile(text, text, text) from public, anon;
grant execute on function public.fn_upsert_my_super_admin_profile(text, text, text) to authenticated, service_role;

drop policy if exists "avatar_storage_owner_write" on storage.objects;
create policy "avatar_storage_owner_write" on storage.objects for all to authenticated
  using (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = public.current_app_user_id()::text)
  with check (bucket_id = 'user-avatars' and (storage.foldername(name))[1] = public.current_app_user_id()::text);

create or replace function public.notify_tenants_of_new_apartment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.is_published = true
     and old.is_published is distinct from true
     and new.approval_status = 'approved'
     and new.is_archived = false
     and new.deleted_at is null
     and new.status = 'available' then
    insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
    select tenant.id,
      'new_apartment_available',
      'New apartment available',
      format('"%s" is now available in AptFindr.', coalesce(nullif(new.title, ''), 'A new apartment')),
      jsonb_build_object('apartment_id', new.id, 'event', 'published'),
      false,
      '/apartment/' || new.id::text,
      new.id,
      'apartment'
    from public.app_users tenant
    where tenant.role = 'tenant'
      and tenant.status <> 'disabled'
      and tenant.preferences #> '{notifications,newApartments}' is distinct from 'false'::jsonb
      and not exists (
        select 1 from public.notifications existing
        where existing.user_id = tenant.id
          and existing.type = 'new_apartment_available'
          and existing.action_target_id = new.id
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_tenants_of_new_apartment on public.apartments;
create trigger trg_notify_tenants_of_new_apartment
after update of is_published on public.apartments
for each row execute function public.notify_tenants_of_new_apartment();

create or replace function public.notify_favorites_of_apartment_availability()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_event_key text := 'apartment:' || new.id::text || ':' || txid_current()::text;
begin
  if new.status = 'available'
     and old.status is distinct from 'available'
     and new.is_published = true
     and new.approval_status = 'approved'
     and new.is_archived = false
     and new.deleted_at is null then
    insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
    select favorite.user_id,
      'favorite_availability',
      'Saved apartment available',
      format('"%s" is available again.', coalesce(nullif(new.title, ''), 'A saved apartment')),
      jsonb_build_object('apartment_id', new.id, 'availability_event', v_event_key),
      false, '/apartment/' || new.id::text, new.id, 'apartment'
    from public.favorites favorite
    join public.app_users tenant on tenant.id = favorite.user_id
    where favorite.apartment_id = new.id
      and tenant.status <> 'disabled'
      and tenant.preferences #> '{notifications,favoriteAvailability}' is distinct from 'false'::jsonb
      and not exists (
        select 1 from public.notifications existing
        where existing.user_id = favorite.user_id
          and existing.type = 'favorite_availability'
          and existing.payload ->> 'availability_event' = v_event_key
      );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_favorites_of_apartment_availability on public.apartments;
create trigger trg_notify_favorites_of_apartment_availability
after update of status on public.apartments
for each row execute function public.notify_favorites_of_apartment_availability();

create or replace function public.notify_tenant_of_resolved_report()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_tenant_id uuid := coalesce(new.reporter_id, new.user_id);
  v_apartment_title text;
  v_notification_type text;
  v_title text;
  v_message text;
begin
  if new.status::text in ('resolved', 'dismissed')
     and old.status is distinct from new.status
     and v_tenant_id is not null then
    select nullif(trim(title), '') into v_apartment_title
    from public.apartments where id = new.apartment_id;

    if new.status::text = 'resolved' then
      v_notification_type := 'report_resolved';
      v_title := 'Report Resolved';
      v_message := case when v_apartment_title is not null
        then format('Your report regarding %s has been resolved by the administrator.', v_apartment_title)
        else 'Your submitted report has been resolved by the administrator.'
      end;
    else
      v_notification_type := 'report_dismissed';
      v_title := 'Report Reviewed';
      v_message := case when v_apartment_title is not null
        then format('Your report regarding %s was reviewed and dismissed by the administrator.', v_apartment_title)
        else 'Your submitted report was reviewed and dismissed by the administrator.'
      end;
    end if;

    insert into public.notifications (
      user_id, type, title, message, payload, read,
      action_url, action_target_id, action_target_type
    )
    select
      v_tenant_id,
      v_notification_type,
      v_title,
      v_message,
      jsonb_build_object('report_id', new.id, 'apartment_id', new.apartment_id, 'status', new.status),
      false,
      '/dashboard?section=notifications&reportId=' || new.id::text,
      new.id,
      'report'
    where not exists (
      select 1 from public.notifications existing
      where existing.user_id = v_tenant_id
        and existing.type = v_notification_type
        and existing.action_target_id = new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_tenant_of_resolved_report on public.reports;
create trigger trg_notify_tenant_of_resolved_report
after update of status on public.reports
for each row execute function public.notify_tenant_of_resolved_report();

create or replace function public.notify_favorites_of_room_availability()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_apartment public.apartments%rowtype;
  v_event_key text := 'room:' || new.id::text || ':' || txid_current()::text;
begin
  if new.status = 'available'
     and new.is_occupied = false
     and (old.status is distinct from 'available' or old.is_occupied is distinct from false) then
    select * into v_apartment from public.apartments where id = new.apartment_id;
    if v_apartment.is_published = true and v_apartment.approval_status = 'approved'
       and v_apartment.is_archived = false and v_apartment.deleted_at is null
       and v_apartment.status = 'available' then
      insert into public.notifications (user_id, type, title, message, payload, read, action_url, action_target_id, action_target_type)
      select favorite.user_id,
        'favorite_availability',
        'Room available in a saved apartment',
        format('A room in "%s" is now available.', coalesce(nullif(v_apartment.title, ''), 'a saved apartment')),
        jsonb_build_object('apartment_id', v_apartment.id, 'room_id', new.id, 'availability_event', v_event_key),
        false, '/apartment/' || v_apartment.id::text, v_apartment.id, 'apartment'
      from public.favorites favorite
      join public.app_users tenant on tenant.id = favorite.user_id
      where favorite.apartment_id = v_apartment.id
        and tenant.status <> 'disabled'
        and tenant.preferences #> '{notifications,favoriteAvailability}' is distinct from 'false'::jsonb
        and not exists (
          select 1 from public.notifications existing
          where existing.user_id = favorite.user_id
            and existing.type = 'favorite_availability'
            and existing.payload ->> 'availability_event' = v_event_key
        );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_favorites_of_room_availability on public.apartment_rooms;
create trigger trg_notify_favorites_of_room_availability
after update of status, is_occupied on public.apartment_rooms
for each row execute function public.notify_favorites_of_room_availability();

commit;

select
  auth_user.id as auth_id,
  auth_user.email as auth_email,
  auth_owner.id as linked_app_user_id,
  auth_owner.email as linked_app_user_email,
  email_owner.id as same_email_app_user_id,
  email_owner.auth_id as same_email_auth_id
from auth.users auth_user
left join public.app_users auth_owner
  on auth_owner.auth_id = auth_user.id
left join public.app_users email_owner
  on lower(email_owner.email) = lower(auth_user.email)
where auth_user.email is not null
  and auth_owner.id is not null
  and email_owner.id is not null
  and auth_owner.id <> email_owner.id;

select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'tenant_profiles',
    'student_profiles',
    'employee_profiles',
    'landlord_profiles',
    'admin_profiles'
  )
order by table_name;

select
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'auth.users'::regclass
  and not t.tgisinternal
order by t.tgname;
