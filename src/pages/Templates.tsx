import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import {
  DEFAULT_RENFORCEMENT_TEMPLATES,
  DEFAULT_MUSCULATION_TEMPLATES,
  RENFORCEMENT_EXERCISES,
  MUSCULATION_EXERCISES,
} from '@/utils/constants';
import { useSessionStore } from '@/store/sessionStore';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserTemplates } from '@/hooks/useUserTemplates';
import { useHaptic } from '@/hooks/useHaptic';
import { useToast } from '@/hooks/use-toast';
import { CreateTemplateDialog } from '@/components/CreateTemplateDialog';
import { Zap, Dumbbell, ChevronRight, ArrowRight, Plus, Trash2 } from 'lucide-react';
import type { WorkoutTemplate } from '@/firebase/types';
import type { GymSessionExercise } from '@/firebase/types';

type Tab = 'renforcement' | 'musculation';

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onStart,
  onDelete,
}: {
  template: WorkoutTemplate;
  onStart: () => void;
  onDelete?: () => void;
}) {
  const exerciseCount = template.exerciseIds?.length ?? template.muscuExercises?.length ?? 0;

  const previewEmojis =
    template.workoutType === 'renforcement'
      ? (template.exerciseIds ?? [])
          .slice(0, 4)
          .map((id) => RENFORCEMENT_EXERCISES.find((ex) => ex.id === id)?.emoji ?? '💪')
      : (template.muscuExercises ?? [])
          .slice(0, 4)
          .map((me) => MUSCULATION_EXERCISES.find((ex) => ex.id === me.exerciseId)?.emoji ?? '🏋️');

  return (
    <div className="flex items-stretch gap-2">
      <button
        onClick={onStart}
        className="flex-1 flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all text-left"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted flex-shrink-0 text-2xl">
          {template.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
          <div className="flex items-center gap-1 mt-1.5">
            {previewEmojis.map((emoji, i) => (
              <span key={i} className="text-sm">{emoji}</span>
            ))}
            {exerciseCount > 4 && (
              <span className="text-xs text-muted-foreground ml-1">+{exerciseCount - 4}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0 text-muted-foreground">
          <span className="text-xs">{exerciseCount} exo</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {onDelete && (
        <button
          onClick={onDelete}
          className="flex items-center justify-center w-10 rounded-2xl border border-border bg-card hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function Templates() {
  const navigate = useNavigate();
  const haptics = useHaptic();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('renforcement');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { isActive, loadExercisesFromTemplate } = useSessionStore();
  const { phase: gymPhase, loadGymTemplate } = useGymSessionStore();
  const { templates: userTemplates, loading: templatesLoading, create, remove } = useUserTemplates();

  const hasActiveSession = isActive || gymPhase !== 'idle';

  const guardSession = () => {
    if (!hasActiveSession) return false;
    toast({
      title: 'Séance en cours',
      description: "Termine ta séance en cours avant d'en démarrer une nouvelle.",
      variant: 'destructive',
    });
    return true;
  };

  const handleRenforcementTemplate = (template: WorkoutTemplate) => {
    if (!template.exerciseIds || guardSession()) return;
    haptics.impact();
    loadExercisesFromTemplate(template.exerciseIds);
    navigate('/session');
  };

  const handleMuscuTemplate = (template: WorkoutTemplate) => {
    if (!template.muscuExercises || guardSession()) return;
    haptics.impact();
    const gymExercises: GymSessionExercise[] = template.muscuExercises.map((me) => {
      const exercise = MUSCULATION_EXERCISES.find((ex) => ex.id === me.exerciseId);
      return {
        exerciseId: me.exerciseId,
        name: exercise?.name ?? me.exerciseId,
        emoji: exercise?.emoji ?? '🏋️',
        imageUrl: exercise?.imageUrl,
        sets: me.sets.map((s) => ({ ...s, completed: false })),
      };
    });
    loadGymTemplate(gymExercises);
    navigate('/gym');
  };

  const handleStartTemplate = (template: WorkoutTemplate) => {
    if (template.workoutType === 'renforcement') {
      handleRenforcementTemplate(template);
    } else {
      handleMuscuTemplate(template);
    }
  };

  const handleDeleteUserTemplate = async (templateId: string) => {
    try {
      await remove(templateId);
      toast({ title: 'Template supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le template.', variant: 'destructive' });
    }
  };

  const userTemplatesForTab = userTemplates.filter((t) => t.workoutType === activeTab);
  const defaultTemplates =
    activeTab === 'renforcement' ? DEFAULT_RENFORCEMENT_TEMPLATES : DEFAULT_MUSCULATION_TEMPLATES;

  return (
    <PageLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Templates</h1>
            <p className="text-sm text-muted-foreground mt-1">Démarre une séance depuis un programme préétabli.</p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Créer
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setActiveTab('renforcement')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'renforcement'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4 text-orange-500" />
            Renforcement
          </button>
          <button
            onClick={() => setActiveTab('musculation')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'musculation'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Dumbbell className="h-4 w-4 text-blue-500" />
            Musculation
          </button>
        </div>

        {/* Mes templates */}
        {!templatesLoading && userTemplatesForTab.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
              Mes programmes
            </p>
            {userTemplatesForTab.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onStart={() => handleStartTemplate(template)}
                onDelete={() => handleDeleteUserTemplate(template.id)}
              />
            ))}
          </div>
        )}

        {/* Templates par défaut */}
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
            Programmes par défaut
          </p>
          {defaultTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onStart={() => handleStartTemplate(template)}
            />
          ))}
        </div>

        {/* CTA — séance libre */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground text-center mb-3">ou commence une séance sans template</p>
          <button
            onClick={() => {
              if (guardSession()) return;
              navigate(activeTab === 'renforcement' ? '/session' : '/gym');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted transition-all text-sm text-muted-foreground hover:text-foreground"
          >
            Séance libre
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <CreateTemplateDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSave={async (data) => {
          await create(data);
          toast({ title: 'Template créé !', description: data.name });
        }}
      />
    </PageLayout>
  );
}

export default Templates;
