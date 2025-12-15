import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { StatsCard } from '@/components/StatsCard';
import { AuthForm } from '@/components/AuthForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BackButton } from '@/components/BackButton';
import { ProfileEditForm } from '@/components/ProfileEditForm';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { getUnlockedBadges, getNextBadge } from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';
import { Settings, LogOut, Award, Target } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function Profile() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();
  const { user, stats, isLoading } = useUserStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: 'Déconnexion réussie',
        description: 'À bientôt !',
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de se déconnecter',
        variant: 'destructive',
      });
    }
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

  if (!user) {
    // Page de connexion
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-md space-y-6">
          <div className="text-center">
            <h1 className="mb-2 text-3xl font-bold">🏋️ Reps</h1>
            <p className="text-muted-foreground">
              Suivez vos entraînements de musculation au poids du corps
            </p>
          </div>
          <AuthForm
            onSuccess={() => {
              navigate('/');
            }}
          />
          <p className="text-center text-xs text-muted-foreground">
            En vous connectant, vous acceptez nos conditions d'utilisation
          </p>
        </div>
      </div>
    );
  }

  const unlockedBadges = getUnlockedBadges(user.totalReps);
  const nextBadge = getNextBadge(user.totalReps);

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="text-2xl font-bold">Profil</h1>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>

        {/* Profil utilisateur */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-2xl">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold">{user.displayName}</h2>
                <p className="text-muted-foreground">{user.email}</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">Modifier</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Modifier le profil</DialogTitle>
                  </DialogHeader>
                  <ProfileEditForm user={user} />
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Âge</p>
                <p className="font-semibold">{user.age ? `${user.age} ans` : '-'}</p>
              </div>
              <div className="text-center border-l border-r">
                <p className="text-sm text-muted-foreground">Poids</p>
                <p className="font-semibold">{user.weight ? `${user.weight} kg` : '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Taille</p>
                <p className="font-semibold">{user.height ? `${user.height} cm` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <StatsCard stats={stats} />

        {/* Badges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Badges
            </CardTitle>
          </CardHeader>
          <CardContent>
            {unlockedBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {unlockedBadges.map((badge) => (
                  <div
                    key={badge.id}
                    className="p-4 rounded-lg bg-muted/50 flex flex-col items-center gap-2"
                  >
                    <span className="text-3xl">{badge.emoji}</span>
                    <p className="font-semibold text-sm text-center">{badge.name}</p>
                    <p className="text-xs text-muted-foreground text-center">
                      {badge.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Aucun badge débloqué pour le moment
              </p>
            )}

            {nextBadge && (
              <div className="mt-4 p-4 rounded-lg border-2 border-dashed flex items-center gap-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-semibold">Prochain badge</p>
                  <p className="text-sm text-muted-foreground">
                    {nextBadge.name} - {formatNumber(nextBadge.threshold - user.totalReps)} reps
                    restantes
                  </p>
                </div>
                <span className="text-2xl">{nextBadge.emoji}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Déconnexion */}
        <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" className="w-full" size="lg">
              <LogOut className="h-5 w-5 mr-2" />
              Se déconnecter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Se déconnecter ?</DialogTitle>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowLogoutDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSignOut} variant="destructive" className="flex-1">
                Déconnexion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Profile;
