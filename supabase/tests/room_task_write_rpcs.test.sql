begin;
select plan(24);

-- Identifiants : users 0146a1.., employees 0146b1.. ; b1 admin (appelant), b2 ménage actif,
-- b3 ménage inactif, b4 cuisine, b5 staff ménage (appelant refusé). Chambres 0146c1/c2. Dates 2030-04-xx.

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000146a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000146a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into public.employees (id, user_id, display_name, department, role, contract, active)
values
  ('00000000-0000-0000-0000-0000000146b1', '00000000-0000-0000-0000-0000000146a1', 'Test Admin', 'rezeption', 'admin', 'VZ', true),
  ('00000000-0000-0000-0000-0000000146b2', null, 'Test Zimmer', 'housekeeping', 'staff', 'VZ', true),
  ('00000000-0000-0000-0000-0000000146b3', null, 'Test Ehemalig', 'housekeeping', 'staff', 'VZ', false),
  ('00000000-0000-0000-0000-0000000146b4', null, 'Test Koch', 'kueche', 'staff', 'VZ', true),
  ('00000000-0000-0000-0000-0000000146b5', '00000000-0000-0000-0000-0000000146a5', 'Test Staff', 'housekeeping', 'staff', 'VZ', true);

insert into public.rooms (id, number, floor, beds)
values
  ('00000000-0000-0000-0000-0000000146c1', 'T146-1', 1, 4),
  ('00000000-0000-0000-0000-0000000146c2', 'T146-2', 1, 4);

insert into public.room_tasks (id, date, room_id, task_type, status)
values ('00000000-0000-0000-0000-0000000146d1', '2030-04-02', '00000000-0000-0000-0000-0000000146c2', 'abreise', 'erledigt');

set local role authenticated;

-- Admin : création, modification, attribution, suppression ----------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000146a1';

select lives_ok(
  $$select public.save_room_task(null, '2030-04-01', '00000000-0000-0000-0000-0000000146c1', 'abreise', null, '00000000-0000-0000-0000-0000000146b2', 'Test', 'Neu geplant')$$,
  'admin crée une tâche de chambre assignée'
);
select is(
  (select count(*) from public.room_tasks
   where date = '2030-04-01' and room_id = '00000000-0000-0000-0000-0000000146c1'
     and assigned_to = '00000000-0000-0000-0000-0000000146b2' and status = 'offen'),
  1::bigint,
  'la tâche créée est offen et assignée'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'room_tasks' and action = 'insert' and reason = 'Neu geplant'),
  1::bigint,
  'la création est tracée avec sa raison'
);
select lives_ok(
  $$select public.save_room_task(null, '2030-04-01', null, 'bleiber', '  Bäder  ', null, null, 'Zone')$$,
  'admin crée une tâche de zone non assignée'
);
select is(
  (select count(*) from public.room_tasks where date = '2030-04-01' and zone = 'Bäder' and room_id is null),
  1::bigint,
  'la zone est nettoyée'
);
select lives_ok(
  format($$select public.save_room_task(%L, '2030-04-03', '00000000-0000-0000-0000-0000000146c1', 'bleiber', null, null, 'Neu', 'Verschoben')$$,
    (select id from public.room_tasks where date = '2030-04-01' and room_id = '00000000-0000-0000-0000-0000000146c1')),
  'admin modifie une tâche'
);
select is(
  (select count(*) from public.room_tasks
   where date = '2030-04-03' and task_type = 'bleiber' and assigned_to is null),
  1::bigint,
  'la modification est appliquée'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'room_tasks' and action = 'update' and reason = 'Verschoben'),
  1::bigint,
  'la modification est tracée avec sa raison'
);
select lives_ok(
  format($$select public.assign_room_task(%L, '00000000-0000-0000-0000-0000000146b2')$$,
    (select id from public.room_tasks where date = '2030-04-03')),
  'admin attribue une tâche'
);
select is(
  (select assigned_to from public.room_tasks where date = '2030-04-03'),
  '00000000-0000-0000-0000-0000000146b2'::uuid,
  'attribution appliquée'
);
select lives_ok(
  format($$select public.assign_room_task(%L, null)$$,
    (select id from public.room_tasks where date = '2030-04-03')),
  'admin retire l''attribution'
);
select is(
  (select assigned_to from public.room_tasks where date = '2030-04-03'),
  null::uuid,
  'attribution retirée'
);
select lives_ok(
  format($$select public.delete_room_task(%L, 'Doppelt')$$,
    (select id from public.room_tasks where date = '2030-04-03')),
  'admin supprime une tâche non faite'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'room_tasks' and action = 'delete' and reason = 'Doppelt'),
  1::bigint,
  'la suppression est tracée avec sa raison'
);

-- Erreurs ---------------------------------------------------------------------
select throws_ok(
  $$select public.save_room_task(null, '2030-04-05', null, 'abreise', 'Bäder', null, null, null)$$,
  'HT001', 'reason_required', 'save_room_task sans raison est refusé'
);
select throws_ok(
  $$select public.save_room_task(null, '2030-04-05', null, 'abreise', null, null, null, 'Test')$$,
  'HT006', 'invalid_room_task', 'ni chambre ni zone refusé'
);
select throws_ok(
  $$select public.save_room_task(null, '2030-04-05', '00000000-0000-0000-0000-0000000146c1', 'abreise', 'Bäder', null, null, 'Test')$$,
  'HT006', 'invalid_room_task', 'chambre et zone ensemble refusé'
);
select throws_ok(
  $$select public.save_room_task(null, '2030-04-02', '00000000-0000-0000-0000-0000000146c2', 'abreise', null, null, null, 'Test')$$,
  'HT006', 'invalid_room_task', 'deuxième tâche pour la même chambre et le même jour refusée'
);
select throws_ok(
  $$select public.save_room_task(null, '2030-04-05', '00000000-0000-0000-0000-0000000146c1', 'abreise', null, '00000000-0000-0000-0000-0000000146b3', null, 'Test')$$,
  'HT007', 'invalid_assignee', 'personne inactive refusée'
);
select throws_ok(
  $$select public.save_room_task(null, '2030-04-05', '00000000-0000-0000-0000-0000000146c1', 'abreise', null, '00000000-0000-0000-0000-0000000146b4', null, 'Test')$$,
  'HT007', 'invalid_assignee', 'personne hors housekeeping refusée'
);
select throws_ok(
  $$select public.assign_room_task('00000000-0000-0000-0000-0000000146d1', '00000000-0000-0000-0000-0000000146b4')$$,
  'HT007', 'invalid_assignee', 'assign_room_task refuse une personne hors housekeeping'
);
select throws_ok(
  $$select public.delete_room_task('00000000-0000-0000-0000-0000000146d1', 'Test')$$,
  'HT008', 'task_done', 'tâche erledigt non supprimable'
);

-- Refus par rôle --------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000146a5';
select throws_ok(
  $$select public.save_room_task(null, '2030-04-05', null, 'abreise', 'Bäder', null, null, 'Test')$$,
  'HT002', 'forbidden', 'staff ne peut pas écrire une tâche'
);

set local role anon;
select throws_ok(
  $$select public.assign_room_task('00000000-0000-0000-0000-0000000146d1', null)$$,
  '42501', null, 'anonyme : assign_room_task refusé'
);

select * from finish();
rollback;
