import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const NUM_INPUT = 'text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const onFocusSelect = (e: React.FocusEvent<HTMLInputElement>) => e.target.select();
import { RENFORCEMENT_EXERCISES, MUSCULATION_EXERCISES } from '@/utils/constants';
import { Zap, Dumbbell, Plus, Trash2, X, ChevronDown, ChevronUp } from 'lucide-react';
import type { WorkoutTemplate } from '@/firebase/types';

type WorkoutType = 'renforcement' | 'musculation';

interface MuscuExercise {
  exerciseId: string;
  name: string;
  emoji: string;
  sets: { reps: number; weight: number }[];
}

const EMOJI_OPTIONS = ['💪', '🏋️', '🔥', '⚡', '🦵', '🧗', '⚓', '🏃', '🎯', '🥊', '🧘', '🤸', '🦾', '🏅', '⚽'];

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
}

export function CreateTemplateDialog({ open, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('💪');
  const [workoutType, setWorkoutType] = useState<WorkoutType>('renforcement');
  const [selectedIds, setSelectedIds] = useState<string[]>([]); // renforcement
  const [muscuExercises, setMuscuExercises] = useState<MuscuExercise[]>([]); // musculation
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedEx, setExpandedEx] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setName(''); setEmoji('💪'); setWorkoutType('renforcement');
    setSelectedIds([]); setMuscuExercises([]); setShowExercisePicker(false); setSaving(false);
    onClose();
  };

  const switchType = (type: WorkoutType) => {
    setWorkoutType(type);
    setSelectedIds([]);
    setMuscuExercises([]);
    setShowExercisePicker(false);
  };

  // ── Renforcement helpers ──────────────────────────────────────────────────

  const toggleRenfoExercise = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Musculation helpers ───────────────────────────────────────────────────

  const addMuscuExercise = (exerciseId: string) => {
    const ex = MUSCULATION_EXERCISES.find((e) => e.id === exerciseId);
    if (!ex || muscuExercises.some((m) => m.exerciseId === exerciseId)) return;
    setMuscuExercises((prev) => [
      ...prev,
      { exerciseId, name: ex.name, emoji: ex.emoji ?? '🏋️', sets: [{ reps: 10, weight: 0 }] },
    ]);
    setExpandedEx(exerciseId);
  };

  const removeMuscuExercise = (exerciseId: string) => {
    setMuscuExercises((prev) => prev.filter((m) => m.exerciseId !== exerciseId));
  };

  const addSet = (exerciseId: string) => {
    setMuscuExercises((prev) =>
      prev.map((m) =>
        m.exerciseId === exerciseId
          ? { ...m, sets: [...m.sets, { ...m.sets[m.sets.length - 1]! }] }
          : m
      )
    );
  };

  const removeSet = (exerciseId: string, setIndex: number) => {
    setMuscuExercises((prev) =>
      prev.map((m) =>
        m.exerciseId === exerciseId
          ? { ...m, sets: m.sets.filter((_, i) => i !== setIndex) }
          : m
      )
    );
  };

  const updateSet = (exerciseId: string, setIndex: number, field: 'reps' | 'weight', value: number) => {
    setMuscuExercises((prev) =>
      prev.map((m) =>
        m.exerciseId === exerciseId
          ? { ...m, sets: m.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)) }
          : m
      )
    );
  };

  // ── Save ─────────────────────────────────────────────────────────────────

  const canSave =
    name.trim().length > 0 &&
    (workoutType === 'renforcement' ? selectedIds.length > 0 : muscuExercises.length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const exerciseNames =
        workoutType === 'renforcement'
          ? selectedIds
              .map((id) => RENFORCEMENT_EXERCISES.find((e) => e.id === id)?.name)
              .filter(Boolean)
              .slice(0, 3)
              .join(' · ')
          : muscuExercises
              .map((m) => m.name)
              .slice(0, 3)
              .join(' · ');

      await onSave({
        name: name.trim(),
        description: exerciseNames,
        emoji,
        workoutType,
        ...(workoutType === 'renforcement'
          ? { exerciseIds: selectedIds }
          : {
              muscuExercises: muscuExercises.map((m) => ({
                exerciseId: m.exerciseId,
                sets: m.sets,
              })),
            }),
      });
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  const exercises = workoutType === 'renforcement' ? RENFORCEMENT_EXERCISES : MUSCULATION_EXERCISES;
  const pickerSelected =
    workoutType === 'renforcement'
      ? selectedIds
      : muscuExercises.map((m) => m.exerciseId);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Sheet */}
      <div className="relative z-10 w-full sm:max-w-md bg-background rounded-t-3xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b shrink-0">
          <h2 className="font-semibold text-base">Nouveau template</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* Nom + Emoji */}
          <div className="flex gap-3 items-start">
            {/* Emoji picker */}
            <div className="space-y-1.5 shrink-0">
              <p className="text-xs text-muted-foreground font-medium">Icône</p>
              <div className="text-2xl w-12 h-10 flex items-center justify-center rounded-xl bg-muted border">
                {emoji}
              </div>
              <div className="grid grid-cols-3 gap-1 w-[52px]">
                {EMOJI_OPTIONS.slice(0, 9).map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`text-base rounded-lg w-full aspect-square flex items-center justify-center transition-colors ${
                      emoji === e ? 'bg-primary/20 ring-1 ring-primary' : 'hover:bg-muted'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">Nom</p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mon programme..."
                maxLength={40}
                autoFocus
              />
            </div>
          </div>

          {/* Type de séance */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground font-medium">Type de séance</p>
            <div className="flex gap-2 p-1 bg-muted rounded-xl">
              {(['renforcement', 'musculation'] as WorkoutType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => switchType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                    workoutType === t
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'renforcement' ? (
                    <Zap className="h-3.5 w-3.5 text-orange-500" />
                  ) : (
                    <Dumbbell className="h-3.5 w-3.5 text-blue-500" />
                  )}
                  {t === 'renforcement' ? 'Renforcement' : 'Musculation'}
                </button>
              ))}
            </div>
          </div>

          {/* Exercices sélectionnés */}
          {workoutType === 'renforcement' && selectedIds.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground font-medium">
                Exercices ({selectedIds.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedIds.map((id) => {
                  const ex = RENFORCEMENT_EXERCISES.find((e) => e.id === id);
                  if (!ex) return null;
                  return (
                    <span
                      key={id}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-sm"
                    >
                      {ex.emoji} {ex.name}
                      <button onClick={() => toggleRenfoExercise(id)}>
                        <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {workoutType === 'musculation' && muscuExercises.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground font-medium">
                Exercices ({muscuExercises.length})
              </p>
              {muscuExercises.map((m) => (
                <div key={m.exerciseId} className="bg-muted/50 rounded-xl border overflow-hidden">
                  {/* Exercise header */}
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="text-lg">{m.emoji}</span>
                    <span className="flex-1 text-sm font-medium">{m.name}</span>
                    <span className="text-xs text-muted-foreground">{m.sets.length} série{m.sets.length > 1 ? 's' : ''}</span>
                    <button
                      onClick={() => setExpandedEx(expandedEx === m.exerciseId ? null : m.exerciseId)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {expandedEx === m.exerciseId ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => removeMuscuExercise(m.exerciseId)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Sets editor */}
                  {expandedEx === m.exerciseId && (
                    <div className="border-t px-3 py-2 space-y-2">
                      {m.sets.map((s, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-14">Série {i + 1}</span>
                          <div className="flex items-center gap-1 flex-1">
                            <Input
                              type="number"
                              value={s.reps}
                              min={1}
                              onChange={(e) => updateSet(m.exerciseId, i, 'reps', Number(e.target.value))}
                              onFocus={onFocusSelect}
                              className={`h-8 text-sm w-16 ${NUM_INPUT}`}
                            />
                            <span className="text-xs text-muted-foreground">reps</span>
                            <Input
                              type="number"
                              value={s.weight}
                              min={0}
                              onChange={(e) => updateSet(m.exerciseId, i, 'weight', Number(e.target.value))}
                              onFocus={onFocusSelect}
                              className={`h-8 text-sm w-20 ${NUM_INPUT}`}
                            />
                            <span className="text-xs text-muted-foreground">kg</span>
                          </div>
                          {m.sets.length > 1 && (
                            <button onClick={() => removeSet(m.exerciseId, i)}>
                              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addSet(m.exerciseId)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-xs font-medium mt-1"
                      >
                        <Plus className="w-3 h-3" /> Série {m.sets.length + 1}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Picker d'exercices */}
          <div className="space-y-2">
            <button
              onClick={() => setShowExercisePicker((p) => !p)}
              className="flex items-center gap-2 text-sm text-primary font-medium"
            >
              <Plus className="w-4 h-4" />
              Ajouter un exercice
            </button>

            {showExercisePicker && (
              <div className="border rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                {exercises.map((ex) => {
                  const isSelected = pickerSelected.includes(ex.id);
                  return (
                    <button
                      key={ex.id}
                      disabled={isSelected}
                      onClick={() => {
                        workoutType === 'renforcement'
                          ? toggleRenfoExercise(ex.id)
                          : addMuscuExercise(ex.id);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors border-b last:border-b-0 ${
                        isSelected
                          ? 'opacity-40 cursor-default bg-muted/30'
                          : 'hover:bg-muted active:bg-muted/80'
                      }`}
                    >
                      <span className="text-base">{ex.emoji}</span>
                      <span className="flex-1">{ex.name}</span>
                      {isSelected && <span className="text-xs text-muted-foreground">Ajouté</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-8 pt-3 border-t shrink-0">
          <Button
            className="w-full"
            disabled={!canSave || saving}
            onClick={handleSave}
          >
            {saving ? 'Sauvegarde...' : 'Sauvegarder le template'}
          </Button>
        </div>
      </div>
    </div>
  );
}
