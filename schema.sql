-- Marine Work Order Management — public schema
-- Consolidated from supabase/migrations for the assessment submission.
-- Prefer applying migrations with: supabase db push

-- >>> 20261019055058_marine_directory.sql
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
  review_note text,
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
  'Null while the appointment is open. Setting an end date removes the matching vessel assignment. At most one open record per member and vessel.';

comment on table public.sea_services is
  'A voyage independent of the current assignment. Status starts pending for captain and crew, and accepted for an admin, in phase 2.';

comment on table public.work_orders is
  'Unresolved means open or in_progress. Creating an order requires the captain and an active crew member of that vessel; that check is phase 2.';

comment on table public.work_order_solutions is
  'A work order keeps every rejected solution and at most one that is still pending or accepted.';

-- >>> 20261019060041_directory_rules.sql
-- Phase 2: rules that need more than one row.
-- Functions live in private so they are not exposed through the Data API.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;

alter table public.work_orders alter column code set default '';

alter table public.work_order_solutions
  add column posted_by uuid not null references public.members (id) on delete restrict;

create index work_order_solutions_posted_by_idx
  on public.work_order_solutions (posted_by);

alter table public.sea_services
  add column created_by_id uuid not null references public.members (id) on delete restrict;

create index sea_services_created_by_id_idx on public.sea_services (created_by_id);

create unique index members_name_lower_key on public.members (
  lower(
    regexp_replace(
      btrim(first_name) || ' ' || btrim(last_name),
      '\s+',
      ' ',
      'g'
    )
  )
);

