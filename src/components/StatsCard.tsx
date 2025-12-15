import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/cn';
import type { UserStats } from '@/firebase/types';
import { Trophy, Target, TrendingUp, Calendar } from 'lucide-react';

interface StatsCardProps {
  stats: UserStats | null;
  className?: string;
}

/**
 * Carte affichant les statistiques de l'utilisateur
 */
export function StatsCard({ stats, className }: StatsCardProps) {
  if (!stats) {
    return (
      <Card className={cn(className)}>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">Aucune statistique disponible</p>
        </CardContent>
      </Card>
    );
  }

  const statItems = [
    {
      label: 'Total Reps',
      value: stats.totalReps.toLocaleString(),
      icon: Target,
      color: 'text-blue-500',
    },
    {
      label: 'Séances',
      value: stats.totalSessions.toString(),
      icon: Calendar,
      color: 'text-green-500',
    },
    {
      label: 'Moyenne/Séance',
      value: stats.averageRepsPerSession.toString(),
      icon: TrendingUp,
      color: 'text-orange-500',
    },
    {
      label: 'Durée Moyenne',
      value: `${Math.floor(stats.averageDuration / 60)}m`,
      icon: Calendar,
      color: 'text-purple-500',
    },
    {
      label: 'Exos/Séance',
      value: stats.averageExercises.toString(),
      icon: Target,
      color: 'text-blue-500',
    },
    {
      label: 'Série actuelle',
      value: `${stats.currentStreak} jours`,
      icon: Trophy,
      color: 'text-yellow-500',
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>Statistiques</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {statItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50">
                <Icon className={cn('h-6 w-6', item.color)} />
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-sm text-muted-foreground text-center">{item.label}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

