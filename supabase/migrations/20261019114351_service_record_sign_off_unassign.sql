-- Closing a service record (setting end_date) removes the vessel assignment.
-- Unassigning (delete or sign-off) is blocked while that person still has
-- open or in-progress work orders on the vessel.

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
        and wo.status in ('open', 'in_progress')
        and (wo.assignee_id = p_member_id or wo.created_by_id = p_member_id)
      order by substring(wo.code from '^WO-([0-9]+)$')::bigint
    ),
    '{}'
  );
$$;

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
    raise exception 'Resolve % before removing this assignment', private.listed(codes);
  end if;
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

drop trigger if exists assignments_before_delete on public.assignments;
create trigger assignments_before_delete
before delete on public.assignments
for each row
execute function private.assignments_before_delete();

drop trigger if exists service_records_after_update on public.service_records;
create trigger service_records_after_update
after update on public.service_records
for each row
execute function private.service_records_after_update();

comment on column public.service_records.end_date is
  'Null while the appointment is open. Setting an end date removes the matching vessel assignment. At most one open record per member and vessel.';