create function private.member_name(first_name text, last_name text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(btrim(first_name) || ' ' || btrim(last_name), '\s+', ' ', 'g');
$$;

create function private.listed(items text[])
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when items is null or cardinality(items) = 0 then ''
    when cardinality(items) = 1 then items[1]
    when cardinality(items) = 2 then items[1] || ' and ' || items[2]
    else array_to_string(items[1:cardinality(items) - 1], ', ')
      || ', and '
      || items[cardinality(items)]
  end;
$$;

create function private.vessel_names_for_member(p_member_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array(
      select v.name
      from public.assignments a
      join public.vessels v on v.id = a.vessel_id
      where a.member_id = p_member_id
      order by a.created_at, v.name
    ),
    '{}'
  );
$$;

create function private.active_vessel_names(p_member_id uuid, p_except uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array(
      select v.name
      from public.assignments a
      join public.vessels v on v.id = a.vessel_id
      where a.member_id = p_member_id
        and a.vessel_id is distinct from p_except
        and v.active
      order by a.created_at, v.name
    ),
    '{}'
  );
$$;

create function private.unresolved_codes(p_member_id uuid, p_vessel_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array(
      select wo.code
      from public.work_orders wo
      where wo.status in ('open', 'in_progress', 'done')
        and (
          (p_member_id is not null and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id))
          or (p_vessel_id is not null and wo.vessel_id = p_vessel_id)
        )
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

comment on function private.unresolved_codes(uuid, uuid) is
  'Work-order codes that block member/vessel deactivation: open, in_progress, or done (awaiting Attest/Reject).';

create function private.next_work_order_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_number bigint;
begin
  perform pg_advisory_xact_lock(hashtext('marine.work_order_code')::bigint);
  select coalesce(max(substring(code from '^WO-([0-9]+)$')::bigint), 1000) + 1
    into next_number
  from public.work_orders
  where code ~ '^WO-[0-9]+$';
  return 'WO-' || next_number::text;
end;
$$;

create function private.assert_work_order_crew(
  p_vessel_id uuid,
  p_assignee_id uuid,
  p_created_by_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  crew_count integer;
  captain_assigned boolean;
  assignee_is_crew boolean;
begin
  select count(*)
    into crew_count
  from public.assignments a
  join public.members m on m.id = a.member_id
  where a.vessel_id = p_vessel_id
    and m.role = 'crew'
    and m.active;

  if crew_count = 0 then
    raise exception 'This vessel has no active crew';
  end if;

  select exists (
    select 1
    from public.assignments a
    join public.vessels v on v.id = a.vessel_id
    join public.members m on m.id = a.member_id
    where a.member_id = p_created_by_id
      and a.vessel_id = p_vessel_id
      and v.active
      and m.role = 'captain'
      and m.active
  )
    into captain_assigned;

  select exists (
    select 1
    from public.assignments a
    join public.members m on m.id = a.member_id
    where a.member_id = p_assignee_id
      and a.vessel_id = p_vessel_id
      and m.role = 'crew'
      and m.active
  )
    into assignee_is_crew;

  if not captain_assigned or not assignee_is_crew then
    raise exception 'Crew must be an active member of this vessel';
  end if;
end;
$$;

create function private.members_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  names text[];
  codes text[];
  who text;
begin
  new.first_name := btrim(new.first_name);
  new.last_name := btrim(new.last_name);

  if exists (
    select 1
    from public.members m
    where m.id is distinct from new.id
      and lower(private.member_name(m.first_name, m.last_name))
        = lower(private.member_name(new.first_name, new.last_name))
  ) then
    raise exception 'A user with this name already exists';
  end if;

  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    names := private.vessel_names_for_member(old.id);
    if cardinality(names) > 0 then
      who := private.member_name(old.first_name, old.last_name);
      raise exception 'Remove % from % before changing roles', who, private.listed(names);
    end if;
  end if;

  if tg_op = 'UPDATE' and old.active and not new.active then
    names := private.vessel_names_for_member(old.id);
    who := private.member_name(old.first_name, old.last_name);
    if cardinality(names) > 0 then
      raise exception 'Remove % from % before deactivating', who, private.listed(names);
    end if;
    codes := private.unresolved_codes(new.id, null);
    if cardinality(codes) > 0 then
      raise exception 'Close or approve % before deactivating %', private.listed(codes), who;
    end if;
  end if;

  return new;
end;
$$;

create function private.vessels_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  names text[];
  codes text[];
  captain record;
begin
  new.name := btrim(new.name);

  if exists (
    select 1
    from public.vessels v
    where v.id is distinct from new.id
      and lower(btrim(v.name)) = lower(btrim(new.name))
  ) then
    raise exception 'A vessel with this name already exists';
  end if;

  if tg_op = 'UPDATE' and old.active and not new.active then
    codes := private.unresolved_codes(null, new.id);
    if cardinality(codes) > 0 then
      raise exception 'Close or approve % before deactivating %', private.listed(codes), new.name;
    end if;
  end if;

  if tg_op = 'UPDATE' and not old.active and new.active then
    for captain in
      select m.id, private.member_name(m.first_name, m.last_name) as full_name
      from public.assignments a
      join public.members m on m.id = a.member_id
      where a.vessel_id = new.id
        and m.role = 'captain'
        and m.active
    loop
      names := private.active_vessel_names(captain.id, new.id);
      if cardinality(names) > 0 then
        raise exception '% is already assigned to %', captain.full_name, private.listed(names);
      end if;
    end loop;
  end if;

  return new;
end;
$$;

create function private.vessels_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.active and not new.active then
    delete from public.assignments
    where vessel_id = new.id;
  end if;
  return new;
end;
$$;

create function private.assignments_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member public.members%rowtype;
  vessel_name text;
  captain_id uuid;
  names text[];
begin
  select *
    into member
  from public.members
  where id = new.member_id;

  if member.role = 'admin' then
    raise exception 'Admins are not assigned to vessels';
  end if;

  if not member.active then
    raise exception 'Deactivated users are not assigned to vessels';
  end if;

  if exists (
    select 1
    from public.assignments a
    where a.member_id = new.member_id
      and a.vessel_id = new.vessel_id
  ) then
    raise exception 'This user is already assigned to this vessel';
  end if;

  if member.role = 'captain' then
    select m.id
      into captain_id
    from public.assignments a
    join public.members m on m.id = a.member_id
    where a.vessel_id = new.vessel_id
      and m.role = 'captain'
      and m.active
    limit 1;

    if captain_id is not null and captain_id is distinct from new.member_id then
      select name into vessel_name from public.vessels where id = new.vessel_id;
      raise exception '% already has a captain', vessel_name;
    end if;

    names := private.active_vessel_names(new.member_id, new.vessel_id);
    if cardinality(names) > 0 then
      raise exception '% is already assigned to %',
        private.member_name(member.first_name, member.last_name),
        private.listed(names);
    end if;
  end if;

  return new;
end;
$$;

create function private.unresolved_codes_for_assignment(
  p_member_id uuid,
  p_vessel_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    array(
      select wo.code
      from public.work_orders wo
      where wo.vessel_id = p_vessel_id
        and wo.status in ('open', 'in_progress', 'done')
        and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id)
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

comment on function private.unresolved_codes_for_assignment(uuid, uuid) is
  'Work-order codes that block unassign: open, in_progress, or done (awaiting captain Attest/Reject) for that member on the vessel.';

create function private.assignments_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  codes text[];
begin
  codes := private.unresolved_codes_for_assignment(old.member_id, old.vessel_id);
  if cardinality(codes) > 0 then
    raise exception 'Close or approve % before removing this assignment', private.listed(codes);
  end if;
  return old;
end;
$$;

create function private.assignments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.service_records (member_id, vessel_id, role, start_date)
  select new.member_id, new.vessel_id, m.role, current_date
  from public.members m
  where m.id = new.member_id
    and not exists (
      select 1
      from public.service_records sr
      where sr.member_id = new.member_id
        and sr.vessel_id = new.vessel_id
        and sr.end_date is null
    );
  return new;
end;
$$;

create function private.assignments_after_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.service_records
  set end_date = greatest(start_date, current_date)
  where member_id = old.member_id
    and vessel_id = old.vessel_id
    and end_date is null;
  return old;
end;
$$;

create function private.service_records_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.end_date is null and new.end_date is not null then
    delete from public.assignments
    where member_id = new.member_id
      and vessel_id = new.vessel_id;
  end if;
  return new;
end;
$$;

create function private.work_orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.issue := btrim(new.issue);
  if new.code is null or btrim(new.code) = '' then
    new.code := private.next_work_order_code();
  end if;
  perform private.assert_work_order_crew(new.vessel_id, new.assignee_id, new.created_by_id);
  return new;
end;
$$;

create function private.work_orders_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_id uuid;
  latest_status public.review_status;
begin
  if coalesce(current_setting('private.in_sync', true), '') = 'on' then
    return new;
  end if;

  new.title := btrim(new.title);
  new.issue := btrim(new.issue);

  if new.vessel_id is distinct from old.vessel_id
    or new.created_by_id is distinct from old.created_by_id
  then
    raise exception 'A work order stays on the vessel and captain that created it';
  end if;

  if old.status = 'done' and new.assignee_id is distinct from old.assignee_id then
    raise exception 'The assigned crew member stays as it is';
  end if;

  if new.title is distinct from old.title
    or new.issue is distinct from old.issue
    or new.assignee_id is distinct from old.assignee_id
  then
    perform private.assert_work_order_crew(new.vessel_id, new.assignee_id, new.created_by_id);
  end if;

  if new.status is distinct from old.status and new.status in ('accepted', 'rejected') then
    select s.id, s.status
      into latest_id, latest_status
    from public.work_order_solutions s
    where s.work_order_id = new.id
    order by s.posted_at desc, s.id desc
    limit 1;

    if old.status <> 'done' or latest_id is null or latest_status <> 'pending' then
      raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
    end if;

    perform set_config('private.in_sync', 'on', true);
    update public.work_order_solutions
    set status = new.status::text::public.review_status
    where id = latest_id
      and status::text is distinct from new.status::text;
    perform set_config('private.in_sync', 'off', true);
  end if;

  return new;
end;
$$;

create function private.solutions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignee_id uuid;
  latest_status public.review_status;
begin
  new.body := btrim(new.body);
  if new.body = '' then
    raise exception 'Solution is required';
  end if;

  select wo.assignee_id
    into assignee_id
  from public.work_orders wo
  where wo.id = new.work_order_id;

  if new.posted_by is distinct from assignee_id then
    raise exception 'You can only send a solution for a work order assigned to you';
  end if;

  select s.status
    into latest_status
  from public.work_order_solutions s
  where s.work_order_id = new.work_order_id
  order by s.posted_at desc, s.id desc
  limit 1;

  if latest_status = 'accepted' then
    raise exception 'This solution was accepted';
  elsif latest_status is not null and latest_status <> 'rejected' then
    raise exception 'Wait until the current solution is rejected before sending another';
  end if;

  new.status := 'pending';
  return new;
end;
$$;

create function private.solutions_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('private.in_sync', 'on', true);
  update public.work_orders
  set status = 'done'
  where id = new.work_order_id
    and status is distinct from 'done';
  perform set_config('private.in_sync', 'off', true);
  return new;
end;
$$;

create function private.solutions_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status <> 'pending' or new.status not in ('accepted', 'rejected') then
    raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
  end if;

  if coalesce(current_setting('private.in_sync', true), '') = 'on' then
    return new;
  end if;

  perform set_config('private.in_sync', 'on', true);
  update public.work_orders
  set status = new.status::text::public.work_order_status
  where id = new.work_order_id
    and status = 'done';
  if not found then
    perform set_config('private.in_sync', 'off', true);
    raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
  end if;
  perform set_config('private.in_sync', 'off', true);
  return new;
end;
$$;

create function private.sea_services_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  creator_role public.app_role;
begin
  select role
    into creator_role
  from public.members
  where id = new.created_by_id;

  if creator_role = 'admin' then
    new.status := 'accepted';
  else
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger members_before_write
before insert or update on public.members
for each row
execute function private.members_before_write();

create trigger vessels_before_write
before insert or update on public.vessels
for each row
execute function private.vessels_before_write();

create trigger vessels_after_update
after update on public.vessels
for each row
execute function private.vessels_after_update();

create trigger assignments_before_insert
before insert on public.assignments
for each row
execute function private.assignments_before_insert();

create trigger assignments_before_delete
before delete on public.assignments
for each row
execute function private.assignments_before_delete();

create trigger assignments_after_insert
after insert on public.assignments
for each row
execute function private.assignments_after_insert();

create trigger assignments_after_delete
after delete on public.assignments
for each row
execute function private.assignments_after_delete();

create trigger service_records_after_update
after update on public.service_records
for each row
execute function private.service_records_after_update();

create trigger work_orders_before_insert
before insert on public.work_orders
for each row
execute function private.work_orders_before_insert();

create trigger work_orders_before_update
before update on public.work_orders
for each row
execute function private.work_orders_before_update();

create trigger solutions_before_insert
before insert on public.work_order_solutions
for each row
execute function private.solutions_before_insert();

create trigger solutions_after_insert
after insert on public.work_order_solutions
for each row
execute function private.solutions_after_insert();

create trigger solutions_before_update
before update on public.work_order_solutions
for each row
execute function private.solutions_before_update();

create trigger sea_services_before_insert
before insert on public.sea_services
for each row
execute function private.sea_services_before_insert();

revoke all on all functions in schema private from public;
revoke all on all functions in schema private from anon, authenticated;

comment on schema private is
  'Trigger functions for directory and work-order rules. Not exposed through the Data API.';

comment on column public.work_order_solutions.posted_by is
  'Must be the crew member assigned to the work order.';

comment on column public.sea_services.created_by_id is
  'An admin create starts accepted. A captain or crew create starts pending.';

-- >>> 20261019060450_cast_review_status.sql
-- Work order status and solution status are separate enums.
-- Accept and reject copy the label across that boundary.

create or replace function private.work_orders_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_id uuid;
  latest_status public.review_status;
begin
  if coalesce(current_setting('private.in_sync', true), '') = 'on' then
    return new;
  end if;

  new.title := btrim(new.title);
  new.issue := btrim(new.issue);

  if new.vessel_id is distinct from old.vessel_id
    or new.created_by_id is distinct from old.created_by_id
  then
    raise exception 'A work order stays on the vessel and captain that created it';
  end if;

  if old.status = 'done' and new.assignee_id is distinct from old.assignee_id then
    raise exception 'The assigned crew member stays as it is';
  end if;

  if new.title is distinct from old.title
    or new.issue is distinct from old.issue
    or new.assignee_id is distinct from old.assignee_id
  then
    perform private.assert_work_order_crew(new.vessel_id, new.assignee_id, new.created_by_id);
  end if;

  if new.status is distinct from old.status and new.status in ('accepted', 'rejected') then
    select s.id, s.status
      into latest_id, latest_status
    from public.work_order_solutions s
    where s.work_order_id = new.id
    order by s.posted_at desc, s.id desc
    limit 1;

    if old.status <> 'done' or latest_id is null or latest_status <> 'pending' then
      raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
    end if;

    perform set_config('private.in_sync', 'on', true);
    update public.work_order_solutions
    set status = new.status::text::public.review_status
    where id = latest_id
      and status::text is distinct from new.status::text;
    perform set_config('private.in_sync', 'off', true);
  end if;

  return new;
end;
$$;

create or replace function private.solutions_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status <> 'pending' or new.status not in ('accepted', 'rejected') then
    raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
  end if;

  if coalesce(current_setting('private.in_sync', true), '') = 'on' then
    return new;
  end if;

  perform set_config('private.in_sync', 'on', true);
  update public.work_orders
  set status = new.status::text::public.work_order_status
  where id = new.work_order_id
    and status = 'done';
  if not found then
    perform set_config('private.in_sync', 'off', true);
    raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
  end if;
  perform set_config('private.in_sync', 'off', true);
  return new;
end;
$$;

revoke all on function private.work_orders_before_update() from public, anon, authenticated;
revoke all on function private.solutions_before_update() from public, anon, authenticated;

-- >>> 20261019060838_work_order_codes.sql
-- Work order codes are always assigned by the database, as WO-1001, WO-1002, and so on.
-- A value sent with the insert is ignored, and later updates cannot change the code.

create or replace function private.work_orders_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.title := btrim(new.title);
  new.issue := btrim(new.issue);
  new.code := private.next_work_order_code();
  perform private.assert_work_order_crew(new.vessel_id, new.assignee_id, new.created_by_id);
  return new;
end;
$$;

create or replace function private.work_orders_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_id uuid;
  latest_status public.review_status;
begin
  if coalesce(current_setting('private.in_sync', true), '') = 'on' then
    return new;
  end if;

  new.code := old.code;
  new.title := btrim(new.title);
  new.issue := btrim(new.issue);

  if new.vessel_id is distinct from old.vessel_id
    or new.created_by_id is distinct from old.created_by_id
  then
    raise exception 'A work order stays on the vessel and captain that created it';
  end if;

  if old.status = 'done' and new.assignee_id is distinct from old.assignee_id then
    raise exception 'The assigned crew member stays as it is';
  end if;

  if new.title is distinct from old.title
    or new.issue is distinct from old.issue
    or new.assignee_id is distinct from old.assignee_id
  then
    perform private.assert_work_order_crew(new.vessel_id, new.assignee_id, new.created_by_id);
  end if;

  if new.status is distinct from old.status and new.status in ('accepted', 'rejected') then
    select s.id, s.status
      into latest_id, latest_status
    from public.work_order_solutions s
    where s.work_order_id = new.id
    order by s.posted_at desc, s.id desc
    limit 1;

    if old.status <> 'done' or latest_id is null or latest_status <> 'pending' then
      raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
    end if;

    perform set_config('private.in_sync', 'on', true);
    update public.work_order_solutions
    set status = new.status::text::public.review_status
    where id = latest_id
      and status::text is distinct from new.status::text;
    perform set_config('private.in_sync', 'off', true);
  end if;

  return new;
end;
$$;

revoke all on function private.work_orders_before_insert() from public, anon, authenticated;
revoke all on function private.work_orders_before_update() from public, anon, authenticated;

-- >>> 20261019062749_session_rls.sql
-- Row access follows the mock session: vessel, role, and member from the dropdowns.
-- The Data API reads those from request headers. Supabase Auth is not used.

create function private.session_member_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('marine.member_id', true), '')::uuid;
$$;

create function private.session_role()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('marine.role', true), '');
$$;

create function private.session_vessel_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('marine.vessel_id', true), '')::uuid;
$$;

create function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_role() = 'admin';
$$;

create function private.is_captain()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_role() = 'captain';
$$;

create function private.is_crew()
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.session_role() = 'crew';
$$;

create function private.assigned_to_vessel(p_member_id uuid, p_vessel_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments
    where member_id = p_member_id
      and vessel_id = p_vessel_id
  );
$$;

create function private.can_see_work_order(p_work_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.work_orders wo
    where wo.id = p_work_order_id
      and (
        private.is_admin()
        or (
          private.is_captain()
          and wo.created_by_id = private.session_member_id()
          and wo.vessel_id = private.session_vessel_id()
        )
        or (
          private.is_crew()
          and wo.assignee_id = private.session_member_id()
        )
      )
  );
$$;

create function private.set_marine_session()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  member_header text;
  role_header text;
  vessel_header text;
  found_member public.members%rowtype;
  vessel_is_active boolean;
begin
  perform set_config('marine.member_id', '', true);
  perform set_config('marine.role', '', true);
  perform set_config('marine.vessel_id', '', true);

  if headers is null then
    return;
  end if;

  member_header := headers->>'x-marine-member-id';
  role_header := headers->>'x-marine-role';
  vessel_header := headers->>'x-marine-vessel-id';

  if member_header is null or role_header is null or vessel_header is null then
    return;
  end if;

  if role_header not in ('admin', 'captain', 'crew') then
    return;
  end if;

  select *
    into found_member
  from public.members
  where id = member_header::uuid;

  if found_member.id is null
    or not found_member.active
    or found_member.role::text <> role_header
  then
    return;
  end if;

  select active
    into vessel_is_active
  from public.vessels
  where id = vessel_header::uuid;

  if vessel_is_active is not true then
    return;
  end if;

  if role_header in ('captain', 'crew')
    and not private.assigned_to_vessel(found_member.id, vessel_header::uuid)
  then
    return;
  end if;

  perform set_config('marine.member_id', found_member.id::text, true);
  perform set_config('marine.role', role_header, true);
  perform set_config('marine.vessel_id', vessel_header, true);
exception
  when invalid_text_representation then
    return;
end;
$$;

create function private.sea_services_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.session_role() in ('captain', 'crew') then
    new.status := 'pending';
  end if;
  return new;
end;
$$;

create trigger sea_services_before_update
before update on public.sea_services
for each row
execute function private.sea_services_before_update();

revoke all on all functions in schema private from public, anon, authenticated;
grant usage on schema private to anon;
grant execute on function private.set_marine_session() to anon;

alter role authenticator set pgrst.db_pre_request = 'private.set_marine_session';
notify pgrst, 'reload config';

grant select, insert, update on public.members to anon;
grant select, insert, update on public.vessels to anon;
grant select, insert, delete on public.assignments to anon;
grant select, insert, update, delete on public.service_records to anon;
grant select, insert, update, delete on public.sea_services to anon;
grant select, insert, update on public.work_orders to anon;
grant select, insert, update on public.work_order_solutions to anon;

revoke truncate on
  public.members,
  public.vessels,
  public.assignments,
  public.service_records,
  public.sea_services,
  public.work_orders,
  public.work_order_solutions
from anon, authenticated;

create policy members_select on public.members
for select to anon
using (
  (select private.is_admin())
  or id = (select private.session_member_id())
  or (
    (select private.is_captain())
    and role = 'crew'
    and (select private.assigned_to_vessel(id, private.session_vessel_id()))
  )
);

create policy members_insert on public.members
for insert to anon
with check ((select private.is_admin()));

create policy members_update on public.members
for update to anon
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy vessels_select on public.vessels
for select to anon
using (
  (select private.is_admin())
  or (select private.assigned_to_vessel(private.session_member_id(), id))
);

create policy vessels_insert on public.vessels
for insert to anon
with check ((select private.is_admin()));

create policy vessels_update on public.vessels
for update to anon
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy assignments_select on public.assignments
for select to anon
using (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and vessel_id = (select private.session_vessel_id())
  )
  or (
    (select private.is_crew())
    and member_id = (select private.session_member_id())
  )
);

