import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { BackButton } from '@/components/BackButton';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';
import {
    joinChallenge,
    ChallengeDefinition,
    getDayIndex,
    CHALLENGE_TEMPLATES
} from '@/firebase/challenges';
import { useChallenges } from '@/hooks/useChallenges';
import { Trophy, CheckCircle2, ChevronDown } from 'lucide-react';
import { ChallengeCard } from '@/components/challenges/ChallengeCard';
import { CreateChallengeDialog } from '@/components/challenges/CreateChallengeDialog';

function Challenges() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useUserStore();
  const { activeChallenges, isLoading, refreshChallenges } = useChallenges();
  const dailyDoneCount = activeChallenges.filter(c =>
    c.history.length > getDayIndex(c.startDate, new Date())
  ).length;
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
                    En cours <span className="text-muted-foreground text-sm font-normal">({dailyDoneCount}/{activeChallenges.length})</span>
                </h2>

                <div className="space-y-4">
                     {/* Todo Challenges */}
                     <div className="grid grid-cols-2 gap-3">
                        {activeChallenges
                            .filter(c => c.history.length <= getDayIndex(c.startDate, new Date()))
                            .map(ac => (
                             <ChallengeCard
                                key={ac.id}
                                userId={user?.uid || ''}
                                activeChallenge={ac}
                                detailed={true}
                            />
                        ))}
                    </div>

                    {/* Collapsible Done Challenges */}
                    {activeChallenges.some(c => c.history.length > getDayIndex(c.startDate, new Date())) && (
                        <details className="group">
                            <summary className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors py-2 select-none">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Défis validés aujourd'hui</span>
                                <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="grid grid-cols-2 gap-3 mt-3 animate-in slide-in-from-top-2 fade-in duration-200">
                                {activeChallenges
                                    .filter(c => c.history.length > getDayIndex(c.startDate, new Date()))
                                    .map(ac => (
                                    <ChallengeCard
                                        key={ac.id}
                                        userId={user?.uid || ''}
                                        activeChallenge={ac}
                                        detailed={true}
                                    />
                                ))}
                            </div>
                        </details>
                    )}
                 </div>
            </div>
        )}

        {/* Available Challenges */}
        <div className="space-y-8">
            <CreateChallengeDialog onChallengeCreated={() => {
                refreshChallenges();
                navigate('/'); // Redirect home after creation
            }} />

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
             <div className="grid grid-cols-2 gap-3">
                {challenges.map(challenge => (
                    <ChallengeCard
                        key={challenge.id}
                        userId="" // Not needed for template mode
                        template={challenge}
                        onJoin={onJoin}
                        isJoining={isJoining === challenge.id}
                    />
                ))}
            </div>
        </div>
    );
}

export default Challenges;
