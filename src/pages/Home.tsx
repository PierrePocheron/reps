import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { useSession } from '@/hooks/useSession';
import { Plus, Calendar, Activity, Flame, Trophy, ChevronDown, CheckCircle2 } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';
import { getLastSession } from '@/firebase/firestore';
import { getDayIndex, getChallengeDef } from '@/firebase/challenges';
import type { Session } from '@/firebase/types';
import { useState, useEffect } from 'react';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { useChallenges } from '@/hooks/useChallenges';
import { DEFAULT_MOTIVATIONAL_PHRASES } from '@/utils/constants';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { user, stats } = useUserStore();
  const { isActive, duration } = useSession();
  const { activeChallenges } = useChallenges();

  // Count challenges that are "Up to date" (ahead or equal to calendar day)
  // Actually, if I am late, I am NOT up to date.
  // The count should show "How many are DONE for today".
  // If I am late, I am NOT done.
  // So > getDayIndex is correct.
  const dailyDoneCount = activeChallenges.filter(c =>
    c.history.length > getDayIndex(c.startDate, new Date())
  ).length;

  const [motivationalPhrase] = useState(() => DEFAULT_MOTIVATIONAL_PHRASES[Math.floor(Math.random() * DEFAULT_MOTIVATIONAL_PHRASES.length)]);




  // Fetch Last Session Details
  const [lastSessionDetail, setLastSessionDetail] = useState<Session | null>(null);

  useEffect(() => {
    async function fetchLastSession() {
      if (user?.uid) {
        try {
          const session = await getLastSession(user.uid);
          setLastSessionDetail(session);
        } catch (err) {
            console.error(err);
        }
      }
    }
    fetchLastSession();
  }, [user?.uid, stats?.totalSessions]); // Re-fetch if stats update (e.g. after a new session)

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

  return (
    <div className="bg-background p-4 pb-24">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reps</h1>
          <button
            onClick={() => navigate('/profil')}
            className="relative flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border-none p-0 outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {user && (
              <UserAvatar user={user} size="sm" className="h-9 w-9 border-none" />
            )}
          </button>
        </div>

        {/* Message de bienvenue */}
        <div className="mb-2">
            <h2 className="text-xl font-medium text-muted-foreground">
                Bonjour <span className="text-foreground font-bold">{user?.displayName}</span>
            </h2>
            {motivationalPhrase && (
                <p className="text-sm text-muted-foreground">{motivationalPhrase.text} {motivationalPhrase.emoji}</p>
            )}
        </div>

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
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                        {activeChallenges
                            .filter(c => c.history.length <= getDayIndex(c.startDate, new Date()))
                            .slice(0, 6)
                            .map(challenge => (
                            <ChallengeCard
                                key={challenge.id}
                                userId={user?.uid || ''}
                                activeChallenge={challenge}
                            />
                        ))}
                    </div>

                    {/* Collapsible Done Challenges */}
                    {activeChallenges.some(c => c.history.length > getDayIndex(c.startDate, new Date())) && (
                        <details className="group">
                            <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-2 select-none">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Défis validés aujourd'hui</span>
                                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                {activeChallenges
                                    .filter(c => c.history.length > getDayIndex(c.startDate, new Date()))
                                    .map(challenge => (
                                    <ChallengeCard
                                        key={challenge.id}
                                        userId={user?.uid || ''}
                                        activeChallenge={challenge}
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

        {/* Hero Section - Start/Resume Session */}
        <div className="relative overflow-hidden rounded-2xl p-6 border border-primary/20 bg-primary/5 shadow-sm">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10">
            {isActive ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                  </span>
                  <h2 className="text-lg font-medium text-foreground">Séance en cours</h2>
                </div>

                <div className="flex items-end gap-2 text-foreground">
                  <span className="text-4xl font-bold tracking-tight font-heading">
                    {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="mb-1 text-sm text-muted-foreground">durée</span>
                </div>

                <Button
                  onClick={() => navigate('/session')}
                  size="lg"
                  className="w-full font-semibold shadow-sm"
                >
                  Reprendre la séance
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-foreground font-heading">Prêt à t'entraîner ?</h2>
                  <p className="text-muted-foreground">Chaque rep compte.</p>
                </div>

                <Button
                  onClick={() => navigate('/session')}
                  size="lg"
                  className="w-full font-semibold shadow-sm h-12 text-lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Nouvelle séance
                </Button>
              </div>
            )}
          </div>
        </div>



        {/* Last Session Card */}
        {lastSessionDetail && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold px-1">Dernière activité</h3>
            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="w-2 bg-primary/60" />
                  <div className="flex-1 p-5 space-y-4">
                    {/* Header: Date + Total Reps */}
                    <div className="flex items-center justify-between border-b pb-3 border-border/50">
                      <div className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-sm font-semibold capitalize">
                          {lastSessionDetail.date ? (
                            <>
                              {new Date(lastSessionDetail.date.toDate()).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                              <span className="text-muted-foreground ml-2 font-normal">
                                {new Date(lastSessionDetail.date.toDate()).toLocaleTimeString('fr-FR', {
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
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                          <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-mono font-bold">{lastSessionDetail.totalReps}</span>
                          <span className="text-xs uppercase text-muted-foreground font-medium">reps</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-background/50 px-2 py-1 rounded-md border border-border/50">
                          <Flame className="h-3.5 w-3.5 text-orange-500" />
                          <span className="text-sm font-mono font-bold">{lastSessionDetail.totalCalories || 0}</span>
                          <span className="text-xs uppercase text-muted-foreground font-medium">kcal</span>
                        </div>
                      </div>
                    </div>

                    {/* Exercises Grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {lastSessionDetail.exercises.map((exo, idx) => (
                             <div key={idx} className="flex items-center gap-2 bg-background/40 p-2 rounded-lg border border-border/30">
                                <span className="text-xl">{exo.emoji}</span>
                                <div className="flex flex-col">
                                    <span className="text-xs font-medium line-clamp-1">{exo.name}</span>
                                    <span className="text-xs text-muted-foreground">{exo.reps} reps</span>
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
    </div>
  );
}

export default Home;
