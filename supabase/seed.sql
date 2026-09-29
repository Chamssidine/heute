-- P1-07 : données de démo « Jugendherberge Musterberg » (PLAN §2.2).
-- Tout est fictif. Les dates sont relatives à current_date : jamais de date fixe.
-- Fenêtre du Dienstplan : du 1er du mois courant jusqu'à 6 jours après la fin du mois.
-- Repas, Speiseplan et tâches de ménage : aujourd'hui et les 6 jours suivants.
--
-- Comptes de démo (auth.users), tous avec le même mot de passe : demo-Passwort-2026
-- Ce mot de passe n'existe que dans ce seed, pour le Supabase local.

-- Employés et comptes ---------------------------------------------------------

create temporary table seed_staff (
  idx int primary key,
  user_id uuid not null,
  employee_id uuid not null,
  email text not null,
  display_name text not null,
  department public.department not null,
  role public.app_role not null,
  contract text not null,
  soll_min_day int not null,
  soll_min_month int not null,
  start1 int not null,
  end1 int not null
);

-- start1/end1 : horaires réels ; 8,5 h d'amplitude en VZ (IST = 8,00 h avec 30 min de pause),
-- 4,5 h pour Emil en TZ (IST = 4,00 h, aligné sur son Soll).
insert into seed_staff values
  (0, 'a0000000-0000-4000-8000-000000000001', 'e0000000-0000-4000-8000-000000000001',
   'karl.koch@musterberg.test', 'Karl Musterkoch', 'kueche', 'staff', 'VZ', 480, 10440, 360, 870),
  (1, 'a0000000-0000-4000-8000-000000000002', 'e0000000-0000-4000-8000-000000000002',
   'berta.beispiel@musterberg.test', 'Berta Beispiel', 'kueche', 'staff', 'VZ', 480, 10440, 630, 1140),
  (2, 'a0000000-0000-4000-8000-000000000003', 'e0000000-0000-4000-8000-000000000003',
   'otto.testkoch@musterberg.test', 'Otto Testkoch', 'kueche', 'kitchen_lead', 'VZ', 480, 10440, 480, 990),
  (3, 'a0000000-0000-4000-8000-000000000004', 'e0000000-0000-4000-8000-000000000004',
   'mia.putzmuster@musterberg.test', 'Mia Putzmuster', 'housekeeping', 'staff', 'VZ', 480, 10440, 405, 915),
  (4, 'a0000000-0000-4000-8000-000000000005', 'e0000000-0000-4000-8000-000000000005',
   'jonas.bettmuster@musterberg.test', 'Jonas Bettmuster', 'housekeeping', 'staff', 'VZ', 480, 10440, 480, 990),
  (5, 'a0000000-0000-4000-8000-000000000006', 'e0000000-0000-4000-8000-000000000006',
   'emil.freiwillig@musterberg.test', 'Emil Freiwillig', 'bfd', 'staff', 'TZ', 240, 5220, 480, 750),
  (6, 'a0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007',
   'clara.empfang@musterberg.test', 'Clara Empfangsmuster', 'rezeption', 'admin', 'VZ', 480, 10440, 690, 1200),
  (7, 'a0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000008',
   'paul.rezeptionstest@musterberg.test', 'Paul Rezeptionstest', 'rezeption', 'admin', 'VZ', 480, 10440, 360, 870);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', s.user_id, 'authenticated', 'authenticated', s.email,
  extensions.crypt('demo-Passwort-2026', extensions.gen_salt('bf')), now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb, '{}'::jsonb, now(), now(),
  '', '', '', '', '', '', '', ''
from seed_staff s;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(), s.user_id, s.user_id::text,
  jsonb_build_object('sub', s.user_id::text, 'email', s.email, 'email_verified', true),
  'email', now(), now(), now()
from seed_staff s;

insert into public.employees (
  id, user_id, display_name, department, role, contract, soll_min_day, soll_min_month
)
select employee_id, user_id, display_name, department, role, contract, soll_min_day, soll_min_month
from seed_staff;

-- Dienstplan -----------------------------------------------------------------
-- Rotation : 2 jours frei par semaine et par personne, décalés selon idx, donc des
-- dimanches travaillés. Exceptions : TD (Karl), urlaub (Mia), krank (Berta), SEM (Otto).
-- Aucun motif de santé n'est écrit dans les notes.

