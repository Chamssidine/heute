begin;
select plan(60);

-- Les identifiants de test se terminent par un chiffre hexadécimal propre à la table
-- suivi d'un numéro (employees b, bookings c, rooms d, room_tasks e, announcements f,
-- menu_items a, meal_counts 9, push_tokens 8, audit_log 7) : les comptages filtrent sur
-- ce motif pour ne pas dépendre du seed. Les shifts sont filtrés par la date 2030-01-10.

insert into auth.users (id, instance_id, aud, role)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a4', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('00000000-0000-0000-0000-0000000000a5', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
-- a1 n'a volontairement aucune ligne employees.

insert into public.employees (id, user_id, display_name, department, role, contract)
values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a2', 'Test Admin', 'rezeption', 'admin', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a3', 'Test Koch', 'kueche', 'staff', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b4', '00000000-0000-0000-0000-0000000000a4', 'Test Leitung', 'kueche', 'kitchen_lead', 'VZ'),
  ('00000000-0000-0000-0000-0000000000b5', '00000000-0000-0000-0000-0000000000a5', 'Test Zimmer', 'housekeeping', 'staff', 'VZ');

insert into public.shifts (employee_id, date, type, start1, end1)
values
  ('00000000-0000-0000-0000-0000000000b2', '2030-01-10', 'normal', 480, 960),
  ('00000000-0000-0000-0000-0000000000b3', '2030-01-10', 'normal', 480, 960),
  ('00000000-0000-0000-0000-0000000000b4', '2030-01-10', 'normal', 480, 960),
  ('00000000-0000-0000-0000-0000000000b5', '2030-01-10', 'normal', 480, 960);

insert into public.bookings (id, matchcode, label, arrival, departure)
values ('00000000-0000-0000-0000-0000000000c1', 'TEST-A', 'Test Gruppe A', '2030-01-10', '2030-01-11');

insert into public.meal_counts (id, booking_id, date, meal, total)
values ('00000000-0000-0000-0000-000000000091', '00000000-0000-0000-0000-0000000000c1', '2030-01-10', 'mittag', 20);

insert into public.menu_items (id, date, meal, main_dish)
values ('00000000-0000-0000-0000-0000000000a1', '2030-01-10', 'mittag', 'Test Suppe');

insert into public.rooms (id, number, floor, beds)
values ('00000000-0000-0000-0000-0000000000d1', 'T-101', 1, 2);

-- e1 est assigné à Housekeeping, e2 à la Küche, e3 à personne.
insert into public.room_tasks (id, date, room_id, task_type, zone, assigned_to)
values
  ('00000000-0000-0000-0000-0000000000e1', '2030-01-10', '00000000-0000-0000-0000-0000000000d1', 'abreise', null, '00000000-0000-0000-0000-0000000000b5'),
  ('00000000-0000-0000-0000-0000000000e2', '2030-01-10', null, 'bleiber', 'Test Zone', '00000000-0000-0000-0000-0000000000b3'),
  ('00000000-0000-0000-0000-0000000000e3', '2030-01-10', null, 'bleiber', 'Test Zone 2', null);

insert into public.announcements (id, text, audience)
values
  ('00000000-0000-0000-0000-0000000000f1', 'Test für alle', 'all'),
  ('00000000-0000-0000-0000-0000000000f2', 'Test Küche', 'kueche'),
  ('00000000-0000-0000-0000-0000000000f3', 'Test Zimmer', 'housekeeping');

insert into public.push_tokens (id, employee_id, token, platform)
values
  ('00000000-0000-0000-0000-000000000081', '00000000-0000-0000-0000-0000000000b3', 'test-token-koch', 'android'),
  ('00000000-0000-0000-0000-000000000082', '00000000-0000-0000-0000-0000000000b5', 'test-token-zimmer', 'android');

insert into public.audit_log (id, table_name, row_id, action)
values ('00000000-0000-0000-0000-000000000071', 'shifts', '00000000-0000-0000-0000-0000000000b3', 'insert');

select is(
  (select count(*) from pg_policies
   where schemaname = 'public'
     and tablename in ('shifts', 'room_tasks', 'audit_log')
     and cmd <> 'SELECT'),
  0::bigint,
  'shifts, room_tasks, audit_log : aucune policy d''écriture'
);

set local role authenticated;

