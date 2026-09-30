/**
 * Clés TanStack Query centralisées pour l'application mobile.
 * Utilisées pour structurer les requêtes et les règles d'invalidation temps réel.
 */
export const queryKeys = {
  auth: {
    all: ["auth"] as const,
    session: () => ["auth", "session"] as const,
  },
  shifts: {
    all: ["shifts"] as const,
    month: (month: string) => ["shifts", "month", month] as const,
  },
  tasks: {
    all: ["tasks"] as const,
    day: (date: string) => ["tasks", "day", date] as const,
  },
  kitchen: {
    all: ["kitchen"] as const,
    day: (date: string) => ["kitchen", "day", date] as const,
  },
  today: {
    all: ["today"] as const,
    day: (date: string) => ["today", "day", date] as const,
  },
  team: {
    all: ["team"] as const,
    day: (date: string) => ["team", "day", date] as const,
  },
} as const;
