import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Timer } from '@/components/Timer';
import { AddExerciseDialog } from '@/components/AddExerciseDialog';
import { BackButton } from '@/components/BackButton';
import { useSession } from '@/hooks/useSession';
import { useUserStore } from '@/store/userStore';
import { clearCurrentSessionFromLocal } from '@/firebase';
import { Square, Plus, Dumbbell, Flame, Loader2, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSound } from '@/hooks/useSound';
import confetti from 'canvas-confetti';
import { useHaptic } from '@/hooks/useHaptic';
import { calculateDynamicCalories } from '@/utils/calories';
import { DEFAULT_EXERCISES } from '@/utils/constants';
import type { Exercise } from '@/firebase/types';
import { logger } from '@/utils/logger';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { ToastAction } from '@/components/ui/toast';
import { renfoCard, shareSessionCard } from '@/utils/shareCard';

function Session() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    isActive,
    startTime,
    exercises,
    totalReps,
    startSession,
    endSession,
    resetSession,
    addExercise,
    removeExercise,
    addReps,
    hasExercise,
    getAvailableExercises,
    addCustomExercise,
  } = useSession();
  useKeepAwake(isActive);

  const [removingExercise, setRemovingExercise] = useState<string | null>(null);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [isLoadingLastSession, setIsLoadingLastSession] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const { user } = useUserStore();
  const { play } = useSound();
  const haptics = useHaptic();

  // Démarrage automatique de la session si elle n'est pas active
  // Démarrage automatique de la session si elle n'est pas active au chargement de la page
  useEffect(() => {
    if (!isActive) {
      startSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // On ne veut exécuter ça qu'au montage du composant




  const handleEndSession = async () => {
    if (totalReps === 0) {
      resetSession();
      clearCurrentSessionFromLocal();
      toast({
        title: 'Séance annulée',
        description: "Aucune répétition enregistrée, rien n'a été sauvegardé.",
      });
      navigate('/');
      return;
    }

    setIsEnding(true);
    // Carte de partage figée avant que endSession ne vide le store
    const card = renfoCard({ date: new Date(), duration: startTime ? Math.floor((Date.now() - startTime) / 1000) : 0, exercises, totalReps, totalCalories: currentCalories });
    try {
      await endSession();
      toast({
        action: <ToastAction altText="Partager ma séance en image" onClick={() => void shareSessionCard(card).catch(() => {})}>Partager</ToastAction>,
        title: 'Séance terminée',
        description: `Bravo ! ${totalReps} reps • ${Math.round(currentCalories)} kcal 🔥`,
      });
      play('complete');
      haptics.notification();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      // Petit délai pour laisser le temps au store de se mettre à jour
      setTimeout(() => {
        navigate('/');
      }, 100);
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la séance',
        variant: 'destructive',
      });
    } finally {
      setIsEnding(false);
    }
  };

  const handleLoadLastSession = async () => {
    if (!user) return;
    setIsLoadingLastSession(true);
    try {
      // Import dynamique pour éviter les cycles ou charger seulement quand nécessaire
      const { getLastSession } = await import('@/firebase/firestore');
      const lastSession = await getLastSession(user.uid);

      if (lastSession?.exercises) {
        // Ajouter les exercices de la dernière session
        lastSession.exercises.forEach(ex => {
          if (!hasExercise(ex.name)) {
            // On ajoute l'exercice sans les sets
            // On ajoute l'exercice sans les sets (propriété inexistante dans SessionExercise mais présente dans l'ancien modèle)
            // On génère un ID temporaire car addExercise attend un Exercise avec ID
            const exerciseToAdd = {
              id: ex.name.toLowerCase().replace(/\s+/g, '_'),
              name: ex.name,
              emoji: ex.emoji
            };
            addExercise(exerciseToAdd);
          }
        });
      } else {
        toast({
          title: 'Aucune séance trouvée',
          description: "Tu n'as pas encore de séance enregistrée. Ajoute tes exercices à la main.",
        });
      }
    } catch (error) {
      logger.error('Load last session failed', error as Error);
      toast({
        title: 'Erreur',
        description: "Impossible de charger la dernière séance",
        variant: 'destructive',
      });
    } finally {
      setIsLoadingLastSession(false);
    }
  };

  const handleLoadTemplate = () => {
    const templateExercises = [
      { id: 'pullups', name: 'Tractions', emoji: '💪' },
      { id: 'dips', name: 'Dips', emoji: '🏋️' },
      { id: 'pushups', name: 'Pompes', emoji: '🔥' }
    ];

    templateExercises.forEach(ex => {
      if (!hasExercise(ex.name)) {
        addExercise(ex);
      }
    });
  };

  const handleAddDefaultExercise = (exerciseId: string) => {
    const exercise = getAvailableExercises().find((ex) => ex.id === exerciseId);
    if (exercise && !hasExercise(exercise.name)) {
      addExercise(exercise);
    }
  };

  const handleAddCustomExercise = (name: string, emoji: string) => {
    addCustomExercise(name, emoji);
  };

  const handleLongPress = (exerciseName: string) => {
    setRemovingExercise(exerciseName);
  };

  const handleRemoveExercise = (exerciseName: string) => {
    removeExercise(exerciseName);
    setRemovingExercise(null);
  };

  // Si on n'est pas authentifié, on redirige (déjà géré plus haut)
  // Si la session n'est pas active, on affiche un loader en attendant le useEffect
  if (!isActive) {
    return null; // ou un loader
  }

  // Calculer les calories en temps réel
  const currentCalories = exercises.reduce((sum, sessionEx) => {
    const defaultEx = DEFAULT_EXERCISES.find(e => e.name === sessionEx.name) || {} as Exercise;
    return sum + calculateDynamicCalories(user, defaultEx, sessionEx.reps);
  }, 0);

  return (
    <div className="bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      {/* Header Fixe */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <BackButton to="/" />
          <div className="flex flex-col items-center">
              <h1 className="font-bold text-lg leading-none">Séance</h1>
              <div className="flex items-center gap-1 text-xs text-orange-700 dark:text-orange-400 font-medium animate-in fade-in slide-in-from-bottom-1">
                  <Flame className="w-3 h-3 fill-current" />
                  <span>{Math.round(currentCalories)} kcal</span>
              </div>
          </div>
          <Timer startTime={startTime} isActive={isActive} />
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Liste des exercices */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {exercises.map((exercise) => (
              <ExerciseCard
                key={exercise.name}
                exercise={exercise}
                onAddReps={(reps) => addReps(exercise.name, reps)}
                onLongPress={() => handleLongPress(exercise.name)}
                isRemoving={removingExercise === exercise.name}
                onCancelRemove={() => setRemovingExercise(null)}
                onConfirmRemove={() => handleRemoveExercise(exercise.name)}
                repButtons={user?.repButtons || [5, 10]}
              />
            ))}
          </AnimatePresence>

          {/* Suggestions intelligentes si aucun exercice */}
          {exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6 animate-in fade-in-50">
              <div className="text-center space-y-2">
                <div className="bg-primary/10 p-4 rounded-full w-fit mx-auto mb-4">
                  <Dumbbell className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">Prêt à transpirer ?</h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto">
                  Ajoute des exercices pour commencer ta séance
                </p>
              </div>

              <div className="w-full space-y-3">
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setShowExerciseDialog(true)}
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Ajouter un exercice
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={handleLoadLastSession}
                    disabled={isLoadingLastSession}
                  >
                    {isLoadingLastSession ? <Loader2 className="h-4 w-4 mb-1 animate-spin" /> : <History className="h-4 w-4 mb-1" />}
                    <span className="text-xs">Dernière séance</span>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto py-3 flex-col gap-1"
                    onClick={handleLoadTemplate}
                  >
                    <Dumbbell className="h-4 w-4 mb-1" />
                    <span className="text-xs">Séance de base</span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Boutons d'action (seulement si des exercices sont présents) */}
        {exercises.length > 0 && (
          <div className="space-y-3 pt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowExerciseDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un exercice
            </Button>

            <Button
              onClick={handleEndSession}
              variant="default"
              size="lg"
              className="w-full font-bold shadow-md"
              disabled={isEnding}
            >
              {isEnding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4 fill-current" />}
              Terminer la séance
            </Button>
          </div>
        )}
      </div>

      <AddExerciseDialog
        open={showExerciseDialog}
        onOpenChange={setShowExerciseDialog}
        onAddDefault={handleAddDefaultExercise}
        onAddCustom={handleAddCustomExercise}
        onAddLibrary={(exercise) => { if (!hasExercise(exercise.name)) addExercise(exercise); }}
        hasExercise={hasExercise}
      />
    </div>
  );
}

export default Session;