-- Sans ligne employees : rien n'est lisible ---------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a1';
select is((select count(*) from public.employees where id::text like '%0000000000b_'), 0::bigint, 'sans employees : employees');
select is((select count(*) from public.shifts where date = '2030-01-10'), 0::bigint, 'sans employees : shifts');
select is((select count(*) from public.audit_log where id::text like '%000000000071'), 0::bigint, 'sans employees : audit_log');
select is((select count(*) from public.bookings where id::text like '%0000000000c_'), 0::bigint, 'sans employees : bookings');
select is((select count(*) from public.meal_counts where id::text like '%000000000091'), 0::bigint, 'sans employees : meal_counts');
select is((select count(*) from public.menu_items where id::text like '%0000000000a_'), 0::bigint, 'sans employees : menu_items');
select is((select count(*) from public.rooms where id::text like '%0000000000d_'), 0::bigint, 'sans employees : rooms');
select is((select count(*) from public.room_tasks where id::text like '%0000000000e_'), 0::bigint, 'sans employees : room_tasks');
select is((select count(*) from public.announcements where id::text like '%0000000000f_'), 0::bigint, 'sans employees : announcements');
select is((select count(*) from public.push_tokens where id::text like '%00000000008_'), 0::bigint, 'sans employees : push_tokens');

-- Admin ----------------------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a2';
select is((select count(*) from public.employees where id::text like '%0000000000b_'), 4::bigint, 'admin lit employees');
select is((select count(*) from public.shifts where date = '2030-01-10'), 4::bigint, 'admin lit shifts');
select is((select count(*) from public.audit_log where id::text like '%000000000071'), 1::bigint, 'admin lit audit_log');
select is((select count(*) from public.bookings where id::text like '%0000000000c_'), 1::bigint, 'admin lit bookings');
select is((select count(*) from public.meal_counts where id::text like '%000000000091'), 1::bigint, 'admin lit meal_counts');
select is((select count(*) from public.menu_items where id::text like '%0000000000a_'), 1::bigint, 'admin lit menu_items');
select is((select count(*) from public.rooms where id::text like '%0000000000d_'), 1::bigint, 'admin lit rooms');
select is((select count(*) from public.room_tasks where id::text like '%0000000000e_'), 3::bigint, 'admin lit room_tasks');
select is((select count(*) from public.announcements where id::text like '%0000000000f_'), 3::bigint, 'admin lit announcements');
select is((select count(*) from public.push_tokens where id::text like '%00000000008_'), 0::bigint, 'admin ne lit que ses propres push_tokens');
select lives_ok(
  $$insert into public.rooms (number, floor, beds) values ('T-102', 1, 2)$$,
  'admin écrit rooms'
);
select throws_ok(
  $$insert into public.shifts (employee_id, date, type) values ('00000000-0000-0000-0000-0000000000b2', '2030-01-11', 'frei')$$,
  '42501',
  null,
  'admin n''écrit pas shifts directement'
);
select throws_ok(
  $$insert into public.audit_log (table_name, row_id, action) values ('shifts', '00000000-0000-0000-0000-0000000000b2', 'insert')$$,
  '42501',
  null,
  'admin n''écrit pas audit_log'
);

-- Küchenleitung ----------------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a4';
select is((select count(*) from public.employees where id::text like '%0000000000b_'), 2::bigint, 'Küchenleitung lit la Küche et soi dans employees');
select is((select count(*) from public.shifts where date = '2030-01-10'), 2::bigint, 'Küchenleitung lit les shifts de la Küche');
select is((select count(*) from public.audit_log where id::text like '%000000000071'), 0::bigint, 'Küchenleitung ne lit pas audit_log');
select is((select count(*) from public.bookings where id::text like '%0000000000c_'), 1::bigint, 'Küchenleitung lit bookings');
select is((select count(*) from public.meal_counts where id::text like '%000000000091'), 1::bigint, 'Küchenleitung lit meal_counts');
select is((select count(*) from public.menu_items where id::text like '%0000000000a_'), 1::bigint, 'Küchenleitung lit menu_items');
select is((select count(*) from public.rooms where id::text like '%0000000000d_'), 0::bigint, 'Küchenleitung ne lit pas rooms');
select is((select count(*) from public.room_tasks where id::text like '%0000000000e_'), 0::bigint, 'Küchenleitung ne lit pas room_tasks');
select is((select count(*) from public.announcements where id::text like '%0000000000f_'), 2::bigint, 'Küchenleitung lit les annonces all et kueche');
select is((select count(*) from public.push_tokens where id::text like '%00000000008_'), 0::bigint, 'Küchenleitung ne lit pas les push_tokens des autres');
select lives_ok(
  $$insert into public.menu_items (date, meal, main_dish) values ('2030-01-10', 'abend', 'Test Eintopf')$$,
  'Küchenleitung écrit menu_items'
);
select throws_ok(
  $$insert into public.bookings (matchcode, label, arrival, departure) values ('TEST-X', 'Test X', '2030-01-10', '2030-01-11')$$,
  '42501',
  null,
  'Küchenleitung n''écrit pas bookings'
);

