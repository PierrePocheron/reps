import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import {
  UserChallenge,
  getChallengeDef,
  validateChallengeDay,
  getDayIndex,
  getTargetForDay,
  calculateChallengeTotalReps,
  CHALLENGE_TEMPLATES
} from '@/firebase/challenges';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Timestamp } from 'firebase/firestore';

interface ChallengeCardProps {
  activeChallenge?: UserChallenge;
  userId: string;
  detailed?: boolean;
}

export function ChallengeCard({ activeChallenge, userId, detailed }: ChallengeCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  // 1. STATE: Discovery (No active challenge)
  if (!activeChallenge) {
    // Pick a random template for discovery
    const randomTemplate = CHALLENGE_TEMPLATES[0];
    if (!randomTemplate) return null; // Safety check

    return (
      <Card className="overflow-hidden border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
            <Trophy className="w-24 h-24 rotate-12" />
        </div>
        <CardContent className="p-5">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                     <h3 className="font-bold text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Défi du moment
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Relevez le défi pour booster votre progression !
                    </p>
                </div>
            </div>

            <div className="bg-background/60 backdrop-blur-sm rounded-lg p-3 border border-border/50 mb-4">
                <div className="flex items-center gap-3">
                    <div className="text-2xl bg-muted rounded-md w-10 h-10 flex items-center justify-center">
                        🏃
                    </div>
                    <div>
                        <p className="font-semibold">{randomTemplate.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{randomTemplate.description}</p>
                    </div>
                </div>
            </div>

            <Button onClick={() => navigate('/challenges')} className="w-full">
                Voir les défis
                <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
        </CardContent>
      </Card>
    );
  }

  // 2. STATE: Active Challenge
  const def = activeChallenge.definitionSnapshot || getChallengeDef(activeChallenge.challengeId);
  if (!def) return null;

  const today = new Date();
  const dayIndex = getDayIndex(activeChallenge.startDate, today);
  const target = getTargetForDay(def, dayIndex);

  // Calculate specific stats
  const totalTargetRepetitions = calculateChallengeTotalReps(def);
  const percentTotal = Math.min(100, Math.round((activeChallenge.totalProgress / totalTargetRepetitions) * 100));

  // Check completion for today
  const todayStr = today.toISOString().split('T')[0];
  const isDoneToday = activeChallenge.history.some(h => h.date === todayStr && h.completed);

  // Calculate delay (if late)
  const lastLog = activeChallenge.lastLogDate?.toDate() || activeChallenge.startDate.toDate();
  const lateDays = getDayIndex(Timestamp.fromDate(lastLog), today) - (isDoneToday ? 0 : 1);
  const isLate = lateDays > 0;

  const handleValidate = async () => {
    setIsValidating(true);
    try {
        await validateChallengeDay(activeChallenge.id, userId, target, today);
        toast({
            title: "Bien joué ! 🔥",
            description: `Jour ${dayIndex + 1} validé : ${target} reps ajoutées.`,
        });
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Impossible de valider le défi.",
            variant: "destructive"
        });
    } finally {
        setIsValidating(false);
    }
  };

  const getEmoji = (id: string, def?: any) => {
      // Priority 1: Check DEFAULT_EXERCISES specific mapping
      if (id.includes('pushups')) return '💪';
      if (id.includes('pullups')) return '🧗';
      if (id.includes('squats')) return '🦵';
      if (id.includes('dips')) return '♣️';
      if (id.includes('abs')) return '🍫';
      if (id.includes('lateral')) return '🥥';
      return '🦅'; // Fallback
  };

  return (
    <Card className={`overflow-hidden border-2 ${isDoneToday ? 'border-green-500/20 bg-green-500/5' : 'border-primary/20 bg-primary/5'} relative transition-all`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-start gap-3">
                 <div className="text-2xl bg-background/50 rounded-md w-10 h-10 flex items-center justify-center border border-border/50">
                    {getEmoji(def.exerciseId)}
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                        {def.title}
                    </h3>

                    <div className="flex items-center gap-2 mt-1">
                        {/* Difficulty Badge */}
                         <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                            def.difficulty === 'easy' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-400 dark:border-green-500/30' :
                            def.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/30' :
                            def.difficulty === 'hard' ? 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30' :
                            'bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30'
                        }`}>
                            {def.difficulty === 'extreme' ? 'Extrême' :
                             def.difficulty === 'hard' ? 'Difficile' :
                             def.difficulty === 'medium' ? 'Moyen' : 'Facile'}
                        </span>

                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>J{Math.min(dayIndex + 1, def.durationDays)}/{def.durationDays}</span>
                        </div>
                    </div>
                </div>
            </div>
            {isDoneToday && (
                <div className="bg-green-500 text-white p-1 rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            )}
        </div>

        {/* Progress Bar (Days) */}
        {!detailed && (
            <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4 mt-2">
                <div
                    className={`h-full ${isDoneToday ? 'bg-green-500' : 'bg-primary'} transition-all duration-500`}
                    style={{ width: `${((dayIndex + (isDoneToday ? 1 : 0)) / def.durationDays) * 100}%` }}
                />
            </div>
        )}

        {/* Detailed Stats */}
        {detailed && (
            <div className="bg-background/40 rounded-lg p-3 my-4 border border-border/30">
                <div className="flex justify-between items-end mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Progression totale</span>
                    <span className="text-sm font-bold">{percentTotal}%</span>
                </div>
                <div className="h-2.5 bg-background rounded-full overflow-hidden border border-border/20">
                    <div
                        className="h-full bg-blue-500 transition-all duration-1000"
                        style={{ width: `${percentTotal}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                    <span>{activeChallenge.totalProgress} reps faites</span>
                    <span>Sur {totalTargetRepetitions} total</span>
                </div>
            </div>
        )}

        {/* Action Area */}
        <div className={`flex items-center justify-between gap-3 ${detailed ? 'mt-0' : 'mt-4'}`}>
            <div className={`flex flex-col ${isDoneToday ? 'opacity-50' : ''}`}>
                <span className="text-xs font-semibold uppercase text-muted-foreground">Aujourd'hui</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{target}</span>
                    <span className="text-xs font-medium">{def.exerciseId === 'lateral_raises' ? 'Reps' : 'Reps'}</span>
                </div>
            </div>

            {isDoneToday ? (
                <Button variant="outline" className="flex-1 bg-green-500/10 border-green-500/20 text-green-700 hover:bg-green-500/20 px-2" disabled>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Validé
                </Button>
            ) : (
                <Button onClick={handleValidate} disabled={isValidating} className="flex-1 px-2">
                    {isValidating ? <LoadingSpinner size="sm"/> : "Valider"}
                </Button>
            )}
        </div>

        {/* Late Warning */}
        {isLate && !isDoneToday && (
            <div className="mt-3 flex items-center gap-2 text-xs text-orange-600 bg-orange-100 dark:bg-orange-500/10 p-2 rounded-md">
                <Clock className="w-3.5 h-3.5" />
                <span>{lateDays} jour{lateDays > 1 ? 's' : ''} de retard !
                    <button onClick={() => navigate('/challenges')} className="underline font-semibold ml-1">Rattraper</button>
                </span>
            </div>
        )}
      </CardContent>
    </Card>
  );
}