create policy assignments_insert on public.assignments
for insert to anon
with check ((select private.is_admin()));

create policy assignments_delete on public.assignments
for delete to anon
using ((select private.is_admin()));

create policy service_records_select on public.service_records
for select to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
);

create policy service_records_write on public.service_records
for all to anon
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy sea_services_select on public.sea_services
for select to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
);

create policy sea_services_insert on public.sea_services
for insert to anon
with check (
  created_by_id = (select private.session_member_id())
  and (
    (
      (select private.is_admin())
      and exists (
        select 1
        from public.members owner
        where owner.id = member_id
          and owner.role <> 'admin'
      )
    )
    or (
      (select private.session_role()) in ('captain', 'crew')
      and member_id = (select private.session_member_id())
    )
  )
);

create policy sea_services_update on public.sea_services
for update to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
)
with check (
  (select private.is_admin())
  or (
    (select private.session_role()) in ('captain', 'crew')
    and member_id = (select private.session_member_id())
    and created_by_id = (select private.session_member_id())
  )
);

create policy sea_services_delete on public.sea_services
for delete to anon
using (
  (select private.is_admin())
  or member_id = (select private.session_member_id())
);

create policy work_orders_select on public.work_orders
for select to anon
using ((select private.can_see_work_order(id)));

create policy work_orders_insert on public.work_orders
for insert to anon
with check (
  (select private.is_captain())
  and created_by_id = (select private.session_member_id())
  and vessel_id = (select private.session_vessel_id())
);

