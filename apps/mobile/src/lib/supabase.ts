/**
 * Configuration Supabase pour l'application mobile.
 * Les variables sont lues depuis les variables d'environnement Expo (EXPO_PUBLIC_*).
 */

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "",
  };
}
