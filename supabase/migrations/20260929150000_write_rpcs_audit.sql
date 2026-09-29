-- P1-05 : RPC d'écriture et journal d'audit (PLAN §2.1 A1/A5/A10, §3 D4/D5).
-- Codes d'erreur (SQLSTATE) miroirs de packages/domain/src/errors :
--   HT001 reason_required · HT002 forbidden

-- Audit -----------------------------------------------------------------------
-- SECURITY DEFINER : audit_log n'a aucune policy d'écriture, seul ce trigger y écrit.
-- La raison vient de set_config('app.reason', …, true) posé par les RPC ; sans RPC, null.
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_log (
    table_name, row_id, action, old, new, changed_by, reason, employee_id, date
  )
  values (
    tg_table_name,
    (v_row ->> 'id')::uuid,
    lower(tg_op),
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    public.current_employee_id(),
    nullif(current_setting('app.reason', true), ''),
    coalesce(v_row ->> 'employee_id', v_row ->> 'assigned_to')::uuid,
    (v_row ->> 'date')::date
  );
  return coalesce(new, old);
end
$$;

revoke execute on function public.audit_row_change() from public, anon, authenticated;

create trigger audit_row_change after insert or update or delete on public.shifts
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.meal_counts
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.menu_items
  for each row execute function public.audit_row_change();
create trigger audit_row_change after insert or update or delete on public.room_tasks
  for each row execute function public.audit_row_change();

-- Défense en profondeur : même sans policy, aucun privilège d'écriture pour les clients.
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;

-- Périmètre d'écriture sur les services : admin tout ; Küchenleitung la Küche ; sinon rien.
create function public.can_write_shifts_of(p_employee_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.current_app_role()
    when 'admin' then exists (select 1 from public.employees e where e.id = p_employee_id)
    when 'kitchen_lead' then exists (
      select 1 from public.employees e
      where e.id = p_employee_id and e.department = 'kueche'
    )
    else false
  end
$$;

revoke execute on function public.can_write_shifts_of(uuid) from public, anon;
grant execute on function public.can_write_shifts_of(uuid) to authenticated;

-- RPC -------------------------------------------------------------------------

-- Crée ou remplace le service d'un employé pour un jour (unique employee_id + date).
create function public.save_shift(
  p_employee_id uuid,
  p_date date,
  p_type public.shift_type,
  p_start1 smallint,
  p_end1 smallint,
  p_start2 smallint,
  p_end2 smallint,
  p_break_min smallint,
  p_note text,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not public.can_write_shifts_of(p_employee_id) then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'HT001';
  end if;

  perform set_config('app.reason', btrim(p_reason), true);

  insert into public.shifts (employee_id, date, type, start1, end1, start2, end2, break_min, note)
  values (p_employee_id, p_date, p_type, p_start1, p_end1, p_start2, p_end2,
          coalesce(p_break_min, 30::smallint), p_note)
  on conflict (employee_id, date) do update
    set type = excluded.type,
        start1 = excluded.start1,
        end1 = excluded.end1,
        start2 = excluded.start2,
        end2 = excluded.end2,
        break_min = excluded.break_min,
        note = excluded.note
  returning id into v_id;

  return v_id;
end
$$;

create function public.delete_shift(p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_id uuid;
begin
  select s.employee_id into v_employee_id from public.shifts s where s.id = p_id;
  -- Même code pour « absent » et « hors périmètre » : ne révèle pas l'existence du service.
  if v_employee_id is null or not public.can_write_shifts_of(v_employee_id) then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'reason_required' using errcode = 'HT001';
  end if;

  perform set_config('app.reason', btrim(p_reason), true);
  delete from public.shifts where id = p_id;
end
$$;

-- Seule la personne assignée change le statut ; done_at suit le statut (A5).
create function public.set_task_status(p_id uuid, p_status public.task_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.room_tasks t
  set status = p_status,
      done_at = case when p_status = 'erledigt' then now() end
  where t.id = p_id
    and t.assigned_to = public.current_employee_id();

  if not found then
    raise exception 'forbidden' using errcode = 'HT002';
  end if;
end
$$;

revoke execute on function public.save_shift(uuid, date, public.shift_type, smallint, smallint, smallint, smallint, smallint, text, text) from public, anon;
revoke execute on function public.delete_shift(uuid, text) from public, anon;
revoke execute on function public.set_task_status(uuid, public.task_status) from public, anon;
grant execute on function public.save_shift(uuid, date, public.shift_type, smallint, smallint, smallint, smallint, smallint, text, text) to authenticated;
grant execute on function public.delete_shift(uuid, text) to authenticated;
grant execute on function public.set_task_status(uuid, public.task_status) to authenticated;
