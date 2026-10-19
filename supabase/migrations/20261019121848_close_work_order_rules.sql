-- Captains may move accepted or rejected work orders to closed.
-- Closed orders no longer block unassign/deactivate and accept no new solutions.

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

  if new.status is distinct from old.status and new.status = 'closed' then
    if old.status not in ('accepted', 'rejected') then
      raise exception 'Close a work order only after it is accepted or rejected';
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.solutions_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignee_id uuid;
  order_status public.work_order_status;
  latest_status public.review_status;
begin
  new.body := btrim(new.body);
  if new.body = '' then
    raise exception 'Solution is required';
  end if;

  select wo.assignee_id, wo.status
    into assignee_id, order_status
  from public.work_orders wo
  where wo.id = new.work_order_id;

  if new.posted_by is distinct from assignee_id then
    raise exception 'You can only send a solution for a work order assigned to you';
  end if;

  if order_status in ('accepted', 'closed') then
    raise exception 'This work order is closed';
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
