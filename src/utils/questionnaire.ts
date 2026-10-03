export type Goal = 'muscle' | 'forme' | 'force' | 'poids';
export type Level = 'debutant' | 'intermediaire' | 'confirme';
export type Place = 'maison' | 'salle';

export interface Answers {
  goal?: Goal;
  level?: Level;
  place?: Place;
  perWeek?: number;
}

export const QUESTIONNAIRE_KEY = 'reps_questionnaire_v1';

/** Règles simples (Fitbod sans IA) : lieu → type de séance, objectif → premier modèle conseillé. */
export function suggestPlan(a: Answers): { weeklyGoal: number; templateId: string; tab: 'renforcement' | 'musculation' } {
  const weeklyGoal = a.perWeek ?? (a.level === 'debutant' ? 2 : 3);
  if (a.place === 'salle') return { weeklyGoal, templateId: 'muscu_push', tab: 'musculation' }; // début du Push / Pull / Legs
  const templateId = a.goal === 'poids' || a.goal === 'forme' ? 'renfo_cardio_core' : 'renfo_full_body';
  return { weeklyGoal, templateId, tab: 'renforcement' };
}
