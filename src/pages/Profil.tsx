import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

import { LoadingSpinner } from '@/components/LoadingSpinner';
import { PageLayout } from '@/components/layout/PageLayout';
import { ProfilEditForm } from '@/components/ProfilEditForm';
import { useAuth } from '@/hooks/useAuth';
import { useUserStore } from '@/store/userStore';
import { getUnlockedBadges, getNextBadge } from '@/utils/constants';
import { formatNumber, plural } from '@/utils/formatters';
import { Settings, LogOut, Award, Target, Users, Trash2, Pencil } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { UserAvatar } from '@/components/UserAvatar';
import type { User } from '@/firebase/types';
import { BodyMetrics } from '@/components/BodyMetrics';

function ProfilEditDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" aria-label="Modifier le profil" className="max-[359px]:px-2.5">
          <Pencil className="h-4 w-4 min-[360px]:hidden" aria-hidden />
          <span className="max-[359px]:sr-only">Modifier</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le profil</DialogTitle>
          <DialogDescription className="sr-only">
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
  const { user, stats, isLoading, deleteAccount, currentUser } = useUserStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const isPasswordAccount = currentUser?.providerData.some((p) => p.providerId === 'password') ?? false;
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    if (isPasswordAccount && !deletePassword) return;
    setIsDeleting(true);
    try {
      await deleteAccount(isPasswordAccount ? deletePassword : undefined);
      window.location.replace('/'); // rechargement complet (→ connexion) : Firestore a été arrêté pour vider son cache
    } catch {
      toast({
        title: 'Erreur',
        description: 'Impossible de supprimer le compte. Reconnecte-toi et réessaie.',
        variant: 'destructive',
      });
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

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

  if (!user) return null;

  const unlockedBadges = stats ? getUnlockedBadges(stats) : [];
  const nextBadge = stats ? getNextBadge(stats) : null;

  return (
    <PageLayout
        title="MON PROFIL"
        variant="secondary"
        headerAction={
            <Button variant="ghost" size="icon" aria-label="Réglages" onClick={() => navigate('/settings')} className="-mr-2">
                <Settings className="h-5 w-5" />
            </Button>
        }
    >
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Profil utilisateur */}
        <Card>
          <CardContent className="p-6 max-[359px]:p-4">
            <div className="flex items-center gap-4 max-[359px]:gap-3 mb-6">
              <UserAvatar user={user} size="xl" />
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold truncate">
                  {user.firstName && user.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user.displayName}
                </h2>
                {(user.firstName || user.lastName) && (
                  <p className="text-sm text-muted-foreground">@{user.displayName}</p>
                )}
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                <button
                  onClick={() => navigate('/friends')}
                  className="text-sm font-medium text-primary hover:underline mt-1 -mb-2 py-2 min-h-[44px] flex items-center gap-1.5"
                >
                  <Users className="h-4 w-4" />
                  {user.friends?.length || 0} {(user.friends?.length || 0) > 1 ? 'amis' : 'ami'}
                </button>
              </div>
              <ProfilEditDialog user={user} />
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Âge</p>
                <p className="font-semibold">
                  {user.birthDate
                    ? `${(() => {
                        const b = new Date(user.birthDate);
                        const t = new Date();
                        let a = t.getFullYear() - b.getFullYear();
                        if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
                        return a;
                      })()} ans`
                    : '-'}
                </p>
              </div>
              <div className="text-center border-l border-r">
                <p className="text-sm text-muted-foreground">Poids</p>
                <p className="font-semibold">{user.weight ? `${user.weight.toLocaleString('fr-FR')} kg` : '-'}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Taille</p>
                <p className="font-semibold">{user.height ? `${user.height} cm` : '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <BodyMetrics />

        {/* Badges */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2 text-lg font-bold">
              <Award className="h-5 w-5" />
              Badges
              {user.newBadgeIds && user.newBadgeIds.length > 0 && (
                 <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </CardTitle>
            <Button variant="ghost" size="sm" className="min-h-11" onClick={() => navigate('/achievements')}>
              Voir tout{unlockedBadges.length > 4 ? ` (${unlockedBadges.length})` : ''}
            </Button>
          </CardHeader>
          <CardContent>
            {unlockedBadges.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {/* Aperçu : les 4 derniers débloqués, le reste dans « Voir tout » (la liste complète rallongeait le profil) */}
                {unlockedBadges.slice(-4).reverse().map((badge) => (
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
              <div className="text-center py-6 space-y-3">
                <span className="text-3xl" role="img" aria-label="Badge">🏅</span>
                <p className="text-sm text-muted-foreground">
                  Aucun badge débloqué pour le moment. Lance ta première séance pour en gagner !
                </p>
                <Button variant="secondary" size="sm" onClick={() => navigate('/')}>
                  Lancer une séance
                </Button>
              </div>
            )}

            {nextBadge && (
              <div className="mt-4 p-4 rounded-lg border-2 border-dashed flex items-center gap-3">
                <Target className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="font-semibold">Prochain badge</p>
                  <p className="text-sm text-muted-foreground">
                    {nextBadge.name} — encore {
                      nextBadge.category === 'total_reps' ? `${formatNumber(nextBadge.threshold - stats!.totalReps)} reps` :
                      nextBadge.category === 'streak' ? plural(nextBadge.threshold - stats!.currentStreak, 'jour') :
                      nextBadge.category === 'total_calories' ? `${formatNumber(nextBadge.threshold - (stats!.totalCalories || 0))} kcal` :
                      nextBadge.category === 'time_morning' ? plural(nextBadge.threshold - (stats!.morningSessions || 0), 'séance') :
                      nextBadge.category === 'time_lunch' ? plural(nextBadge.threshold - (stats!.lunchSessions || 0), 'séance') :
                      nextBadge.category === 'time_night' ? plural(nextBadge.threshold - (stats!.nightSessions || 0), 'séance') :
                      plural(nextBadge.threshold - stats!.totalSessions, 'séance')
                    }
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
                Tu es sûr de vouloir te déconnecter ?
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowLogoutDialog(false)} className="flex-1 basis-28">
                Annuler
              </Button>
              <Button onClick={handleSignOut} variant="default" className="flex-1 basis-28">
                Me déconnecter
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Suppression du compte */}
        <Dialog open={showDeleteDialog} onOpenChange={(open) => {
          setShowDeleteDialog(open);
          if (!open) { setDeleteConfirmText(''); setDeletePassword(''); }
        }}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer mon compte
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Supprimer le compte</DialogTitle>
              <DialogDescription className="space-y-2 pt-1">
                <span className="block">
                  Cette action est <strong>irréversible</strong>. Toutes tes données seront effacées :
                  séances, statistiques, badges, amis, modèles.
                </span>
                <span className="block">
                  Tape <strong>SUPPRIMER</strong> pour confirmer.
                </span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input
                placeholder="SUPPRIMER"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck={false}
                aria-label="Tape SUPPRIMER pour confirmer"
                className="border-destructive/40 focus-visible:ring-destructive"
              />
              {isPasswordAccount && (
                <Input
                  type="password"
                  placeholder="Ton mot de passe"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoComplete="current-password"
                  aria-label="Mot de passe requis pour supprimer le compte"
                  className="border-destructive/40 focus-visible:ring-destructive"
                />
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteDialog(false)}
                  className="flex-auto"
                  disabled={isDeleting}
                >
                  Annuler
                </Button>
                <Button
                  variant="destructive"
                  className="flex-auto"
                  disabled={deleteConfirmText !== 'SUPPRIMER' || (isPasswordAccount && !deletePassword) || isDeleting}
                  onClick={handleDeleteAccount}
                >
                  {isDeleting ? <LoadingSpinner size="sm" /> : 'Supprimer définitivement'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}

export default Profil;
