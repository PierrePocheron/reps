import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

const STORAGE_KEY = 'reps_onboarding_v1';

const SLIDES = [
  {
    emoji: '🏋️',
    title: 'Bienvenue sur Reps',
    description: 'Ton compagnon d\'entraînement quotidien. Suis tes séances, progresse et dépasse-toi.',
    accent: 'bg-primary/10',
  },
  {
    emoji: '💪',
    title: 'Deux modes d\'entraînement',
    description: 'Lance une séance de renforcement musculaire au poids du corps, ou une séance de musculation avec poids et haltères.',
    accent: 'bg-blue-500/10',
  },
  {
    emoji: '📊',
    title: 'Suis ta progression',
    description: 'Graphiques hebdomadaires, heatmap d\'activité, records personnels, streak de régularité — tout est là.',
    accent: 'bg-orange-500/10',
  },
  {
    emoji: '🏆',
    title: 'Défie tes amis',
    description: 'Ajoute tes amis, grimpe dans le classement et débloquez des badges ensemble. La motivation est collective.',
    accent: 'bg-yellow-500/10',
  },
] as const;

export function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) setVisible(true);
  }, []);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const next = () => {
    if (step < SLIDES.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  };

  if (!visible) return null;

  const slide = SLIDES[step]!;
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-between p-6 pb-safe">
      {/* Skip */}
      <div className="w-full flex justify-end">
        <button
          onClick={finish}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2 px-3"
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
          className="flex-1 flex flex-col items-center justify-center text-center gap-6 max-w-sm"
        >
          <div className={`h-24 w-24 rounded-3xl ${slide.accent} flex items-center justify-center`}>
            <span className="text-5xl" role="img" aria-label={slide.title}>
              {slide.emoji}
            </span>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold">{slide.title}</h1>
            <p className="text-muted-foreground leading-relaxed">{slide.description}</p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots + Button */}
      <div className="w-full space-y-6">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        <Button
          size="lg"
          className="w-full"
          onClick={next}
        >
          {isLast ? 'Commencer !' : (
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
