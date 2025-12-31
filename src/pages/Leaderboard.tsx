import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BackButton } from '@/components/BackButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useUserStore } from '@/store/userStore';
import { getLeaderboardStats, getFriendsDetails } from '@/firebase/firestore';
import { Trophy, Medal, Calendar, TrendingUp } from 'lucide-react';
import { User } from '@/firebase/types';
import { UserAvatar } from '@/components/UserAvatar';
import { AdSpace } from '@/components/AdSpace';

export default function Leaderboard() {
  const { user } = useUserStore();
  const [activeTab, setActiveTab] = useState('all_time');
  const [stats, setStats] = useState<{ userId: string; totalReps: number; totalSessions: number; totalCalories: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [friendsDetails, setFriendsDetails] = useState<User[]>([]);

  useEffect(() => {
    if (!user) return;

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

          setStats(leaderboardData.sort((a, b) => b.totalReps - a.totalReps));
        } else {
          // Pour les autres périodes, on calcule via les sessions
          // On a quand même besoin des détails pour l'affichage (nom, photo)
          if (friendsDetails.length === 0) {
             const details = await getFriendsDetails(friendIds);
             setFriendsDetails(details);
          }

          const periodStats = await getLeaderboardStats(allIds, activeTab as 'daily' | 'weekly' | 'monthly');
          setStats(periodStats.sort((a, b) => b.totalReps - a.totalReps));
        }
      } catch (error) {
        console.error('Erreur chargement classement:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [user, activeTab]);

  const getUserDetails = (userId: string) => {
    if (user && userId === user.uid) return user;
    return friendsDetails.find(f => f.uid === userId);
  };

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0: return "bg-yellow-500/10 border-yellow-500/50 text-yellow-600";
      case 1: return "bg-gray-400/10 border-gray-400/50 text-gray-600";
      case 2: return "bg-orange-500/10 border-orange-500/50 text-orange-600";
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

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="text-2xl font-bold">Classement</h1>
          <div className="w-10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="daily" className="text-xs">Jour</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs">Semaine</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs">Mois</TabsTrigger>
            <TabsTrigger value="all_time" className="text-xs">Toujours</TabsTrigger>
          </TabsList>

          <div className="space-y-4 animate-in fade-in-50">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold flex items-center justify-center gap-2">
                {activeTab === 'daily' && <Calendar className="h-6 w-6 text-primary" />}
                {activeTab === 'weekly' && <TrendingUp className="h-6 w-6 text-primary" />}
                {activeTab === 'monthly' && <Calendar className="h-6 w-6 text-primary" />}
                {activeTab === 'all_time' && <Trophy className="h-6 w-6 text-yellow-500" />}

                {activeTab === 'daily' && "Top du Jour"}
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
              <div className="space-y-3">
                {stats.map((stat, index) => {
                  const player = getUserDetails(stat.userId);
                  if (!player) return null;

                  return (
                    <div key={stat.userId}>
                        <Card className={`overflow-hidden border-2 shadow-sm transition-all ${getRankStyle(index)}`}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className="flex-shrink-0 w-8 flex justify-center">
                            {getRankIcon(index)}
                            </div>

                            <UserAvatar user={player} size="lg" className="border-2 border-background" />

                            <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold truncate">{player.displayName}</h3>
                                {player.uid === user.uid && (
                                <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">
                                    Moi
                                </span>
                                )}
                            </div>
                            <p className="text-xs opacity-80 truncate">
                                {stat.totalSessions} séances
                            </p>
                            </div>

                            <div className="text-right flex flex-col items-end">
                            <span className="text-xl font-black block leading-none">{stat.totalReps}</span>
                            <span className="text-[10px] uppercase tracking-wider opacity-70 mb-1">Reps</span>

                            {stat.totalCalories > 0 && (
                                <span className="text-xs font-medium text-orange-500 flex items-center gap-0.5">
                                    {Math.round(stat.totalCalories)} kcal
                                </span>
                            )}
                            </div>
                        </CardContent>
                        </Card>

                        {/* Publicité après le 3ème (index 2) et le 7ème (index 6) */}
                        {((index === 2) || (index === 6)) && (
                            <AdSpace className="my-3" adId="ca-app-pub-1431137074985627/2893707245" />
                        )}
                    </div>
                  );
                })}

                {/* Publicité par défaut si moins de 3 utilisateurs */}
                {stats.length > 0 && stats.length < 3 && (
                    <AdSpace className="mt-4" adId="ca-app-pub-1431137074985627/2893707245" />
                )}

                {stats.length === 0 && (
                   <div className="text-center py-12 text-muted-foreground">
                    <p>Aucune activité sur cette période.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
