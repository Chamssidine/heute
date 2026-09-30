import { useEffect, useRef, useState } from "react";
import { getLastSeen, getLastSeenSync, setLastSeen } from "./storage.ts";
import type { ScreenName } from "./types.ts";

export interface UseMarkSeenOptions {
  timing?: "unmount" | "mount";
}

/**
 * Hook appelé à l'ouverture d'un écran pour mémoriser sa consultation dans AsyncStorage.
 * Règle métier (docs/design/tokens.md §4.4) :
 * « Le marquage disparaît quand l'écran a été consulté puis quitté, pas au bout d'un délai. »
 * Par défaut (timing: "unmount"), mémorise l'heure d'ouverture et l'écrit lors du départ (unmount)
 * pour que les modifications restent visibles pendant toute la consultation active.
 */
export function useMarkSeen(screen: ScreenName, options?: UseMarkSeenOptions): void {
  const timing = options?.timing ?? "unmount";
  const openedAtRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    const openedAt = new Date().toISOString();
    openedAtRef.current = openedAt;

    if (timing === "mount") {
      void setLastSeen(screen, openedAt);
    }

    return () => {
      if (timing === "unmount") {
        void setLastSeen(screen, openedAtRef.current);
      }
    };
  }, [screen, timing]);
}

/**
 * Hook réactif lisant la date/heure de dernière consultation pour un écran donné.
 */
export function useLastSeen(screen: ScreenName): string | null {
  const [lastSeen, setLastSeenState] = useState<string | null>(() => getLastSeenSync(screen));

  useEffect(() => {
    let isMounted = true;
    void getLastSeen(screen).then((val) => {
      if (isMounted) {
        setLastSeenState(val);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [screen]);

  return lastSeen;
}

/**
 * Fonction impérative pour marquer un écran comme consulté.
 */
export async function markSeen(screen: ScreenName, timestamp?: string): Promise<void> {
  await setLastSeen(screen, timestamp);
}
