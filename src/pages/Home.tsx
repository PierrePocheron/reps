import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { useSession } from '@/hooks/useSession';
import { Plus, Calendar, Activity } from 'lucide-react';
import { UserAvatar } from '@/components/UserAvatar';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { user, stats } = useUserStore();
  const { isActive, duration } = useSession();

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

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <h1 className="mb-4 text-4xl font-bold">🏋️ Reps</h1>
        <p className="mb-8 text-center text-muted-foreground">
          Suivez vos entraînements de musculation au poids du corps
        </p>
        <Button onClick={() => navigate('/profile')} size="lg">
          Se connecter
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-24">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reps</h1>
          <button
            onClick={() => navigate('/profile')}
            className="relative flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border-none p-0 outline-none ring-offset-background transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {user && (
              <UserAvatar user={user} size="sm" className="h-9 w-9 border-none" />
            )}
          </button>
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
                  <p className="text-muted-foreground">Dépasse tes limites aujourd'hui.</p>
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

        {/* Stats Card */}
        <StatsCard stats={stats} />

        {/* Last Session Card */}
        {stats && stats.totalSessions > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold px-1">Dernière activité</h3>
            <Card className="overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="flex items-stretch">
                  <div className="w-2 bg-primary/20" />
                  <div className="flex-1 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          {stats.lastSessionDate
                            ? new Date(stats.lastSessionDate.toDate()).toLocaleDateString('fr-FR', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })
                            : 'Date inconnue'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {stats.lastSessionReps !== undefined && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Volume</p>
                          <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" />
                            <span className="text-2xl font-bold">{stats.lastSessionReps}</span>
                            <span className="text-sm text-muted-foreground font-medium">reps</span>
                          </div>
                        </div>
                      )}
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
