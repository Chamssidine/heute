-- P1-03 : policies RLS (PLAN §5.1). Toutes destinées à authenticated ; sans employé actif,
-- current_employee_id() et current_app_role() donnent null et aucune condition n'est vraie.
--
-- Aucune policy INSERT/UPDATE/DELETE sur shifts, room_tasks et audit_log : ces écritures
-- passent par des RPC SECURITY DEFINER (P1-05) ou par le trigger d'audit.
--
-- « Küche » = département kueche. La sous-requête sur employees ne récursive pas :
-- chacun voit sa propre ligne (policy employees_select_self).
-- « Housekeeping/BFD » = tout employé actif hors département kueche (la matrice ne
-- prévoit pas de colonne pour les autres départements).

-- employees : admin tout ; Küchenleitung la Küche + soi ; les autres soi.
create policy employees_select on public.employees
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or id = public.current_employee_id()
    or (public.current_app_role() = 'kitchen_lead' and department = 'kueche')
  );

-- shifts : admin tout ; Küchenleitung la Küche + soi ; les autres soi.
create policy shifts_select on public.shifts
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or employee_id = public.current_employee_id()
    or (
      public.current_app_role() = 'kitchen_lead'
      and exists (
        select 1 from public.employees e
        where e.id = shifts.employee_id and e.department = 'kueche'
      )
    )
  );

-- audit_log : admin seulement.
create policy audit_log_select on public.audit_log
  for select to authenticated
  using (public.current_app_role() = 'admin');

-- bookings et meal_counts : lecture admin, Küchenleitung, Küche ; écriture admin.
create policy bookings_select on public.bookings
  for select to authenticated
  using (
    public.current_app_role() in ('admin', 'kitchen_lead')
    or exists (
      select 1 from public.employees e
      where e.id = public.current_employee_id() and e.department = 'kueche'
    )
  );

create policy bookings_admin_write on public.bookings
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

create policy meal_counts_select on public.meal_counts
  for select to authenticated
  using (
    public.current_app_role() in ('admin', 'kitchen_lead')
    or exists (
      select 1 from public.employees e
      where e.id = public.current_employee_id() and e.department = 'kueche'
    )
  );

create policy meal_counts_admin_write on public.meal_counts
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- menu_items : lecture pour tout employé actif ; écriture admin et Küchenleitung.
create policy menu_items_select on public.menu_items
  for select to authenticated
  using (public.current_employee_id() is not null);

create policy menu_items_write on public.menu_items
  for all to authenticated
  using (public.current_app_role() in ('admin', 'kitchen_lead'))
  with check (public.current_app_role() in ('admin', 'kitchen_lead'));

-- rooms : lecture admin et Housekeeping/BFD ; écriture admin.
create policy rooms_select on public.rooms
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (
      public.current_employee_id() is not null
      and not exists (
        select 1 from public.employees e
        where e.id = public.current_employee_id() and e.department = 'kueche'
      )
    )
  );

create policy rooms_admin_write on public.rooms
  for all to authenticated
  using (public.current_app_role() = 'admin')
  with check (public.current_app_role() = 'admin');

-- room_tasks : admin tout ; Housekeeping/BFD ses propres tâches.
create policy room_tasks_select on public.room_tasks
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (
      assigned_to = public.current_employee_id()
      and not exists (
        select 1 from public.employees e
        where e.id = public.current_employee_id() and e.department = 'kueche'
      )
    )
  );

-- announcements : admin tout ; les autres l'audience « all » ou leur département.
create policy announcements_select on public.announcements
  for select to authenticated
  using (
    public.current_app_role() = 'admin'
    or (
      public.current_employee_id() is not null
      and (
        audience = 'all'
        or exists (
          select 1 from public.employees e
          where e.id = public.current_employee_id() and e.department::text = audience
        )
      )
    )
  );

-- push_tokens : chacun ses propres lignes, en lecture comme en écriture.
create policy push_tokens_own on public.push_tokens
  for all to authenticated
  using (employee_id = public.current_employee_id())
  with check (employee_id = public.current_employee_id());
