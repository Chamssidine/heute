begin;
select plan(9);

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into public.employees (id, user_id, display_name, department, role, contract, active)
values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Test Inaktiv', 'kueche', 'staff', 'VZ', false),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'Test Aktiv', 'kueche', 'kitchen_lead', 'VZ', true);

select ok(
  not has_function_privilege('anon', 'public.current_employee_id()', 'execute')
  and not has_function_privilege('anon', 'public.current_app_role()', 'execute'),
  'anon ne peut pas exécuter les helpers'
);
select ok(
  has_function_privilege('authenticated', 'public.current_employee_id()', 'execute')
  and has_function_privilege('authenticated', 'public.current_app_role()', 'execute'),
  'authenticated peut exécuter les helpers'
);

set local role authenticated;

-- Sans ligne employees
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select is(public.current_employee_id(), null, 'sans employees : id null');
select is(public.current_app_role(), null, 'sans employees : rôle null');

-- Employé inactif
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select is(public.current_employee_id(), null, 'inactif : id null');
select is(public.current_app_role(), null, 'inactif : rôle null');

-- Employé actif
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select is(public.current_employee_id(), '00000000-0000-0000-0000-0000000000b3'::uuid, 'actif : son id');
select is(public.current_app_role(), 'kitchen_lead'::public.app_role, 'actif : son rôle');

-- Non authentifié
set local request.jwt.claim.sub = '';
select is(public.current_employee_id(), null, 'sans uid : null');

select * from finish();
rollback;
