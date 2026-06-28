import { useState } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { useSessionHistory } from '@/hooks/useSessionHistory';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Activity, Flame, Zap, Dumbbell, Weight, Clock } from 'lucide-react';
import type { Session, GymSession } from '@/firebase/types';

type Tab = 'renforcement' | 'musculation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
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
              <p className="text-sm font-semibold capitalize">{formatDate(date)}</p>
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
              <p className="text-sm font-semibold capitalize">{formatDate(date)}</p>
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
              // Résumé : "4 × 80 kg" ou "4 × bw"
              const firstSet = completedSetsList[0];
              const w = firstSet ? (firstSet.actualWeight ?? firstSet.weight) : 0;
              const setsSummary = completedSetsList.length > 0
                ? `${completedSetsList.length} × ${w > 0 ? `${w} kg` : 'bw'}`
                : `${ex.sets.length} série${ex.sets.length > 1 ? 's' : ''}`;

              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt={ex.name} className="h-full w-full object-cover" />
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
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-xs text-primary font-medium mt-1 hover:underline"
              >
                {expanded
                  ? 'Voir moins'
                  : `+ ${session.exercises.length - 3} exercice${session.exercises.length - 3 > 1 ? 's' : ''}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function History() {
  const [activeTab, setActiveTab] = useState<Tab>('musculation');
  const { sessions, gymSessions, loading } = useSessionHistory(100);
  const { imageMap } = useExerciseImages();

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Historique</h1>
          <p className="text-sm text-muted-foreground mt-1">Toutes tes séances passées.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setActiveTab('musculation')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'musculation'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Dumbbell className="h-4 w-4 text-blue-500" />
            Musculation
            {gymSessions.length > 0 && (
              <span className="text-xs bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded-full font-semibold">
                {gymSessions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('renforcement')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'renforcement'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4 text-orange-500" />
            Renforcement
            {sessions.length > 0 && (
              <span className="text-xs bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded-full font-semibold">
                {sessions.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
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
            </div>
          ) : (
            <div className="space-y-3">
              {gymSessions.map((s) => (
                <MuscuCard key={s.sessionId} session={s} imageMap={imageMap} />
              ))}
            </div>
          )
        ) : (
          sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="bg-orange-500/10 p-4 rounded-full">
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
              <p className="font-semibold">Aucune séance renforcement</p>
              <p className="text-sm text-muted-foreground">Tes séances de renforcement apparaîtront ici.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s) => (
                <RenforcementCard key={s.sessionId} session={s} />
              ))}
            </div>
          )
        )}
      </div>
    </PageLayout>
  );
}

export default History;
