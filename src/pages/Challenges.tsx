import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BackButton } from '@/components/BackButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import {
    CHALLENGE_TEMPLATES,
    joinChallenge,
    ChallengeDefinition
} from '@/firebase/challenges';
import { useChallenges } from '@/hooks/useChallenges';
import { Trophy, Clock } from 'lucide-react';

function Challenges() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserStore();
  const { activeChallenges, isLoading, refreshChallenges } = useChallenges();
  const [isJoining, setIsJoining] = useState<string | null>(null);

  const handleJoin = async (challengeId: string) => {
    if (!user) return;
    setIsJoining(challengeId);
    try {
        await joinChallenge(user.uid, challengeId);
        toast({
            title: "C'est parti ! 🚀",
            description: "Le défi a été ajouté à ta liste.",
        });
        refreshChallenges();
        navigate('/'); // Redirect to home (requested requirement)
    } catch (error: any) {
        toast({
            title: "Erreur",
            description: error.message || "Impossible de rejoindre le défi",
            variant: "destructive"
        });
    } finally {
        setIsJoining(null);
    }
  };

  // Filter out challenges already active
  const availableChallenges = CHALLENGE_TEMPLATES.filter(
    template => !activeChallenges.some(ac => ac.challengeId === template.id)
  );

  // Categorize by difficulty
  const easyChallenges = availableChallenges.filter(c => c.difficulty === 'easy');
  const mediumChallenges = availableChallenges.filter(c => c.difficulty === 'medium');
  const hardChallenges = availableChallenges.filter(c => c.difficulty === 'hard');

  if (isLoading) {
    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <LoadingSpinner size="lg" />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto p-4 pt-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <BackButton to="/" />
          <h1 className="text-2xl font-bold">Défis</h1>
          <div className="w-10" />
        </div>

        {/* Active Challenges List */}
        {activeChallenges.length > 0 && (
            <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    En cours
                </h2>
                <div className="space-y-4">
                    {activeChallenges.map(ac => {
                        const template = CHALLENGE_TEMPLATES.find(t => t.id === ac.challengeId);
                        if (!template) return null;

                        return (
                           <Card key={ac.id} className="border-primary/20 bg-primary/5">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold">{template.title}</h3>
                                        <p className="text-sm text-muted-foreground">
                                           {Math.round((ac.totalProgress / (template.durationDays * template.baseAmount)) * 10 || 0)}% complété
                                        </p>
                                    </div>
                                    <Button size="sm" variant="outline" onClick={() => navigate('/')}>
                                        Voir
                                    </Button>
                                </CardContent>
                           </Card>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Available Challenges */}
        <div className="space-y-8">
            <Section title="Pour commencer (Facile)" challenges={easyChallenges} onJoin={handleJoin} isJoining={isJoining} />
            <Section title="Pour progresser (Moyen)" challenges={mediumChallenges} onJoin={handleJoin} isJoining={isJoining} />
            <Section title="Pour les guerriers (Difficile)" challenges={hardChallenges} onJoin={handleJoin} isJoining={isJoining} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, challenges, onJoin, isJoining }: { title: string, challenges: ChallengeDefinition[], onJoin: (id: string) => void, isJoining: string | null }) {
    if (challenges.length === 0) return null;

    return (
        <div>
             <h2 className="text-lg font-semibold mb-3">{title}</h2>
             <div className="grid gap-3">
                {challenges.map(challenge => (
                    <Card key={challenge.id} className="hover:border-primary/50 transition-colors">
                        <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl h-10 w-10 flex items-center justify-center bg-muted rounded-full">
                                        {challenge.exerciseId === 'pushups' ? '💪' :
                                         challenge.exerciseId === 'pullups' ? '🧗' :
                                         challenge.exerciseId === 'squats' ? '🦵' : '🦅'}
                                    </span>
                                    <div>
                                        <h3 className="font-bold">{challenge.title}</h3>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {challenge.durationDays} jours
                                            </span>
                                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">
                                                +{challenge.increment} / jour
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="text-sm text-muted-foreground mb-4">
                                {challenge.description}
                            </p>

                            <Button
                                className="w-full"
                                variant="secondary"
                                disabled={isJoining !== null}
                                onClick={() => onJoin(challenge.id)}
                            >
                                {isJoining === challenge.id ? <LoadingSpinner size="sm" /> : "Relever le défi"}
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default Challenges;
