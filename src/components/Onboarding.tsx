import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight, Check, Flame, Trophy, Dumbbell, Users } from 'lucide-react';
import { StartQuestionnaire } from '@/components/StartQuestionnaire';
import { QUESTIONNAIRE_KEY } from '@/utils/questionnaire';

const STORAGE_KEY = 'reps_onboarding_v2';

/* ─── Mini-visuels illustrant l'app (mockups Tailwind, données factices) ─── */

function VisualWelcome() {
  return (
    <div className="h-40 w-40 rounded-[2rem] bg-primary/10 flex items-center justify-center">
      <span className="text-7xl" role="img" aria-label="Reps">🏋️</span>
    </div>
  );
}

function VisualModes() {
  return (
    <div className="w-full space-y-3">
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3 text-left shadow-sm">
        <div className="h-11 w-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl">💪</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Renforcement</p>
          <p className="text-xs text-muted-foreground">Au poids du corps, compte tes répétitions</p>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3 text-left shadow-sm">
        <div className="h-11 w-11 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <Dumbbell className="h-6 w-6 text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Musculation</p>
          <p className="text-xs text-muted-foreground">Séries × poids, à la salle</p>
        </div>
      </div>
    </div>
  );
}

function VisualExercises() {
  return (
    <div className="w-full rounded-2xl border bg-card p-4 space-y-3 shadow-sm text-left">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl overflow-hidden bg-white flex-shrink-0">
          <img src="/exercises/bench_press.jpg" alt="Développé couché" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Développé couché</p>
          <p className="text-xs text-muted-foreground">Pectoraux · Barre</p>
        </div>
      </div>
      <div className="space-y-1.5">
        {[
          { reps: 10, weight: 80, done: true },
          { reps: 10, weight: 80, done: true },
          { reps: 8, weight: 85, done: false },
        ].map((set, i) => (
          <div key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5 text-xs">
            <span className={`flex h-4 w-4 items-center justify-center rounded-full ${set.done ? 'bg-primary text-primary-foreground' : 'border border-muted-foreground/30'}`}>
              {set.done && <Check className="h-2.5 w-2.5" />}
            </span>
            <span className="font-medium">{set.reps} reps</span>
            <span className="text-muted-foreground">× {set.weight.toLocaleString('fr-FR')} kg</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function VisualProgress() {
  return (
    <div className="w-full space-y-3">
      <div className="rounded-2xl border bg-card p-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <span className="text-sm font-semibold">Série</span>
        </div>
        <span className="text-lg font-bold">5 jours</span>
      </div>
      <div className="rounded-2xl border bg-card p-4 space-y-2 shadow-sm text-left">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold">Objectif de la semaine</span>
          <span className="text-muted-foreground text-xs">2 / 3 séances</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-2/3 rounded-full bg-primary" />
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3 shadow-sm text-left">
        <Trophy className="h-5 w-5 text-yellow-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Nouveau record !</p>
          <p className="text-xs text-muted-foreground">Développé couché — 85 kg × 8</p>
        </div>
      </div>
    </div>
  );
}

function VisualSocial() {
  const rows = [
    { rank: 1, name: 'Toi', reps: 342, me: true },
    { rank: 2, name: 'Alex', reps: 310, me: false },
    { rank: 3, name: 'Sam', reps: 268, me: false },
  ];
  return (
    <div className="w-full space-y-3">
      <div className="rounded-2xl border bg-card p-3 space-y-1.5 shadow-sm">
        {rows.map((r) => (
          <div
            key={r.rank}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${r.me ? 'bg-primary/10 font-semibold' : ''}`}
          >
            <span className={`text-xs font-bold ${r.rank === 1 ? 'text-yellow-500' : 'text-muted-foreground'}`}>#{r.rank}</span>
            <span className="flex-1 text-left">{r.name}</span>
            <span className="text-xs text-muted-foreground">{r.reps} reps</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3 shadow-sm text-left">
        <Users className="h-5 w-5 text-primary flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Ajoute tes amis, lance des défis et débloque des badges avec eux
        </p>
      </div>
    </div>
  );
}

/* ─── Slides ──────────────────────────────────────────────────────────────── */

const SLIDES = [
  {
    title: 'Bienvenue sur Reps',
    description: 'Ton compagnon d\'entraînement. Un tour rapide de l\'app avant de commencer ?',
    visual: VisualWelcome,
  },
  {
    title: 'Deux modes d\'entraînement',
    description: 'Depuis l\'accueil, lance une séance de renforcement ou de musculation — chacune a son suivi adapté.',
    visual: VisualModes,
  },
  {
    title: '1324 exercices illustrés',
    description: 'Chaque exercice a son animation, ses muscles ciblés et ses instructions en français. Coche tes séries au fil de la séance ; touche le numéro d’une série pour la marquer en échauffement.',
    visual: VisualExercises,
  },
  {
    title: 'Suis ta progression',
    description: 'Séries, objectif de la semaine, records et courbes de progression par exercice — tout est dans Statistiques et Historique.',
    visual: VisualProgress,
  },
  {
    title: 'Plus fort à plusieurs',
    description: 'Retrouve tes amis dans le classement et défie-les. La motivation est collective !',
    visual: VisualSocial,
  },
] as const;

/* ─── Composants ──────────────────────────────────────────────────────────── */

interface OnboardingSlidesProps {
  onFinish: () => void;
}

/** Slides du tutoriel (exporté séparément pour la prévisualisation en dev) */
export function OnboardingSlides({ onFinish }: OnboardingSlidesProps) {
  const [step, setStep] = useState(0);

  const slide = SLIDES[step]!;
  const isLast = step === SLIDES.length - 1;
  const Visual = slide.visual;

  const next = () => {
    if (isLast) {
      onFinish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button
          onClick={onFinish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] px-4 -mr-4"
        >
          Passer
        </button>
      </div>

      {/* Slide */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="flex-1 w-full flex flex-col items-center justify-center text-center gap-6 max-w-sm mx-auto"
        >
          <Visual />
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{slide.title}</h1>
            <p className="text-muted-foreground leading-relaxed text-sm">{slide.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots + Button */}
      <div className="w-full max-w-sm space-y-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.title}
              onClick={() => setStep(i)}
              aria-label={`Aller à l'étape ${i + 1}`}
              aria-current={i === step ? 'step' : undefined}
              className="p-2 -m-1 rounded-full"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            </button>
          ))}
        </div>

        <Button size="lg" className="w-full" onClick={next}>
          {isLast ? 'C\'est parti !' : (
            <>
              Suivant
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/** Tutoriel affiché une seule fois, à la première connexion */
export function Onboarding() {
  const [step, setStep] = useState<'slides' | 'questions' | null>(null);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setStep('slides');
  }, []);

  // Après le tutoriel : questionnaire de départ (#22), une seule fois lui aussi
  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setStep(localStorage.getItem(QUESTIONNAIRE_KEY) ? null : 'questions');
  };

  if (step === 'slides') return <OnboardingSlides onFinish={finish} />;
  if (step === 'questions') return <StartQuestionnaire onDone={() => setStep(null)} />;
  return null;
}
