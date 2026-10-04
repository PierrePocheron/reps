import { Fragment, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GymExerciseCard } from '@/components/gym/GymExerciseCard';
import { AddGymExerciseDialog } from '@/components/AddGymExerciseDialog';
import { ExerciseDetailSheet } from '@/components/gym/ExerciseDetailSheet';
import { PlateCalculator } from '@/components/gym/PlateCalculator';
import { Timer } from '@/components/Timer';
import { useGymSessionStore, NOTE_MAX, restSeconds } from '@/store/gymSessionStore';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import { useUserStore } from '@/store/userStore';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useHaptic } from '@/hooks/useHaptic';
import { useSound } from '@/hooks/useSound';
import { getUserGymSessions } from '@/firebase/gymSessions';
import type { GymSession as GymSessionData, GymSessionExercise, PlannedSet, SetType } from '@/firebase/types';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { useLanguage } from '@/hooks/useLanguage';
import {
  getLibraryExercise,
  libraryGifUrl,
  LIBRARY_ID_PREFIX,
  type LibraryExercise,
} from '@/utils/exerciseLibrary';
import { MUSCULATION_EXERCISES } from '@/utils/constants';
import { estimate1RM, bestE1RMByExercise, exerciseHistory } from '@/utils/records';
import {
  Plus, Play, Square, Dumbbell, CheckCircle2, Timer as TimerIcon,
  Clock, Weight, ArrowLeft, X, Trash2, Info, Loader2, Trophy,
  StickyNote,
  TrendingUp,
  Link2,
  ArrowUpDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ToastAction } from '@/components/ui/toast';
