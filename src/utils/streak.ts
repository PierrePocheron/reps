/** Minuit local du jour de `d` (clé de jour, robuste aux changements d'heure). */
const dayKey = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const nextDayKey = (key: number) => {
  const d = new Date(key);
  d.setDate(d.getDate() + 1);
  return dayKey(d);
};
/** Lundi de la semaine du jour `key`. */
const weekKey = (key: number) => {
  const d = new Date(key);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return dayKey(d);
};

export interface Streaks {
  current: number;
  longest: number;
  /** Jour de repos couvert par le joker en attente (hier) : la série continue si on s'entraîne aujourd'hui. */
  pendingJoker: number | null;
  /** Dernier jour couvert par un joker dans la série en cours (en attente ou déjà comblé). */
  lastJokerDay: number | null;
}

/**
 * Série = jours consécutifs avec au moins une séance (renfo ou muscu), avec un joker de repos par
 * semaine (Duolingo, Gentler Streak) : un jour manqué isolé ne casse pas la série et compte dès que
 * la séance suivante le comble. Aujourd'hui, pas encore d'entraînement ne casse rien.
 */
export function trainingStreaks(dates: Date[], today = new Date()): Streaks {
  const trained = new Set(dates.map(dayKey));
  const t = dayKey(today);
  let run = 0, longest = 0;
  let pending: number | null = null, lastJoker: number | null = null;
  const usedWeeks = new Set<number>();
  if (trained.size === 0) return { current: 0, longest: 0, pendingJoker: null, lastJokerDay: null };

  for (let k = Math.min(...trained); k <= t; k = nextDayKey(k)) {
    if (trained.has(k)) {
      if (pending !== null) { run++; pending = null; } // le joker fait le pont
      run++;
    } else if (k === t) {
      // journée en cours
    } else if (run > 0 && pending === null && !usedWeeks.has(weekKey(k))) {
      pending = lastJoker = k;
      usedWeeks.add(weekKey(k));
    } else {
      run = 0; pending = lastJoker = null; usedWeeks.clear();
    }
    longest = Math.max(longest, run);
  }
  return { current: run, longest, pendingJoker: pending, lastJokerDay: lastJoker };
}

/**
 * Série enregistrée sur le profil (calculée en fin de séance), remise à 0 si elle a cassé depuis :
 * un seul jour manqué est couvert par le joker s'il n'a pas déjà servi cette semaine-là.
 */
export function liveStreak(streak: number, lastTraining: Date | null | undefined, lastJokerDay?: number | null, today = new Date()): number {
  if (!lastTraining) return 0;
  const last = dayKey(lastTraining), t = dayKey(today);
  if (last === t || nextDayKey(last) === t) return streak;
  const missed = nextDayKey(last);
  const jokerFree = !lastJokerDay || weekKey(lastJokerDay) !== weekKey(missed);
  return nextDayKey(missed) === t && jokerFree ? streak : 0;
}

/**
 * Série hebdomadaire (Hevy) : semaines consécutives (lundi → dimanche) avec au moins `goal` séances.
 * La semaine en cours compte dès que l'objectif est atteint, et ne casse rien tant qu'elle n'est pas finie.
 */
export function weeklyStreaks(dates: Date[], goal: number, today = new Date()): { current: number; longest: number; lastMetWeek: number | null } {
  const need = Math.max(1, goal);
  const perWeek = new Map<number, number>();
  for (const d of dates) { const w = weekKey(dayKey(d)); perWeek.set(w, (perWeek.get(w) ?? 0) + 1); }
  const met = [...perWeek].filter(([, n]) => n >= need).map(([w]) => w).sort((a, b) => a - b);
  const prevWeek = (w: number) => { const d = new Date(w); d.setDate(d.getDate() - 7); return weekKey(dayKey(d)); };
  let longest = 0, run = 0, prev: number | null = null;
  for (const w of met) { run = prev !== null && prevWeek(w) === prev ? run + 1 : 1; longest = Math.max(longest, run); prev = w; }
  const thisWeek = weekKey(dayKey(today));
  const alive = prev !== null && (prev === thisWeek || prev === prevWeek(thisWeek));
  return { current: alive ? run : 0, longest, lastMetWeek: prev };
}

/** Série hebdo enregistrée, remise à 0 si ni cette semaine ni la précédente n'ont atteint l'objectif. */
export function liveWeeklyStreak(streak: number, lastMetWeek: number | null | undefined, today = new Date()): number {
  if (!lastMetWeek) return 0;
  const thisWeek = weekKey(dayKey(today));
  const d = new Date(thisWeek); d.setDate(d.getDate() - 7);
  return lastMetWeek === thisWeek || lastMetWeek === weekKey(dayKey(d)) ? streak : 0;
}
