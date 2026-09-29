-- P1-01 : schéma (PLAN §5). Pas de RLS ni de fonctions métier ici (P1-02 à P1-05).
-- Heures en minutes depuis minuit ; dates locales Europe/Berlin (type date).

create extension if not exists moddatetime schema extensions;

-- Enums ---------------------------------------------------------------------

create type public.department as enum ('kueche', 'housekeeping', 'bfd', 'rezeption');
create type public.app_role as enum ('admin', 'kitchen_lead', 'staff');
create type public.shift_type as enum ('normal', 'td', 'sem', 'urlaub', 'krank', 'frei');
-- lunchpaket et grill sont des lignes distinctes ; mittag = repas chauds (A15).
create type public.meal as enum ('frueh', 'mittag', 'abend', 'lunchpaket', 'grill');
create type public.task_type as enum ('abreise', 'bleiber');
create type public.task_status as enum ('offen', 'in_arbeit', 'erledigt');

-- Validation de meal_counts.allergies : un CHECK ne peut pas contenir de sous-requête.
-- 14 allergènes UE + sonstige ; valeurs = entiers positifs (A11).
create function public.is_valid_allergies(a jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(a) = 'object'
    and not exists (
      select 1
      from jsonb_each(a) as e(k, v)
      where e.k <> all (array[
          'gluten', 'krebstiere', 'eier', 'fisch', 'erdnuesse', 'soja', 'milch',
          'schalenfruechte', 'sellerie', 'senf', 'sesam', 'sulfite', 'lupinen',
          'weichtiere', 'sonstige'
        ])
        or jsonb_typeof(e.v) <> 'number'
        or e.v::text !~ '^[1-9][0-9]*$'
    )
$$;

-- Tables --------------------------------------------------------------------

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  display_name text not null,
  department public.department not null,
  role public.app_role not null default 'staff',
  contract text not null check (contract in ('VZ', 'TZ')),
  soll_min_day smallint not null default 0 check (soll_min_day between 0 and 1440),
  soll_min_month integer not null default 0 check (soll_min_month >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  date date not null,
  type public.shift_type not null,
  start1 smallint check (start1 between 0 and 1440),
  end1 smallint check (end1 between 0 and 1440),
  start2 smallint check (start2 between 0 and 1440),
  end2 smallint check (end2 between 0 and 1440),
  break_min smallint not null default 30 check (break_min >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, date),
  -- normal/td : première plage obligatoire ; sem : avec ou sans heures (les deux ou aucune) ;
  -- urlaub/krank/frei : aucune heure.
  constraint shifts_hours_by_type check (
    case
      when type in ('normal', 'td') then start1 is not null and end1 is not null
      when type = 'sem' then (start1 is null) = (end1 is null)
      else start1 is null and end1 is null
    end
  ),
  constraint shifts_end1_after_start1 check (end1 > start1),
  -- Deuxième plage : renseignée en entier, uniquement pour td, après la première.
  constraint shifts_second_range check (
    (start2 is null and end2 is null)
    or (start2 is not null and end2 is not null and end2 > start2 and start2 >= end1
        and type = 'td')
  )
);

-- Instantané sans clé étrangère : l'historique survit à la suppression de la ligne (A10).
-- Alimenté par trigger uniquement (P1-04) ; jamais modifié, donc pas de updated_at.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old jsonb,
  new jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  reason text,
  employee_id uuid,
  date date,
  created_at timestamptz not null default now()
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  matchcode text not null,
  label text not null,
  arrival date not null,
  departure date not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (departure >= arrival)
);

create table public.meal_counts (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  date date not null,
  meal public.meal not null,
  total smallint not null default 0 check (total >= 0),
  veg smallint not null default 0 check (veg >= 0),
  vegan smallint not null default 0 check (vegan >= 0),
  mos smallint not null default 0 check (mos >= 0),
  constraint meal_counts_diets_within_total check (veg <= total and vegan <= total and mos <= total),
  allergies jsonb not null default '{}'::jsonb check (public.is_valid_allergies(allergies)),
  -- Consigne courte (colonne Info) : jamais de nom ni de diagnostic.
  note text check (char_length(note) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, date, meal)
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  meal public.meal not null check (meal in ('mittag', 'abend')),
  main_dish text not null,
  veg_variant text,
  dessert text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, meal)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  floor smallint not null,
  beds smallint not null check (beds > 0),
  has_bath boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.room_tasks (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  room_id uuid references public.rooms (id) on delete cascade,
  task_type public.task_type not null,
  zone text,
  assigned_to uuid references public.employees (id) on delete set null,
  status public.task_status not null default 'offen',
  done_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Une tâche de zone (Bäder, Schlafzimmer) n'a pas de chambre (A9).
  constraint room_tasks_room_or_zone check (room_id is not null or zone is not null)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  text text not null,
  audience text not null default 'all'
    check (audience in ('all', 'kueche', 'housekeeping', 'bfd', 'rezeption')),
  created_by uuid references public.employees (id) on delete set null,
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees (id) on delete cascade,
  token text not null unique,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index ---------------------------------------------------------------------

create index shifts_date_idx on public.shifts (date);
create index meal_counts_date_idx on public.meal_counts (date);
create index audit_log_changed_at_idx on public.audit_log (changed_at desc);
create index room_tasks_date_assigned_to_idx on public.room_tasks (date, assigned_to);
-- Une seule tâche par chambre et par jour (les tâches de zone n'ont pas de chambre).
create unique index room_tasks_date_room_id_key on public.room_tasks (date, room_id)
  where room_id is not null;

-- updated_at ----------------------------------------------------------------

create trigger set_updated_at before update on public.employees
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.shifts
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.bookings
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.meal_counts
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.menu_items
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.rooms
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.room_tasks
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.announcements
  for each row execute function extensions.moddatetime(updated_at);
create trigger set_updated_at before update on public.push_tokens
  for each row execute function extensions.moddatetime(updated_at);

-- RLS ----------------------------------------------------------------------
-- Activée sans aucune policy : accès refusé par défaut. Les policies arrivent en P1-02.

alter table public.employees enable row level security;
alter table public.shifts enable row level security;
alter table public.audit_log enable row level security;
alter table public.bookings enable row level security;
alter table public.meal_counts enable row level security;
alter table public.menu_items enable row level security;
alter table public.rooms enable row level security;
alter table public.room_tasks enable row level security;
alter table public.announcements enable row level security;
alter table public.push_tokens enable row level security;
