import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GymExerciseCard } from '@/components/gym/GymExerciseCard';
import { RestTimerModal } from '@/components/gym/RestTimerModal';
import { AddGymExerciseDialog } from '@/components/AddGymExerciseDialog';
import { Timer } from '@/components/Timer';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserStore } from '@/store/userStore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useHaptic } from '@/hooks/useHaptic';
import { useSound } from '@/hooks/useSound';
import { getUserGymSessions } from '@/firebase/gymSessions';
import {
  Plus, Play, Square, Dumbbell, CheckCircle2, ChevronDown, ChevronUp,
  Clock, Weight, ArrowLeft
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/utils/cn';

function GymSession() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const haptics = useHaptic();
  const { play } = useSound();

  const {
    phase,
    exercises,
    currentExerciseIndex,
    currentSetIndex,
    startTime,
    restDuration,
    showRestTimer,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    startExecution,
    completeSet,
    dismissRestTimer,
    setRestDuration,
    endSession,
    cancelSession,
    getCurrentExercise,
    getCurrentSet,
    getTotalSets,
    getCompletedSets,
  } = useGymSessionStore();

  const { user } = useUserStore();
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentReps, setCurrentReps] = useState('');
  // Defaults from history: exerciseId → { reps, weight }
  const [historyDefaults, setHistoryDefaults] = useState<Record<string, { reps: number; weight: number }>>({});

  // Rediriger si non auth ou si pas de session en cours
  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Charger les defaults depuis la dernière séance muscu de l'utilisateur
  useEffect(() => {
    if (!user || phase !== 'plan') return;
    getUserGymSessions(user.uid, 5).then((sessions) => {
      const defaults: Record<string, { reps: number; weight: number }> = {};
      // Parcourir les sessions du plus récent au plus ancien
      for (const session of sessions) {
        for (const ex of session.exercises) {
          if (!defaults[ex.exerciseId]) {
            const lastCompletedSet = [...ex.sets].reverse().find((s) => s.completed);
            const fallback = ex.sets[ex.sets.length - 1];
            const ref = lastCompletedSet ?? fallback;
            if (ref) {
              defaults[ex.exerciseId] = {
                reps: ref.actualReps ?? ref.reps,
                weight: ref.actualWeight ?? ref.weight,
              };
            }
          }
        }
      }
      setHistoryDefaults(defaults);
    });
  }, [user?.uid, phase]);

  // Sync inputs avec le set courant en mode exécution
  useEffect(() => {
    if (phase === 'execute') {
      const currentSet = getCurrentSet();
      if (currentSet) {
        setCurrentWeight(String(currentSet.weight));
        setCurrentReps(String(currentSet.reps));
      }
    }
  }, [phase, currentExerciseIndex, currentSetIndex, getCurrentSet]);

  // Mise à jour du timer
  useEffect(() => {
    if (phase !== 'execute' || !startTime) return;
    const interval = setInterval(() => {
      useGymSessionStore.setState({ duration: Math.floor((Date.now() - startTime) / 1000) });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, startTime]);

  if (phase === 'idle') {
    // Redirect back si on arrive ici sans session
    navigate('/');
    return null;
  }

  const currentExercise = getCurrentExercise();
  const currentSet = getCurrentSet();
  const totalSets = getTotalSets();
  const completedSets = getCompletedSets();
  const allSetsCompleted = phase === 'execute' && completedSets >= totalSets && totalSets > 0;

  // ─── Handlers Planning ─────────────────────────────────────────────────

  const canStart = exercises.length > 0 && exercises.every((ex) => ex.sets.length > 0);

  // ─── Handlers Exécution ────────────────────────────────────────────────

  const handleCompleteSet = () => {
    const reps = parseInt(currentReps, 10);
    const weight = parseFloat(currentWeight);
    haptics.impact();
    play('success');
    completeSet(
      !isNaN(reps) ? reps : undefined,
      !isNaN(weight) ? weight : undefined
    );
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      toast({
        title: 'Séance terminée !',
        description: `${completedSets} séries · ${Math.round(
          exercises.reduce((v, ex) => v + ex.sets.filter(s => s.completed).reduce((s2, s) => s2 + (s.actualWeight ?? s.weight) * (s.actualReps ?? s.reps), 0), 0)
        )} kg soulevés`,
      });
      haptics.notification();
      play('complete');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
      setTimeout(() => navigate('/'), 100);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    }
  };

  const handleCancel = () => {
    cancelSession();
    navigate('/');
  };

  // Prochain set label pour le timer de repos
  const getNextSetLabel = (): string => {
    const nextSetIndex = currentSetIndex + 1;
    if (currentExercise && nextSetIndex < currentExercise.sets.length) {
      const nextSet = currentExercise.sets[nextSetIndex];
      if (nextSet) return `${nextSet.reps} × ${nextSet.weight} kg`;
    }
    // Prochain exercice
    const nextExercise = exercises[currentExerciseIndex + 1];
    if (nextExercise) return nextExercise.name;
    return 'Fin de séance';
  };

  // ─── PHASE PLANIFICATION ───────────────────────────────────────────────

  if (phase === 'plan') {
    return (
      <div className="bg-background pb-40 min-h-screen">
        {/* Header */}
        <div className="sticky top-[env(safe-area-inset-top)] z-10 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
            <div className="flex flex-col items-center">
              <h1 className="font-bold text-lg leading-none">Musculation</h1>
              <p className="text-xs text-muted-foreground">Planifier la séance</p>
            </div>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4 max-w-2xl mx-auto space-y-4">
          {/* Exercices planifiés */}
          {exercises.map((exercise) => (
            <GymExerciseCard
              key={exercise.exerciseId}
              exercise={exercise}
              defaultSet={historyDefaults[exercise.exerciseId]}
              onAddSet={(s) => addSet(exercise.exerciseId, s)}
              onUpdateSet={(i, p) => updateSet(exercise.exerciseId, i, p)}
              onRemoveSet={(i) => removeSet(exercise.exerciseId, i)}
              onRemoveExercise={() => removeExercise(exercise.exerciseId)}
            />
          ))}

          {/* Empty state */}
          {exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="bg-blue-500/10 p-4 rounded-full">
                <Dumbbell className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Planifiez votre séance</h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto mt-1">
                  Ajoutez des exercices et définissez vos séries (poids × reps)
                </p>
              </div>
            </div>
          )}

          {/* Bouton ajout exercice */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowExerciseDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un exercice
          </Button>
        </div>

        {/* Bouton Start fixe en bas */}
        {canStart && (
          <div
            className="fixed left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-4 py-4"
            style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
          >
            <div className="max-w-2xl mx-auto">
              <Button
                size="lg"
                className="w-full font-bold"
                onClick={startExecution}
              >
                <Play className="mr-2 h-5 w-5 fill-current" />
                Démarrer la séance ({totalSets} séries)
              </Button>
            </div>
          </div>
        )}

        <AddGymExerciseDialog
          open={showExerciseDialog}
          onOpenChange={setShowExerciseDialog}
          onAdd={addExercise}
          hasExercise={(id) => exercises.some((ex) => ex.exerciseId === id)}
        />
      </div>
    );
  }

  // ─── PHASE EXÉCUTION ──────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleCancel}
            className="p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Square className="h-5 w-5" />
          </button>

          <div className="flex flex-col items-center">
            <h1 className="font-bold text-lg leading-none">En séance</h1>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <Weight className="w-3 h-3" />
              <span>{completedSets}/{totalSets} séries</span>
            </div>
          </div>

          <Timer startTime={startTime} isActive={phase === 'execute'} />
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-muted h-1">
        <div
          className="bg-primary h-1 transition-all duration-500"
          style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
        />
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6 pb-32">

        {/* ─── Exercice courant ─── */}
        {currentExercise && !allSetsCompleted && (
          <div className="space-y-4">
            {/* Info exercice */}
            <div className="flex items-center gap-4 bg-card rounded-2xl border p-4">
              <div className="h-16 w-16 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                {currentExercise.imageUrl ? (
                  <img
                    src={currentExercise.imageUrl}
                    alt={currentExercise.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl">{currentExercise.emoji}</span>
                )}
              </div>
              <div>
                <h2 className="font-bold text-xl">{currentExercise.name}</h2>
                <p className="text-sm text-muted-foreground">
                  Série {currentSetIndex + 1} / {currentExercise.sets.length}
                </p>
              </div>
            </div>

            {/* Set courant */}
            {currentSet && (
              <div className="bg-card rounded-2xl border-2 border-primary/30 p-5 space-y-5">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-1">Objectif</p>
                  <p className="text-2xl font-black">
                    {currentSet.reps} reps × {currentSet.weight} kg
                  </p>
                </div>

                {/* Ajustement reps */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Reps réalisées</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentReps(String(Math.max(0, parseInt(currentReps || '0') - 1)))}
                      className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 font-bold text-lg transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={currentReps}
                      onChange={(e) => setCurrentReps(e.target.value)}
                      className="flex-1 h-11 rounded-xl border bg-background text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                      min={0}
                    />
                    <button
                      onClick={() => setCurrentReps(String(parseInt(currentReps || '0') + 1))}
                      className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 font-bold text-lg transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Ajustement poids */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Poids (kg)</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentWeight(String(Math.max(0, parseFloat(currentWeight || '0') - 2.5)))}
                      className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 font-bold text-lg transition-colors flex items-center justify-center"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      value={currentWeight}
                      onChange={(e) => setCurrentWeight(e.target.value)}
                      className="flex-1 h-11 rounded-xl border bg-background text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                      min={0}
                      step={2.5}
                    />
                    <button
                      onClick={() => setCurrentWeight(String(parseFloat(currentWeight || '0') + 2.5))}
                      className="h-11 w-11 rounded-xl bg-muted hover:bg-muted/80 font-bold text-lg transition-colors flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Bouton "Série terminée" */}
                <Button
                  size="lg"
                  className="w-full font-bold"
                  onClick={handleCompleteSet}
                >
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Série terminée
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─── Toutes les séries complétées ─── */}
        {allSetsCompleted && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="bg-green-500/10 p-5 rounded-full">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <div className="text-center">
              <h3 className="font-bold text-xl">Toutes les séries terminées !</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {completedSets} séries complétées
              </p>
            </div>
          </div>
        )}

        {/* ─── Plan de la séance (recap collapsable) ─── */}
        <ExercisePlanSummary
          exercises={exercises}
          currentExerciseIndex={currentExerciseIndex}
          currentSetIndex={currentSetIndex}
        />
      </div>

      {/* Bouton Terminer */}
      <div
        className="fixed left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-4 py-4"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto">
          {allSetsCompleted ? (
            <Button size="lg" className="w-full font-bold" onClick={handleEndSession}>
              <Square className="mr-2 h-4 w-4 fill-current" />
              Terminer la séance
            </Button>
          ) : (
            <Button size="lg" variant="outline" className="w-full" onClick={handleEndSession}>
              <Square className="mr-2 h-4 w-4" />
              Terminer maintenant
            </Button>
          )}
        </div>
      </div>

      {/* Timer de repos */}
      <RestTimerModal
        open={showRestTimer}
        durationSeconds={restDuration}
        onDismiss={dismissRestTimer}
        nextSetLabel={getNextSetLabel()}
      />

      {/* Config durée repos */}
      <RestDurationPicker value={restDuration} onChange={setRestDuration} />
    </div>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function ExercisePlanSummary({
  exercises,
  currentExerciseIndex,
  currentSetIndex,
}: {
  exercises: ReturnType<typeof useGymSessionStore.getState>['exercises'];
  currentExerciseIndex: number;
  currentSetIndex: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border bg-card">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <span className="font-semibold text-sm">Programme de la séance</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {exercises.map((ex, exI) => (
            <div key={ex.exerciseId} className="space-y-1">
              <p
                className={cn(
                  'text-sm font-semibold',
                  exI === currentExerciseIndex ? 'text-primary' : 'text-foreground'
                )}
              >
                {ex.emoji} {ex.name}
              </p>
              <div className="space-y-0.5 pl-5">
                {ex.sets.map((s, sI) => {
                  const isCurrent = exI === currentExerciseIndex && sI === currentSetIndex;
                  return (
                    <p
                      key={sI}
                      className={cn(
                        'text-xs',
                        s.completed
                          ? 'text-green-500 line-through'
                          : isCurrent
                          ? 'text-primary font-bold'
                          : 'text-muted-foreground'
                      )}
                    >
                      S{sI + 1}: {s.actualReps ?? s.reps} × {s.actualWeight ?? s.weight} kg
                      {s.completed ? ' ✓' : ''}
                    </p>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const REST_DURATIONS = [
  { label: '45s', value: 45 },
  { label: '1 min', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
];

function RestDurationPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="fixed top-20 right-4 z-10">
      <div className="bg-background/90 backdrop-blur-sm border rounded-xl p-2 shadow-lg">
        <div className="flex items-center gap-1 mb-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground font-medium">Repos</span>
        </div>
        <div className="flex flex-col gap-1">
          {REST_DURATIONS.map((d) => (
            <button
              key={d.value}
              onClick={() => onChange(d.value)}
              className={cn(
                'text-[10px] px-2 py-1 rounded-lg transition-colors font-medium',
                value === d.value
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GymSession;
