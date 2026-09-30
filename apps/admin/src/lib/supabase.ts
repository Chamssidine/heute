import type { Database } from "@heute/domain";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<Database> | null = null;

// Créé à la demande : le build statique n'a pas les variables d'environnement.
export function getSupabase(): SupabaseClient<Database> {
  if (client) {
    return client;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_KEY doivent être définis (voir .env.example).",
    );
  }
  client = createClient<Database>(url, key);
  return client;
}
