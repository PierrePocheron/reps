import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Activity, Flame, Zap, Dumbbell, Weight, Clock, Trophy } from 'lucide-react';
import type { Session, GymSession } from '@/firebase/types';

type Tab = 'musculation' | 'renforcement' | 'records';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  const s = date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}min`;
  return `${m}min ${s}s`;
}

// ─── Types Records ─────────────────────────────────────────────────────────────

interface PersonalRecord {
  exerciseId: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  bestWeight: number;
  bestReps: number;
  totalSetsCompleted: number;
  bestVolume: number; // poids × reps sur une seule série
  lastPerformed: Date;
}

// ─── Renforcement Card ────────────────────────────────────────────────────────

function RenforcementCard({ session }: { session: Session }) {
  const date = session.date.toDate();
  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-orange-500/70" />
        <div className="flex-1 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{formatDate(date)}</p>
              <p className="text-xs text-muted-foreground">{formatTime(date)}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{formatDuration(session.duration)}</span>
              </div>
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
        </div>
      </div>
    </div>
  );
}

// ─── Musculation Card ─────────────────────────────────────────────────────────

function MuscuCard({ session, imageMap }: { session: GymSession; imageMap: Record<string, string> }) {
  const [expanded, setExpanded] = useState(false);
  const date = session.date.toDate();
  const completedSets = session.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0
  );

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-blue-500/70" />
        <div className="flex-1 p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{formatDate(date)}</p>
              <p className="text-xs text-muted-foreground">{formatTime(date)}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded-lg">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium">{formatDuration(session.duration)}</span>
              </div>
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
              <span className="text-xs text-muted-foreground">séries</span>
            </div>
          </div>

          {/* Exercises summary */}
          <div className="space-y-1.5">
            {(expanded ? session.exercises : session.exercises.slice(0, 3)).map((ex, i) => {
              const completedSetsList = ex.sets.filter((s) => s.completed);
              const imgUrl = imageMap[ex.exerciseId];
              const firstSet = completedSetsList[0];
              const w = firstSet ? (firstSet.actualWeight ?? firstSet.weight) : 0;
              const setsSummary = completedSetsList.length > 0
                ? `${completedSetsList.length} × ${w > 0 ? `${w} kg` : 'poids du corps'}`
                : `${ex.sets.length} série${ex.sets.length > 1 ? 's' : ''}`;

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={ex.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-lg">{ex.emoji}</span>
                    )}
                  </div>
                  <p className="text-sm font-medium flex-1 truncate">{ex.name}</p>
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
        </div>
      </div>
    </div>
  );
}

// ─── PR Card ──────────────────────────────────────────────────────────────────

function PRCard({ pr }: { pr: PersonalRecord }) {
  const oneRepMax = pr.bestWeight > 0
    ? Math.round(pr.bestWeight * (1 + pr.bestReps / 30))
    : null;

  return (
    <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
      <div className="flex items-stretch">
        <div className="w-1.5 bg-yellow-500/70" />
        <div className="flex-1 p-4">
          <div className="flex items-center gap-3">
            {/* Image ou emoji */}
            <div className="h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
              {pr.imageUrl ? (
                <img src={pr.imageUrl} alt={pr.name} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl">{pr.emoji}</span>
              )}
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
                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                    {pr.bestWeight > 0 ? `${pr.bestWeight} kg` : `${pr.bestReps} reps`}
                  </span>
                </div>
                {pr.bestWeight > 0 && (
                  <p className="text-xs text-muted-foreground">× {pr.bestReps} reps</p>
                )}
              </div>
            )}
          </div>

          {/* 1RM estimé */}
          {oneRepMax !== null && oneRepMax > pr.bestWeight && (
            <div className="mt-3 pt-3 border-t flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Max estimé sur 1 rep</p>
              <p className="text-xs font-semibold">~{oneRepMax} kg</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function History() {
  const [activeTab, setActiveTab] = useState<Tab>('musculation');
  const { sessions, gymSessions, loading, error, refetch } = useSessionHistory(100);
  const { imageMap } = useExerciseImages();
  const navigate = useNavigate();
  const { startFreeSession } = useGymSessionStore();

  // Calcul des records personnels depuis l'historique muscu
  const personalRecords = useMemo<PersonalRecord[]>(() => {
    if (gymSessions.length === 0) return [];

    const map = new Map<string, PersonalRecord>();

    for (const session of gymSessions) {
      const sessionDate = session.date.toDate();
      for (const ex of session.exercises) {
        const existing = map.get(ex.exerciseId);
        const pr: PersonalRecord = existing ?? {
          exerciseId: ex.exerciseId,
          name: ex.name,
          emoji: ex.emoji,
          imageUrl: imageMap[ex.exerciseId],
          bestWeight: 0,
          bestReps: 0,
          totalSetsCompleted: 0,
          bestVolume: 0,
          lastPerformed: sessionDate,
        };

        for (const set of ex.sets) {
          if (!set.completed) continue;
          const w = set.actualWeight ?? set.weight;
          const r = set.actualReps ?? set.reps;
          const vol = w * r;

          pr.totalSetsCompleted++;
          if (vol > pr.bestVolume) {
            pr.bestVolume = vol;
            pr.bestWeight = w;
            pr.bestReps = r;
          } else if (w === 0 && pr.bestWeight === 0 && r > pr.bestReps) {
            pr.bestReps = r;
          }
          if (sessionDate > pr.lastPerformed) {
            pr.lastPerformed = sessionDate;
          }
        }

        map.set(ex.exerciseId, pr);
      }
    }

    // Trier par meilleur volume décroissant
    return Array.from(map.values()).sort((a, b) => b.bestVolume - a.bestVolume);
  }, [gymSessions, imageMap]);

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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted ${
              activeTab === 'musculation'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Dumbbell className="h-4 w-4 text-blue-500" />
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted ${
              activeTab === 'renforcement'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4 text-orange-500" />
            Renfo
            {sessions.length > 0 && (
              <span className="text-xs bg-orange-500/10 text-orange-700 dark:text-orange-400 px-1.5 py-0.5 rounded-full font-semibold">
                {sessions.length}
              </span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'records'}
            onClick={() => setActiveTab('records')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-muted ${
              activeTab === 'records'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className="h-4 w-4 text-yellow-500" />
            Records
            {personalRecords.length > 0 && (
              <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded-full font-semibold">
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
        ) : loading ? (
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
            </div>
          ) : (
            <div className="space-y-3">
              {gymSessions.map((s) => (
                <MuscuCard key={s.sessionId} session={s} imageMap={imageMap} />
              ))}
            </div>
          )
        ) : activeTab === 'renforcement' ? (
          sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="bg-orange-500/10 p-4 rounded-full">
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <p className="font-semibold">Aucune séance renforcement</p>
              <p className="text-sm text-muted-foreground">Tes séances de renforcement apparaîtront ici.</p>
              <Button size="sm" className="mt-2 rounded-xl active:scale-95 transition-transform" onClick={() => navigate('/session')}>Démarrer une séance renfo</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <RenforcementCard key={s.sessionId} session={s} />
              ))}
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
                Meilleure série (poids × reps) par exercice sur l'ensemble de tes séances.
              </p>
              {personalRecords.map((pr) => (
                <PRCard key={pr.exerciseId} pr={pr} />
              ))}
            </div>
          )
        )}
      </div>
    </PageLayout>
  );
}

export default History;
