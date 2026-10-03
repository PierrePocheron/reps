/** Mesures corporelles datées (poids, mensurations) — stockées dans users/{uid}/private/body. */
export const BODY_FIELDS = [
  { key: 'weight', label: 'Poids', unit: 'kg' },
  { key: 'waist', label: 'Tour de taille', unit: 'cm' },
  { key: 'chest', label: 'Poitrine', unit: 'cm' },
  { key: 'arm', label: 'Tour de bras', unit: 'cm' },
  { key: 'thigh', label: 'Cuisse', unit: 'cm' },
] as const;
export type BodyField = (typeof BODY_FIELDS)[number]['key'];

export type BodyEntry = { date: string } & Partial<Record<BodyField, number>>; // date AAAA-MM-JJ (locale)

/** Ajoute ou complète la mesure du jour (une entrée par date), triée du plus ancien au plus récent. */
export function upsertBodyEntry(entries: BodyEntry[], entry: BodyEntry): BodyEntry[] {
  const clean = Object.fromEntries(Object.entries(entry).filter(([k, v]) => k === 'date' || (typeof v === 'number' && v > 0))) as BodyEntry;
  const others = entries.filter((e) => e.date !== entry.date);
  const merged = { ...entries.find((e) => e.date === entry.date), ...clean };
  return [...others, merged].sort((a, b) => a.date.localeCompare(b.date));
}

/** Points d'une mesure dans le temps. */
export function bodySeries(entries: BodyEntry[], field: BodyField): { date: Date; value: number }[] {
  return entries.flatMap((e) => (e[field] ? [{ date: new Date(`${e.date}T12:00:00`), value: e[field]! }] : []));
}