import { exactAlarmDenied, openExactAlarmSettings } from '@/utils/restNotification';
import { gymCard, shareSessionCard, type SessionCard } from '@/utils/shareCard';
import { gymSummary, comparisonText } from '@/utils/summary';
import { formatDurationLong, plural } from '@/utils/formatters';
import { SessionSummary, type SummaryStat } from '@/components/SessionSummary';
import { lastWorkSets, suggestNextWeight, type LoadSuggestion } from '@/utils/progression';
import { loadPlatePrefs, warmupSets } from '@/utils/plates';
import { restAfterSet, supersetLetters } from '@/utils/superset';
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
    restEndsAt,
    restExerciseId,
    restByExercise,
    autoRest,
    setAutoRest,
    showRpe,
    suggestLoad,
    addExercise,
    removeExercise,
    addSet,
    updateSet,
    removeSet,
    setExerciseNote,
    prependWarmup,
    toggleSuperset,
    swapExercises,
    startExecution,
    dismissRestTimer,
    setRestDuration,
    adjustRest,
    endSession,
    cancelSession,
    getTotalSets,
    getCompletedSets,
    completeSetAt,
    startRestTimer,
  } = useGymSessionStore();
  useKeepAwake(phase === 'execute');

  const { user } = useUserStore();
  const { imageMap, infoMap } = useExerciseImages();
  const lang = useLanguage();
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [ending, setEnding] = useState(false);
  const [detailExerciseId, setDetailExerciseId] = useState<string | null>(null);
  const [libDetail, setLibDetail] = useState<LibraryExercise | null>(null);

  // Détails (étapes, muscles) des exercices issus de la bibliothèque complète
  useEffect(() => {
    if (detailExerciseId?.startsWith(LIBRARY_ID_PREFIX)) {
      getLibraryExercise(detailExerciseId, lang).then(setLibDetail);
    } else {
      setLibDetail(null);
    }
  }, [detailExerciseId, lang]);
  // Defaults from history: exerciseId → { reps, weight }
  const [historyDefaults, setHistoryDefaults] = useState<Record<string, { reps: number; weight: number }>>({});

  // Rediriger si non auth ou si pas de session en cours
  useEffect(() => {
    if (!isAuthenticated) navigate('/');
  }, [isAuthenticated, navigate]);

  // Records de référence (meilleur 1RM estimé par exercice) — ref : lecture synchrone au tap
  const bestsRef = useRef<Record<string, number>>({});
  const [gymHistory, setGymHistory] = useState<GymSessionData[]>([]);
  // Récap affiché après la fin de séance (#54) ; posé avant endSession pour devancer le retour à l'accueil
  const [summary, setSummary] = useState<{ stats: SummaryStat[]; comparison: string | null; card: SessionCard } | null>(null);

  // Charger les defaults (dernière séance) et les records depuis l'historique muscu
  const uid = user?.uid;
  useEffect(() => {
    if (!uid || phase === 'idle') return;
    getUserGymSessions(uid, 200).then((sessions) => {
      bestsRef.current = bestE1RMByExercise(sessions);
      setGymHistory(sessions);
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
    }).catch(() => { /* defaults facultatifs : on ignore l'échec */ });
  }, [uid, phase]);


  // Mise à jour du timer
  useEffect(() => {
    if (phase !== 'execute' || !startTime) return;
    const interval = setInterval(() => {
      useGymSessionStore.setState({ duration: Math.floor((Date.now() - startTime) / 1000) });
    }, 1000);
    return () => clearInterval(interval);
  }, [phase, startTime]);

  // Android 14+ : sans alarmes exactes, la notification de fin de repos peut arriver en retard — on le propose une fois
  useEffect(() => {
    if (!showRestTimer || localStorage.getItem(EXACT_ALARM_ASKED)) return;
    void exactAlarmDenied().then((denied) => {
      if (!denied) return;
      localStorage.setItem(EXACT_ALARM_ASKED, '1');
      toast({
        title: 'Fin de repos à la seconde près ?',
        description: 'Autorise les alarmes exactes pour que la notification arrive pile à l\'heure.',
        action: <ToastAction altText="Ouvrir le réglage des alarmes" onClick={() => void openExactAlarmSettings()}>Autoriser</ToastAction>,
      });
    });
  }, [showRestTimer, toast]);

  // Plus de séance (terminée, annulée, accès direct) : retour à l'accueil. Jamais pendant le rendu :
  // la page reste montée pendant l'animation de sortie et relançait la navigation en boucle (gel à la fin de séance)
  useEffect(() => {
    if (phase === 'idle' && !summary) navigate('/', { replace: true });
  }, [phase, summary, navigate]);

  if (phase === 'idle') {
    return summary && (
      <SessionSummary
        stats={summary.stats}
        comparison={summary.comparison}
        onShare={() => void shareSessionCard(summary.card).catch(() => {})}
        onDone={() => navigate('/', { replace: true })}
      />
    );
  }

  const letters = supersetLetters(exercises);
  // Dernière note par exercice (historique trié du plus récent au plus ancien)
  const lastNotes: Record<string, string> = {};
  for (const past of gymHistory) {
    for (const ex of past.exercises) if (ex.note && !lastNotes[ex.exerciseId]) lastNotes[ex.exerciseId] = ex.note;
  }

  const totalSets = getTotalSets();
  const completedSets = getCompletedSets();
  const allSetsCompleted = phase === 'execute' && completedSets >= totalSets && totalSets > 0;

  // Enrichir les exercices avec les images Firestore
  const enrichedExercises = exercises.map((ex) => ({
    ...ex,
    imageUrl: ex.imageUrl ?? imageMap[ex.exerciseId],
  }));

  // ─── Handlers Planning ─────────────────────────────────────────────────

  const canStart = exercises.length > 0 && exercises.every((ex) => ex.sets.length > 0);

  // ─── Handlers Exécution ────────────────────────────────────────────────


  const handleCompleteSet = (exerciseId: string, setIndex: number, reps: number, weight: number) => {
    completeSetAt(exerciseId, setIndex, reps, weight);
    // Comme Strong : repos à chaque série… sauf au milieu d'un tour de superset
    if (autoRest && completedSets + 1 < totalSets && restAfterSet(useGymSessionStore.getState().exercises, exerciseId)) startRestTimer(exerciseId);
    const best = bestsRef.current[exerciseId];
    const e1rm = estimate1RM(weight, reps);
    const warmup = exercises.find((ex) => ex.exerciseId === exerciseId)?.sets[setIndex]?.type === 'warmup';
    // Pas d'historique sur l'exercice = pas de « record » (évite le faux positif de la 1re séance) ; jamais sur un échauffement
    if (warmup || best === undefined || e1rm <= best) return;
    bestsRef.current[exerciseId] = e1rm;
    updateSet(exerciseId, setIndex, { isRecord: true });
    haptics.notification();
    confetti({ particleCount: 50, spread: 55, origin: { y: 0.7 } });
    const name = exercises.find((ex) => ex.exerciseId === exerciseId)?.name ?? 'Exercice';
    toast({
      title: 'Nouveau record ! 🏆',
      description: `${name} : ${weight.toLocaleString('fr-FR')} kg × ${reps} — 1RM estimé ${Math.round(e1rm)} kg`,
    });
  };

  const handleEndSession = async () => {
    if (ending) return;
    setEnding(true);
    // Récap et carte de partage figés avant que endSession ne vide le store
    const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    const sum = gymSummary(exercises, gymHistory);
    setSummary({
      card: gymCard({ date: new Date(), duration, exercises }),
      comparison: comparisonText(sum.deltaPct),
      stats: [
        { label: 'Durée', value: formatDurationLong(duration) },
        { label: 'Volume', value: `${sum.volume.toLocaleString('fr-FR')} kg` },
        { label: 'Séries', value: String(sum.sets) },
        { label: 'Records', value: sum.records ? `🏆 ${sum.records}` : '0' },
      ],
    });
    try {
      await endSession();
      haptics.notification();
      play('complete');
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } });
    } catch {
      setSummary(null);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setEnding(false);
    }
  };

  const handleCancel = () => cancelSession(); // l'effet ci-dessus ramène à l'accueil

  const handleCancelConfirm = () => {
    setShowCancelConfirm(false);
    handleCancel();
  };


  // ─── PHASE PLANIFICATION ───────────────────────────────────────────────

  if (phase === 'plan') {
    return (
      <div className="bg-background pb-40 min-h-screen">
        {/* Header */}
        <div className="sticky top-[env(safe-area-inset-top)] z-10 bg-background/80 backdrop-blur-md border-b">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <button
            onClick={() => (exercises.length > 0 ? setShowCancelConfirm(true) : handleCancel())}
            aria-label="Quitter la planification"
            className="h-11 w-11 -ml-2 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
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
          {enrichedExercises.map((exercise, idx) => (
            <Fragment key={exercise.exerciseId}>
            <GymExerciseCard
              exercise={exercise}
              defaultSet={historyDefaults[exercise.exerciseId]}
              onAddSet={(s) => addSet(exercise.exerciseId, s)}
              onUpdateSet={(i, p) => updateSet(exercise.exerciseId, i, p)}
              onRemoveSet={(i) => removeSet(exercise.exerciseId, i)}
              onRemoveExercise={() => removeExercise(exercise.exerciseId)}
            />
            {idx < enrichedExercises.length - 1 && (
              <div className="flex justify-center -my-1">
                <SwapButton upper={exercise.name} lower={enrichedExercises[idx + 1]!.name} onSwap={() => swapExercises(idx)} />
              </div>
            )}
            </Fragment>
          ))}

          {/* Empty state */}
          {exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="bg-blue-500/10 p-4 rounded-full">
                <Dumbbell className="h-8 w-8 text-blue-500" />
              </div>
              <div className="text-center">
                <h3 className="font-semibold text-lg">Planifie ta séance</h3>
                <p className="text-muted-foreground text-sm max-w-[250px] mx-auto mt-1">
                  Ajoute des exercices et définis tes séries (poids × reps)
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
                Démarrer la séance ({plural(totalSets, 'série')})
              </Button>
            </div>
          </div>
        )}

        {/* Modale confirmation abandon planification */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
            <div role="dialog" aria-modal="true" aria-labelledby="cancel-plan-title" className="relative z-10 w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-2xl shadow-xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-destructive" />
                </div>
                <h3 id="cancel-plan-title" className="font-bold text-lg">Abandonner la planification ?</h3>
                <p className="text-sm text-muted-foreground">Les exercices et séries que tu as planifiés seront perdus.</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)}>
                  Continuer
                </Button>
                <Button variant="destructive" className="flex-1" onClick={handleCancelConfirm}>
                  Abandonner
                </Button>
              </div>
            </div>
          </div>
        )}

        <AddGymExerciseDialog
          open={showExerciseDialog}
          onOpenChange={setShowExerciseDialog}
          onAdd={addExercise}
          hasExercise={(id) => exercises.some((ex) => ex.exerciseId === id)}
          enrichedExercises={MUSCULATION_EXERCISES.map((ex) => ({ ...ex, imageUrl: imageMap[ex.id] }))}
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
            onClick={() => navigate('/')}
            aria-label="Retour à l'accueil"
            className="h-11 w-11 -ml-2 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex flex-col items-center">
            <h1 className="font-bold text-lg leading-none">En séance</h1>
            <div className="flex items-center gap-1 text-xs text-primary font-medium">
              <Weight className="w-3 h-3" />
              <span>{completedSets}/{plural(totalSets, 'série')}</span>
            </div>
          </div>
          <Timer startTime={startTime} isActive={phase === 'execute'} />
        </div>
      </div>

      {/* Barre de progression */}
      <div
        className="w-full bg-muted h-1"
        role="progressbar"
        aria-label="Progression de la séance"
        aria-valuemin={0}
        aria-valuemax={totalSets}
        aria-valuenow={completedSets}
        aria-valuetext={`${plural(completedSets, 'série')} sur ${totalSets}`}
      >
        <div
          className="bg-primary h-1 transition-all duration-500"
          style={{ width: `${totalSets > 0 ? (completedSets / totalSets) * 100 : 0}%` }}
        />
      </div>

      {/* Liste complète des exercices */}
      {/* Marge sous la barre flottante : plus haute avec le minuteur de repos ouvert, sinon il cache le bas de la liste */}
      <div className={cn('p-4 max-w-2xl mx-auto space-y-4', showRestTimer ? 'pb-[22rem]' : 'pb-48')}>
        {exercises.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
            <div className="bg-blue-500/10 p-4 rounded-full">
              <Dumbbell className="h-8 w-8 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Séance vide</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-[220px] mx-auto">Ajoute ton premier exercice ci-dessous pour commencer</p>
            </div>
          </div>
        )}

        {enrichedExercises.map((exercise, idx) => (
          <Fragment key={exercise.exerciseId}>
          <ExecuteExerciseCard
            exercise={exercise}
            supersetLabel={exercise.supersetId ? `Superset ${letters[exercise.supersetId]}` : undefined}
            onCompleteSet={handleCompleteSet}
            onRpe={showRpe ? (exerciseId, setIndex, rpe) => updateSet(exerciseId, setIndex, { rpe }) : undefined}
            onType={(exerciseId, setIndex, type) => updateSet(exerciseId, setIndex, { type, ...(type === 'warmup' ? { isRecord: false } : {}) })}
            onUpdateSet={(exerciseId, setIndex, reps, weight) =>
              updateSet(exerciseId, setIndex, { actualReps: reps, actualWeight: weight })
            }
            onShowDetail={(id) => setDetailExerciseId(id)}
            lastNote={lastNotes[exercise.exerciseId]}
            isBarbell={infoMap[exercise.exerciseId]?.equipment === 'barbell'}
            onAddWarmup={(sets) => prependWarmup(exercise.exerciseId, sets)}
            suggestion={suggestLoad ? suggestNextWeight(gymHistory, exercise.exerciseId) : null}
            onApplySuggestion={(s) => exercise.sets.forEach((set, i) => {
              if (!set.completed && set.type !== 'warmup' && (set.actualWeight ?? set.weight) < s.to) updateSet(exercise.exerciseId, i, { weight: s.to, actualWeight: s.to });
            })}
            onNoteChange={(note) => setExerciseNote(exercise.exerciseId, note)}
            onAddSet={(exerciseId) => {
              const ex = exercises.find((e) => e.exerciseId === exerciseId);
              const last = ex?.sets[ex.sets.length - 1];
              const def = historyDefaults[exerciseId] ?? { reps: 10, weight: 0 };
              addSet(exerciseId, {
                reps: last ? (last.actualReps ?? last.reps) : def.reps,
                weight: last ? (last.actualWeight ?? last.weight) : def.weight,
              });
            }}
          />
          {idx < enrichedExercises.length - 1 && (() => {
            const next = enrichedExercises[idx + 1]!;
            const linked = !!exercise.supersetId && exercise.supersetId === next.supersetId;
            return (
              <div className="flex justify-center gap-2 -my-1">
                <SwapButton upper={exercise.name} lower={next.name} onSwap={() => swapExercises(idx)} />
                <button
                  type="button"
                  onClick={() => toggleSuperset(idx)}
                  aria-pressed={linked}
                  aria-label={linked ? `Délier ${exercise.name} et ${next.name}` : `Faire un superset avec ${next.name}`}
                  className={cn('min-h-11 px-3 rounded-full border text-xs font-medium inline-flex items-center gap-1.5',
                    linked ? 'border-primary/40 bg-primary/10 text-primary' : 'border-dashed border-border text-muted-foreground hover:text-foreground')}
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden /> {linked ? 'Superset' : 'Lier'}
                </button>
              </div>
            );
          })()}
          </Fragment>
        ))}

        {allSetsCompleted && (
          <div className="flex flex-col items-center justify-center py-8 space-y-2">
            <div className="bg-green-500/10 p-4 rounded-full">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <p className="font-semibold text-center">Toutes les séries complétées !</p>
          </div>
        )}

        {/* Bouton ajout exercice — après la liste */}
        <button
          onClick={() => setShowExerciseDialog(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-muted-foreground hover:text-primary font-medium"
        >
          <Plus className="h-4 w-4" />
          Ajouter un exercice
        </button>
      </div>

      {/* Barre flottante du bas */}
      <div
        className="fixed left-0 right-0 bg-background/95 backdrop-blur-sm border-t px-4 pt-3 pb-4"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {showRestTimer && restEndsAt && (
            <InlineRestTimer
              endsAt={restEndsAt}
              durationSeconds={restSeconds({ restDuration, restByExercise }, restExerciseId)}
              forName={exercises.find((ex) => ex.exerciseId === restExerciseId)?.name}
              onDismiss={dismissRestTimer}
              onChangeDuration={setRestDuration}
              onAdjust={adjustRest}
              autoRest={autoRest}
              onToggleAutoRest={() => setAutoRest(!autoRest)}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => showRestTimer ? dismissRestTimer() : startRestTimer()}
              className={cn(
                'flex items-center gap-1.5 min-w-11 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                showRestTimer
                  ? 'bg-primary/10 border-primary/30 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
              )}
            >
              <TimerIcon className="h-4 w-4" />
              {showRestTimer ? 'Arrêter' : (REST_PRESETS.find((p) => p.value === restDuration)?.label ?? `${restDuration}s`)}
            </button>

            <Button
              size="default"
              disabled={ending || completedSets === 0}
              className={cn('flex-1 font-semibold', allSetsCompleted && 'bg-green-600 hover:bg-green-700')}
              onClick={handleEndSession}
            >
              {ending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Square className="mr-2 h-4 w-4 fill-current" />}
              {allSetsCompleted ? 'Terminer !' : 'Terminer'}
            </Button>

            <button
              onClick={() => setShowCancelConfirm(true)}
              aria-label="Annuler la séance"
              className="flex items-center justify-center min-w-11 px-3 py-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 active:scale-95 transition-all"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modale confirmation annulation */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelConfirm(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="cancel-session-title" className="relative z-10 w-full sm:max-w-sm bg-background rounded-t-3xl sm:rounded-2xl shadow-xl p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:pb-6 space-y-4">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-6 w-6 text-destructive" />
              </div>
              <h3 id="cancel-session-title" className="font-bold text-lg">Annuler la séance ?</h3>
              <p className="text-sm text-muted-foreground">La séance en cours sera définitivement supprimée, sans sauvegarde.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCancelConfirm(false)}>
                Continuer
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleCancelConfirm}>
                Annuler la séance
              </Button>
            </div>
          </div>
        </div>
      )}

      <AddGymExerciseDialog
        open={showExerciseDialog}
        onOpenChange={setShowExerciseDialog}
        onAdd={(exercise) => {
          addExercise(exercise);
          // Comme Hevy : les séries de la dernière fois, sinon une série par défaut
          const last = lastWorkSets(gymHistory, exercise.id);
          if (last.length) last.forEach((set) => addSet(exercise.id, set));
          else addSet(exercise.id, historyDefaults[exercise.id] ?? { reps: 10, weight: 0 });
        }}
        hasExercise={(id) => exercises.some((ex) => ex.exerciseId === id)}
        enrichedExercises={MUSCULATION_EXERCISES.map((ex) => ({ ...ex, imageUrl: imageMap[ex.id] }))}
      />

      {/* Fiche détail exercice */}
      {detailExerciseId && (() => {
        const ex = enrichedExercises.find((e) => e.exerciseId === detailExerciseId);
        if (!ex) return null;
        return (
          <ExerciseDetailSheet
            exerciseId={ex.exerciseId}
            name={ex.name}
            emoji={ex.emoji}
            imageUrl={
              infoMap[ex.exerciseId]?.gifUrl
              ?? (libDetail ? libraryGifUrl(libDetail) : null)
              ?? ex.imageUrl
              ?? null
            }
            description={infoMap[ex.exerciseId]?.description ?? null}
            steps={infoMap[ex.exerciseId]?.steps ?? libDetail?.steps}
            target={infoMap[ex.exerciseId]?.target ?? libDetail?.target}
            secondaryMuscles={infoMap[ex.exerciseId]?.secondaryMuscles ?? libDetail?.secondaryMuscles}
            history={exerciseHistory(gymHistory, ex.exerciseId)}
            onClose={() => setDetailExerciseId(null)}
          />
        );
      })()}
    </div>
  );
}

