import { useEffect, useState } from 'react';
import { Copy, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/userStore';
import { createUserTemplate, getUserTemplates } from '@/firebase/templates';
import type { User, WorkoutTemplate } from '@/firebase/types';
import { logger } from '@/utils/logger';
import { isOffline } from '@/firebase/offline';
import { EXERCISE_CDN } from '@/components/ExerciseImage';

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const count = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/**
 * A friend's template holds whatever they wrote (no schema in the rules), and the copy becomes mine: only the fields
 * the app writes, typed. An image is kept only from the exercise library (catalogue ones come from the app itself).
 */
function templateFields(t: WorkoutTemplate): Omit<WorkoutTemplate, 'id' | 'userId' | 'createdAt'> {
  const text = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);
  if (t.workoutType !== 'musculation') {
    return { name: text(t.name, ''), description: text(t.description, ''), emoji: text(t.emoji, '🏋️'), workoutType: 'renforcement',
      exerciseIds: list(t.exerciseIds).filter((id): id is string => typeof id === 'string') };
  }
  const muscuExercises = list(t.muscuExercises).flatMap((e) => {
    const { exerciseId, name, emoji, imageUrl, timed, sets } = (e ?? {}) as Record<string, unknown>;
    if (typeof exerciseId !== 'string') return [];
    return [{
      exerciseId,
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof emoji === 'string' ? { emoji } : {}),
      ...(typeof imageUrl === 'string' && imageUrl.startsWith(EXERCISE_CDN) ? { imageUrl } : {}),
      ...(typeof timed === 'boolean' ? { timed } : {}),
      sets: list(sets).map((set) => {
        const { reps, weight } = (set ?? {}) as Record<string, unknown>;
        return { reps: count(reps), weight: count(weight) };
      }),
    }];
  });
  return { name: text(t.name, ''), description: text(t.description, ''), emoji: text(t.emoji, '🏋️'), workoutType: 'musculation', muscuExercises };
}

/** A copy keeps the name, type and exercises: how a template already copied is recognised in mine. */
const signature = (t: WorkoutTemplate) =>
  JSON.stringify([t.name, t.workoutType, t.exerciseIds ?? [], (t.muscuExercises ?? []).map((e) => e.exerciseId)]);

/** Modèles d'un ami, copiables en un tap (Hevy) : la copie devient un modèle perso modifiable. */
export function FriendTemplatesDialog({ friend, onClose }: { friend: User | null; onClose: () => void }) {
  const me = useUserStore((s) => s.user);
  const myUid = me?.uid;
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WorkoutTemplate[] | null>(null);
  const [copied, setCopied] = useState<string[]>([]);
  const [copying, setCopying] = useState<string | null>(null); // a second tap while offline made a duplicate
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (!friend) return;
    setTemplates(null); setCopied([]);
    // [] when refused (rules not deployed yet); mine too: reopening offered « Copier » again on a copied one (duplicate)
    Promise.all([getUserTemplates(friend.uid), myUid ? getUserTemplates(myUid) : []]).then(([theirs, mine]) => {
      const owned = new Set(mine.map(signature));
      const clean = theirs.map((t) => ({ ...templateFields(t), id: t.id })); // shown and copied as typed fields only
      setCopied(clean.filter((t) => owned.has(signature(t))).map((t) => t.id));
      setOffline(theirs.length === 0 && isOffline()); // nothing cached: « no template » would be a guess
      setTemplates(clean);
    });
  }, [friend, myUid]);

  const copy = async (t: WorkoutTemplate) => {
    if (!me || copying || copied.includes(t.id)) return;
    setCopying(t.id);
    try {
      await createUserTemplate(me.uid, templateFields(t));
      setCopied((c) => [...c, t.id]);
      toast({ title: 'Modèle copié', description: `«\u00a0${t.name}\u00a0» est dans tes modèles.` });
    } catch (err) {
      logger.error('Copie du modèle :', err);
      toast({ title: 'Erreur', description: "Le modèle n'a pas pu être copié.", variant: 'destructive' });
    } finally {
      setCopying(null);
    }
  };

  return (
    <Dialog open={!!friend} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="[overflow-wrap:anywhere]">Modèles de {friend?.displayName}</DialogTitle>
          <DialogDescription>Copie un modèle pour l'utiliser et le modifier à ta façon.</DialogDescription>
        </DialogHeader>
        {templates === null ? (
          <div className="h-24 rounded-xl bg-muted animate-pulse" aria-label="Chargement des modèles" />
        ) : offline ? (
          <p className="text-sm text-muted-foreground text-center py-4">Modèles indisponibles hors ligne. Reconnecte-toi pour les voir.</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{friend?.displayName} n'a pas encore créé de modèle.</p>
        ) : (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {templates.map((t) => {
              const done = copied.includes(t.id);
              const count = (t.workoutType === 'renforcement' ? t.exerciseIds : t.muscuExercises)?.length ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <span className="text-2xl" aria-hidden>{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm line-clamp-2 [overflow-wrap:anywhere]">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.workoutType === 'musculation' ? 'Muscu' : 'Renfo'} · {count}&nbsp;exercice{count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button size="sm" variant={done ? 'ghost' : 'outline'} className="min-h-11" disabled={!done && !!copying} aria-disabled={done} onClick={() => copy(t)}
                    aria-label={done ? `${t.name} copié` : `Copier ${t.name}`}>
                    {done ? <><Check className="h-4 w-4 mr-1" /> Copié</> : copying === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Copy className="h-4 w-4 mr-1" /> Copier</>}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
