import { describe, it, expect } from 'vitest';
import { gymCard, renfoCard } from '../shareCard';

describe('cartes de partage', () => {
  it('compte le record de durée (gainage) comme le récap', () => {
    const card = gymCard({ date: new Date(), duration: 600, exercises: [{ exerciseId: 'weighted_plank', name: 'Gainage lesté', emoji: '🧱', timed: true,
      sets: [{ reps: 75, weight: 0, completed: true, isRecord: true }] }] });
    expect(card.stats).toContainEqual({ label: 'Record', value: '🏆 1' });
  });

  it('muscu : volume, séries validées, records, meilleure série par exercice', () => {
    const card = gymCard({
      date: new Date(2026, 9, 3), duration: 3900,
      exercises: [
        { exerciseId: 'deadlift', name: 'Soulevé de terre', emoji: '⚓', sets: [
          { weight: 80, reps: 8, completed: true },
          { weight: 90, reps: 6, completed: true, isRecord: true },
          { weight: 90, reps: 6, completed: false },
        ] },
        { exerciseId: 'pullups', name: 'Tractions', emoji: '🧗', sets: [{ weight: 0, reps: 10, completed: true }] },
        { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [{ weight: 60, reps: 8, completed: false }] },
      ],
    });
    // toLocaleString('fr-FR') sépare les milliers par une espace insécable fine
    expect(card.stats.map((st) => ({ ...st, value: st.value.replace(/\s/g, ' ') }))).toEqual([
      { label: 'Durée', value: '1h 5min' },
      { label: 'Volume', value: '1 180 kg' },
      { label: 'Séries', value: '3' },
      { label: 'Record', value: '🏆 1' },
    ]);
    expect(card.lines).toEqual([
      { name: 'Soulevé de terre', detail: '2 × 90 kg' },
      { name: 'Tractions', detail: '1 × 10 reps' },
    ]);
  });

  it('poids du corps : la meilleure série est celle qui a le plus de reps', () => {
    const card = gymCard({ date: new Date(), duration: 600, exercises: [{ exerciseId: 'pullups', name: 'Tractions', emoji: '🧗',
      sets: [6, 12, 10].map((reps) => ({ weight: 0, reps, completed: true })) }] });
    expect(card.lines).toEqual([{ name: 'Tractions', detail: '3 × 12 reps' }]);
  });

  it('renfo : exercices sans reps ignorés, au-delà de 6 regroupés', () => {
    const exercises = Array.from({ length: 8 }, (_, i) => ({ name: `Ex ${i}`, emoji: '💪', reps: i === 7 ? 0 : 10 }));
    const card = renfoCard({ date: new Date(), duration: 600, exercises, totalReps: 70, totalCalories: 31.6 });
    expect(card.lines).toHaveLength(6);
    expect(card.more).toBe(1);
    expect(card.stats.map((s) => s.value)).toEqual(['10min 00s', '70', '32 kcal']);
  });
});
