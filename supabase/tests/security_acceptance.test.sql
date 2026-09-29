begin;
select plan(23);

-- Critères d'acceptation P1-06. Identifiants : employees b, room_tasks e, audit_log 7 ;
-- dates 2030-03-05 pour ne pas croiser les autres tests. a2 admin, a3 Koch, a4 Küchenleitung,
-- a5 Housekeeping, a6 sans ligne employees.

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a6', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

insert into public.employees (id, user_id, display_name, department, role, contract)
values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Test Admin', 'rezeption', 'admin', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'Test Koch', 'kueche', 'staff', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', 'Test Leitung', 'kueche', 'kitchen_lead', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a5', 'Test Zimmer', 'housekeeping', 'staff', 'VZ');

-- La Küchenleitung est malade (motif à ne pas révéler) ; le Koch travaille.
insert into public.shifts (employee_id, date, type, start1, end1, note)
values
  ('00000000-0000-0000-0000-0000000000b3', '2030-03-05', 'normal', 480, 960, null),
  ('00000000-0000-0000-0000-0000000000b4', '2030-03-05', 'krank', null, null, 'Test Notiz'),
  ('00000000-0000-0000-0000-0000000000b5', '2030-03-05', 'urlaub', null, null, null);

insert into public.rooms (id, number, floor, beds)
values ('00000000-0000-0000-0000-0000000000d1', 'T-101', 1, 2);

-- e1 est assigné à Housekeeping, e2 au Koch.
insert into public.room_tasks (id, date, room_id, task_type, zone, assigned_to)
values
  ('00000000-0000-0000-0000-0000000000e1', '2030-03-05', '00000000-0000-0000-0000-0000000000d1', 'abreise', null, '00000000-0000-0000-0000-0000000000b5'),
  ('00000000-0000-0000-0000-0000000000e2', '2030-03-05', null, 'bleiber', 'Test Zone', '00000000-0000-0000-0000-0000000000b3');

insert into public.audit_log (id, table_name, row_id, action)
values ('00000000-0000-0000-0000-000000000072', 'shifts', '00000000-0000-0000-0000-0000000000b3', 'insert');

set local role authenticated;

-- Küche : motif d'absence d'un collègue --------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';

select is_empty(
  $$select 1 from public.shifts where employee_id = '00000000-0000-0000-0000-0000000000b4'$$,
  'Küche ne lit pas le service d''un collègue'
);
select is(
  (select type from public.team_shifts('2030-03-05') where employee_id = '00000000-0000-0000-0000-0000000000b4'),
  'abwesend',
  'Küche voit « abwesend » pour une absence de collègue'
);
select is(
  (select count(*) from public.team_shifts('2030-03-05') where type in ('krank', 'urlaub')),
  0::bigint,
  'team_shifts ne renvoie jamais krank ni urlaub à un employé'
);
select is(
  (select count(*) from public.team_shifts('2030-03-05') where employee_id = '00000000-0000-0000-0000-0000000000b4' and start1 is not null),
  0::bigint,
  'l''absence d''un collègue n''a pas d''horaire'
);

-- Küche : aucun service modifiable -------------------------------------------------
select is_empty(
  $$update public.shifts set end1 = 900 where employee_id = '00000000-0000-0000-0000-0000000000b3' returning id$$,
  'Küche ne modifie pas son propre service en direct'
);
select is_empty(
  $$update public.shifts set type = 'frei', start1 = null, end1 = null where employee_id = '00000000-0000-0000-0000-0000000000b4' returning id$$,
  'Küche ne modifie pas le service d''un collègue'
);
select is_empty(
  $$delete from public.shifts where employee_id = '00000000-0000-0000-0000-0000000000b3' returning id$$,
  'Küche ne supprime pas de service en direct'
);
select throws_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b3', '2030-03-05', 'normal', 480::smallint, 900::smallint, null, null, 30::smallint, null, 'Test')$$,
  'HT002', 'forbidden',
  'Küche ne modifie pas un service via save_shift'
);

-- Housekeeping : seulement le statut de ses tâches ---------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a5';

select is_empty(
  $$update public.room_tasks set zone = 'Test Neu', assigned_to = null where id = '00000000-0000-0000-0000-0000000000e1' returning id$$,
  'Housekeeping ne modifie pas sa tâche en direct'
);
select is_empty(
  $$update public.room_tasks set status = 'erledigt' where id = '00000000-0000-0000-0000-0000000000e2' returning id$$,
  'Housekeeping ne modifie pas la tâche d''un autre en direct'
);
select lives_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e1', 'erledigt')$$,
  'Housekeeping change le statut de sa tâche'
);
select is(
  (select zone is null and assigned_to = '00000000-0000-0000-0000-0000000000b5' and date = '2030-03-05' and status = 'erledigt'
   from public.room_tasks where id = '00000000-0000-0000-0000-0000000000e1'),
  true,
  'seul le statut de la tâche a changé'
);
select throws_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e2', 'erledigt')$$,
  'HT002', 'forbidden',
  'Housekeeping ne change pas le statut de la tâche d''un autre'
);

-- audit_log : non modifiable, même par un admin -------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';

select throws_ok(
  $$insert into public.audit_log (table_name, row_id, action) values ('shifts', gen_random_uuid(), 'insert')$$,
  '42501', null,
  'admin n''insère pas dans audit_log'
);
select throws_ok(
  $$update public.audit_log set reason = 'x' where id = '00000000-0000-0000-0000-000000000072'$$,
  '42501', null,
  'admin ne modifie pas audit_log'
);
select throws_ok(
  $$delete from public.audit_log where id = '00000000-0000-0000-0000-000000000072'$$,
  '42501', null,
  'admin ne supprime pas audit_log'
);
select throws_ok(
  $$truncate public.audit_log$$,
  '42501', null,
  'admin ne vide pas audit_log'
);
select is(
  (select count(*) from public.audit_log where id = '00000000-0000-0000-0000-000000000072' and reason is null),
  1::bigint,
  'la ligne d''audit est intacte'
);

-- Sans ligne employees : rien n'est visible ni écrivable -----------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a6';

select is_empty(
  $$select 1 from public.team_shifts('2030-03-05')$$,
  'sans employees : team_shifts est vide'
);
select is_empty(
  $$select 1 from public.meal_totals('2030-03-05', '2030-03-05')$$,
  'sans employees : meal_totals est vide'
);
select throws_ok(
  $$select public.save_shift('00000000-0000-0000-0000-0000000000b3', '2030-03-05', 'normal', 480::smallint, 900::smallint, null, null, 30::smallint, null, 'Test')$$,
  'HT002', 'forbidden',
  'sans employees : save_shift est refusé'
);
select throws_ok(
  $$select public.set_task_status('00000000-0000-0000-0000-0000000000e1', 'offen')$$,
  'HT002', 'forbidden',
  'sans employees : set_task_status est refusé'
);

-- Les tentatives refusées n'ont rien changé ----------------------------------------
reset role;

select is(
  (select count(*) from public.shifts
   where date = '2030-03-05' and employee_id in ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000b4')
     and ((employee_id = '00000000-0000-0000-0000-0000000000b3' and type = 'normal' and end1 = 960)
       or (employee_id = '00000000-0000-0000-0000-0000000000b4' and type = 'krank'))),
  2::bigint,
  'les services de test sont inchangés'
);

select * from finish();
rollback;
