/** Minuit local du jour de `d` (clé de jour, robuste aux changements d'heure). */
const dayKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const nextDayKey = (key: number) => {
  const d = new Date(key);
  d.setDate(d.getDate() + 1);
  return dayKey(d);
};

/**
 * Série = jours consécutifs avec au moins une séance (renfo ou muscu).
 * Elle reste « en cours » tant que la dernière séance date d'aujourd'hui ou d'hier.
 */
export function trainingStreaks(dates: Date[], today = new Date()): { current: number; longest: number } {
  const days = [...new Set(dates.map(dayKey))].sort((a, b) => a - b);
  let run = 0, longest = 0, prev: number | undefined;
  for (const day of days) {
    run = prev !== undefined && nextDayKey(prev) === day ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = day;
  }
  const t = dayKey(today);
  const alive = prev !== undefined && (prev === t || nextDayKey(prev) === t);
  return { current: alive ? run : 0, longest };
}

/** Série enregistrée sur le profil, remise à 0 si plus d'un jour sans séance depuis. */
export function liveStreak(streak: number, lastTraining: Date | null | undefined, today = new Date()): number {
  if (!lastTraining) return 0;
  const last = dayKey(lastTraining), t = dayKey(today);
  return last === t || nextDayKey(last) === t ? streak : 0;
}
