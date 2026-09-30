/**
 * Logique pure de comparaison des timestamps et application des indicateurs de modification.
 * Seuls des instants ISO 8601 avec fuseau (timestamptz) sont comparés : un simple « HH:MM »
 * est ambigu (fuseau, date) et est refusé.
 */

/**
 * Parse un instant ISO 8601. Renvoie null si la chaîne est vide ou n'est pas un instant valide.
 */
export function parseTimestamp(str: string): number | null {
  const parsed = Date.parse(str.trim());
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Détermine si un élément a été modifié depuis la dernière consultation.
 * Règle d'acceptation :
 * - Première ouverture (lastSeen null ou vide) : rien n'est marqué (false).
 * - updated_at postérieur à lastSeen : true.
 */
export function isItemChanged(updatedAt?: string | null, lastSeen?: string | null): boolean {
  if (!lastSeen || !updatedAt) {
    return false;
  }

  const updatedTime = parseTimestamp(updatedAt);
  const seenTime = parseTimestamp(lastSeen);

  if (updatedTime === null || seenTime === null) {
    return false;
  }

  return updatedTime > seenTime;
}

/**
 * Applique l'indicateur de changement sur un élément générique.
 */
export function applyChangeIndicator<
  T extends {
    updated_at?: string;
    changed?: boolean;
    previous?: P;
  },
  P = unknown,
>(item: T, lastSeen?: string | null): T & { changed: boolean; previous: P | undefined } {
  const changed = isItemChanged(item.updated_at, lastSeen);
  return {
    ...item,
    changed,
    previous: changed ? item.previous : undefined,
  };
}
