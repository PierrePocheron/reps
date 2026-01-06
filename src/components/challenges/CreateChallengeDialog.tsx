import { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { DEFAULT_EXERCISES } from '@/utils/constants';
import { createCustomChallenge, ChallengeDifficulty } from '@/firebase/challenges';
import { useUserStore } from '@/store/userStore';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Plus, Trophy, Calendar, Zap } from 'lucide-react';

interface CreateChallengeDialogProps {
    onChallengeCreated: () => void;
}

export function CreateChallengeDialog({ onChallengeCreated }: CreateChallengeDialogProps) {
    const { user } = useUserStore();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form Stats
    const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
    const [duration, setDuration] = useState<number>(30);
    const [difficulty, setDifficulty] = useState<ChallengeDifficulty>('medium');

    const reset = () => {
        setStep(1);
        setSelectedExercise(null);
        setDuration(30);
        setDifficulty('medium');
    };

    const handleCreate = async () => {
        if (!user || !selectedExercise) return;
        setIsSubmitting(true);
        try {
            await createCustomChallenge(user.uid, selectedExercise, duration, difficulty);
            toast({
                title: "Défi personnalisé créé ! 🔥",
                description: "C'est parti, bon courage !",
            });
            onChallengeCreated();
            setOpen(false);
            reset();
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message || "Impossible de créer le défi",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getDifficultyParams = (diff: ChallengeDifficulty) => {
        let base = 1, inc = 1;
        switch (diff) {
            case 'easy': base = 5; inc = 1; break;
            case 'medium': base = 10; inc = 2; break;
            case 'hard': base = 20; inc = 3; break;
            case 'extreme': base = 30; inc = 5; break;
        }
        return { base, inc };
    }

    const getEstimatedTotal = (diff: ChallengeDifficulty, days: number): number => {
        const { base, inc } = getDifficultyParams(diff);
        // Arithmetic sum: n/2 * (2a + (n-1)d)
        return Math.round((days / 2) * (2 * base + (days - 1) * inc));
    };

    const getDifficultyText = (diff: ChallengeDifficulty) => {
        const { base, inc } = getDifficultyParams(diff);
        return `Commence à ${base} reps, +${inc} par jour`;
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <div className="border-2 border-dashed border-primary/30 rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-primary/5 transition-colors group">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <div className="text-center">
                        <h3 className="font-bold text-foreground">Créer mon propre défi</h3>
                        <p className="text-sm text-muted-foreground">Choisis l'exercice, la durée et la difficulté</p>
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Créer un défi personnalisé</DialogTitle>
                    <DialogDescription>
                        {step === 1 && "Étape 1/3 : Choisis ton exercice"}
                        {step === 2 && "Étape 2/3 : Combien de temps ?"}
                        {step === 3 && "Étape 3/3 : Quelle difficulté ?"}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {/* STEP 1: EXERCISE */}
                    {step === 1 && (
                        <div className="grid grid-cols-2 gap-3">
                            {DEFAULT_EXERCISES.map(ex => (
                                <button
                                    key={ex.id}
                                    onClick={() => setSelectedExercise(ex.id)}
                                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                                        selectedExercise === ex.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-muted hover:border-primary/50'
                                    }`}
                                >
                                    <span className="text-3xl">{ex.emoji}</span>
                                    <span className="font-medium text-sm">{ex.name}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 2: DURATION */}
                    {step === 2 && (
                        <div className="space-y-3">
                            {[7, 30, 60, 90, 365].map(d => {
                                const isSelected = duration === d;
                                let title = '', desc = '';
                                let baseColor = '', dotColor = '';

                                if (d === 7) {
                                    title = '7 Jours'; desc = 'Découverte express';
                                    baseColor = 'text-sky-500 border-sky-500/30 bg-sky-500/5'; dotColor = 'bg-sky-500';
                                }
                                if (d === 30) {
                                    title = '30 Jours'; desc = 'Idéal pour commencer';
                                    baseColor = 'text-green-500 border-green-500/30 bg-green-500/5'; dotColor = 'bg-green-500';
                                }
                                if (d === 60) {
                                    title = '60 Jours'; desc = 'Pour ancrer l\'habitude';
                                    baseColor = 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5'; dotColor = 'bg-yellow-500';
                                }
                                if (d === 90) {
                                    title = '90 Jours'; desc = 'Transformation complète';
                                    baseColor = 'text-orange-500 border-orange-500/30 bg-orange-500/5'; dotColor = 'bg-orange-500';
                                }
                                if (d === 365) {
                                    title = '1 An'; desc = 'Mode Spartan activé';
                                    baseColor = 'text-red-500 border-red-500/30 bg-red-500/5'; dotColor = 'bg-red-500';
                                }

                                // Style logic matching Step 3
                                let finalClass = 'border-muted hover:bg-muted/50';
                                if (isSelected) {
                                     // Override border to be solid color
                                    finalClass = `border-2 ${baseColor.replace('/30', '')} ${baseColor.split(' ')[0]} ${baseColor.split(' ')[2]}`;
                                }

                                return (
                                    <button
                                        key={d}
                                        onClick={() => setDuration(d)}
                                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${finalClass}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isSelected ? `text-white ${dotColor}` : 'bg-muted text-muted-foreground'}`}>
                                                <Calendar className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <div className="font-bold">{title}</div>
                                                <div className="text-xs text-muted-foreground">{desc}</div>
                                            </div>
                                        </div>
                                        {isSelected && <div className={`h-3 w-3 rounded-full ${dotColor}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* STEP 3: DIFFICULTY */}
                    {step === 3 && (
                        <div className="space-y-3">
                            {(['easy', 'medium', 'hard', 'extreme'] as const).map(diff => {
                                const total = getEstimatedTotal(diff, duration);
                                const isSelected = difficulty === diff;

                                let baseColor = '';
                                let dotColor = '';
                                let label = '';

                                if (diff === 'easy') { baseColor = 'text-green-500 border-green-500/30 bg-green-500/5'; dotColor = 'bg-green-500'; label = 'Facile'; }
                                if (diff === 'medium') { baseColor = 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5'; dotColor = 'bg-yellow-500'; label = 'Moyen'; }
                                if (diff === 'hard') { baseColor = 'text-orange-500 border-orange-500/30 bg-orange-500/5'; dotColor = 'bg-orange-500'; label = 'Difficile'; }
                                if (diff === 'extreme') { baseColor = 'text-red-500 border-red-500/30 bg-red-500/5'; dotColor = 'bg-red-500'; label = 'Extrême'; }

                                // If selected, use strong border matching the color instead of ring-primary
                                const activeClass = isSelected
                                    ? `border-2 ${baseColor.replace('/30', '')} ${baseColor.split(' ')[0]} ${baseColor.split(' ')[2]}` // Remove /30 from border, keep text/bg
                                    : 'border-muted hover:bg-muted/50';

                                // Simplify activeClass logic:
                                // If selected: border-[color] (solid), bg-[color]/5, text-[color]
                                let finalClass = 'border-muted hover:bg-muted/50';
                                if (isSelected) {
                                     // Override border to be solid color
                                     if (diff === 'easy') finalClass = 'border-green-500 bg-green-500/5 text-green-500';
                                     if (diff === 'medium') finalClass = 'border-yellow-500 bg-yellow-500/5 text-yellow-500';
                                     if (diff === 'hard') finalClass = 'border-orange-500 bg-orange-500/5 text-orange-500';
                                     if (diff === 'extreme') finalClass = 'border-red-500 bg-red-500/5 text-red-500';
                                }

                                return (
                                    <button
                                        key={diff}
                                        onClick={() => setDifficulty(diff)}
                                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${finalClass}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Zap className={`w-5 h-5 ${
                                                diff === 'easy' ? 'text-green-500' :
                                                diff === 'medium' ? 'text-yellow-500' :
                                                diff === 'hard' ? 'text-orange-500' : 'text-red-500'
                                            }`} />
                                            <div className="text-left">
                                                <div className="font-bold capitalize">{label}</div>
                                                <div className="text-xs text-foreground/80 font-medium">{getDifficultyText(diff)}</div>
                                                <div className="text-xs text-muted-foreground">Total ≈ {total.toLocaleString()} reps</div>
                                            </div>
                                        </div>
                                        {isSelected && <div className={`h-3 w-3 rounded-full ${dotColor}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                     {step > 1 && (
                        <Button variant="outline" onClick={() => setStep(prev => (prev - 1) as any)}>
                            Retour
                        </Button>
                    )}
                    {step < 3 ? (
                         <Button onClick={() => setStep(prev => (prev + 1) as any)} disabled={!selectedExercise} className="w-full">
                            Suivant
                        </Button>
                    ) : (
                        <Button onClick={handleCreate} disabled={isSubmitting} className="w-full">
                            {isSubmitting ? <LoadingSpinner size="sm" /> : "Créer le défi !"}
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