// ─── Sous-composants execute ──────────────────────────────────────────────────

function SetExecuteRow({
  set,
  setIndex,
  exerciseId,
  onComplete,
  onUpdate,
  onRpe,
  onType,
  number,
}: {
  set: PlannedSet;
  setIndex: number;
  exerciseId: string;
  onComplete: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
  onUpdate: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
  onRpe?: (rpe: number | undefined) => void; // présent seulement si le réglage « RPE par série » est actif
  onType: (type: SetType | undefined) => void;
  number: number; // numéro hors échauffements
}) {
  const [reps, setReps] = useState(String(set.actualReps ?? set.reps));
  const [weight, setWeight] = useState(String(set.actualWeight ?? set.weight));
  const { play } = useSound();
  const haptics = useHaptic();

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-xl transition-colors',
      set.completed ? 'bg-green-500/10' : 'bg-muted/30'
    )}>
      <button
        type="button"
        onClick={() => onType(nextSetType(set.type))}
        aria-label={`Série ${setIndex + 1} : ${set.type ? SET_TYPE_META[set.type].label : 'normale'}${set.isRecord ? ', record personnel' : ''} — changer le type`}
        className={cn('h-11 w-8 -my-1.5 -ml-1.5 flex-shrink-0 flex items-center justify-center rounded-lg text-xs font-bold active:scale-95',
          set.type ? SET_TYPE_META[set.type].cls : set.completed ? 'text-green-700 dark:text-green-400' : 'text-muted-foreground')}
      >
        {set.isRecord
          ? <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
          : set.type ? SET_TYPE_META[set.type].short : `S${number}`}
      </button>

      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          value={reps}
          onChange={(e) => { setReps(e.target.value); onUpdate(exerciseId, setIndex, Number(e.target.value) || 0, Number(weight) || 0); }}
          onFocus={onFocusSel}
          aria-label={`Répétitions, série ${setIndex + 1}`}
          className={`h-8 w-14 max-[359px]:w-12 text-sm p-1 ${NUM_CLS}`}
          min={0}
        />
        <span className="text-xs text-muted-foreground">reps</span>
      </div>

      <div className="flex items-center gap-1 flex-1">
        <Input
          type="number"
          value={weight}
          onChange={(e) => { setWeight(e.target.value); onUpdate(exerciseId, setIndex, Number(reps) || 0, Number(e.target.value) || 0); }}
          onFocus={onFocusSel}
          aria-label={`Charge en kg, série ${setIndex + 1}`}
          className={`h-8 w-16 max-[359px]:w-14 text-sm p-1 ${NUM_CLS}`}
          min={0}
        />
        <span className="text-xs text-muted-foreground">kg</span>
      </div>

      {onRpe && set.completed ? (
        // Série validée : le RPE remplace la coche (la ligne verte indique déjà la validation)
        <select
          value={set.rpe ?? ''}
          onChange={(e) => onRpe(e.target.value ? Number(e.target.value) : undefined)}
          aria-label={`RPE (effort ressenti), série ${setIndex + 1}`}
          className="h-11 w-11 -my-1.5 -mr-1.5 flex-shrink-0 appearance-none rounded-lg bg-transparent text-center text-xs font-semibold text-green-700 dark:text-green-400 border border-green-500/30"
        >
          <option value="">RPE</option>
          {RPE_VALUES.map((v) => <option key={v} value={v}>{v.toLocaleString('fr-FR')}</option>)}
        </select>
      ) : (
        <button
          onClick={() => {
            if (set.completed) return;
            haptics.impact();
            play('success');
            onComplete(exerciseId, setIndex, Number(reps) || 0, Number(weight) || 0);
          }}
          aria-label={set.completed ? `Série ${setIndex + 1} validée` : `Valider la série ${setIndex + 1}`}
          className={cn(
            'h-11 w-11 -my-1.5 -mr-1.5 flex items-center justify-center rounded-lg transition-all active:scale-95 flex-shrink-0',
            set.completed
              ? 'text-green-600 dark:text-green-500'
              : 'text-muted-foreground hover:text-green-500 hover:bg-green-500/10'
          )}
        >
          <CheckCircle2 className={cn('h-5 w-5', set.completed && 'fill-green-500/20')} />
        </button>
      )}
    </div>
  );
}

