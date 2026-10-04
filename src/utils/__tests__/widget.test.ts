import { describe, it, expect } from 'vitest';
import { widgetData, epochDay } from '../widget';

const day = (iso: string) => new Date(`${iso}T12:00:00`);

describe('widgetData', () => {
  it('série en jours : tient jusqu\'au lendemain de la dernière séance, puis un jour de plus avec le joker', () => {
    const today = day('2026-10-07'); // mercredi
    const d = widgetData([day('2026-10-05'), day('2026-10-07')], { currentStreak: 3, lastTrainingDate: day('2026-10-07') }, false, 3, today);
    expect(d).toMatchObject({ streak: 3, weekDone: 2, weekGoal: 3, weekly: false, weekStart: epochDay(day('2026-10-05')) });
    expect(d.validUntil).toBe(epochDay(day('2026-10-09'))); // jeudi raté, couvert par le joker → vendredi
  });

  it('série déjà cassée : 0', () => {
    const d = widgetData([], { currentStreak: 5, lastTrainingDate: day('2026-10-01') }, false, 0, day('2026-10-07'));
    expect(d.streak).toBe(0);
  });

  it('série en semaines : tient jusqu\'au dimanche de la semaine suivante', () => {
    const today = day('2026-10-07');
    const monday = new Date(2026, 9, 5).getTime();
    const d = widgetData([], { currentStreak: 0, weeklyStreak: 4, lastMetWeek: monday }, true, 3, today);
    expect(d.streak).toBe(4);
    expect(d.validUntil).toBe(epochDay(day('2026-10-18')));
  });
});
