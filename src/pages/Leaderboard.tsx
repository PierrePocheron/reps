import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { useUserStore } from '@/store/userStore';
import { useHaptic } from '@/hooks/useHaptic';
import { useToast } from '@/hooks/use-toast';
import { getLeaderboardStats, getFriendsDetails } from '@/firebase/firestore';
import { Trophy, Medal, Calendar, TrendingUp, UserPlus } from 'lucide-react';
import { User } from '@/firebase/types';
import { UserAvatar } from '@/components/UserAvatar';
import { logger } from '@/utils/logger';
import { AdSpace } from '@/components/AdSpace';
import { ADS_CONFIG } from '@/config/ads';

export default function Leaderboard() {
  const { user } = useUserStore();
  const navigate = useNavigate();
  const haptics = useHaptic();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('all_time');
  const [stats, setStats] = useState<{ userId: string; totalReps: number; totalSessions: number; totalCalories: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [friendsDetails, setFriendsDetails] = useState<User[]>([]);

  useEffect(() => {
    if (!user) return;
    // a slower request of the previous tab must not overwrite this one (stats, loading flag, error toast)
    let cancelled = false;

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const friendIds = user.friends || [];
        // Inclure l'utilisateur courant
        const allIds = [...friendIds, user.uid];

        if (activeTab === 'all_time') {
          // Pour "Toujours", on utilise les données du profil utilisateur directement
          // On doit récupérer les détails des amis pour avoir leur totalReps à jour
          const details = await getFriendsDetails(friendIds);
          if (cancelled) return;
          setFriendsDetails(details);

          const leaderboardData = [
            ...details,
            user
          ].map(u => ({
            userId: u.uid,
            totalReps: u.totalReps || 0,
            totalSessions: u.totalSessions || 0,
            totalCalories: u.totalCalories || 0
          }));

          leaderboardData.sort((a, b) => b.totalReps - a.totalReps);
          setStats(leaderboardData);
        } else {
          // Pour les autres périodes, on calcule via les sessions ; détails relus à chaque fois (ami ajouté entre-temps)
          const [details, periodStats] = await Promise.all([
            getFriendsDetails(friendIds),
            getLeaderboardStats(allIds, activeTab as 'daily' | 'weekly' | 'monthly'),
          ]);
          if (cancelled) return;
          setFriendsDetails(details);
          // only players that can be shown: a friend with no profile (deleted account) took a rank while hidden
          const known = new Set([...details.map((d) => d.uid), user.uid]);
          setStats(periodStats.filter((s) => known.has(s.userId)).sort((a, b) => b.totalReps - a.totalReps));
        }
      } catch (error) {
        if (cancelled) return;
        logger.error('Erreur chargement classement:', error);
        setStats([]);
        toast({ title: 'Classement indisponible', description: 'Impossible de charger le classement. Vérifie ta connexion et réessaie.', variant: 'destructive' });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchStats();
    return () => { cancelled = true; };
  }, [user, activeTab, toast]);

  const getUserDetails = (userId: string) => {
    if (user?.uid === userId) return user;
    return friendsDetails.find(f => f.uid === userId);
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-300";
      case 1: return "bg-gray-400/10 border-gray-400/50 text-gray-700 dark:text-gray-200";
      case 2: return "bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-300";
      default: return "bg-card/50 border-transparent";
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 1: return <Medal className="h-6 w-6 text-gray-400" />;
      case 2: return <Medal className="h-6 w-6 text-orange-500" />;
      default: return <span className="font-bold text-muted-foreground w-6 text-center">{index + 1}</span>;
    }
  };

  if (!user) return null;
  const hasFriends = (user.friends?.length ?? 0) > 0;

  return (
    <PageLayout title="CLASSEMENT">
      <div className="max-w-2xl mx-auto space-y-6">

        <Tabs value={activeTab} onValueChange={(v) => { haptics.selection(); setActiveTab(v); }} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6 h-12">
            <TabsTrigger value="daily" className="text-xs h-10">Jour</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs h-10">Semaine</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs h-10">Mois</TabsTrigger>
            <TabsTrigger value="all_time" className="text-xs h-10">Total</TabsTrigger>
          </TabsList>

          <div className="space-y-4 animate-in fade-in-50">
            <div className="mb-2">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {activeTab === 'daily' && <Calendar className="h-5 w-5 text-primary" />}
                {activeTab === 'weekly' && <TrendingUp className="h-5 w-5 text-primary" />}
                {activeTab === 'monthly' && <Calendar className="h-5 w-5 text-primary" />}
                {activeTab === 'all_time' && <Trophy className="h-5 w-5 text-yellow-500" />}

                {activeTab === 'daily' && "Top du jour"}
                {activeTab === 'weekly' && "Top Semaine"}
                {activeTab === 'monthly' && "Top Mois"}
                {activeTab === 'all_time' && "Légendes"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'daily' && "Qui est le plus chaud aujourd'hui ?"}
                {activeTab === 'weekly' && "Classement de la semaine en cours"}
                {activeTab === 'monthly' && "Classement du mois en cours"}
                {activeTab === 'all_time' && "Classement général depuis le début"}
              </p>
            </div>

            {isLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : (
              <>
              {!hasFriends && (
                <EmptyState
                  icon="👥"
                  title="Personne à défier pour l'instant"
                  description="Ajoute des amis pour te mesurer à eux et voir qui est le plus chaud."
                  action={<Button onClick={() => navigate('/friends')}><UserPlus className="h-4 w-4 mr-2" />Ajouter des amis</Button>}
                />
              )}
              {hasFriends && stats.length > 0 && stats.every(s => s.totalReps === 0) && (
                <p className="text-center text-sm text-muted-foreground">Personne n'a encore bougé sur cette période. Sois le premier&nbsp;!</p>
              )}
              {hasFriends && <div className="space-y-3">
                {stats.map((stat, index) => {
                  const player = getUserDetails(stat.userId);
                  if (!player) return null;

                  const onPodium = stat.totalReps > 0;
                  // equal totals share a rank: the order of two friends at 30 (or at 0) came from the fetch order
                  const rank = stats.findIndex((s) => s.totalReps === stat.totalReps);

                  return (
                    <div key={stat.userId}>
                        <Card className={`overflow-hidden border-2 shadow-sm transition-all ${getRankStyle(onPodium ? rank : -1)}`}>
                        <CardContent className="p-3 min-[360px]:p-4 flex items-center gap-3 min-[360px]:gap-4">
                            <div className="flex-shrink-0 w-8 flex justify-center">
                            {onPodium ? getRankIcon(rank) : <span className="font-bold text-muted-foreground w-6 text-center">–</span>}
                            </div>

                            <UserAvatar user={player} size="md" className="border-2 border-background min-[360px]:w-12 min-[360px]:h-12 min-[360px]:text-2xl" />

                            <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2">
                                <h3 className="font-bold line-clamp-2 [overflow-wrap:anywhere]">{player.displayName}</h3>
                                {player.uid === user.uid && (
                                <span className="shrink-0 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                    Moi
                                </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                                {stat.totalSessions} {stat.totalSessions > 1 ? 'séances' : 'séance'}
                            </p>
                            </div>

                            <div className="text-right flex flex-col items-end">
                            <span className="text-xl font-black block leading-none">{stat.totalReps.toLocaleString('fr-FR')}</span>
                            <span className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Reps</span>

                            {stat.totalCalories > 0 && (
                                <span className="text-xs font-medium text-orange-700 dark:text-orange-400 flex items-center gap-0.5">
                                    {Math.round(stat.totalCalories).toLocaleString('fr-FR')} kcal
                                </span>
                            )}
                            </div>
                        </CardContent>
                        </Card>

                        {/* Publicité après le 3ème (index 2) et le 7ème (index 6) */}
                        {((index === 2) || (index === 6)) && (
                            <AdSpace
                              className="my-3"
                              adId="ca-app-pub-1431137074985627/2893707245"
                              slotId={ADS_CONFIG.ADSENSE.SLOTS.LEADERBOARD_FEED}
                            />
                        )}
                    </div>
                  );
                })}

                {/* Publicité par défaut si moins de 3 utilisateurs */}
                {stats.length > 0 && stats.length < 3 && (
                    <AdSpace
                      className="mt-4"
                      adId="ca-app-pub-1431137074985627/2893707245"
                      slotId={ADS_CONFIG.ADSENSE.SLOTS.LEADERBOARD_FEED}
                    />
                )}

                {stats.length === 0 && (
                   <div className="text-center py-12 text-muted-foreground">
                    <p>Le classement n'a pas pu être chargé. Vérifie ta connexion et réessaie.</p>
                  </div>
                )}
              </div>}
              </>
            )}
          </div>
        </Tabs>
      </div>
    </PageLayout>
  );
}
