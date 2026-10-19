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
      where wo.status in ('open', 'in_progress')
        and (
          (p_member_id is not null and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id))
          or (p_vessel_id is not null and wo.vessel_id = p_vessel_id)
        )
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

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
      raise exception 'Resolve % before deactivating %', private.listed(codes), who;
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
      raise exception 'Resolve % before deactivating %', private.listed(codes), new.name;
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

create trigger assignments_after_insert
after insert on public.assignments
for each row
execute function private.assignments_after_insert();

create trigger assignments_after_delete
after delete on public.assignments
for each row
execute function private.assignments_after_delete();

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
