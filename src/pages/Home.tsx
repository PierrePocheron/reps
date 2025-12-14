import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatsCard } from '@/components/StatsCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { Plus, TrendingUp, Calendar, Activity } from 'lucide-react';

function Home() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { stats } = useUserStore();

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
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Reps</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/profile')}>
            <TrendingUp className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Card */}
        <StatsCard stats={stats} />

        {/* Quick Stats */}
        {stats && stats.totalSessions > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Dernière séance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>
                  {stats.lastSessionDate
                    ? new Date(stats.lastSessionDate.toDate()).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })
                    : 'Aucune séance'}
                </span>
              </div>
            </CardContent>
          </Card>
        ) : (
          <EmptyState
            icon={<Activity className="h-16 w-16 text-muted-foreground" />}
            title="Aucune séance pour le moment"
            description="Commencez votre première séance d'entraînement !"
            action={
              <Button onClick={() => navigate('/session')} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Démarrer une séance
              </Button>
            }
          />
        )}

        {/* Nouvelle séance */}
        <Button onClick={() => navigate('/session')} size="lg" className="h-16 w-full text-lg">
          <Plus className="mr-2 h-6 w-6" />
          Nouvelle séance
        </Button>
      </div>
    </div>
  );
}

export default Home;
