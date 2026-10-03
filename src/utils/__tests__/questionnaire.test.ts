import { describe, it, expect } from 'vitest';
import { suggestPlan } from '../questionnaire';
import { DEFAULT_MUSCULATION_TEMPLATES, DEFAULT_RENFORCEMENT_TEMPLATES } from '../constants';

describe('suggestPlan', () => {
  it('salle → musculation (Push), fréquence choisie', () => {
    expect(suggestPlan({ goal: 'force', level: 'intermediaire', place: 'salle', perWeek: 4 }))
      .toEqual({ weeklyGoal: 4, templateId: 'muscu_push', tab: 'musculation' });
  });

  it('maison → renforcement, cardio pour la forme ou la perte de poids', () => {
    expect(suggestPlan({ goal: 'poids', place: 'maison', perWeek: 3 }).templateId).toBe('renfo_cardio_core');
    expect(suggestPlan({ goal: 'muscle', place: 'maison' }).templateId).toBe('renfo_full_body');
  });

  it('questionnaire passé : objectif 3 séances (2 pour un débutant), modèle maison', () => {
    expect(suggestPlan({})).toEqual({ weeklyGoal: 3, templateId: 'renfo_full_body', tab: 'renforcement' });
    expect(suggestPlan({ level: 'debutant' }).weeklyGoal).toBe(2);
  });

  it('ne propose que des modèles qui existent', () => {
    const ids = [...DEFAULT_RENFORCEMENT_TEMPLATES, ...DEFAULT_MUSCULATION_TEMPLATES].map((t) => t.id);
    for (const place of ['maison', 'salle'] as const)
      for (const goal of ['muscle', 'forme', 'force', 'poids'] as const)
        for (const level of ['debutant', 'intermediaire', 'confirme'] as const)
          expect(ids).toContain(suggestPlan({ place, goal, level, perWeek: 5 }).templateId);
  });
});
