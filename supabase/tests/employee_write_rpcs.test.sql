begin;
select plan(23);

-- Identifiants : users 0145a1.., employees 0145b1.. ; b1 admin (appelant), b2 second admin inactif,
-- b3 Koch, b4 Küchenleitung. Dates 2030-03-xx.

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000145a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000145a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000145a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- Les admins éventuels d'un seed ne doivent pas fausser « dernier admin ».
update public.employees set active = false where role = 'admin';

insert into public.employees (id, user_id, display_name, department, role, contract)
values
  ('00000000-0000-0000-0000-0000000145b1', '00000000-0000-0000-0000-0000000145a1', 'Test Admin', 'rezeption', 'admin', 'VZ'),
  ('00000000-0000-0000-0000-0000000145b3', '00000000-0000-0000-0000-0000000145a3', 'Test Koch', 'kueche', 'staff', 'VZ'),
  ('00000000-0000-0000-0000-0000000145b4', '00000000-0000-0000-0000-0000000145a4', 'Test Leitung', 'kueche', 'kitchen_lead', 'VZ');

insert into public.employees (id, display_name, department, role, contract, active)
values ('00000000-0000-0000-0000-0000000145b2', 'Test Admin Zwei', 'rezeption', 'admin', 'VZ', false);

insert into public.shifts (employee_id, date, type, start1, end1)
values ('00000000-0000-0000-0000-0000000145b3', '2030-03-05', 'normal', 480, 960);

set local role authenticated;

-- Admin : création et modification --------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000145a1';

select lives_ok(
  $$select public.save_employee(null, '  Test Neu  ', 'bfd', 'staff', 'TZ', 240::smallint, 4800, 'Neu eingestellt')$$,
  'admin crée une personne'
);
select is(
  (select count(*) from public.employees where display_name = 'Test Neu' and contract = 'TZ' and active),
  1::bigint,
  'la personne créée est active, nom nettoyé'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'employees' and action = 'insert' and reason = 'Neu eingestellt'),
  1::bigint,
  'la création est tracée avec sa raison'
);
select lives_ok(
  $$select public.save_employee('00000000-0000-0000-0000-0000000145b3', 'Test Koch Neu', 'kueche', 'staff', 'TZ', 300::smallint, 6000, 'Vertrag geändert')$$,
  'admin modifie une personne'
);
select is(
  (select count(*) from public.employees
   where id = '00000000-0000-0000-0000-0000000145b3' and display_name = 'Test Koch Neu' and contract = 'TZ'),
  1::bigint,
  'la modification est appliquée'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'employees' and action = 'update' and reason = 'Vertrag geändert'),
  1::bigint,
  'la modification est tracée avec sa raison'
);

-- Erreurs de validation -------------------------------------------------------
select throws_ok(
  $$select public.save_employee(null, 'Test X', 'bfd', 'staff', 'VZ', 0::smallint, 0, null)$$,
  'HT001', 'reason_required', 'save_employee sans raison est refusé'
);
select throws_ok(
  $$select public.save_employee(null, '   ', 'bfd', 'staff', 'VZ', 0::smallint, 0, 'Test')$$,
  'HT003', 'invalid_employee', 'nom vide refusé'
);
select throws_ok(
  $$select public.save_employee(null, 'Test X', 'bfd', 'staff', 'XX', 0::smallint, 0, 'Test')$$,
  'HT003', 'invalid_employee', 'contrat hors VZ/TZ refusé'
);
select throws_ok(
  $$select public.save_employee(null, 'Test X', 'bfd', 'staff', 'VZ', 1441::smallint, 0, 'Test')$$,
  'HT003', 'invalid_employee', 'Soll journalier hors bornes refusé'
);
select throws_ok(
  $$select public.save_employee(null, 'Test X', 'bfd', 'staff', 'VZ', 0::smallint, -1, 'Test')$$,
  'HT003', 'invalid_employee', 'Soll mensuel négatif refusé'
);
select throws_ok(
  $$select public.save_employee('00000000-0000-0000-0000-0000000145ff', 'Test X', 'bfd', 'staff', 'VZ', 0::smallint, 0, 'Test')$$,
  'HT002', 'forbidden', 'personne inconnue refusée'
);

-- Désactivation ---------------------------------------------------------------
select throws_ok(
  $$select public.set_employee_active('00000000-0000-0000-0000-0000000145b3', false, null)$$,
  'HT001', 'reason_required', 'set_employee_active sans raison est refusé'
);
select lives_ok(
  $$select public.set_employee_active('00000000-0000-0000-0000-0000000145b3', false, 'Ausgetreten')$$,
  'admin désactive une personne'
);
select is(
  (select count(*) from public.shifts where employee_id = '00000000-0000-0000-0000-0000000145b3'),
  1::bigint,
  'les services de la personne désactivée restent'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'employees' and action = 'update' and reason = 'Ausgetreten'),
  1::bigint,
  'la désactivation est tracée avec sa raison'
);
select lives_ok(
  $$select public.set_employee_active('00000000-0000-0000-0000-0000000145b3', true, 'Wieder da')$$,
  'admin réactive une personne'
);
select throws_ok(
  $$select public.set_employee_active('00000000-0000-0000-0000-0000000145b1', false, 'Test')$$,
  'HT005', 'self_deactivation', 'on ne se désactive pas soi-même'
);

-- Dernier admin ---------------------------------------------------------------
-- b2 est inactif au départ du scénario : b1 est le seul admin actif.
select throws_ok(
  $$select public.save_employee('00000000-0000-0000-0000-0000000145b1', 'Test Admin', 'rezeption', 'staff', 'VZ', 0::smallint, 0, 'Test')$$,
  'HT004', 'last_admin', 'on ne retire pas le rôle au dernier admin actif'
);

-- Refus par rôle --------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000145a4';
select throws_ok(
  $$select public.save_employee(null, 'Test X', 'bfd', 'staff', 'VZ', 0::smallint, 0, 'Test')$$,
  'HT002', 'forbidden', 'Küchenleitung ne peut pas écrire une personne'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000145a3';
select throws_ok(
  $$select public.set_employee_active('00000000-0000-0000-0000-0000000145b4', false, 'Test')$$,
  'HT002', 'forbidden', 'staff ne peut pas désactiver une personne'
);

set local role anon;
select throws_ok(
  $$select public.save_employee(null, 'Test X', 'bfd', 'staff', 'VZ', 0::smallint, 0, 'Test')$$,
  '42501', null, 'anonyme : save_employee refusé'
);
select throws_ok(
  $$select public.set_employee_active('00000000-0000-0000-0000-0000000145b3', false, 'Test')$$,
  '42501', null, 'anonyme : set_employee_active refusé'
);

select * from finish();
rollback;