create policy work_orders_update on public.work_orders
for update to anon
using (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and created_by_id = (select private.session_member_id())
    and vessel_id = (select private.session_vessel_id())
  )
)
with check (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and created_by_id = (select private.session_member_id())
    and vessel_id = (select private.session_vessel_id())
  )
);

create policy work_order_solutions_select on public.work_order_solutions
for select to anon
using ((select private.can_see_work_order(work_order_id)));

create policy work_order_solutions_insert on public.work_order_solutions
for insert to anon
with check (
  (select private.is_crew())
  and posted_by = (select private.session_member_id())
  and (select private.can_see_work_order(work_order_id))
);

create policy work_order_solutions_update on public.work_order_solutions
for update to anon
using (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and (select private.can_see_work_order(work_order_id))
  )
)
with check (
  (select private.is_admin())
  or (
    (select private.is_captain())
    and (select private.can_see_work_order(work_order_id))
  )
);

comment on function private.set_marine_session() is
  'Loads the dropdown session from x-marine-member-id, x-marine-role, and x-marine-vessel-id. An empty or mismatched session sees no rows.';

-- >>> 20261019062911_rls_helper_grants.sql
-- Policies run as the anon role, so that role must be able to call the session helpers.
-- Trigger functions stay revoked.

grant execute on function
  private.session_member_id(),
  private.session_role(),
  private.session_vessel_id(),
  private.is_admin(),
  private.is_captain(),
  private.is_crew(),
  private.assigned_to_vessel(uuid, uuid),
  private.can_see_work_order(uuid)
to anon;