function ExecuteExerciseCard({
  exercise,
  onCompleteSet,
  onUpdateSet,
  onAddSet,
  onShowDetail,
  lastNote,
  onNoteChange,
  isBarbell,
  onRpe,
  onType,
  suggestion,
  onApplySuggestion,
  onAddWarmup,
  supersetLabel,
}: {
  exercise: GymSessionExercise;
  onCompleteSet: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
  onUpdateSet: (exerciseId: string, setIndex: number, reps: number, weight: number) => void;
  onAddSet: (exerciseId: string) => void;
  onShowDetail: (exerciseId: string) => void;
  lastNote?: string;
  onNoteChange: (note: string) => void;
  isBarbell: boolean;
  onRpe?: (exerciseId: string, setIndex: number, rpe: number | undefined) => void;
  onType: (exerciseId: string, setIndex: number, type: SetType | undefined) => void;
  suggestion: LoadSuggestion | null;
  onApplySuggestion: (s: LoadSuggestion) => void;
  onAddWarmup: (sets: { weight: number; reps: number }[]) => void;
  supersetLabel?: string;
}) {
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const [showPlates, setShowPlates] = useState(false);
  const nextSet = exercise.sets.find((s) => !s.completed) ?? exercise.sets[exercise.sets.length - 1];
  const nextWeight = nextSet ? (nextSet.actualWeight ?? nextSet.weight) : 0;
  // Échauffement proposé avant la première série, s'il n'y en a pas déjà
  const warmups = completedCount === 0 && !exercise.sets.some((st) => st.type === 'warmup')
    ? warmupSets(nextWeight, isBarbell ? loadPlatePrefs() : null) : [];

  return (
    <div className={cn('rounded-2xl border-2 bg-card overflow-hidden', supersetLabel ? 'border-primary/40' : 'border-border')}>
      {supersetLabel && (
        <p className="px-4 pt-2 text-[11px] font-semibold uppercase tracking-wide text-primary">{supersetLabel} · repos après le dernier exercice</p>
      )}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {exercise.imageUrl ? (
            <img src={exercise.imageUrl} alt={exercise.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl">{exercise.emoji}</span>
          )}
        </div>
        <button
          className="flex-1 min-w-0 text-left"
          onClick={() => onShowDetail(exercise.exerciseId)}
          aria-label={`${exercise.name} : voir la fiche et ta progression`}
        >
          <span className="font-bold text-base flex items-center gap-1.5 min-w-0">
            <span className="line-clamp-2 min-w-0 break-words">{exercise.name}</span>
            <Info className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" aria-hidden />
          </span>
          <p className="text-xs text-muted-foreground">
            {completedCount}/{exercise.sets.length} série{exercise.sets.length !== 1 ? 's' : ''} complétée{completedCount !== 1 ? 's' : ''}
          </p>
        </button>
        {isBarbell && (
          <button
            type="button"
            onClick={() => setShowPlates(true)}
            aria-label={`Disques à charger pour ${exercise.name}`}
            className="min-h-11 px-3 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-primary hover:border-primary/40 flex-shrink-0"
          >
            Disques
          </button>
        )}
        {completedCount === exercise.sets.length && exercise.sets.length > 0 && (
          <CheckCircle2 className="h-5 w-5 text-green-500 fill-green-500/20 flex-shrink-0" />
        )}
      </div>
      {isBarbell && (
        <PlateCalculator open={showPlates} onOpenChange={setShowPlates} weight={nextWeight} exerciseName={exercise.name} />
      )}

      <div className="p-3 space-y-2">
        {/* Surcharge progressive : proposée tant qu'une série de travail reste sous la charge suggérée */}
        {suggestion && exercise.sets.some((st) => !st.completed && st.type !== 'warmup' && (st.actualWeight ?? st.weight) < suggestion.to) && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2">
            <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" aria-hidden />
            <p className="flex-1 text-xs">
              <span className="font-semibold">Essaie {suggestion.to.toLocaleString('fr-FR')} kg</span>
              <span className="text-muted-foreground"> · tout réussi la dernière fois ({suggestion.summary})</span>
            </p>
            <button
              type="button"
              onClick={() => onApplySuggestion(suggestion)}
              className="min-h-11 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold active:scale-95"
            >
              Appliquer
            </button>
          </div>
        )}
        {/* Note (Hevy) : la dernière est rappelée, la nouvelle part avec la séance */}
        <div className="px-1">
          {lastNote && (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <StickyNote className="h-3.5 w-3.5 mt-px flex-shrink-0" aria-hidden />
              <span>Dernière fois : « {lastNote} »</span>
            </p>
          )}
          <input
            value={exercise.note ?? ''}
            onChange={(e) => onNoteChange(e.target.value)}
            maxLength={NOTE_MAX}
            placeholder="Ajouter une note (réglage, sensation…)"
            aria-label={`Note pour ${exercise.name}`}
            className="w-full min-h-11 bg-transparent text-sm placeholder:text-muted-foreground/70 border-b border-dashed border-border focus:border-primary focus:outline-none"
          />
        </div>
        {exercise.sets.map((set, i) => (
          <SetExecuteRow
            key={`${i}-${set.weight}`} // remonte la ligne quand la charge change (suggestion appliquée)
            set={set}
            setIndex={i}
            exerciseId={exercise.exerciseId}
            onComplete={onCompleteSet}
            onUpdate={onUpdateSet}
            onRpe={onRpe && ((rpe) => onRpe(exercise.exerciseId, i, rpe))}
            onType={(type) => onType(exercise.exerciseId, i, type)}
            number={exercise.sets.slice(0, i + 1).filter((st) => st.type !== 'warmup').length}
          />
        ))}

        <div className="flex gap-2">
          <button
            onClick={() => onAddSet(exercise.exerciseId)}
            className="flex-1 min-h-11 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-xs font-medium"
          >
            <Plus className="h-3.5 w-3.5" />
            Série {exercise.sets.filter((st) => st.type !== 'warmup').length + 1}
          </button>
          {warmups.length > 0 && (
            <button
              onClick={() => onAddWarmup(warmups)}
              aria-label={`Ajouter l'échauffement : ${warmups.map((w) => `${w.reps} × ${w.weight.toLocaleString('fr-FR')} kg`).join(', ')}`}
              className="flex-1 min-h-11 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 transition-all text-xs font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              Échauffement ({warmups.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const EXACT_ALARM_ASKED = 'reps_exact_alarm_asked';
const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
// Types de série (Hevy : W / D / F) ; toucher l'étiquette fait défiler normale → échauffement → dégressive → échec
const SET_TYPE_META: Record<SetType, { short: string; label: string; cls: string }> = {
  warmup: { short: 'É', label: 'échauffement', cls: 'text-amber-700 dark:text-amber-400' },
  drop: { short: 'D', label: 'dégressive', cls: 'text-sky-700 dark:text-sky-400' },
  failure: { short: '!', label: "jusqu'à l'échec", cls: 'text-red-600 dark:text-red-400' },
};
const SET_TYPE_CYCLE: (SetType | undefined)[] = [undefined, 'warmup', 'drop', 'failure'];
const nextSetType = (t: SetType | undefined) => SET_TYPE_CYCLE[(SET_TYPE_CYCLE.indexOf(t) + 1) % SET_TYPE_CYCLE.length];

/** Échange un exercice et le suivant (réordonner, #53) — boutons plutôt que glisser-déposer : accessible. */
function SwapButton({ upper, lower, onSwap }: { upper: string; lower: string; onSwap: () => void }) {
  return (
    <button
      type="button"
      onClick={onSwap}
      aria-label={`Échanger ${upper} et ${lower}`}
      className="min-h-11 px-3 rounded-full border border-dashed border-border text-xs font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
    >
      <ArrowUpDown className="h-3.5 w-3.5" aria-hidden /> Échanger
    </button>
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
  endsAt,
  durationSeconds,
  onDismiss,
  onChangeDuration,
  autoRest,
  onToggleAutoRest,
  forName,
  onAdjust,
}: {
  endsAt: number;
  durationSeconds: number;
  forName?: string;
  onDismiss: () => void;
  onChangeDuration: (v: number) => void;
  autoRest: boolean;
  onToggleAutoRest: () => void;
  onAdjust: (deltaSeconds: number) => void;
}) {
  const haptics = useHaptic();
  const secondsLeft = () => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  const [remaining, setRemaining] = useState(secondsLeft);

  // Décompte calé sur l'heure de fin : juste au retour d'arrière-plan (les timers JS y sont gelés)
  useEffect(() => {
    const tick = () => {
      const left = secondsLeft();
      setRemaining(left);
      if (left > 0) return;
      if (Date.now() - endsAt < 2000) haptics.notification(); // sinon la notification a déjà prévenu
      onDismiss();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- secondsLeft ne dépend que de endsAt
  }, [endsAt, onDismiss, haptics]);

  const pct = durationSeconds > 0 ? Math.min(100, (remaining / durationSeconds) * 100) : 0;

  return (
    <div className="bg-card border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-2xl font-bold tabular-nums">
            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={autoRest}
            onClick={onToggleAutoRest}
            className={cn('min-h-9 px-2.5 rounded-full text-xs font-medium border transition-colors',
              autoRest ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground')}
          >
            Repos auto {autoRest ? '✓' : ''}
          </button>
          <button onClick={onDismiss} className="p-2.5 -m-2.5 rounded-lg text-muted-foreground hover:text-foreground" aria-label="Fermer le minuteur de repos">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={() => onAdjust(-15)} aria-label="Raccourcir le repos de 15 secondes"
          className="min-h-9 px-2.5 rounded-lg bg-muted text-xs font-medium tabular-nums active:scale-95">−15 s</button>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        </div>
        <button type="button" onClick={() => onAdjust(15)} aria-label="Allonger le repos de 15 secondes"
          className="min-h-9 px-2.5 rounded-lg bg-muted text-xs font-medium tabular-nums active:scale-95">+15 s</button>
      </div>

      <div className="flex gap-1">
        {REST_PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onChangeDuration(p.value)}
            className={cn(
              'flex-1 py-2 min-h-9 rounded-lg text-xs font-medium transition-colors active:scale-95',
              durationSeconds === p.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      {forName && <p className="text-xs text-muted-foreground truncate">Durée retenue pour {forName}</p>}
    </div>
  );
}

export default GymSession;
