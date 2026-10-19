-- Phase 1: directory, voyages, and work orders.
-- Checks here match rules the app can express on a single row or a unique key.
-- Assignment eligibility, service-record open and close, deactivation, and
-- solution review stay for phase 2 triggers.

create type public.app_role as enum ('admin', 'captain', 'crew');

create type public.work_order_status as enum (
  'open',
  'in_progress',
  'done',
  'accepted',
  'rejected'
);

create type public.review_status as enum ('pending', 'accepted', 'rejected');

create table public.members (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  role public.app_role not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint members_first_name_not_blank check (btrim(first_name) <> ''),
  constraint members_last_name_not_blank check (btrim(last_name) <> '')
);

create table public.vessels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint vessels_name_not_blank check (btrim(name) <> '')
);

create unique index vessels_name_lower_key on public.vessels (lower(btrim(name)));

create table public.assignments (
  member_id uuid not null references public.members (id) on delete restrict,
  vessel_id uuid not null references public.vessels (id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (member_id, vessel_id)
);

create index assignments_vessel_id_idx on public.assignments (vessel_id);

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  vessel_id uuid not null references public.vessels (id) on delete restrict,
  role public.app_role not null,
  start_date date not null,
  end_date date,
  created_at timestamptz not null default now(),
  constraint service_records_end_on_or_after_start check (
    end_date is null or end_date >= start_date
  )
);

create unique index service_records_one_open_key
  on public.service_records (member_id, vessel_id)
  where end_date is null;

create index service_records_member_id_idx on public.service_records (member_id);
create index service_records_vessel_id_idx on public.service_records (vessel_id);

create table public.sea_services (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete restrict,
  vessel_id uuid not null references public.vessels (id) on delete restrict,
  role public.app_role not null,
  sign_on_date date not null,
  sign_on_port text not null,
  sign_off_date date not null,
  sign_off_port text not null,
  status public.review_status not null,
  created_at timestamptz not null default now(),
  constraint sea_services_sign_off_on_or_after_sign_on check (sign_off_date >= sign_on_date),
  constraint sea_services_sign_on_port_not_blank check (btrim(sign_on_port) <> ''),
  constraint sea_services_sign_off_port_not_blank check (btrim(sign_off_port) <> '')
);

create index sea_services_member_id_idx on public.sea_services (member_id);
create index sea_services_vessel_id_idx on public.sea_services (vessel_id);

create table public.work_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  vessel_id uuid not null references public.vessels (id) on delete restrict,
  title text not null,
  issue text not null,
  status public.work_order_status not null default 'open',
  assignee_id uuid not null references public.members (id) on delete restrict,
  created_by_id uuid not null references public.members (id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint work_orders_code_key unique (code),
  constraint work_orders_code_format check (code ~ '^WO-[0-9]+$'),
  constraint work_orders_title_not_blank check (btrim(title) <> ''),
  constraint work_orders_issue_not_blank check (btrim(issue) <> '')
);

create index work_orders_vessel_id_idx on public.work_orders (vessel_id);
create index work_orders_assignee_id_idx on public.work_orders (assignee_id);
create index work_orders_created_by_id_idx on public.work_orders (created_by_id);

create table public.work_order_solutions (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.work_orders (id) on delete cascade,
  body text not null,
  status public.review_status not null,
  posted_at timestamptz not null default now(),
  constraint work_order_solutions_body_not_blank check (btrim(body) <> '')
);

create index work_order_solutions_work_order_id_idx
  on public.work_order_solutions (work_order_id);

create unique index work_order_solutions_one_unrejected_key
  on public.work_order_solutions (work_order_id)
  where status <> 'rejected';

alter table public.members enable row level security;
alter table public.vessels enable row level security;
alter table public.assignments enable row level security;
alter table public.service_records enable row level security;
alter table public.sea_services enable row level security;
alter table public.work_orders enable row level security;
alter table public.work_order_solutions enable row level security;

comment on table public.members is
  'People in the directory. New members start active. Deactivation while assigned, or while an open or in-progress work order remains, is enforced in phase 2.';

comment on table public.vessels is
  'Vessels start inactive. Names are unique ignoring case and surrounding spaces. Deactivation strips assignments and closes open service records in phase 2.';

comment on table public.assignments is
  'One row per member and vessel. Phase 2 rejects admins, deactivated members, a second captain on a vessel, and a captain already on another active vessel.';

comment on column public.service_records.end_date is
  'Null while the appointment is open. At most one open record per member and vessel.';

comment on table public.sea_services is
  'A voyage independent of the current assignment. Status starts pending for captain and crew, and accepted for an admin, in phase 2.';

comment on table public.work_orders is
  'Unresolved means open or in_progress. Creating an order requires the captain and an active crew member of that vessel; that check is phase 2.';

comment on table public.work_order_solutions is
  'A work order keeps every rejected solution and at most one that is still pending or accepted.';
