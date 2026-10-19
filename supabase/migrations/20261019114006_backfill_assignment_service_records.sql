-- Ensure assign/unassign still open and close appointment history, then
-- backfill any current assignment that is missing an open service record.

create or replace function private.assignments_after_insert()
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

create or replace function private.assignments_after_delete()
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

drop trigger if exists assignments_after_insert on public.assignments;
create trigger assignments_after_insert
after insert on public.assignments
for each row
execute function private.assignments_after_insert();

drop trigger if exists assignments_after_delete on public.assignments;
create trigger assignments_after_delete
after delete on public.assignments
for each row
execute function private.assignments_after_delete();

insert into public.service_records (member_id, vessel_id, role, start_date)
select a.member_id, a.vessel_id, m.role, current_date
from public.assignments a
join public.members m on m.id = a.member_id
where not exists (
  select 1
  from public.service_records sr
  where sr.member_id = a.member_id
    and sr.vessel_id = a.vessel_id
    and sr.end_date is null
);
