import { Capacitor, registerPlugin } from '@capacitor/core';
import { liveStreak, liveWeeklyStreak } from '@/utils/streak';

/** Ce que le widget Android affiche ; il remet série et semaine à 0 seul, d'après validUntil et weekStart. */
export interface WidgetData {
  streak: number;
  weekly: boolean;    // série en semaines (sinon en jours)
  weekDone: number;   // séances depuis lundi
  weekGoal: number;   // 0 : pas d'objectif
  validUntil: number; // dernier jour (epochDay) où la série tient sans nouvelle séance
  weekStart: number;  // lundi (epochDay) de la semaine comptée
}

const RepsWidget = registerPlugin<{ update(data: WidgetData): Promise<void> }>('RepsWidget');

/** Jour local en jours depuis 1970 : même calcul côté Java (heure + décalage du fuseau). */
export const epochDay = (d: Date) => Math.floor((d.getTime() - d.getTimezoneOffset() * 60_000) / 86_400_000);

interface StreakState {
  currentStreak: number;
  lastTrainingDate?: Date | null;
  lastJokerDay?: number | null;
  weeklyStreak?: number;
  lastMetWeek?: number | null;
}

export function widgetData(dates: Date[], s: StreakState, weekly: boolean, weekGoal: number, today = new Date()): WidgetData {
  const live = (day: Date) => weekly
    ? liveWeeklyStreak(s.weeklyStreak ?? 0, s.lastMetWeek, day)
    : liveStreak(s.currentStreak, s.lastTrainingDate, s.lastJokerDay, day);
  const streak = live(today);
  // Jusqu'à quand la série tient-elle sans séance ? Sondage jour par jour (mêmes règles que l'appli, joker compris)
  let days = 0;
  while (streak > 0 && days < 21) {
    const next = new Date(today); next.setDate(today.getDate() + days + 1);
    if (live(next) < streak) break;
    days++;
  }
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  return {
    streak, weekly, weekGoal,
    weekDone: dates.filter((d) => d >= monday).length,
    validUntil: epochDay(today) + days,
    weekStart: epochDay(monday),
  };
}

/** Pousse les chiffres vers le widget d'écran d'accueil (Android seulement ; sans effet ailleurs). */
export function updateWidget(data: WidgetData) {
  if (Capacitor.getPlatform() !== 'android') return;
  RepsWidget.update(data).catch(() => { /* build natif sans widget : rien à faire */ });
}
