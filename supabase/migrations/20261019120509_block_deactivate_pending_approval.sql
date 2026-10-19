-- Deactivating a member or vessel is blocked while related work orders are
-- still open, in progress, or Done (awaiting Attest/Reject).

create or replace function private.unresolved_codes(p_member_id uuid, p_vessel_id uuid)
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

create or replace function private.members_before_write()
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

create or replace function private.vessels_before_write()
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

comment on function private.unresolved_codes(uuid, uuid) is
  'Work-order codes that block member/vessel deactivation: open, in_progress, or done (awaiting Attest/Reject).';
