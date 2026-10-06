import { useState, useMemo, useEffect } from 'react';
import { ExerciseImage } from '@/components/ExerciseImage';
import { formatDurationLong, formatNumber, frDate } from '@/utils/formatters';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useSessionStore } from '@/store/sessionStore';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Activity, Flame, Zap, Dumbbell, Weight, Clock, Trophy, RotateCcw, Share2, BookmarkPlus, Trash2, Loader2, MoreVertical, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { EditGymSessionDialog } from '@/components/EditGymSessionDialog';
import { EditRenfoSessionDialog } from '@/components/EditRenfoSessionDialog';
import { renfoCalories } from '@/utils/calories';
import { deleteSession, updateSession, updateUserStatsAfterSession } from '@/firebase/firestore';
import { deleteGymSession, updateGymSession } from '@/firebase/gymSessions';
import { logger } from '@/utils/logger';
import { gymCard, renfoCard, shareSessionCard, type SessionCard } from '@/utils/shareCard';
import type { Session, GymSession } from '@/firebase/types';
import { ExerciseDetailSheet } from '@/components/gym/ExerciseDetailSheet';
import { exerciseHistory, exerciseLog, isWorkSet, markRecords, isTimed, personalRecordsOf, type PersonalRecord } from '@/utils/records';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useUserStore } from '@/store/userStore';
import { createUserTemplate } from '@/firebase/templates';
import { templateFromSession, redoExercises } from '@/utils/progression';
import { useLanguage } from '@/hooks/useLanguage';
import { getLibraryExercise, libraryGifUrl, type LibraryExercise } from '@/utils/exerciseLibrary';

type Tab = 'musculation' | 'renforcement' | 'records';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const s = frDate(date, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}


// ─── Types Records ─────────────────────────────────────────────────────────────


// ─── Renforcement Card ────────────────────────────────────────────────────────

/** Actions d'une carte de l'historique, regroupées comme chez Hevy : modifier (#57), modèle (#48), supprimer (#56). */
function CardMenu({ onEdit, onSaveTemplate, onDelete }: { onEdit?: () => void; onSaveTemplate?: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="Actions de la séance"
          className="h-11 w-11 -my-2 -mr-2 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem className="cursor-pointer min-h-11" onClick={onEdit}>
            <Pencil className="mr-2 h-4 w-4" /> Modifier
          </DropdownMenuItem>
        )}
        {onSaveTemplate && (
          <DropdownMenuItem className="cursor-pointer min-h-11" onClick={onSaveTemplate}>
            <BookmarkPlus className="mr-2 h-4 w-4" /> Enregistrer comme modèle
          </DropdownMenuItem>
        )}
        <DropdownMenuItem className="cursor-pointer min-h-11 text-destructive focus:text-destructive" onClick={onDelete}>
          <Trash2 className="mr-2 h-4 w-4" /> Supprimer
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CardActions({ onRedo, onShare }: { onRedo: () => void; onShare: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="flex-1 basis-28 min-h-11" onClick={onRedo} aria-label="Refaire cette séance">
        <RotateCcw className="h-4 w-4 mr-2" /> Refaire
      </Button>
      <Button variant="outline" className="flex-1 basis-28 min-h-11" onClick={onShare}>
        <Share2 className="h-4 w-4 mr-2" /> Partager
      </Button>
    </div>
  );
}

