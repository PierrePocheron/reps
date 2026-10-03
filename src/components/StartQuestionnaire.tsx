import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSettingsStore } from '@/store/settingsStore';
import { DEFAULT_MUSCULATION_TEMPLATES, DEFAULT_RENFORCEMENT_TEMPLATES } from '@/utils/constants';
import { QUESTIONNAIRE_KEY, suggestPlan, type Answers } from '@/utils/questionnaire';
import { cn } from '@/utils/cn';

const QUESTIONS = [
  { key: 'goal', title: 'Ton objectif ?', options: [
    { value: 'muscle', label: 'Prendre du muscle', emoji: '💪' },
    { value: 'force', label: 'Gagner en force', emoji: '🏋️' },
    { value: 'forme', label: 'Me remettre en forme', emoji: '⚡' },
    { value: 'poids', label: 'Perdre du poids', emoji: '🔥' },
  ] },
  { key: 'level', title: 'Ton niveau ?', options: [
    { value: 'debutant', label: 'Je débute', emoji: '🐣' },
    { value: 'intermediaire', label: "Je m'entraîne déjà", emoji: '🙂' },
    { value: 'confirme', label: 'Confirmé', emoji: '🦾' },
  ] },
  { key: 'place', title: 'Où tu t\'entraînes ?', options: [
    { value: 'maison', label: 'À la maison', emoji: '🏠', hint: 'Poids du corps, sans matériel' },
    { value: 'salle', label: 'En salle', emoji: '🏢', hint: 'Barres, haltères, machines' },
  ] },
  { key: 'perWeek', title: 'Combien de séances par semaine ?', options: [2, 3, 4, 5].map((n) => ({ value: n, label: `${n} séances`, emoji: '📅' })) },
] as const;

/** Questionnaire de départ (Fitbod, version règles simples) : fixe l'objectif hebdo et conseille un modèle. */
export function StartQuestionnaire({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const setWeeklyGoal = useSettingsStore((s) => s.setWeeklyGoal);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const plan = suggestPlan(answers);
  const template = [...DEFAULT_RENFORCEMENT_TEMPLATES, ...DEFAULT_MUSCULATION_TEMPLATES].find((t) => t.id === plan.templateId);

  const finish = (seeProgram: boolean) => {
    if (answers.perWeek) setWeeklyGoal(answers.perWeek); // passé avant la question : on garde l'objectif actuel
    try { localStorage.setItem(QUESTIONNAIRE_KEY, JSON.stringify(answers)); } catch { /* stockage indisponible */ }
    onDone();
    if (seeProgram) navigate(`/templates?suggest=${plan.templateId}`);
  };

  const question = QUESTIONS[step];
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="questionnaire-title"
      className="fixed inset-0 z-[100] bg-background flex flex-col p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        {step > 0 ? (
          <button onClick={() => setStep(step - 1)} aria-label="Question précédente" className="h-11 w-11 -ml-3 flex items-center justify-center rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : <span />}
        <button onClick={() => finish(false)} className="text-sm text-muted-foreground min-h-11 px-4 -mr-4">Passer</button>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto flex flex-col justify-center gap-6">
        {question ? (
          <>
            <p className="text-xs font-semibold text-primary">Question {step + 1} sur {QUESTIONS.length}</p>
            <h1 id="questionnaire-title" className="text-2xl font-bold">{question.title}</h1>
            <div className="space-y-2" role="group" aria-labelledby="questionnaire-title">
              {question.options.map((o) => {
                const selected = answers[question.key] === o.value;
                return (
                  <button
                    key={String(o.value)}
                    aria-pressed={selected}
                    onClick={() => { setAnswers({ ...answers, [question.key]: o.value }); setStep(step + 1); }}
                    className={cn('w-full min-h-14 flex items-center gap-3 px-4 py-3 rounded-2xl border-2 text-left transition-colors',
                      selected ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/40')}
                  >
                    <span className="text-2xl" aria-hidden>{o.emoji}</span>
                    <span>
                      <span className="block font-semibold">{o.label}</span>
                      {'hint' in o && <span className="block text-xs text-muted-foreground">{o.hint}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-5xl" aria-hidden>{template?.emoji ?? '💪'}</p>
            <h1 id="questionnaire-title" className="text-2xl font-bold">Ton programme est prêt</h1>
            <p className="text-muted-foreground text-sm">
              Objectif : <strong className="text-foreground">{plan.weeklyGoal} séances par semaine</strong>.<br />
              Pour commencer : <strong className="text-foreground">{template?.name}</strong> ({template?.description}).
            </p>
            <p className="text-xs text-muted-foreground">Tu pourras tout changer dans Réglages.</p>
          </div>
        )}
      </div>

      <div className="w-full max-w-sm mx-auto space-y-2">
        {!question && (
          <>
            <Button size="lg" className="w-full" onClick={() => finish(true)}>Voir mon programme</Button>
            <Button size="lg" variant="ghost" className="w-full" onClick={() => finish(false)}>Plus tard</Button>
          </>
        )}
      </div>
    </div>
  );
}
