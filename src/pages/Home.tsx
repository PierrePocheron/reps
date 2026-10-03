import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { useSession } from '@/hooks/useSession';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { SessionTypePicker } from '@/components/SessionTypePicker';
import { Plus, Calendar, Activity, Flame, Trophy, ChevronDown, CheckCircle2, Dumbbell, Weight } from 'lucide-react';

import { getLastSession } from '@/firebase/firestore';
import { getUserGymSessions } from '@/firebase/gymSessions';
import { getDayIndex } from '@/firebase/challenges';
import type { Session, GymSession } from '@/firebase/types';
import { useState, useEffect } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { useChallenges } from '@/hooks/useChallenges';
import { DEFAULT_MOTIVATIONAL_PHRASES } from '@/utils/constants';
import { logger } from '@/utils/logger';
import { isWorkSet } from '@/utils/records';
import { KudosBanner } from '@/components/Kudos';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { user, stats } = useUserStore();
  const { isActive, duration } = useSession();
  const { phase: gymPhase, startTime: gymStartTime, exercises: gymExercises, getTotalSets, getCompletedSets } = useGymSessionStore();
  const { activeChallenges, refreshChallenges } = useChallenges();
  const [sessionRefreshTrigger, setSessionRefreshTrigger] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [gymDuration, setGymDuration] = useState(0);

  // Timer gym — calculé depuis startTime (indépendant du montage de GymSession)
  useEffect(() => {
    if (gymPhase !== 'execute' || !gymStartTime) { setGymDuration(0); return; }
    const tick = () => setGymDuration(Math.floor((Date.now() - gymStartTime) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [gymPhase, gymStartTime]);

  const handleChallengeUpdate = () => {
      refreshChallenges();
      // Small delay to ensure Firestore is consistent if needed, but usually immediate is fine locally.
      // Firestore listeners update automatically for activeChallenges, but LastSession is a fetch.
      setSessionRefreshTrigger(prev => prev + 1);
  };

  // Count challenges that are "Up to date" (ahead or equal to calendar day)
  // Actually, if I am late, I am NOT up to date.
  // The count should show "How many are DONE for today".
  // If I am late, I am NOT done.
  // So > getDayIndex is correct.
  const todayIndex = (c: (typeof activeChallenges)[number]) => getDayIndex(c.startDate, new Date());
  const todoChallenges = activeChallenges.filter((c) => c.history.length <= todayIndex(c));
  const doneChallenges = activeChallenges.filter((c) => c.history.length > todayIndex(c));
  const dailyDoneCount = doneChallenges.length;



  const [motivationalPhrase] = useState(() => DEFAULT_MOTIVATIONAL_PHRASES[Math.floor(Math.random() * DEFAULT_MOTIVATIONAL_PHRASES.length)]);




  // Fetch Last Session Details
  // Dernière séance de chaque mode : on affiche la plus récente des deux
  const [lastSessionDetail, setLastSessionDetail] = useState<Session | null>(null);
  const [lastGymSession, setLastGymSession] = useState<GymSession | null>(null);

  useEffect(() => {
    async function fetchLastSession() {
      if (user?.uid) {
        try {
          const [session, gym] = await Promise.all([
            getLastSession(user.uid),
            getUserGymSessions(user.uid, 1).catch(() => [] as GymSession[]),
          ]);
          setLastSessionDetail(session);
          setLastGymSession(gym[0] ?? null);
        } catch (err) {
            logger.error('Fetch last session failed', err as Error);
        }
      }
    }
    fetchLastSession();
  }, [user?.uid, stats?.totalSessions, sessionRefreshTrigger]); // Re-fetch on signal

  const showGym = !!lastGymSession && (!lastSessionDetail || lastGymSession.date.toMillis() > lastSessionDetail.date.toMillis());
  const lastActivity = showGym && lastGymSession
    ? {
        date: lastGymSession.date,
        chips: [
          { icon: Weight, className: 'text-muted-foreground', value: Math.round(lastGymSession.totalVolume).toLocaleString('fr-FR'), unit: 'kg' },
          { icon: Dumbbell, className: 'text-primary', value: String(lastGymSession.totalSets), unit: lastGymSession.totalSets > 1 ? 'séries' : 'série' },
        ],
        items: lastGymSession.exercises.map((ex) => {
          const done = ex.sets.filter(isWorkSet).length;
          return { key: ex.exerciseId, emoji: ex.emoji, name: ex.name, detail: `${done} série${done > 1 ? 's' : ''}` };
        }),
      }
    : lastSessionDetail && {
        date: lastSessionDetail.date,
        chips: [
          { icon: Activity, className: 'text-muted-foreground', value: String(lastSessionDetail.totalReps), unit: 'reps' },
          { icon: Flame, className: 'text-orange-500', value: String(lastSessionDetail.totalCalories || 0), unit: 'kcal' },
        ],
        items: lastSessionDetail.exercises.map((ex) => ({ key: ex.name, emoji: ex.emoji, name: ex.name, detail: `${ex.reps} reps` })),
      };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  // ... (Not authenticated check remains same) ...
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <h1 className="mb-4 text-4xl font-bold">🏋️ Reps</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Suivez vos entraînements de musculation au poids du corps
        </p>
        <Button onClick={() => navigate('/profil')} size="lg">
          Se connecter
        </Button>
      </div>
    );
  }

  const hasActiveSession = isActive || gymPhase !== 'idle';

  const sessionLabel = gymPhase === 'plan'
    ? `Planification · ${gymExercises.length} exo`
    : gymPhase === 'execute'
    ? `${getCompletedSets()}/${getTotalSets()} séries`
    : isActive
    ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
    : '';

  const sessionTimer = gymPhase === 'execute'
    ? `${Math.floor(gymDuration / 60)}:${(gymDuration % 60).toString().padStart(2, '0')}`
    : isActive
    ? `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`
    : '';

  return (
    <PageLayout isHome>
      <div className="mx-auto max-w-2xl space-y-8">

        {/* Bandeau séance en cours — tout en haut */}
        {hasActiveSession && (
          <button
            onClick={() => navigate(gymPhase !== 'idle' ? '/gym' : '/session')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl bg-primary/10 border border-primary/30 hover:bg-primary/15 active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="relative flex h-3 w-3 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
            </span>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm font-semibold text-foreground">Séance en cours</p>
              <p className="text-xs text-muted-foreground truncate">{sessionLabel}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-lg font-bold font-heading text-primary tabular-nums">{sessionTimer}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground -rotate-90" />
            </div>
          </button>
        )}

        {/* Message de bienvenue */}
        <div className="mb-2">
            <h2 className="text-xl font-medium text-muted-foreground">
                Bonjour <span className="text-foreground font-bold">{user?.firstName || user?.displayName}</span>
            </h2>
            {motivationalPhrase && (
                <p className="text-sm text-muted-foreground">{motivationalPhrase.text} {motivationalPhrase.emoji}</p>
            )}
        </div>

        <KudosBanner />

        {/* CTA nouvelle séance */}
        {!hasActiveSession && (
          <div className="relative overflow-hidden rounded-2xl p-6 border border-primary/20 bg-primary/5 shadow-sm">
            <div className="absolute top-0 right-0 -mt-20 -mr-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground font-heading">Prêt à t'entraîner ?</h2>
                <p className="text-muted-foreground">Chaque rep compte.</p>
              </div>
              <Button
                onClick={() => setShowPicker(true)}
                size="lg"
                className="w-full font-semibold shadow-sm h-12 text-lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Nouvelle séance
              </Button>
            </div>
          </div>
        )}

        {/* Section Challenge */}
        <div>
            {activeChallenges.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                         <h2 className="text-lg font-semibold flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Défis en cours <span className="text-muted-foreground text-sm font-normal">({dailyDoneCount}/{activeChallenges.length})</span>
                        </h2>
                        {activeChallenges.length > 6 && (
                             <Button variant="ghost" size="sm" onClick={() => navigate('/challenges')} className="text-xs h-8">
                                Voir tout ({activeChallenges.length})
                            </Button>
                        )}
                    </div>

                    {/* Todo Challenges */}
                    <div className={`grid gap-3 sm:gap-4 ${todoChallenges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {todoChallenges
                            .slice(0, 6)
                            .map(challenge => (
                            <ChallengeCard
                                key={challenge.id}
                                userId={user?.uid || ''}
                                activeChallenge={challenge}
                                onUpdate={handleChallengeUpdate}
                            />
                        ))}
                    </div>

                    {/* Collapsible Done Challenges */}
                    {doneChallenges.length > 0 && (
                        <details className="group">
                            <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-2 select-none">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Défis validés aujourd'hui</span>
                                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className={`grid gap-3 sm:gap-4 mt-3 animate-in slide-in-from-top-2 fade-in duration-200 ${doneChallenges.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                {doneChallenges
                                    .map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        userId={user?.uid || ''}
                                        activeChallenge={challenge}
                                        onUpdate={handleChallengeUpdate}
                                    />
                                ))}
                            </div>
                        </details>
                    )}
                </div>
            ) : (
                <ChallengeCard userId={user?.uid || ''} />
            )}
        </div>

        {/* Last Session Card */}
        {lastActivity && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Dernière activité</h2>
            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="w-2 bg-primary/60" />
                  <div className="flex-1 p-5 space-y-4">
                    {/* Header: Date + Total Reps */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-border/50">
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="inline-block text-sm font-semibold first-letter:uppercase">
                          {lastActivity.date ? (
                            <>
                              {new Date(lastActivity.date.toDate()).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                              <span className="text-muted-foreground ml-2 font-normal">
                                {new Date(lastActivity.date.toDate()).toLocaleTimeString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </>
                          ) : (
                            'Date inconnue'
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {lastActivity.chips.map(({ icon: Icon, className, value, unit }) => (
                          <div key={unit} className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                            <Icon className={`h-3.5 w-3.5 ${className}`} />
                            <span className="text-sm font-mono font-bold">{value}</span>
                            <span className="text-xs uppercase text-muted-foreground font-medium">{unit}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Exercises Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {lastActivity.items.map((item) => (
                             <div key={item.key} className="flex items-center gap-2 bg-background/40 p-2 rounded-lg border border-border/30 min-w-0">
                                <span className="text-xl">{item.emoji}</span>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-medium line-clamp-1">{item.name}</span>
                                    <span className="text-xs text-muted-foreground">{item.detail}</span>
                                </div>
                             </div>
                        ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <SessionTypePicker open={showPicker} onClose={() => setShowPicker(false)} />
    </PageLayout>
  );
}

export default Home;