insert into public.shifts (employee_id, date, type, start1, end1, start2, end2, break_min)
select
  x.employee_id,
  x.d,
  x.type::public.shift_type,
  case x.type
    when 'normal' then x.start1
    when 'td' then 480
    when 'sem' then 540
  end,
  case x.type
    when 'normal' then x.end1
    when 'td' then 780
    when 'sem' then 1050
  end,
  case when x.type = 'td' then 1080 end,
  case when x.type = 'td' then 1260 end,
  case when x.type = 'td' then 0 else 30 end
from (
  select
    s.employee_id, s.start1, s.end1,
    date_trunc('month', current_date)::date + n.n as d,
    case
      when s.idx = 0 and n.n in (4, 18) then 'td'
      when s.idx = 3 and n.n between 8 and 10 then 'urlaub'
      when s.idx = 1 and n.n between 12 and 13 then 'krank'
      when s.idx = 2 and n.n = 15 then 'sem'
      when (n.n + s.idx) % 7 in (5, 6) then 'frei'
      else 'normal'
    end as type
  from seed_staff s
  cross join generate_series(
    0,
    (date_trunc('month', current_date) + interval '1 month')::date + 6 - date_trunc('month', current_date)::date
  ) as n(n)
) x;

-- Chambres : 40 sur 4 étages -------------------------------------------------

insert into public.rooms (number, floor, beds, has_bath)
select
  (f.f * 100 + r.r)::text,
  f.f,
  (array[2, 4, 6, 4, 2])[(r.r - 1) % 5 + 1],
  r.r % 3 = 0
from generate_series(1, 4) as f(f)
cross join generate_series(1, 10) as r(r);

-- Réservations : 5 groupes, Einzelgäste et Familien ---------------------------

create temporary table seed_bookings (
  id uuid primary key,
  matchcode text not null,
  label text not null,
  arrival date not null,
  departure date not null,
  size int not null,
  allergies jsonb not null default '{}'::jsonb
);

insert into seed_bookings values
  ('b0000000-0000-4000-8000-000000000001', 'MUSTERSCHULE/40001', 'Klasse 8b Musterschule',
   current_date - 2, current_date + 3, 24, '{"erdnuesse": 1}'),
  ('b0000000-0000-4000-8000-000000000002', 'DEMOCLUB/40002', 'Sportverein Demo',
   current_date, current_date + 5, 18, '{}'),
  ('b0000000-0000-4000-8000-000000000003', 'TESTCHOR/40003', 'Chorfreizeit Test',
   current_date + 1, current_date + 6, 30, '{"milch": 2}'),
  ('b0000000-0000-4000-8000-000000000004', 'BEISPIEL-GMBH/40004', 'Firmenseminar Beispiel',
   current_date - 1, current_date + 2, 12, '{}'),
  ('b0000000-0000-4000-8000-000000000005', 'FERIENLAGER/40005', 'Ferienlager Muster',
   current_date + 2, current_date + 7, 80, '{}'),
  ('b0000000-0000-4000-8000-000000000006', 'Einzelgäste_27+', 'Einzelgäste ab 27 Jahren',
   current_date - 7, current_date + 10, 6, '{}'),
  ('b0000000-0000-4000-8000-000000000007', 'Familien', 'Familien',
   current_date - 3, current_date + 6, 9, '{}');

insert into public.bookings (id, matchcode, label, arrival, departure)
select id, matchcode, label, arrival, departure
from seed_bookings;

-- Repas : Früh, Mittag, Abend pour chaque jour de séjour, avec les exceptions ci-dessous.
-- Jour +5 : pas de Mittag. Aujourd'hui : l'Abend est posé à la main (13 couverts).
-- Jour +4 : DEMOCLUB fait un Grillen à la place de l'Abend.
insert into public.meal_counts (booking_id, date, meal, total, veg, vegan, mos, allergies)
select
  b.id,
  b.arrival + n.n,
  m.meal,
  b.size,
  ceil(b.size * 0.15)::int,
  floor(b.size * 0.05)::int,
  floor(b.size * 0.10)::int,
  case when m.meal in ('mittag', 'abend') then b.allergies else '{}'::jsonb end
from seed_bookings b
cross join generate_series(0, 30) as n(n)
cross join (values ('frueh'::public.meal), ('mittag'::public.meal), ('abend'::public.meal)) as m(meal)
where b.arrival + n.n <= b.departure
  and not (m.meal = 'frueh' and n.n = 0)
  and not (m.meal = 'abend' and b.arrival + n.n = b.departure)
  and not (m.meal = 'mittag' and b.arrival + n.n = current_date + 5)
  and not (m.meal = 'abend' and b.arrival + n.n = current_date)
  and not (m.meal = 'abend' and b.matchcode = 'DEMOCLUB/40002' and b.arrival + n.n = current_date + 4)
  and not (m.meal = 'mittag' and b.matchcode = 'FERIENLAGER/40005' and b.arrival + n.n = current_date + 3);