function RenforcementCard({ session, onRedo, onShare, onDelete, onEdit }: { session: Session; onRedo: () => void; onShare: () => void; onDelete: () => void; onEdit: () => void }) {
  const date = session.date.toDate();
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-orange-500/70" />
        <div className="flex-1 min-w-0 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold">{formatDate(date)}</p>
              <p className="text-xs text-muted-foreground">{formatTime(date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex shrink-0 items-center gap-1 whitespace-nowrap bg-muted px-2 py-1 rounded-lg">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{formatDurationLong(session.duration)}</span>
              </div>
              <CardMenu onEdit={onEdit} onDelete={onDelete} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-orange-500/10 px-2.5 py-1 rounded-lg">
              <Activity className="h-3.5 w-3.5 text-orange-500" />
              <span className="text-sm font-bold">{session.totalReps}</span>
              <span className="text-xs text-muted-foreground">reps</span>
            </div>
            {(session.totalCalories ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-lg">
                <Flame className="h-3.5 w-3.5 text-red-500" />
                <span className="text-sm font-bold">{session.totalCalories}</span>
                <span className="text-xs text-muted-foreground">kcal</span>
              </div>
            )}
          </div>

          {/* Exercises */}
          <div className="grid grid-cols-2 gap-2">
            {session.exercises.map((ex, i) => (
              <div key={i} className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2">
                <span className="text-lg">{ex.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{ex.name}</p>
                  <p className="text-xs text-muted-foreground">{ex.reps} reps</p>
                </div>
              </div>
            ))}
          </div>
          <CardActions onRedo={onRedo} onShare={onShare} />
        </div>
      </div>
    </div>
  );
}

// ─── Musculation Card ─────────────────────────────────────────────────────────

function MuscuCard({ session, imageMap, onRedo, onShare, onSaveTemplate, onDelete, onEdit }: { session: GymSession; imageMap: Record<string, string>; onRedo: () => void; onShare: () => void; onSaveTemplate: () => void; onDelete: () => void; onEdit: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const date = session.date.toDate();
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter(isWorkSet).length, 0
  );

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-blue-500/70" />
        <div className="flex-1 min-w-0 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              {session.title && <p className="text-sm font-bold truncate">{session.title}</p>}
              <p className={session.title ? 'text-xs text-muted-foreground' : 'text-sm font-semibold'}>{formatDate(date)}</p>
              <p className="text-xs text-muted-foreground">{formatTime(date)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex shrink-0 items-center gap-1 whitespace-nowrap bg-muted px-2 py-1 rounded-lg">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{formatDurationLong(session.duration)}</span>
              </div>
              <CardMenu onEdit={onEdit} onSaveTemplate={onSaveTemplate} onDelete={onDelete} />
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-blue-500/10 px-2.5 py-1 rounded-lg">
              <Weight className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-sm font-bold">{session.totalVolume.toLocaleString('fr-FR')}</span>
              <span className="text-xs text-muted-foreground">kg</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted px-2.5 py-1 rounded-lg">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-sm font-bold">{completedSets}</span>
              <span className="text-xs text-muted-foreground">série{completedSets > 1 ? 's' : ''}</span>
            </div>
          </div>

          {session.note && <p className="text-xs italic text-muted-foreground">«&nbsp;{session.note}&nbsp;»</p>}

          {/* Exercises summary */}
          <div className="space-y-1.5">
            {(expanded ? session.exercises : session.exercises.slice(0, 3)).map((ex, i) => {
              const completedSetsList = ex.sets.filter(isWorkSet);
              const imgUrl = imageMap[ex.exerciseId] ?? ex.imageUrl; // library exercises are not in imageMap
              const firstSet = completedSetsList[0];
              const w = firstSet ? (firstSet.actualWeight ?? firstSet.weight) : 0;
              const rpes = completedSetsList.map((st) => st.rpe ?? 0).filter(Boolean);
              const warmups = ex.sets.filter((st) => st.completed && st.type === 'warmup').length;
              const setsSummary = completedSetsList.length === 0
                ? (warmups ? `${warmups} échauff.` : 'aucune série validée') // planned sets are kept for « Refaire » but were not done
                : `${completedSetsList.length} × ${isTimed(ex) ? `${firstSet!.actualReps ?? firstSet!.reps} s` : w > 0 ? `${formatNumber(w)} kg` : 'poids du corps'}`
                  + (rpes.length ? ` · RPE ${formatNumber(Math.max(...rpes))}` : '')
                  + (warmups ? ` · ${warmups} échauff.` : '');

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    <ExerciseImage src={imgUrl} alt={ex.name} emoji={ex.emoji} emojiClassName="text-lg" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ex.supersetId && <span className="text-primary" aria-label="Superset">🔗 </span>}{ex.name}</p>
                    {ex.note && <p className="text-xs italic text-muted-foreground truncate">«&nbsp;{ex.note}&nbsp;»</p>}
                  </div>
                  <p className="text-xs text-muted-foreground flex-shrink-0">{setsSummary}</p>
                </div>
              );
            })}

            {session.exercises.length > 3 && (
              <div>
                <button
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="inline-flex items-center min-h-[44px] -my-2.5 px-1 -mx-1 text-xs text-primary font-medium hover:underline active:opacity-70 transition-opacity"
                >
                  {expanded
                    ? 'Voir moins'
                    : `+ ${session.exercises.length - 3} exercice${session.exercises.length - 3 > 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
          <CardActions onRedo={onRedo} onShare={onShare} />
        </div>
      </div>
    </div>
  );
}

// ─── PR Card ──────────────────────────────────────────────────────────────────

function PRCard({ pr, onOpen }: { pr: PersonalRecord; onOpen: () => void }) {
  const oneRepMax = !pr.timed && pr.bestE1RM > 0 ? Math.round(pr.bestE1RM) : null; // best of all sets, like trophies and the chart

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${pr.name} : voir ta progression`}
      className="w-full text-left rounded-2xl border bg-card overflow-hidden shadow-sm transition-colors hover:bg-muted/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-stretch">
        <div className="w-1.5 bg-yellow-500/70" />
        <div className="flex-1 min-w-0 p-4">
          <div className="flex items-center gap-3">
            {/* Image ou emoji */}
            <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
              <ExerciseImage src={pr.imageUrl} alt={pr.name} emoji={pr.emoji} />
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{pr.name}</p>
              <p className="text-xs text-muted-foreground">
                {pr.totalSetsCompleted} série{pr.totalSetsCompleted > 1 ? 's' : ''} au total
              </p>
            </div>

            {/* Badge PR */}
            {(pr.bestWeight > 0 || pr.bestReps > 0) && (
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-1 bg-yellow-500/10 px-2.5 py-1 rounded-lg">
                  <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                    {pr.timed ? `${pr.bestReps} s` : pr.bestWeight > 0 ? `${formatNumber(pr.bestWeight)} kg` : `${pr.bestReps} reps`}
                  </span>
                </div>
                {!pr.timed && pr.bestWeight > 0 && (
                  <p className="text-xs text-muted-foreground">× {pr.bestReps} reps</p>
                )}
              </div>
            )}
          </div>

          {/* 1RM estimé */}
          {oneRepMax !== null && oneRepMax > pr.bestWeight && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Max estimé sur 1 rep</p>
              <p className="text-xs font-semibold">~{formatNumber(oneRepMax)} kg</p>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/** The list stays in place while the next page loads. */
function LoadOlder({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <Button variant="outline" className="w-full min-h-11 rounded-xl" disabled={loading} onClick={onClick}>
      {loading ? <LoadingSpinner size="sm" /> : 'Voir les séances plus anciennes'}
    </Button>
  );
}

// ponytail: « load more » raises the limit and re-reads from the top (simple); cursor pages if reads cost matters
const PAGE = 100;

function History() {
  const [activeTab, setActiveTab] = useState<Tab>('musculation');
  const [limit, setLimit] = useState(PAGE); // past the latest 100 sessions, older ones were unreachable (#71)
  const history = useSessionHistory(limit);
  const { loading, error, refetch } = history;
  // Séances supprimées (#56) : retirées tout de suite, sans recharger la liste (pas de clignotement)
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [renfoEdits, setRenfoEdits] = useState<Record<string, Pick<Session, 'exercises' | 'totalReps' | 'totalCalories'>>>({});
  const sessions = useMemo(() => history.sessions
    .filter((s) => !deletedIds.includes(s.sessionId))
    .map((s) => (renfoEdits[s.sessionId] ? { ...s, ...renfoEdits[s.sessionId] } : s)), [history.sessions, deletedIds, renfoEdits]);
  const [toEditRenfo, setToEditRenfo] = useState<Session | null>(null);
  // Séances modifiées (#57) : appliquées tout de suite, sans recharger
  const [edits, setEdits] = useState<Record<string, Pick<GymSession, 'exercises' | 'totalVolume' | 'totalSets'>>>({});
  const gymSessions = useMemo(() => history.gymSessions
    .filter((s) => !deletedIds.includes(s.sessionId))
    .map((s) => (edits[s.sessionId] ? { ...s, ...edits[s.sessionId] } : s)), [history.gymSessions, deletedIds, edits]);
  const [toEdit, setToEdit] = useState<GymSession | null>(null);
  // Filtre par exercice (#63, Strong) : exercices de l'historique, du plus fréquent au plus rare
  const [exerciseFilter, setExerciseFilter] = useState('');
  const exerciseOptions = useMemo(() => {
    const seen = new Map<string, { name: string; count: number }>();
    for (const s of gymSessions) for (const ex of s.exercises) {
      const o = seen.get(ex.exerciseId) ?? { name: ex.name, count: 0 };
      o.count++;
      seen.set(ex.exerciseId, o);
    }
    return [...seen].sort((a, b) => b[1].count - a[1].count);
  }, [gymSessions]);
  // a filtered exercise whose last session was deleted or edited away no longer filters (blank list otherwise)
  const filter = exerciseOptions.some(([id]) => id === exerciseFilter) ? exerciseFilter : '';
  const shownGymSessions = filter ? gymSessions.filter((s) => s.exercises.some((ex) => ex.exerciseId === filter)) : gymSessions;
  const { imageMap, infoMap } = useExerciseImages();
  const navigate = useNavigate();
  const [detailPr, setDetailPr] = useState<PersonalRecord | null>(null);
  const lang = useLanguage();
  const [libDetail, setLibDetail] = useState<LibraryExercise | null>(null);
  // library exercises are not in infoMap: their how-to comes from the library, as in a live session
  useEffect(() => {
    let cancelled = false;
    setLibDetail(null);
    if (detailPr) {
      getLibraryExercise(detailPr.exerciseId, lang)
        .then((d) => { if (!cancelled) setLibDetail(d); })
        .catch(() => {}); // offline: the sheet shows without the how-to
    }
    return () => { cancelled = true; };
  }, [detailPr, lang]);
  const { phase: gymPhase, startFreeSession, loadGymTemplate, startExecution } = useGymSessionStore();
  const { isActive: renfoActive, loadExercises } = useSessionStore();
  const { toast } = useToast();
  const user = useUserStore((st) => st.user);
  const refreshStats = useUserStore((st) => st.refreshStats);
  // Suppression d'une séance (#56) : confirmation, puis stats, série et totaux recalculés
  const [toDelete, setToDelete] = useState<{ kind: 'gym' | 'renfo'; id: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const saveEdit = async (exercises: GymSession['exercises']) => {
    if (!toEdit || !user) return;
    try {
      // Trophées recalculés par rapport aux séances précédentes, comme en direct
      const older = gymSessions.filter((s) => s.date.toMillis() < toEdit.date.toMillis());
      const fields = await updateGymSession(user.uid, toEdit.sessionId, markRecords(exercises, older));
      setEdits((e) => ({ ...e, [toEdit.sessionId]: fields }));
      setToEdit(null);
      toast({ title: 'Séance modifiée' });
    } catch (err) {
      logger.error('Modification de séance :', err);
      toast({ title: 'Erreur', description: 'Impossible de modifier la séance', variant: 'destructive' });
    }
  };
  const saveRenfoEdit = async (exercises: Session['exercises']) => {
    if (!toEditRenfo || !user) return;
    try {
      const fields = await updateSession(user.uid, toEditRenfo.sessionId, exercises, renfoCalories(user, exercises));
      setRenfoEdits((e) => ({ ...e, [toEditRenfo.sessionId]: fields }));
      setToEditRenfo(null);
      toast({ title: 'Séance modifiée' });
      await updateUserStatsAfterSession(user.uid, 0); // le total de reps du profil change
      await refreshStats();
    } catch (err) {
      logger.error('Modification de séance renfo :', err);
      toast({ title: 'Erreur', description: 'Impossible de modifier la séance', variant: 'destructive' });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete || !user) return;
    setDeleting(true);
    try {
      await (toDelete.kind === 'gym' ? deleteGymSession : deleteSession)(user.uid, toDelete.id);
      setDeletedIds((ids) => [...ids, toDelete.id]);
      setToDelete(null);
      toast({ title: 'Séance supprimée' });
      await updateUserStatsAfterSession(user.uid, 0);
      await refreshStats();
    } catch (err) {
      logger.error('Suppression de séance :', err);
      toast({ title: 'Erreur', description: 'Impossible de supprimer la séance', variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };
  const [saveAsTemplate, setSaveAsTemplate] = useState<GymSession | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false); // a second tap while offline made a duplicate
  const saveTemplate = async () => {
    if (!user || !saveAsTemplate || !templateName.trim() || savingTemplate) return;
    setSavingTemplate(true);
    try {
      await createUserTemplate(user.uid, templateFromSession(saveAsTemplate, templateName));
      toast({ title: 'Modèle enregistré', description: `« ${templateName.trim()} » est dans tes modèles.` });
      setSaveAsTemplate(null);
    } catch {
      toast({ title: 'Erreur', description: "Le modèle n'a pas pu être enregistré.", variant: 'destructive' });
    } finally {
      setSavingTemplate(false);
    }
  };

  // « Refaire » (Hevy / Strong) : mêmes exercices, séries et charges réalisées, prêtes à valider
  const sessionInProgress = () => {
    if (!renfoActive && gymPhase === 'idle') return false;
    toast({ title: 'Séance en cours', description: "Termine ta séance en cours avant d'en démarrer une nouvelle.", variant: 'destructive' });
    return true;
  };
  const redoGym = (s: GymSession) => {
    if (sessionInProgress()) return;
    loadGymTemplate(redoExercises(s), s.title);
    startExecution();
    navigate('/gym');
  };
  const share = (card: SessionCard) => {
    shareSessionCard(card).catch(() => toast({ title: 'Partage impossible', description: "L'image n'a pas pu être créée.", variant: 'destructive' }));
  };
  const redoRenfo = (s: Session) => {
    if (sessionInProgress()) return;
    loadExercises(s.exercises);
    navigate('/session');
  };

  // Calcul des records personnels depuis l'historique muscu
  const personalRecords = useMemo(() => personalRecordsOf(gymSessions, imageMap), [gymSessions, imageMap]);

  return (
    <PageLayout title="HISTORIQUE" backButton>
      <div className="max-w-2xl mx-auto space-y-6">
        <p className="text-sm text-muted-foreground -mt-2">Toutes tes séances passées.</p>

        {/* Tabs */}
        <div role="tablist" aria-label="Type d'historique" className="flex gap-1 p-1 bg-muted rounded-xl">
          <button
            role="tab"
            aria-selected={activeTab === 'musculation'}
            onClick={() => setActiveTab('musculation')}
            className={`flex-auto min-w-0 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted ${
              activeTab === 'musculation'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Dumbbell className="h-4 w-4 text-blue-500 max-[359px]:hidden" />
            Muscu
            {gymSessions.length > 0 && (
              <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full font-semibold">
                {gymSessions.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'renforcement'}
            onClick={() => setActiveTab('renforcement')}
            className={`flex-auto min-w-0 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted ${
              activeTab === 'renforcement'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4 text-orange-500 max-[359px]:hidden" />
            Renfo
            {sessions.length > 0 && (
              <span className="text-xs bg-orange-500/10 text-orange-800 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-semibold">
                {sessions.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
            className={`flex-auto min-w-0 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0.5 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted ${
              activeTab === 'records'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="h-4 w-4 text-yellow-500 max-[359px]:hidden" />
            Records
            {personalRecords.length > 0 && (
              <span className="text-xs bg-yellow-500/10 text-yellow-800 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-semibold">
                {personalRecords.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
            <p className="font-semibold">Impossible de charger ton historique</p>
            <p className="text-sm text-muted-foreground">Vérifie ta connexion puis réessaie.</p>
            <Button variant="outline" size="sm" className="rounded-xl" onClick={refetch}>Réessayer</Button>
          </div>
        ) : loading && history.sessions.length === 0 && history.gymSessions.length === 0 ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : activeTab === 'musculation' ? (
          gymSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="bg-blue-500/10 p-4 rounded-full">
                <Dumbbell className="h-8 w-8 text-blue-500" />
              </div>
              <p className="font-semibold">Aucune séance muscu</p>
              <p className="text-sm text-muted-foreground">Tes séances de musculation apparaîtront ici.</p>
              <Button size="sm" className="mt-2 rounded-xl active:scale-95 transition-transform" onClick={() => { startFreeSession(); navigate('/gym'); }}>Démarrer une séance muscu</Button>
              {/* Nouvel arrivant (#61) : reprendre son historique d'une autre appli */}
              <button type="button" onClick={() => navigate('/settings#import')} className="min-h-11 px-2 text-xs font-medium text-primary hover:underline">
                Tu viens de Strong ou Hevy ? Importer ton historique
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {exerciseOptions.length > 1 && (
                <select
                  value={filter}
                  onChange={(e) => setExerciseFilter(e.target.value)}
                  aria-label="Filtrer les séances par exercice"
                  className="w-full min-h-11 rounded-xl border bg-card px-3 text-sm"
                >
                  <option value="">Tous les exercices ({gymSessions.length} séances)</option>
                  {exerciseOptions.map(([id, o]) => (
                    <option key={id} value={id}>{o.name} ({o.count})</option>
                  ))}
                </select>
              )}
              {shownGymSessions.map((s) => (
                <MuscuCard key={s.sessionId} session={s} imageMap={imageMap} onRedo={() => redoGym(s)}
                  onSaveTemplate={() => { setSaveAsTemplate(s); setTemplateName(`Séance du ${frDate(s.date.toDate(), { day: 'numeric', month: 'long' })}`); }}
                  onShare={() => share(gymCard({ date: s.date.toDate(), duration: s.duration, exercises: s.exercises, title: s.title }))}
                  onDelete={() => setToDelete({ kind: 'gym', id: s.sessionId })}
                  onEdit={() => setToEdit(s)} />
              ))}
              {history.gymSessions.length >= limit && <LoadOlder loading={loading} onClick={() => setLimit((l) => l + PAGE)} />}
            </div>
          )
        ) : activeTab === 'renforcement' ? (
          sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="bg-orange-500/10 p-4 rounded-full">
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <p className="font-semibold">Aucune séance renfo</p>
              <p className="text-sm text-muted-foreground">Tes séances de renforcement apparaîtront ici.</p>
              <Button size="sm" className="mt-2 rounded-xl active:scale-95 transition-transform" onClick={() => navigate('/session')}>Démarrer une séance renfo</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <RenforcementCard key={s.sessionId} session={s} onRedo={() => redoRenfo(s)}
                  onShare={() => share(renfoCard({ ...s, date: s.date.toDate() }))}
                  onDelete={() => setToDelete({ kind: 'renfo', id: s.sessionId })}
                  onEdit={() => setToEditRenfo(s)} />
              ))}
              {history.sessions.length >= limit && <LoadOlder loading={loading} onClick={() => setLimit((l) => l + PAGE)} />}
            </div>
          )
        ) : (
          personalRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="bg-yellow-500/10 p-4 rounded-full">
                <Trophy className="h-8 w-8 text-yellow-500" />
              </div>
              <p className="font-semibold">Aucun record encore</p>
              <p className="text-sm text-muted-foreground">
                Tes records personnels muscu apparaîtront ici après ta première séance.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground px-1">
                Meilleure série (poids × reps) par exercice sur l'ensemble de tes séances. Touche un exercice pour voir ta courbe.
              </p>
              {personalRecords.map((pr) => (
                <PRCard key={pr.exerciseId} pr={pr} onOpen={() => setDetailPr(pr)} />
              ))}
            </div>
          )
        )}
      </div>
      {detailPr && (
        <ExerciseDetailSheet
          exerciseId={detailPr.exerciseId}
          name={detailPr.name}
          emoji={detailPr.emoji}
          imageUrl={infoMap[detailPr.exerciseId]?.gifUrl ?? (libDetail ? libraryGifUrl(libDetail) : null) ?? detailPr.imageUrl ?? null}
          description={infoMap[detailPr.exerciseId]?.description ?? null}
          steps={infoMap[detailPr.exerciseId]?.steps ?? libDetail?.steps}
          target={infoMap[detailPr.exerciseId]?.target ?? libDetail?.target}
          secondaryMuscles={infoMap[detailPr.exerciseId]?.secondaryMuscles ?? libDetail?.secondaryMuscles}
          history={exerciseHistory(gymSessions, detailPr.exerciseId)}
          log={exerciseLog(gymSessions, detailPr.exerciseId)}
          timed={detailPr.timed}
          onClose={() => setDetailPr(null)}
        />
      )}
      <Dialog open={!!saveAsTemplate} onOpenChange={(open) => !open && setSaveAsTemplate(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Enregistrer comme modèle</DialogTitle>
            <DialogDescription>Les séries réalisées (hors échauffement) deviennent un modèle réutilisable.</DialogDescription>
          </DialogHeader>
          <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} maxLength={40} aria-label="Nom du modèle" />
          <Button className="w-full min-h-11" onClick={saveTemplate} disabled={savingTemplate || !templateName.trim()}>
            {savingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
          </Button>
        </DialogContent>
      </Dialog>
      {toEdit && <EditGymSessionDialog session={toEdit} onCancel={() => setToEdit(null)} onSave={saveEdit} />}
      {toEditRenfo && <EditRenfoSessionDialog session={toEditRenfo} onCancel={() => setToEditRenfo(null)} onSave={saveRenfoEdit} />}
      <Dialog open={!!toDelete} onOpenChange={(open) => !open && !deleting && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer cette séance ?</DialogTitle>
            <DialogDescription>Elle disparaît de ton historique, de tes stats et du classement. C'est définitif.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1 basis-28 min-h-11" onClick={() => setToDelete(null)} disabled={deleting}>Annuler</Button>
            <Button variant="destructive" className="flex-1 basis-28 min-h-11" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Supprimer'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}

export default History;
