import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { StatsCard } from '@/components/StatsCard';
import { AuthForm } from '@/components/AuthForm';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { BackButton } from '@/components/BackButton';
import { ProfilEditForm } from '@/components/ProfilEditForm';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { getUnlockedBadges, getNextBadge } from '@/utils/constants';
import { formatNumber } from '@/utils/formatters';
import { Settings, LogOut, Award, Target, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/UserAvatar';
import type { User } from '@/firebase/types';

function ProfilEditDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Modifier</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription className="hidden">
            Formulaire de modification du profil
          </DialogDescription>
        </DialogHeader>
        <ProfilEditForm user={user} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Profil() {
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

  const unlockedBadges = stats ? getUnlockedBadges(stats) : [];
  const nextBadge = stats ? getNextBadge(stats) : null;

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
              <UserAvatar user={user} size="xl" />
              <div className="flex-1">
                <h2 className="text-xl font-bold">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.displayName}
                </h2>
                {(user.firstName || user.lastName) && (
                  <p className="text-sm text-muted-foreground">@{user.displayName}</p>
                )}
                <p className="text-muted-foreground">{user.email}</p>
                <button
                  onClick={() => navigate('/friends')}
                  className="text-sm font-medium text-primary hover:underline mt-1 flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  {user.friends?.length || 0} Amis
                </button>
              </div>
              <ProfilEditDialog user={user} />
            </div>

            <div className="flex justify-center pb-6">
              <Button variant="secondary" className="w-full" onClick={() => navigate('/friends')}>
                <Users className="h-4 w-4 mr-2" />
                Gérer les amis
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Âge</p>
                <p className="font-semibold">
                  {user.birthDate
                    ? `${new Date().getFullYear() - new Date(user.birthDate).getFullYear()} ans`
                    : '-'}
                </p>
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
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5" />
              Badges
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => navigate('/achievements')}>
              Voir tout
            </Button>
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
                    {nextBadge.name} - {
                      nextBadge.category === 'total_reps' ? `${formatNumber(nextBadge.threshold - stats!.totalReps)} reps` :
                      nextBadge.category === 'streak' ? `${nextBadge.threshold - stats!.currentStreak} jours` :
                      `${nextBadge.threshold - stats!.totalSessions} séances`
                    } restants
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
              <DialogDescription>
                Êtes-vous sûr de vouloir vous déconnecter ?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowLogoutDialog(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleSignOut} variant="default" className="flex-1">
                Déconnexion
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default Profil;
