import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trophy,
  ChevronRight,
  CheckCircle2,
  MoreVertical,
  Trash2
} from 'lucide-react';
import {
  UserChallenge,
  getChallengeDef,
  validateChallengeDay,
  getDayIndex,
  getTargetForDay,
  calculateChallengeTotalReps,
  CHALLENGE_TEMPLATES,
  ChallengeDefinition,
  abandonChallenge
} from '@/firebase/challenges';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import confetti from 'canvas-confetti';

interface ChallengeCardProps {
  activeChallenge?: UserChallenge;
  template?: ChallengeDefinition;
  userId: string;
  detailed?: boolean;
  onJoin?: (id: string) => void;
  isJoining?: boolean;
  onUpdate?: () => void;
}

export function ChallengeCard({ activeChallenge, template, userId, detailed, onJoin, isJoining, onUpdate }: ChallengeCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isValidating, setIsValidating] = useState(false);

  // 1. STATE: Active Challenge or Preview
  const def = activeChallenge
    ? (activeChallenge.definitionSnapshot || getChallengeDef(activeChallenge.challengeId))
    : template;

  // Fallback / Loading / Discovery Card (only if NOTHING provided)
  if (!def) {
     // Pick a random template for discovery if intended to be shown (rare case given usage)
    const randomTemplate = CHALLENGE_TEMPLATES[0];
    if (!randomTemplate) return null;

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

  // Common Derived State
  const isActive = !!activeChallenge;
  let isDoneToday = false;
  let isLate = false;
  let lateDays = 0;
  let percentTotal = 0;
  let totalTargetRepetitions = 0;
  let target = 0;
  let dayIndex = 0;

  if (isActive && activeChallenge) {
      const today = new Date();
      // Calendar Day (Theoretical Position)
      const calendarDayIndex = Math.min(getDayIndex(activeChallenge.startDate, today), def.durationDays - 1);

      // Actual Progress based on History Count (Catch-up Model)
      const stepsCompleted = activeChallenge.history.length;
      dayIndex = stepsCompleted; // The step we are about to do (0-indexed)

      // If we finished all days, cap it
      if (dayIndex >= def.durationDays) dayIndex = def.durationDays - 1;

      target = getTargetForDay(def, dayIndex);
      totalTargetRepetitions = calculateChallengeTotalReps(def);
      percentTotal = Math.min(100, Math.round((activeChallenge.totalProgress / totalTargetRepetitions) * 100));

      // We are caught up if we have completed up to the current calendar day
      const isCaughtUp = stepsCompleted > calendarDayIndex;
      isDoneToday = isCaughtUp;

      lateDays = Math.max(0, calendarDayIndex - stepsCompleted);
      isLate = lateDays > 0;
  } else {
      // For templates, calculate Total Reps for display
      totalTargetRepetitions = calculateChallengeTotalReps(def);
  }

  const handleAbandon = async () => {
    if (!activeChallenge) return;
    try {
        if (!window.confirm("Es-tu sûr de vouloir abandonner ce défi ? (L'historique sera conservé)")) return;

        await abandonChallenge(activeChallenge.id);
        toast({
            title: `Défi ${def.title} arrêté`,
            description: "Le défi a été déplacé dans l'historique.",
        });
        onUpdate?.();
    } catch (error) {
        toast({
            title: "Erreur",
            description: "Impossible d'abandonner le défi.",
            variant: "destructive"
        });
    }
  };

  const handleValidate = async () => {
    if (!activeChallenge) return;
    setIsValidating(true);
    try {
        const stepIndex = activeChallenge.history.length;
        await validateChallengeDay(activeChallenge.id, userId, getTargetForDay(def, stepIndex), new Date());
        const targetReps = getTargetForDay(def, stepIndex);

        // 1. Play Sound
        const audio = new Audio('/sounds/success.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Audio play failed", e));

        // 2. Trigger Confetti
        confetti({
            particleCount: Math.min(targetReps * 2, 200), // Scale with reps, cap at 200
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#eab308', '#f97316'] // green, yellow, orange
        });
        toast({
            title: isLate ? "Rattrapage réussi ! 💪" : "Bien joué ! 🔥",
            description: `Jour ${stepIndex + 1} validé !`,
        });
        onUpdate?.();
    } catch (error) {
        console.error(error);
        toast({
            title: "Erreur",
            description: "Impossible de valider le défi.",
            variant: "destructive"
        });
    } finally {
        setIsValidating(false);
    }
  };

  const getEmoji = (id: string) => {
      if (id.includes('pushups')) return '💪';
      if (id.includes('pullups')) return '🧗';
      if (id.includes('squats')) return '🦵';
      if (id.includes('dips')) return '♣️';
      if (id.includes('abs')) return '🍫';
      if (id.includes('lateral')) return '🥥';
      return '🦅';
  };

  // Determine Colors (Active & Template follow same difficulty logic)
  // Active usually uses Primary, but user wants same DA.
  // Let's use Difficulty coloring for Template, and keep Status coloring for Active if needed.
  // Actually, user wants "Same DA".

  let borderColor = 'border-primary/20 bg-primary/5';
  if (isActive && isDoneToday) {
      borderColor = 'border-green-500/20 bg-green-500/5';
  } else if (!isActive) {
      // Template Colors
       if (def.difficulty === 'easy') borderColor = 'border-green-500/30 bg-green-500/5';
       else if (def.difficulty === 'medium') borderColor = 'border-yellow-500/30 bg-yellow-500/5';
       else if (def.difficulty === 'hard') borderColor = 'border-orange-500/30 bg-orange-500/5';
       else borderColor = 'border-red-500/30 bg-red-500/5';
  }

  let actionButtonClass = '';
  if (!isActive) {
       if (def.difficulty === 'easy') actionButtonClass = 'bg-green-500/10 border-green-500/20 text-green-700 hover:bg-green-500/20 dark:text-green-400 border';
       else if (def.difficulty === 'medium') actionButtonClass = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-400 border';
       else if (def.difficulty === 'hard') actionButtonClass = 'bg-orange-500/10 border-orange-500/20 text-orange-700 hover:bg-orange-500/20 dark:text-orange-400 border';
       else actionButtonClass = 'bg-red-500/10 border-red-500/20 text-red-700 hover:bg-red-500/20 dark:text-red-400 border';
  }

  // Stack Effect for Late Days
  let stackClasses = '';
  if (isActive && isLate) {
       // Colored stack for "Late" status (Orange/Red theme)
       stackClasses = 'after:absolute after:w-full after:h-full after:bg-orange-100 dark:after:bg-orange-900/40 after:border after:border-dashed after:border-orange-300 dark:after:border-orange-700/50 after:rounded-xl after:top-1.5 after:left-1.5 after:-z-10';
       if (lateDays > 1) {
           stackClasses += ' before:absolute before:w-full before:h-full before:bg-orange-50 dark:before:bg-orange-900/20 before:border before:border-dashed before:border-orange-200 dark:before:border-orange-800/30 before:rounded-xl before:top-3 before:left-3 before:-z-20';
       }
  }

  return (
    <Card className={`overflow-visible border-2 ${borderColor} relative transition-all ${stackClasses}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-start gap-3">
                 <div className="text-2xl bg-background/50 rounded-md w-10 h-10 flex items-center justify-center border border-border/50 shrink-0">
                    {getEmoji(def.exerciseId)}
                </div>
                <div>
                    <h3 className="font-bold text-lg leading-tight flex items-center gap-2">
                        {def.title}
                    </h3>

                    <div className="flex flex-col gap-0.5 mt-1">
                        <div className="flex items-center gap-2">
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

                            {/* Late Badge */}
                            {isActive && isLate && (
                                <span className="bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border">
                                    Retard: {lateDays}j
                                </span>
                            )}

                            {/* Active: Progress Badge */}
                            {isActive && (
                                <span className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border">
                                    J {Math.min(dayIndex + 1, def.durationDays)} / {def.durationDays}
                                </span>
                            )}

                            {/* Template: Duration & Sum Badges */}
                            {!isActive && (
                                <>
                                    <span className="bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border">
                                        {def.durationDays} Jours
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded border bg-background text-foreground font-mono font-bold">
                                        Σ {totalTargetRepetitions.toLocaleString()}
                                    </span>
                                </>
                            )}
                        </div>

                         {/* Template: (Duration) removed, moved to badges row */}
                    </div>
                </div>
            </div>
            <div className="flex items-start gap-2">
                {isDoneToday && (
                    <div className="bg-green-500 text-white p-1 rounded-full">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                )}
                {isActive && (
                     <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-2 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleAbandon} className="text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Abandonner le défi
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>

        {/* BODY CONTENT */}
        {isActive ? (
             /* ACTIVE: Progress Bar */
            !detailed ? (
                <div className="h-2 bg-background/50 rounded-full overflow-hidden mb-4 mt-2">
                    <div
                        className={`h-full ${isDoneToday ? 'bg-green-500' : 'bg-primary'} transition-all duration-500`}
                        style={{ width: `${((dayIndex + (isDoneToday ? 1 : 0)) / def.durationDays) * 100}%` }}
                    />
                </div>
            ) : (
                /* ACTIVE: Detailed Stats */
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
                        <span>{activeChallenge!.totalProgress} reps faites</span>
                        <span>Sur {totalTargetRepetitions} total</span>
                    </div>
                </div>
            )
        ) : (
            /* TEMPLATE: Description */
            <p className="text-sm text-muted-foreground mt-2 mb-4 line-clamp-2 min-h-[2.5em]">
                {def.description}
            </p>
        )}

        {/* ACTION AREA */}
        <div className={`flex items-center justify-between gap-3 ${detailed ? 'mt-0' : 'mt-4'}`}>
            {isActive ? (
                <>
                    <div className={`flex flex-col ${isDoneToday ? 'opacity-50' : ''}`}>
                        <span className="text-xs font-semibold uppercase text-muted-foreground">
                            {isLate ? "Rattrapage" : "Aujourd'hui"}
                        </span>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">{target}</span>
                            <span className="text-xs font-medium">Reps</span>
                        </div>
                    </div>

                    {isDoneToday ? (
                        <Button variant="outline" className="flex-1 bg-green-500/10 border-green-500/20 text-green-700 hover:bg-green-500/20 px-2" disabled>
                            <CheckCircle2 className="w-4 h-4 mr-1.5" />
                            Validé
                        </Button>
                    ) : (
                        <Button onClick={handleValidate} disabled={isValidating} className={`flex-1 px-2 ${isLate ? 'bg-orange-500 hover:bg-orange-600' : ''}`}>
                            {isValidating ? <LoadingSpinner size="sm"/> : (isLate ? `Rattraper J${dayIndex + 1}` : "Valider")}
                        </Button>
                    )}
                </>
            ) : (
                /* TEMPLATE: Stats + Button */
                <>
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold uppercase text-muted-foreground">Détails</span>
                        <div className="flex items-baseline gap-2 text-sm">
                           <span>Départ <b>{def.baseAmount}</b></span>
                           <span className="text-muted-foreground/50">•</span>
                           <span>+<b>{def.increment}</b>/j</span>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        className={`flex-1 ${actionButtonClass}`}
                        onClick={() => onJoin?.(def.id)}
                        disabled={isJoining}
                    >
                        {isJoining ? <LoadingSpinner size="sm"/> : "Relever"}
                    </Button>
                </>
            )}
        </div>


      </CardContent>
    </Card>
  );
}
