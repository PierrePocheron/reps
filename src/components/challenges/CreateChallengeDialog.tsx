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
                        <div className="grid grid-cols-2 gap-3">
                            {[30, 60, 90, 365].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setDuration(d)}
                                    className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${
                                        duration === d
                                            ? 'border-primary bg-primary/10'
                                            : 'border-muted hover:border-primary/50'
                                    }`}
                                >
                                    <Calendar className="w-6 h-6 text-primary" />
                                    <span className="font-bold">{d === 365 ? '1 An' : `${d} Jours`}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* STEP 3: DIFFICULTY */}
                    {step === 3 && (
                        <div className="space-y-3">
                            {(['easy', 'medium', 'hard', 'extreme'] as const).map(diff => {
                                const total = getEstimatedTotal(diff, duration);
                                const isSelected = difficulty === diff;

                                let colorClass = '';
                                if (diff === 'easy') colorClass = 'text-green-500 border-green-500/30 bg-green-500/5';
                                if (diff === 'medium') colorClass = 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5';
                                if (diff === 'hard') colorClass = 'text-orange-500 border-orange-500/30 bg-orange-500/5';
                                if (diff === 'extreme') colorClass = 'text-red-500 border-red-500/30 bg-red-500/5';

                                return (
                                    <button
                                        key={diff}
                                        onClick={() => setDifficulty(diff)}
                                        className={`w-full p-3 rounded-lg border-2 flex items-center justify-between transition-all ${
                                            isSelected ? `ring-2 ring-primary ${colorClass}` : 'border-muted hover:bg-muted/50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Zap className={`w-5 h-5 ${
                                                diff === 'easy' ? 'text-green-500' :
                                                diff === 'medium' ? 'text-yellow-500' :
                                                diff === 'hard' ? 'text-orange-500' : 'text-red-500'
                                            }`} />
                                            <div className="text-left">
                                                <div className="font-bold capitalize">{diff === 'extreme' ? 'Extrême' : diff}</div>
                                                <div className="text-xs text-foreground/80 font-medium">{getDifficultyText(diff)}</div>
                                                <div className="text-xs text-muted-foreground">Total ≈ {total.toLocaleString()} reps</div>
                                            </div>
                                        </div>
                                        {isSelected && <div className="h-3 w-3 rounded-full bg-primary" />}
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
