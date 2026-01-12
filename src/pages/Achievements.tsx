import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BackButton } from '@/components/BackButton';
import { useUserStore } from '@/store/userStore';
import { BADGES, getUnlockedBadges } from '@/utils/constants';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/utils/cn';
import { Lock, Check, User } from 'lucide-react';

import { useEffect, useRef } from 'react';

export default function Achievements() {
  const { user, stats, updateProfile, markBadgesAsSeen } = useUserStore();
  const { toast } = useToast();

  // Utiliser une ref pour suivre si on a des badges à marquer comme vus
  const shouldMarkAsSeen = useRef(false);
  // Protection contre le StrictMode (double invoke mount/unmount)
  const canPerformCleanup = useRef(false);

  useEffect(() => {
    if (user?.newBadgeIds && user.newBadgeIds.length > 0) {
      shouldMarkAsSeen.current = true;
    }
  }, [user?.newBadgeIds]);

  // Timer de sécurité pour autoriser le nettoyage
  useEffect(() => {
    const timer = setTimeout(() => {
        canPerformCleanup.current = true;
    }, 1000); // On considère qu'après 1s, c'est une vraie visite et pas un flash/StrictMode
    return () => clearTimeout(timer);
  }, []);

  // Cet effet ne s'exécute qu'au montage et au démontage
  useEffect(() => {
    return () => {
      // On ne marque comme vu que si :
      // 1. Il y avait des nouveaux badges (shouldMarkAsSeen)
      // 2. L'utilisateur est resté au moins 1s (canPerformCleanup)
      if (shouldMarkAsSeen.current && canPerformCleanup.current) {
         markBadgesAsSeen();
      }
    };
  }, [markBadgesAsSeen]);

  if (!user || !stats) return null;

  const unlockedBadges = getUnlockedBadges(stats);
  const unlockedBadgeIds = unlockedBadges.map(b => b.id);

  const totalBadges = BADGES.length;
  const unlockedCount = unlockedBadges.length;
  const progressPercentage = (unlockedCount / totalBadges) * 100;

  const handleSetAvatar = async (emoji: string) => {
    try {
      await updateProfile({ avatarEmoji: emoji });

      toast({
        title: 'Avatar mis à jour',
        description: `L'emoji ${emoji} est maintenant votre avatar !`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erreur',
        description: "Impossible de mettre à jour l'avatar",
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <BackButton />
          <h1 className="text-2xl font-bold">Succès</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Global Progress */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6 text-center space-y-4">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-primary">{unlockedCount} / {totalBadges}</h2>
              <p className="text-muted-foreground font-medium">Badges débloqués</p>
            </div>
            <div className="space-y-2">
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-xs text-muted-foreground text-right">{Math.round(progressPercentage)}% complété</p>
            </div>
          </CardContent>
        </Card>

        {/* Badges List */}
        <div className="grid grid-cols-1 gap-4">
          {[...BADGES]
            .sort((a, b) => {
              const isUnlockedA = unlockedBadgeIds.includes(a.id);
              const isUnlockedB = unlockedBadgeIds.includes(b.id);
              if (isUnlockedA && !isUnlockedB) return -1;
              if (!isUnlockedA && isUnlockedB) return 1;
              return 0;
            })
            .map((badge) => {
            const isUnlocked = unlockedBadgeIds.includes(badge.id);
            const isNew = user.newBadgeIds?.includes(badge.id); // Check if badge is new

            const progress = !isUnlocked ? (() => {
               // ... (existing progress logic)
               switch (badge.category) {
                case 'total_reps': return (stats.totalReps / badge.threshold) * 100;
                case 'streak': return (stats.currentStreak / badge.threshold) * 100;
                case 'total_sessions': return (stats.totalSessions / badge.threshold) * 100;
                case 'total_calories': return ((stats.totalCalories || 0) / badge.threshold) * 100;
                case 'time_morning': return ((stats.morningSessions || 0) / badge.threshold) * 100;
                case 'time_lunch': return ((stats.lunchSessions || 0) / badge.threshold) * 100;
                case 'time_night': return ((stats.nightSessions || 0) / badge.threshold) * 100;
                default: return 0;
              }
            })() : 100;

            return (
              <Card key={badge.id} className={cn(
                "transition-all duration-200",
                !isUnlocked && "opacity-70 bg-muted/30",
                isNew && "border-orange-500 bg-orange-500/5 shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]"
              )}>
                <CardContent className="p-4 flex items-center gap-4 relative overflow-hidden">
                  {isNew && (
                    <div className="absolute top-0 right-0 bg-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl-lg animate-pulse">
                      NOUVEAU
                    </div>
                  )}

                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-sm shrink-0",
                    isUnlocked ? "bg-gradient-to-br from-background to-muted" : "bg-muted",
                     isNew && "ring-2 ring-orange-500 ring-offset-2 ring-offset-background"
                  )}>
                    {isUnlocked ? badge.emoji : <Lock className="h-6 w-6 text-muted-foreground" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold truncate pr-2">{badge.name}</h3>
                      {isUnlocked && <Check className="h-4 w-4 text-green-500 shrink-0" />}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{badge.description}</p>

                    {!isUnlocked && (
                      <div className="space-y-1">
                        <Progress value={Math.min(100, Math.max(0, progress))} className="h-1.5" />
                        <p className="text-[10px] text-muted-foreground text-right">
                          {Math.round(Math.min(100, Math.max(0, progress)))}%
                        </p>
                      </div>
                    )}

                    {isUnlocked && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs mt-1 px-2"
                        onClick={() => handleSetAvatar(badge.emoji)}
                      >
                        <User className="h-3 w-3 mr-1.5" />
                        Utiliser en avatar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
