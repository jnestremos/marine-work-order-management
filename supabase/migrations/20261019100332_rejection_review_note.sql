-- Captains must leave a rejection reason when sending work back to crew.

alter table public.work_order_solutions
  add column review_note text;

comment on column public.work_order_solutions.review_note is
  'Captain rejection reason. Required when the solution is rejected; unused when accepted.';

create or replace function private.work_orders_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  latest_id uuid;
  latest_status public.review_status;
  latest_note text;
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
    select s.id, s.status, s.review_note
      into latest_id, latest_status, latest_note
    from public.work_order_solutions s
    where s.work_order_id = new.id
    order by s.posted_at desc, s.id desc
    limit 1;

    if old.status <> 'done' or latest_id is null or latest_status <> 'pending' then
      raise exception 'Accept or reject a work order only when it is done and the latest solution is pending';
    end if;

    if new.status = 'rejected' and btrim(coalesce(latest_note, '')) = '' then
      raise exception 'A rejection reason is required';
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

revoke all on function private.work_orders_before_update() from public, anon, authenticated;
