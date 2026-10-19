-- Load the marine fixture with triggers paused so historical dates, codes, and
-- solution history stay as the screens show them. New rows after this still
-- run the triggers.

alter table public.members disable trigger user;
alter table public.vessels disable trigger user;
alter table public.assignments disable trigger user;
alter table public.service_records disable trigger user;
alter table public.sea_services disable trigger user;
alter table public.work_orders disable trigger user;
alter table public.work_order_solutions disable trigger user;

insert into public.members (id, first_name, last_name, role, active) values
  ('00000000-0000-4000-8000-000000000001', 'Avery', 'Chen', 'admin', true),
  ('00000000-0000-4000-8000-000000000002', 'Blake', 'Ortiz', 'captain', true),
  ('00000000-0000-4000-8000-000000000003', 'Casey', 'Nguyen', 'crew', true),
  ('00000000-0000-4000-8000-000000000004', 'Drew', 'Patel', 'captain', true),
  ('00000000-0000-4000-8000-000000000005', 'Eden', 'Brooks', 'crew', false),
  ('00000000-0000-4000-8000-000000000006', 'Frank', 'Adler', 'admin', true),
  ('00000000-0000-4000-8000-000000000007', 'Gina', 'Morales', 'captain', true),
  ('00000000-0000-4000-8000-000000000008', 'Harper', 'Singh', 'crew', true),
  ('00000000-0000-4000-8000-000000000009', 'Ivan', 'Brooks', 'crew', true),
  ('00000000-0000-4000-8000-00000000000a', 'June', 'Okonkwo', 'captain', true),
  ('00000000-0000-4000-8000-00000000000b', 'Kai', 'Nakamura', 'crew', true);

insert into public.vessels (id, name, active) values
  ('00000000-0000-4000-8000-000000000010', 'MV Horizon', true),
  ('00000000-0000-4000-8000-000000000011', 'MV Aurora', true),
  ('00000000-0000-4000-8000-000000000012', 'MV Retired', false);

insert into public.assignments (member_id, vessel_id) values
  ('00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000011'),
  ('00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000010'),
  ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000010');

insert into public.service_records (id, member_id, vessel_id, role, start_date, end_date) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010', 'captain', '2024-03-01', null),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', 'captain', '2021-06-15', '2024-02-20'),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000010', 'crew', '2023-11-01', null),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000011', 'captain', '2022-04-01', null),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000010', 'crew', '2024-08-01', null);

insert into public.sea_services (
  id, member_id, vessel_id, role, sign_on_date, sign_on_port, sign_off_date, sign_off_port, status, created_by_id
) values
  ('00000000-0000-4000-8000-000000000401', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000010', 'captain', '2024-03-01', 'Singapore', '2024-09-12', 'Rotterdam', 'accepted', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000402', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000012', 'captain', '2022-01-10', 'Manila', '2022-07-18', 'Busan', 'accepted', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000403', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000010', 'crew', '2025-02-04', 'Manila', '2025-08-19', 'Singapore', 'accepted', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000404', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000011', 'captain', '2025-01-06', 'Dubai', '2025-06-30', 'Mumbai', 'accepted', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000405', '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000010', 'crew', '2025-03-15', 'Hong Kong', '2025-09-01', 'Kaohsiung', 'accepted', '00000000-0000-4000-8000-000000000001');

insert into public.work_orders (id, code, vessel_id, title, issue, status, assignee_id, created_by_id) values
  ('00000000-0000-4000-8000-000000000201', 'WO-1001', '00000000-0000-4000-8000-000000000010', 'Starboard navigation light', 'The starboard navigation light stays dark after the breaker is reset.', 'open', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000202', 'WO-1002', '00000000-0000-4000-8000-000000000010', 'Bilge pump seal', 'The engine-room bilge pump weeps around the shaft seal.', 'in_progress', '00000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000203', 'WO-1003', '00000000-0000-4000-8000-000000000010', 'VHF radio check', 'Channel 16 drops out during the radio check.', 'done', '00000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000204', 'WO-1004', '00000000-0000-4000-8000-000000000010', 'Fire damper latch', 'The galley fire damper latch does not hold closed.', 'open', '00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000002');

insert into public.work_order_solutions (id, work_order_id, body, status, posted_at, posted_by) values
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000203', 'Tightened the antenna mount.', 'rejected', '2026-10-10T08:15:00.000Z', '00000000-0000-4000-8000-000000000009'),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000203', 'Replaced the antenna connector and confirmed a clear radio check.', 'pending', '2026-10-12T14:40:00.000Z', '00000000-0000-4000-8000-000000000009');

alter table public.members enable trigger user;
alter table public.vessels enable trigger user;
alter table public.assignments enable trigger user;
alter table public.service_records enable trigger user;
alter table public.sea_services enable trigger user;
alter table public.work_orders enable trigger user;
alter table public.work_order_solutions enable trigger user;

create function public.session_choices()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'vessels', coalesce((
      select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'active', active) order by name)
      from public.vessels
    ), '[]'::jsonb),
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id,
        'firstName', first_name,
        'lastName', last_name,
        'role', role,
        'active', active
      ) order by last_name, first_name)
      from public.members
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object('memberId', member_id, 'vesselId', vessel_id))
      from public.assignments
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.session_choices() from public;
grant execute on function public.session_choices() to anon;

comment on function public.session_choices() is
  'Login catalog for the vessel, role, and member dropdowns. Row access for everything else stays on the session policies.';
