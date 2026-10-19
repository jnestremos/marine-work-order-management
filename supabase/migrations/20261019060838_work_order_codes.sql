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
