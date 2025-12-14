import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ExerciseCard } from '@/components/ExerciseCard';
import { Timer } from '@/components/Timer';
import { AddExerciseDialog } from '@/components/AddExerciseDialog';
import { BackButton } from '@/components/BackButton';
import { EmptyState } from '@/components/EmptyState';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { Play, Square, Plus, Dumbbell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

function Session() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const {
    isActive,
    startTime,
    exercises,
    totalReps,
    startSession,
    endSession,
    addExercise,
    removeExercise,
    addReps,
    hasExercise,
    getAvailableExercises,
    addCustomExercise,
  } = useSession();

  const [removingExercise, setRemovingExercise] = useState<string | null>(null);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);

  // Rediriger si non authentifié
  if (!isAuthenticated) {
    navigate('/');
    return null;
  }

  const handleStartSession = () => {
    startSession();
    toast({
      title: 'Séance démarrée',
      description: 'Bonne séance ! 💪',
    });
  };

  const handleEndSession = async () => {
    try {
      await endSession();
      toast({
        title: 'Séance terminée',
        description: `Bravo ! ${totalReps} reps accomplies 🎉`,
      });
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder la séance',
        variant: 'destructive',
      });
    }
  };

  const handleAddDefaultExercise = (exerciseId: string) => {
    const exercise = getAvailableExercises().find((ex) => ex.id === exerciseId);
    if (exercise && !hasExercise(exercise.name)) {
      addExercise(exercise);
    }
  };

  const handleAddCustomExercise = (name: string, emoji: string) => {
    addCustomExercise(name, emoji);
  };

  const handleLongPress = (exerciseName: string) => {
    setRemovingExercise(exerciseName);
  };

  const handleRemoveExercise = (exerciseName: string) => {
    removeExercise(exerciseName);
    setRemovingExercise(null);
  };

  if (!isActive) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="mx-auto max-w-2xl">
          <BackButton to="/" className="mb-6" />
          <EmptyState
            icon={<Dumbbell className="h-16 w-16 text-primary" />}
            title="Prêt à commencer ?"
            description="Démarrez une nouvelle séance d'entraînement et suivez vos progrès en temps réel"
            action={
              <Button onClick={handleStartSession} size="lg" className="mt-4">
                <Play className="mr-2 h-5 w-5" />
                Démarrer la séance
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header avec timer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BackButton to="/" />
            <h2 className="text-2xl font-bold">Séance en cours</h2>
          </div>
          <Timer startTime={startTime} isActive={isActive} />
        </div>

        {/* Total reps */}
        <div className="text-center p-6 bg-primary/10 rounded-lg">
          <p className="text-sm text-muted-foreground mb-1">Total</p>
          <p className="text-4xl font-bold text-primary">{totalReps}</p>
          <p className="text-sm text-muted-foreground mt-1">reps</p>
        </div>

        {/* Exercices */}
        {exercises.length > 0 ? (
          <div className="space-y-3">
            <AnimatePresence>
              {exercises.map((exercise) => (
                <ExerciseCard
                  key={exercise.name}
                  exercise={exercise}
                  onAddReps={(reps) => addReps(exercise.name, reps)}
                  onRemove={() => handleRemoveExercise(exercise.name)}
                  isRemoving={removingExercise === exercise.name}
                  onLongPress={() => handleLongPress(exercise.name)}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <EmptyState
            icon={<Dumbbell className="h-12 w-12 text-muted-foreground" />}
            title="Aucun exercice ajouté"
            description="Ajoutez des exercices pour commencer à suivre vos reps"
            action={
              <Button
                variant="outline"
                onClick={() => setShowExerciseDialog(true)}
                size="lg"
              >
                <Plus className="mr-2 h-5 w-5" />
                Ajouter un exercice
              </Button>
            }
          />
        )}

        {/* Bouton ajouter exercice */}
        <AddExerciseDialog
          open={showExerciseDialog}
          onOpenChange={setShowExerciseDialog}
          onAddDefault={handleAddDefaultExercise}
          onAddCustom={handleAddCustomExercise}
          hasExercise={hasExercise}
        />
        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => setShowExerciseDialog(true)}
        >
          <Plus className="h-5 w-5 mr-2" />
          Ajouter un exercice
        </Button>

        {/* Bouton terminer */}
        <Button
          onClick={handleEndSession}
          variant="destructive"
          size="lg"
          className="w-full"
        >
          <Square className="h-5 w-5 mr-2" />
          Terminer la séance
        </Button>
      </div>
    </div>
  );
}

export default Session;