-- Abendessen aujourd'hui = 13 (démo, étape 3) : 8 + 3 + 2.
insert into public.meal_counts (booking_id, date, meal, total, veg, vegan, mos)
values
  ('b0000000-0000-4000-8000-000000000002', current_date, 'abend', 8, 2, 0, 1),
  ('b0000000-0000-4000-8000-000000000006', current_date, 'abend', 3, 0, 0, 0),
  ('b0000000-0000-4000-8000-000000000007', current_date, 'abend', 2, 0, 0, 0);

-- 80 Lunchpakete (Ferienlager) et un Grillen à 18:00 (Sportverein).
insert into public.meal_counts (booking_id, date, meal, total, veg, vegan, mos, note)
values
  ('b0000000-0000-4000-8000-000000000005', current_date + 3, 'lunchpaket', 80, 8, 2, 0, null),
  ('b0000000-0000-4000-8000-000000000002', current_date + 4, 'grill', 18, 3, 1, 0, 'Grillen 18:00');

update public.meal_counts
set note = '1× Nudeln/Müsli'
where booking_id = 'b0000000-0000-4000-8000-000000000007'
  and date = current_date + 1
  and meal = 'mittag';

-- Speiseplan : 7 jours, sans Mittag au jour +5 (A17 : variante veg parfois vide).
insert into public.menu_items (date, meal, main_dish, veg_variant, dessert)
select current_date + (d.i - 1)::int, 'mittag', d.main_dish, d.veg_variant, d.dessert
from unnest(
  array['Spaghetti Bolognese', 'Schnitzel mit Kartoffelsalat', 'Gemüsecurry mit Reis',
        'Pizza Margherita', 'Fischstäbchen mit Kartoffelpüree', 'Kässpätzle', 'Gulasch mit Knödeln'],
  array['Spaghetti mit Tomatensauce', 'Gemüseschnitzel mit Kartoffelsalat', null,
        null, 'Gemüsebratling mit Kartoffelpüree', null, 'Pilzgulasch mit Knödeln'],
  array['Obstsalat', 'Vanillepudding', null, 'Eis', null, 'Apfelmus', 'Joghurt']
) with ordinality as d(main_dish, veg_variant, dessert, i)
where d.i - 1 <> 5;

insert into public.menu_items (date, meal, main_dish, veg_variant, dessert)
select current_date + (d.i - 1)::int, 'abend', d.main_dish, d.veg_variant, null
from unnest(
  array['Kartoffelsuppe', 'Nudelauflauf', 'Gemüsesuppe', 'Bratkartoffeln mit Ei',
        'Grillplatte', 'Flammkuchen', 'Pfannkuchen'],
  array['Kartoffelsuppe ohne Speck', 'Gemüse-Nudelauflauf', null, null,
        'Grillgemüse', null, null]
) with ordinality as d(main_dish, veg_variant, i);

-- Ménage : 13 tâches de chambre + 2 tâches de zone par jour (≈ 15) ------------
-- Les tâches sont réparties entre Mia, Jonas et Emil. Seul aujourd'hui a des statuts avancés.

insert into public.room_tasks (date, room_id, task_type, assigned_to, status, done_at)
select
  current_date + d.d,
  r.id,
  case when r.idx % 2 = 0 then 'abreise' else 'bleiber' end::public.task_type,
  (array[
    'e0000000-0000-4000-8000-000000000004',
    'e0000000-0000-4000-8000-000000000005',
    'e0000000-0000-4000-8000-000000000006'
  ])[r.idx % 3 + 1]::uuid,
  case
    when d.d = 0 and r.idx % 3 = 0 then 'erledigt'
    when d.d = 0 and r.idx % 3 = 1 then 'in_arbeit'
    else 'offen'
  end::public.task_status,
  case when d.d = 0 and r.idx % 3 = 0 then now() end
from (
  select id, (row_number() over (order by number) - 1)::int as idx from public.rooms
) r
cross join generate_series(0, 6) as d(d)
where (r.idx + d.d * 7) % 40 < 13;

insert into public.room_tasks (date, room_id, task_type, zone, assigned_to)
select current_date + d.d, null, 'bleiber', z.zone, 'e0000000-0000-4000-8000-000000000004'
from generate_series(0, 6) as d(d)
cross join (values ('Bäder Erdgeschoss'), ('Schlafzimmer Obergeschoss')) as z(zone);

drop table seed_bookings;
drop table seed_staff;
