import { useState } from 'react';
import { plural } from '@/utils/formatters';
import { templateExercise } from '@/utils/progression';
import { useLocation, useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import {
  DEFAULT_RENFORCEMENT_TEMPLATES,
  DEFAULT_MUSCULATION_TEMPLATES,
  RENFORCEMENT_EXERCISES,
} from '@/utils/constants';
import { useSessionStore } from '@/store/sessionStore';
import { useGymSessionStore } from '@/store/gymSessionStore';
import { useUserTemplates } from '@/hooks/useUserTemplates';
import { useHaptic } from '@/hooks/useHaptic';
import { useToast } from '@/hooks/use-toast';
import { CreateTemplateDialog } from '@/components/CreateTemplateDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Zap, Dumbbell, ChevronRight, ArrowRight, Plus, Trash2, Pencil } from 'lucide-react';
import type { WorkoutTemplate, GymSessionExercise } from '@/firebase/types';
import { GymTemplatePreviewSheet } from '@/components/GymTemplatePreviewSheet';

type Tab = 'renforcement' | 'musculation';

// Per-device convenience: reopen on the last tab used (saves a tap, and the same template name exists in both tabs)
const TAB_KEY = 'reps_templates_tab';
const lastTab = (): Tab => { try { return localStorage.getItem(TAB_KEY) === 'musculation' ? 'musculation' : 'renforcement'; } catch { return 'renforcement'; } };

// ─── TemplateCard ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onStart,
  onDelete,
  onEdit,
  suggested = false,
}: {
  template: WorkoutTemplate;
  onStart: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  suggested?: boolean;
}) {
  // by type: a template switched type before the fix still carries the other type's list
  const exerciseCount = (template.workoutType === 'renforcement' ? template.exerciseIds : template.muscuExercises)?.length ?? 0;

  const previewEmojis =
    template.workoutType === 'renforcement'
      ? (template.exerciseIds ?? [])
          .slice(0, 4)
          .map((id) => RENFORCEMENT_EXERCISES.find((ex) => ex.id === id)?.emoji ?? '💪')
      : (template.muscuExercises ?? [])
          .slice(0, 4)
          .map((me) => templateExercise(me).emoji);

  return (
    <div className="flex items-stretch gap-2">
      <button
        onClick={onStart}
        className={`relative flex-1 flex items-center gap-4 p-4 rounded-2xl bg-card border hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] transition-all text-left ${suggested ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
      >
        {suggested && (
          <span className="absolute -top-2.5 left-4 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">Conseillé pour toi</span>
        )}
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted flex-shrink-0 text-2xl">
          {template.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{template.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
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
          <span className="text-xs">{plural(exerciseCount, 'exo')}</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {onEdit && (
        <button
          onClick={onEdit}
          aria-label={`Modifier ${template.name}`}
          className="flex items-center justify-center w-11 min-h-[44px] rounded-2xl border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground active:scale-95 transition-all"
        >
          <Pencil className="w-4 h-4" />
        </button>
      )}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label={`Supprimer ${template.name}`}
          className="flex items-center justify-center w-11 min-h-[44px] rounded-2xl border border-border bg-card hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground active:scale-95 transition-all"
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
  const suggested = new URLSearchParams(useLocation().search).get('suggest'); // modèle conseillé par le questionnaire
  const [activeTab, setTab] = useState<Tab>(() => (suggested ? (suggested.startsWith('muscu_') ? 'musculation' : 'renforcement') : lastTab()));
  const setActiveTab = (tab: Tab) => {
    setTab(tab);
    try { localStorage.setItem(TAB_KEY, tab); } catch { /* stockage indisponible */ }
  };
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editing, setEditing] = useState<WorkoutTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);
  // selectors: the whole store re-rendered the page each second of a renfo session (its timer ticks from the bottom bar)
  const isActive = useSessionStore((st) => st.isActive);
  const loadExercisesFromTemplate = useSessionStore((st) => st.loadExercisesFromTemplate);
  const { phase: gymPhase, loadGymTemplate, startExecution, startFreeSession } = useGymSessionStore();
  const { templates: userTemplates, loading: templatesLoading, create, remove, update } = useUserTemplates();

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
    const gymExercises: GymSessionExercise[] = template.muscuExercises.map((me) => ({
      ...templateExercise(me),
      sets: me.sets.map((s) => ({ ...s, completed: false })),
    }));
    loadGymTemplate(gymExercises, template.name);
    startExecution();
    navigate('/gym');
  };

  const handleStartTemplate = (template: WorkoutTemplate) => {
    if (template.workoutType === 'renforcement') {
      handleRenforcementTemplate(template);
    } else {
      if (guardSession()) return;
      setPreviewTemplate(template);
    }
  };

  const handleDeleteUserTemplate = async (templateId: string) => {
    setTemplateToDelete(null);
    try {
      await remove(templateId);
      toast({ title: 'Modèle supprimé' });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de supprimer le modèle.', variant: 'destructive' });
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
            <h2 className="text-2xl font-bold">Modèles de séance</h2>
            <p className="text-sm text-muted-foreground mt-1">Lance une séance en un geste depuis un modèle.</p>
          </div>
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            Créer
          </button>
        </div>

        {/* Tabs */}
        <div role="tablist" className="flex gap-2 p-1 bg-muted rounded-xl">
          <button
            role="tab"
            aria-selected={activeTab === 'renforcement'}
            onClick={() => setActiveTab('renforcement')}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
              activeTab === 'renforcement'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4 text-orange-500" />
            Renforcement
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'musculation'}
            onClick={() => setActiveTab('musculation')}
            className={`flex-1 flex items-center justify-center gap-2 min-h-[44px] rounded-lg text-sm font-medium transition-all ${
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
        <div className="space-y-3">
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
            Mes modèles
          </h2>
          {templatesLoading && <div className="h-20 rounded-2xl bg-muted animate-pulse" />}
          {!templatesLoading && userTemplatesForTab.length === 0 && (
            <button
              onClick={() => setShowCreateDialog(true)}
              className="w-full flex items-center justify-center gap-2 min-h-[44px] py-3 rounded-2xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted transition-all text-sm text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
              Crée ton premier modèle
            </button>
          )}
          {userTemplatesForTab.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onStart={() => handleStartTemplate(template)}
              onDelete={() => setTemplateToDelete(template)}
              onEdit={() => setEditing(template)}
            />
          ))}
        </div>

        {/* Templates par défaut */}
        <div className="space-y-3">
          <h2 className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-1">
            Modèles proposés
          </h2>
          {defaultTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              suggested={template.id === suggested}
              onStart={() => handleStartTemplate(template)}
            />
          ))}
        </div>

        {/* CTA — séance libre */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground text-center mb-3">ou commence une séance sans modèle</p>
          <button
            onClick={() => {
              if (guardSession()) return;
              if (activeTab === 'renforcement') return navigate('/session');
              startFreeSession(); // an idle /gym sends the user back to Home
              navigate('/gym');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border hover:border-primary/40 hover:bg-muted transition-all text-sm text-muted-foreground hover:text-foreground"
          >
            Séance libre
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <GymTemplatePreviewSheet
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
        onStart={(t) => { setPreviewTemplate(null); handleMuscuTemplate(t); }}
      />

      <Dialog open={templateToDelete !== null} onOpenChange={(open) => { if (!open) setTemplateToDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce modèle ?</DialogTitle>
            <DialogDescription>
              {templateToDelete?.name} sera supprimé. Cette action est définitive.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => setTemplateToDelete(null)} className="flex-1">
              Annuler
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => { if (templateToDelete) handleDeleteUserTemplate(templateToDelete.id); }}
            >
              Supprimer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateTemplateDialog
        open={showCreateDialog || !!editing}
        initial={editing}
        onClose={() => { setShowCreateDialog(false); setEditing(null); }}
        onSave={async (data) => {
          if (editing) {
            await update(editing.id, data);
            toast({ title: 'Modèle modifié', description: data.name });
          } else {
            await create(data);
            toast({ title: 'Modèle créé !', description: data.name });
          }
        }}
      />
    </PageLayout>
  );
}

export default Templates;
