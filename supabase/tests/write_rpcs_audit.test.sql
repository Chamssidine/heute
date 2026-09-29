begin;
select plan(24);

-- Identifiants : employees b, room_tasks e, rooms d ; dates 2030-02-xx pour ne pas
-- croiser les autres tests. a2 admin, a3 Koch, a4 Küchenleitung, a5 Housekeeping.

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into public.employees (id, user_id, display_name, department, role, contract)
values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Test Admin', 'rezeption', 'admin', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'Test Koch', 'kueche', 'staff', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', 'Test Leitung', 'kueche', 'kitchen_lead', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a5', 'Test Zimmer', 'housekeeping', 'staff', 'VZ');

insert into public.rooms (id, number, floor, beds)
values ('00000000-0000-0000-0000-0000000000d1', 'T-101', 1, 2);

insert into public.room_tasks (id, date, room_id, task_type, zone, assigned_to)
values
  ('00000000-0000-0000-0000-0000000000e1', '2030-02-05', '00000000-0000-0000-0000-0000000000d1', 'abreise', null, '00000000-0000-0000-0000-0000000000b5'),
  ('00000000-0000-0000-0000-0000000000e3', '2030-02-05', null, 'bleiber', 'Test Zone', null);

set local role authenticated;

-- save_shift : raison obligatoire ---------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';

select throws_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b5', '2030-02-05', 'normal', 480::smallint, 960::smallint, null, null, 30::smallint, null, null)$$,
  'HT001', 'reason_required',
  'save_shift sans raison est refusé'
);
select throws_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b5', '2030-02-05', 'normal', 480::smallint, 960::smallint, null, null, 30::smallint, null, '   ')$$,
  'HT001', 'reason_required',
  'save_shift avec raison vide est refusé'
);

-- Admin : tous les employés ---------------------------------------------------
select lives_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b5', '2030-02-05', 'normal', 480::smallint, 960::smallint, null, null, 30::smallint, null, 'Erstellt')$$,
  'admin crée un service Housekeeping'
);
select lives_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b5', '2030-02-05', 'normal', 540::smallint, 960::smallint, null, null, 30::smallint, null, 'Beginn verschoben')$$,
  'admin modifie un service Housekeeping (upsert)'
);
select lives_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b3', '2030-02-06', 'normal', 480::smallint, 960::smallint, null, null, 30::smallint, null, 'Erstellt')$$,
  'admin crée un service Küche'
);

-- Küchenleitung : Küche seulement ---------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';

select throws_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b5', '2030-02-05', 'normal', 480::smallint, 900::smallint, null, null, 30::smallint, null, 'Test')$$,
  'HT002', 'forbidden',
  'la Küchenleitung ne peut pas modifier un service Housekeeping'
);
select lives_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b3', '2030-02-06', 'normal', 480::smallint, 900::smallint, null, null, 30::smallint, null, 'Früher Schluss')$$,
  'la Küchenleitung modifie un service Küche'
);

-- Employé standard ------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';

select throws_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b3', '2030-02-06', 'normal', 480::smallint, 900::smallint, null, null, 30::smallint, null, 'Test')$$,
  'HT002', 'forbidden',
  'un employé standard ne peut pas modifier son propre service'
);

-- delete_shift ----------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';

select throws_ok(
  $$select public.delete_shift((select id from public.shifts where employee_id = '00000000-0000-0000-0000-0000000000b3' and date = '2030-02-06'), '')$$,
  'HT001', 'reason_required',
  'delete_shift sans raison est refusé'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';

select throws_ok(
  $$select public.delete_shift('00000000-0000-0000-0000-000000000000', 'Test')$$,
  'HT002', 'forbidden',
  'delete_shift sur un service inconnu est refusé'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';

select lives_ok(
  $$select public.delete_shift((select id from public.shifts where employee_id = '00000000-0000-0000-0000-0000000000b3' and date = '2030-02-06'), 'Dienst getauscht')$$,
  'la Küchenleitung supprime un service Küche'
);

-- La Küchenleitung ne lit pas le service Housekeeping (RLS) : l'id est mémorisé
-- en admin, puis le refus est testé avec cet id.
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';

select set_config('test.hk_shift_id',
  (select id::text from public.shifts where employee_id = '00000000-0000-0000-0000-0000000000b5' and date = '2030-02-05'),
  true);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';

select throws_ok(
  $$select public.delete_shift(current_setting('test.hk_shift_id')::uuid, 'Test')$$,
  'HT002', 'forbidden',
  'la Küchenleitung ne peut pas supprimer un service Housekeeping'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';

select lives_ok(
  $$select public.delete_shift((select id from public.shifts where employee_id = '00000000-0000-0000-0000-0000000000b5' and date = '2030-02-05'), 'Fehlerhaft angelegt')$$,
  'admin supprime un service Housekeeping'
);

-- set_task_status -------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a5';

select lives_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e1', 'erledigt')$$,
  'la personne assignée change le statut'
);
select isnt(
  (select done_at from public.room_tasks where id = '00000000-0000-0000-0000-0000000000e1'),
  null,
  'done_at est renseigné avec erledigt'
);
select lives_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e1', 'in_arbeit')$$,
  'la personne assignée rouvre la tâche'
);
select is(
  (select done_at from public.room_tasks where id = '00000000-0000-0000-0000-0000000000e1'),
  null,
  'done_at est effacé hors erledigt'
);
select throws_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e3', 'erledigt')$$,
  'HT002', 'forbidden',
  'une tâche non assignée à soi est refusée'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';

select throws_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e1', 'erledigt')$$,
  'HT002', 'forbidden',
  'une autre personne ne change pas le statut'
);

-- audit_log : aucune écriture utilisateur -------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';

select throws_ok(
  $$insert into public.audit_log (table_name, row_id, action) values ('shifts', gen_random_uuid(), 'insert')$$,
  '42501', null,
  'aucune écriture directe dans audit_log'
);
select throws_ok(
  $$update public.audit_log set reason = 'x'$$,
  '42501', null,
  'audit_log non modifiable'
);

-- Audit : lecture en superutilisateur ----------------------------------------
reset role;

select is(
  (select count(*) from public.audit_log
   where table_name = 'shifts' and employee_id = '00000000-0000-0000-0000-0000000000b5'
     and date = '2030-02-05' and action = 'update'
     and changed_by = '00000000-0000-0000-0000-0000000000b2' and reason = 'Beginn verschoben'
     and (old ->> 'start1') = '480' and (new ->> 'start1') = '540'),
  1::bigint,
  'une modification crée une ligne d''audit avec auteur et raison'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'shifts' and employee_id = '00000000-0000-0000-0000-0000000000b5'
     and date = '2030-02-05' and action = 'delete'
     and changed_by = '00000000-0000-0000-0000-0000000000b2' and reason = 'Fehlerhaft angelegt'
     and new is null),
  1::bigint,
  'une suppression garde un instantané avec auteur et raison'
);
select is(
  (select count(*) from public.audit_log
   where table_name = 'room_tasks' and row_id = '00000000-0000-0000-0000-0000000000e1'
     and action = 'update' and changed_by = '00000000-0000-0000-0000-0000000000b5'
     and reason is null and employee_id = '00000000-0000-0000-0000-0000000000b5'),
  2::bigint,
  'les changements de statut sont audités sans raison'
);

select * from finish();
rollback;
