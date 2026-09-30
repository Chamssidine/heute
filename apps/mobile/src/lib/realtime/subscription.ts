import { supabase as defaultSupabase } from "../supabase/index.ts";
import { queryClient as defaultQueryClient } from "../query/client.ts";
import { handleRealtimeTableEvent, type QueryInvalidator, type RealtimeLogger } from "./handler.ts";
import { REALTIME_TABLES } from "./tableRules.ts";

export const REALTIME_CHANNEL_NAME = "heute-mobile-realtime";

export interface RealtimeSubscriptionChannel {
  on: (
    type: "postgres_changes",
    filter: { event: string; schema: string; table: string },
    callback: (payload: unknown) => void,
  ) => RealtimeSubscriptionChannel;
  subscribe: (callback?: (status: string, err?: Error) => void) => RealtimeSubscriptionChannel;
  unsubscribe: () => Promise<unknown>;
}

export interface RealtimeSupabaseClient {
  channel: (name: string) => RealtimeSubscriptionChannel;
  removeChannel: (channel: unknown) => Promise<unknown>;
  auth?: {
    getSession?: () => Promise<{ data: { session: unknown | null } }>;
    onAuthStateChange: (callback: (event: string, session: { user?: unknown } | null) => void) => {
      data: { subscription: { unsubscribe: () => void } };
    };
  };
}

let activeChannel: RealtimeSubscriptionChannel | null = null;

/**
 * Indique si un abonnement Supabase Realtime est actuellement actif.
 */
export function isRealtimeSubscribed(): boolean {
  return activeChannel != null;
}

/**
 * Abonne le client mobile aux événements Realtime sur les tables :
 * shifts, room_tasks, meal_counts, menu_items.
 *
 * Garanties :
 * - Aucun abonnement en double : si déjà souscrit, renvoie l'abonnement actif.
 * - La RLS fait foi côté serveur : l'app ne filtre pas à la place de la base.
 * - Chaque événement invalide les requêtes TanStack Query concernées.
 */
export function subscribeToRealtime(
  client: RealtimeSupabaseClient = defaultSupabase as unknown as RealtimeSupabaseClient,
  queryClient: QueryInvalidator = defaultQueryClient,
  logger?: RealtimeLogger,
): RealtimeSubscriptionChannel | null {
  if (activeChannel != null) {
    return activeChannel;
  }

  const channel = client.channel(REALTIME_CHANNEL_NAME);

  for (const table of REALTIME_TABLES) {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
      },
      () => {
        // La RLS fait foi : pas de filtrage client sur l'ID de l'employé
        void handleRealtimeTableEvent(table, queryClient, logger);
      },
    );
  }

  channel.subscribe();
  activeChannel = channel;
  return channel;
}

/**
 * Ferme et nettoie l'abonnement Supabase Realtime actif.
 * Appelé notamment lors de la déconnexion de l'utilisateur.
 */
export async function unsubscribeFromRealtime(
  client: RealtimeSupabaseClient = defaultSupabase as unknown as RealtimeSupabaseClient,
  logger?: RealtimeLogger,
): Promise<void> {
  if (activeChannel == null) {
    return;
  }

  const channelToClose = activeChannel;
  activeChannel = null;

  try {
    if (typeof client.removeChannel === "function") {
      await client.removeChannel(channelToClose);
    } else if (typeof channelToClose.unsubscribe === "function") {
      await channelToClose.unsubscribe();
    }
  } catch (error) {
    if (typeof logger === "function") {
      logger("[Realtime] Erreur lors de la désinscription");
    }
    console.error(
      "[Realtime] Erreur lors de la désinscription:",
      error instanceof Error ? error.message : "Erreur inconnue",
    );
  }
}

/**
 * Synchronise l'abonnement Realtime avec l'état de la session utilisateur :
 * - Si une session est active (connexion) -> démarre l'abonnement.
 * - Si la session devient nulle (déconnexion) -> ferme l'abonnement.
 */
export function setupRealtimeAuthSync(
  client: RealtimeSupabaseClient = defaultSupabase as unknown as RealtimeSupabaseClient,
  queryClient: QueryInvalidator = defaultQueryClient,
  logger?: RealtimeLogger,
): () => void {
  // Vérifie la session initiale si l'API est disponible
  if (client.auth && typeof client.auth.getSession === "function") {
    void client.auth
      .getSession()
      .then(({ data }) => {
        if (data?.session && (data.session as { user?: unknown }).user) {
          subscribeToRealtime(client, queryClient, logger);
        }
      })
      .catch((error: unknown) => {
        if (typeof logger === "function") {
          logger("[Realtime] Erreur lors de la récupération de la session");
        }
        console.error(
          "[Realtime] Erreur lors de la récupération de la session:",
          error instanceof Error ? error.message : "Erreur inconnue",
        );
      });
  }

  if (!client.auth || typeof client.auth.onAuthStateChange !== "function") {
    return () => {
      void unsubscribeFromRealtime(client, logger);
    };
  }

  const { data } = client.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      subscribeToRealtime(client, queryClient, logger);
    } else {
      void unsubscribeFromRealtime(client, logger);
    }
  });

  return () => {
    data.subscription.unsubscribe();
    void unsubscribeFromRealtime(client, logger);
  };
}

/**
 * Réinitialise l'état global pour les tests unitaires.
 */
export function _resetRealtimeState(): void {
  activeChannel = null;
}
