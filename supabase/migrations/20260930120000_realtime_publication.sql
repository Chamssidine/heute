-- Realtime : les changements de ces tables sont diffusés aux apps (téléphones et admin).
-- Sans cette publication, le serveur Realtime est actif mais n'envoie aucun événement.
-- La RLS s'applique à chaque événement : chacun ne reçoit que les lignes qu'il a le droit de lire.
alter publication supabase_realtime
  add table public.shifts, public.room_tasks, public.meal_counts, public.menu_items, public.bookings;
