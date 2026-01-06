import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Trophy,
  Calendar,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Clock
} from 'lucide-react';
import {
  UserChallenge,
  getChallengeDef,
  validateChallengeDay,
  getDayIndex,
  getTargetForDay,
  CHALLENGE_TEMPLATES
} from '@/firebase/challenges';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Timestamp } from 'firebase/firestore';

interface ChallengeCardProps {
  activeChallenge?: UserChallenge;
  userId: string;
}

export function ChallengeCard({ activeChallenge, userId }: ChallengeCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  // 1. STATE: Discovery (No active challenge)
  if (!activeChallenge) {
    // Pick a random template for discovery
    const randomTemplate = CHALLENGE_TEMPLATES[0]; // For now just the first one, could be random

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
  const def = getChallengeDef(activeChallenge.challengeId);
  if (!def) return null;

  const today = new Date();
  const dayIndex = getDayIndex(activeChallenge.startDate, today);
  const target = getTargetForDay(def, dayIndex);

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

  return (
    <Card className={`overflow-hidden border-2 ${isDoneToday ? 'border-green-500/20 bg-green-500/5' : 'border-primary/20 bg-primary/5'} relative transition-all`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
            <div>
                <h3 className="font-bold text-lg flex items-center gap-2">
                    {def.title}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Jour {dayIndex + 1} sur {def.durationDays}</span>
                </div>
            </div>
            {isDoneToday && (
                <div className="bg-green-500 text-white p-1 rounded-full">
                    <CheckCircle2 className="w-5 h-5" />
                </div>
            )}
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4">
             <div
                className={`h-full ${isDoneToday ? 'bg-green-500' : 'bg-primary'} transition-all duration-500`}
                style={{ width: `${((dayIndex + (isDoneToday ? 1 : 0)) / def.durationDays) * 100}%` }}
             />
        </div>

        {/* Action Area */}
        <div className="flex items-center justify-between gap-4">
            <div className={`flex flex-col ${isDoneToday ? 'opacity-50' : ''}`}>
                <span className="text-xs font-semibold uppercase text-muted-foreground">Objectif</span>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{target}</span>
                    <span className="text-xs font-medium">{def.exerciseId === 'lateral_raises' ? 'Reps' : 'Reps'}</span>
                </div>
            </div>

            {isDoneToday ? (
                <Button variant="outline" className="flex-1 bg-green-500/10 border-green-500/20 text-green-700 hover:bg-green-500/20" disabled>
                    Validé pour aujourd'hui
                </Button>
            ) : (
                <Button onClick={handleValidate} disabled={isValidating} className="flex-1">
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
