-- P1-04 : fonctions de lecture masquée (PLAN §5.1, ADR 0007).
-- SECURITY DEFINER : elles lisent des lignes que la RLS cache à l'appelant, mais ne
-- renvoient que des valeurs déjà masquées ou agrégées. Sans employé actif : aucune ligne.

-- « abwesend » n'est pas une valeur de shift_type : la colonne type est donc du texte.
-- Un service « frei » n'est pas un service : il n'est pas renvoyé. note n'est jamais renvoyée.
create function public.team_shifts(day date)
returns table (
  employee_id uuid,
  display_name text,
  department public.department,
  type text,
  start1 smallint,
  end1 smallint,
  start2 smallint,
  end2 smallint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.id,
    e.display_name,
    e.department,
    case
      when s.type in ('urlaub', 'krank') and public.current_app_role() <> 'admin' then 'abwesend'
      else s.type::text
    end,
    s.start1,
    s.end1,
    s.start2,
    s.end2
  from public.shifts s
  join public.employees e on e.id = s.employee_id
  where public.current_employee_id() is not null
    and s.date = team_shifts.day
    and e.active
    and s.type <> 'frei'
  order by e.department, e.display_name
$$;

-- Aucun détail par groupe : seulement la somme des allergies (valeurs du jsonb).
create function public.meal_totals(from_date date, to_date date)
returns table (
  date date,
  meal public.meal,
  total bigint,
  veg bigint,
  vegan bigint,
  mos bigint,
  allergies bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    mc.date,
    mc.meal,
    sum(mc.total)::bigint,
    sum(mc.veg)::bigint,
    sum(mc.vegan)::bigint,
    sum(mc.mos)::bigint,
    coalesce(sum(
      (select coalesce(sum(a.v::integer), 0) from jsonb_each_text(mc.allergies) as a(k, v))
    ), 0)::bigint
  from public.meal_counts mc
  where public.current_employee_id() is not null
    and mc.date between meal_totals.from_date and meal_totals.to_date
  group by mc.date, mc.meal
  order by mc.date, mc.meal
$$;

revoke execute on function public.team_shifts(date) from public, anon;
revoke execute on function public.meal_totals(date, date) from public, anon;
grant execute on function public.team_shifts(date) to authenticated;
grant execute on function public.meal_totals(date, date) to authenticated;
