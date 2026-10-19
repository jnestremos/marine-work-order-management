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
