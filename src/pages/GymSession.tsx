import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GymExerciseCard } from '@/components/gym/GymExerciseCard';
import { AddGymExerciseDialog } from '@/components/AddGymExerciseDialog';
import { Timer } from '@/components/Timer';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserStore } from '@/store/userStore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useHaptic } from '@/hooks/useHaptic';
import { useSound } from '@/hooks/useSound';
import { getUserGymSessions } from '@/firebase/gymSessions';
import type { GymSessionExercise, PlannedSet } from '@/firebase/types';
import {
  Plus, Play, Square, Dumbbell, CheckCircle2, Timer as TimerIcon,
  Clock, Weight, ArrowLeft, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { cn } from '@/utils/cn';

const NUM_CLS = 'text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const onFocusSel = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();

function GymSession() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const haptics = useHaptic();
  const { play } = useSound();

  const {
    phase,
    exercises,
    startTime,
    restDuration,
    showRestTimer,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    startExecution,
    dismissRestTimer,
    setRestDuration,
    endSession,
    cancelSession,
    getTotalSets,
    getCompletedSets,
  } = useGymSessionStore();

  const { user } = useUserStore();
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
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

  const totalSets = getTotalSets();
  const completedSets = getCompletedSets();
  const allSetsCompleted = phase === 'execute' && completedSets >= totalSets && totalSets > 0;

  // ─── Handlers Planning ─────────────────────────────────────────────────

  const canStart = exercises.length > 0 && exercises.every((ex) => ex.sets.length > 0);

  // ─── Handlers Exécution ────────────────────────────────────────────────


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

  const { completeSetAt, startRestTimer } = useGymSessionStore();

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

      {/* Liste complète des exercices */}
      <div className="p-4 max-w-2xl mx-auto space-y-4 pb-48">
        {exercises.map((exercise) => (
          <ExecuteExerciseCard
            key={exercise.exerciseId}
            exercise={exercise}
            onCompleteSet={completeSetAt}
          />
        ))}

        {allSetsCompleted && (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <div className="bg-green-500/10 p-4 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="font-semibold text-center">Toutes les séries complétées !</p>
          </div>
        )}
      </div>

      {/* Barre flottante du bas */}
      <div
        className="fixed left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-4 pt-3 pb-4"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {showRestTimer && (
            <InlineRestTimer
              durationSeconds={restDuration}
              onDismiss={dismissRestTimer}
              onChangeDuration={setRestDuration}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => showRestTimer ? dismissRestTimer() : startRestTimer()}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                showRestTimer
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              )}
            >
              <TimerIcon className="h-4 w-4" />
              {showRestTimer ? 'Arrêter' : `${restDuration}s`}
            </button>

            <Button
              size="default"
              className={cn('flex-1 font-semibold', allSetsCompleted && 'bg-green-600 hover:bg-green-700')}
              onClick={handleEndSession}
            >
              <Square className="mr-2 h-4 w-4 fill-current" />
              {allSetsCompleted ? 'Terminer la séance' : 'Terminer'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sous-composants execute ──────────────────────────────────────────────────

function SetExecuteRow({
  set,
  setIndex,
  exerciseId,
  onComplete,
}: {
  set: PlannedSet;
  setIndex: number;
  exerciseId: string;
  onComplete: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
}) {
  const [reps, setReps] = useState(String(set.actualReps ?? set.reps));
  const [weight, setWeight] = useState(String(set.actualWeight ?? set.weight));

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors',
      set.completed ? 'bg-green-500/10' : 'bg-muted/30'
    )}>
      <span className={cn('text-xs font-bold w-6 flex-shrink-0', set.completed ? 'text-green-500' : 'text-muted-foreground')}>
        S{setIndex + 1}
      </span>

      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          onFocus={onFocusSel}
          className={`h-8 w-14 text-sm p-1 ${NUM_CLS}`}
          min={0}
        />
        <span className="text-xs text-muted-foreground">reps</span>
      </div>

      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          onFocus={onFocusSel}
          className={`h-8 w-16 text-sm p-1 ${NUM_CLS}`}
          min={0}
        />
        <span className="text-xs text-muted-foreground">kg</span>
      </div>

      <button
        onClick={() => onComplete(exerciseId, setIndex, Number(reps) || 0, Number(weight) || 0)}
        className={cn(
          'p-1.5 rounded-lg transition-colors flex-shrink-0',
          set.completed
            ? 'text-green-500 hover:bg-green-500/10'
            : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
        )}
      >
        <CheckCircle2 className={cn('h-5 w-5', set.completed && 'fill-green-500/20')} />
      </button>
    </div>
  );
}

function ExecuteExerciseCard({
  exercise,
  onCompleteSet,
}: {
  exercise: GymSessionExercise;
  onCompleteSet: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
}) {
  const completedCount = exercise.sets.filter((s) => s.completed).length;

  return (
    <div className="rounded-2xl border-2 border-border bg-card overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {exercise.imageUrl ? (
            <img src={exercise.imageUrl} alt={exercise.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">{exercise.emoji}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate">{exercise.name}</h3>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{exercise.sets.length} série{exercise.sets.length !== 1 ? 's' : ''} complétée{completedCount !== 1 ? 's' : ''}
          </p>
        </div>
        {completedCount === exercise.sets.length && exercise.sets.length > 0 && (
          <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-500/20 flex-shrink-0" />
        )}
      </div>

      <div className="p-3 space-y-2">
        {exercise.sets.map((set, i) => (
          <SetExecuteRow
            key={i}
            set={set}
            setIndex={i}
            exerciseId={exercise.exerciseId}
            onComplete={onCompleteSet}
          />
        ))}
      </div>
    </div>
  );
}

const REST_PRESETS = [
  { label: '30s', value: 30 },
  { label: '1 min', value: 60 },
  { label: '1:30', value: 90 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
];

function InlineRestTimer({
  durationSeconds,
  onDismiss,
  onChangeDuration,
}: {
  durationSeconds: number;
  onDismiss: () => void;
  onChangeDuration: (v: number) => void;
}) {
  const [remaining, setRemaining] = useState(durationSeconds);

  useEffect(() => { setRemaining(durationSeconds); }, [durationSeconds]);

  useEffect(() => {
    if (remaining <= 0) { onDismiss(); return; }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDismiss]);

  const pct = durationSeconds > 0 ? (remaining / durationSeconds) * 100 : 0;

  return (
    <div className="bg-card border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-2xl font-bold tabular-nums">
            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground p-1">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-1000"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-1">
        {REST_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChangeDuration(p.value)}
            className={cn(
              'flex-1 py-1 rounded-lg text-xs font-medium transition-colors',
              durationSeconds === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default GymSession;