-- Küche ------------------------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a3';
select is((select count(*) from public.employees where id::text like '%0000000000b_'), 1::bigint, 'Küche lit soi dans employees');
select is((select count(*) from public.shifts where date = '2030-01-10'), 1::bigint, 'Küche lit ses shifts');
select is((select count(*) from public.audit_log where id::text like '%000000000071'), 0::bigint, 'Küche ne lit pas audit_log');
select is((select count(*) from public.bookings where id::text like '%0000000000c_'), 1::bigint, 'Küche lit bookings');
select is((select count(*) from public.meal_counts where id::text like '%000000000091'), 1::bigint, 'Küche lit meal_counts');
select is((select count(*) from public.menu_items where id::text like '%0000000000a_'), 1::bigint, 'Küche lit menu_items');
select is((select count(*) from public.rooms where id::text like '%0000000000d_'), 0::bigint, 'Küche ne lit pas rooms');
select is((select count(*) from public.room_tasks where id::text like '%0000000000e_'), 0::bigint, 'Küche ne lit pas room_tasks');
select is((select count(*) from public.announcements where id::text like '%0000000000f_'), 2::bigint, 'Küche lit les annonces all et kueche');
select is((select count(*) from public.push_tokens where id::text like '%00000000008_'), 1::bigint, 'Küche lit ses propres push_tokens');
select throws_ok(
  $$insert into public.menu_items (date, meal, main_dish) values ('2030-01-11', 'mittag', 'Test Gulasch')$$,
  '42501',
  null,
  'Küche n''écrit pas menu_items'
);

-- Housekeeping -------------------------------------------------------------------------
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000a5';
select is((select count(*) from public.employees where id::text like '%0000000000b_'), 1::bigint, 'Housekeeping lit soi dans employees');
select is((select count(*) from public.shifts where date = '2030-01-10'), 1::bigint, 'Housekeeping lit ses shifts');
select is((select count(*) from public.audit_log where id::text like '%000000000071'), 0::bigint, 'Housekeeping ne lit pas audit_log');
select is((select count(*) from public.bookings where id::text like '%0000000000c_'), 0::bigint, 'Housekeeping ne lit pas bookings');
select is((select count(*) from public.meal_counts where id::text like '%000000000091'), 0::bigint, 'Housekeeping ne lit pas meal_counts');
select is((select count(*) from public.menu_items where id::text like '%0000000000a_'), 1::bigint, 'Housekeeping lit menu_items');
select is((select count(*) from public.rooms where id::text like '%0000000000d_'), 1::bigint, 'Housekeeping lit rooms');
select is((select count(*) from public.room_tasks where id::text like '%0000000000e_'), 1::bigint, 'Housekeeping lit ses room_tasks');
select is((select count(*) from public.announcements where id::text like '%0000000000f_'), 2::bigint, 'Housekeeping lit les annonces all et housekeeping');
select is((select count(*) from public.push_tokens where id::text like '%00000000008_'), 1::bigint, 'Housekeeping lit ses propres push_tokens');
select lives_ok(
  $$insert into public.push_tokens (employee_id, token, platform) values ('00000000-0000-0000-0000-0000000000b5', 'test-token-neu', 'android')$$,
  'Housekeeping écrit son propre push_token'
);
select throws_ok(
  $$insert into public.push_tokens (employee_id, token, platform) values ('00000000-0000-0000-0000-0000000000b3', 'test-token-fremd', 'android')$$,
  '42501',
  null,
  'Housekeeping n''écrit pas le push_token d''un autre'
);
select throws_ok(
  $$insert into public.rooms (number, floor, beds) values ('T-103', 1, 2)$$,
  '42501',
  null,
  'Housekeeping n''écrit pas rooms'
);

select * from finish();
rollback;
