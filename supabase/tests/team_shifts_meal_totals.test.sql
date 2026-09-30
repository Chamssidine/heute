begin;
select plan(11);

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
-- a1 n'a volontairement aucune ligne employees.

insert into public.employees (id, user_id, display_name, department, role, contract)
values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Test Admin', 'rezeption', 'admin', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'Test Koch', 'kueche', 'staff', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', 'Test Kranker', 'kueche', 'staff', 'VZ');

insert into public.shifts (employee_id, date, type, start1, end1, note)
values
  ('00000000-0000-0000-0000-0000000000b3', '2030-01-10', 'normal', 480, 960, 'geheim'),
  ('00000000-0000-0000-0000-0000000000b4', '2030-01-10', 'krank', null, null, 'geheim'),
  ('00000000-0000-0000-0000-0000000000b2', '2030-01-10', 'frei', null, null, null);

insert into public.bookings (id, matchcode, label, arrival, departure)
values
  ('00000000-0000-0000-0000-0000000000c1', 'TEST-A', 'Test Gruppe A', '2030-01-10', '2030-01-11'),
  ('00000000-0000-0000-0000-0000000000c2', 'TEST-B', 'Test Gruppe B', '2030-01-10', '2030-01-11');

insert into public.meal_counts (booking_id, date, meal, total, veg, vegan, mos, allergies)
values
  ('00000000-0000-0000-0000-0000000000c1', '2030-01-10', 'mittag', 20, 3, 1, 2, '{"gluten": 2, "milch": 1}'),
  ('00000000-0000-0000-0000-0000000000c2', '2030-01-10', 'mittag', 10, 1, 0, 0, '{"eier": 4}'),
  ('00000000-0000-0000-0000-0000000000c2', '2030-01-10', 'abend', 10, 0, 0, 0, '{}');

select ok(
  not has_function_privilege('anon', 'public.team_shifts(date)', 'execute')
  and not has_function_privilege('anon', 'public.meal_totals(date, date)', 'execute'),
  'anon ne peut pas exécuter les fonctions'
);
select ok(
  has_function_privilege('authenticated', 'public.team_shifts(date)', 'execute')
  and has_function_privilege('authenticated', 'public.meal_totals(date, date)', 'execute'),
  'authenticated peut exécuter les fonctions'
);

set local role authenticated;

-- Employé Küche
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select is(
  (select type from public.team_shifts('2030-01-10') where employee_id = '00000000-0000-0000-0000-0000000000b4'),
  'abwesend',
  'Küche : krank apparaît comme abwesend'
);
select is(
  (select type from public.team_shifts('2030-01-10') where employee_id = '00000000-0000-0000-0000-0000000000b3'),
  'normal',
  'Küche : un service normal reste normal'
);
select is(
  (select count(*) from public.team_shifts('2030-01-10')),
  2::bigint,
  'frei n''est pas renvoyé'
);
select ok(
  not exists (
    select 1 from pg_proc p
    where p.oid = 'public.team_shifts(date)'::regprocedure and 'note' = any (p.proargnames)
  ),
  'team_shifts ne renvoie pas note'
);
select is(
  (select total from public.meal_totals('2030-01-10', '2030-01-10') where meal = 'mittag'),
  30::bigint,
  'meal_totals additionne total'
);
select results_eq(
  $$select veg, vegan, mos, allergies from public.meal_totals('2030-01-10', '2030-01-10') where meal = 'mittag'$$,
  $$values (4::bigint, 1::bigint, 2::bigint, 7::bigint)$$,
  'meal_totals additionne veg, vegan, mos et allergies'
);

-- Admin
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select is(
  (select type from public.team_shifts('2030-01-10') where employee_id = '00000000-0000-0000-0000-0000000000b4'),
  'krank',
  'admin : voit krank'
);

-- Sans ligne employees
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select is(
  (select count(*) from public.team_shifts('2030-01-10')),
  0::bigint,
  'sans employees : team_shifts vide'
);
select is(
  (select count(*) from public.meal_totals('2030-01-10', '2030-01-10')),
  0::bigint,
  'sans employees : meal_totals vide'
);

select * from finish();
rollback;
