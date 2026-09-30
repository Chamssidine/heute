begin;
select plan(2);

select is(
  (select array_agg(tablename::text order by tablename::text collate "C")
   from pg_publication_tables
   where pubname = 'supabase_realtime' and schemaname = 'public'),
  array['bookings', 'meal_counts', 'menu_items', 'room_tasks', 'shifts'],
  'Realtime diffuse exactement les tables lues par les apps'
);

-- Les personnes et le journal ne sont jamais diffusés : rien de sensible ne part en direct.
select is(
  (select count(*) from pg_publication_tables
   where pubname = 'supabase_realtime' and tablename in ('employees', 'audit_log', 'push_tokens')),
  0::bigint,
  'employees, audit_log et push_tokens ne sont pas dans la publication'
);

select * from finish();
rollback;
