import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useUserStore } from '@/store/userStore';
import { createUserTemplate, getUserTemplates } from '@/firebase/templates';
import type { User, WorkoutTemplate } from '@/firebase/types';
import { logger } from '@/utils/logger';

/** Modèles d'un ami, copiables en un tap (Hevy) : la copie devient un modèle perso modifiable. */
export function FriendTemplatesDialog({ friend, onClose }: { friend: User | null; onClose: () => void }) {
  const me = useUserStore((s) => s.user);
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WorkoutTemplate[] | null>(null);
  const [copied, setCopied] = useState<string[]>([]);

  useEffect(() => {
    if (!friend) return;
    setTemplates(null); setCopied([]);
    getUserTemplates(friend.uid).then(setTemplates); // [] si refusé (règles pas encore déployées)
  }, [friend]);

  const copy = async (t: WorkoutTemplate) => {
    if (!me) return;
    try {
      const { id, userId, createdAt, ...data } = t;
      void id; void userId; void createdAt;
      await createUserTemplate(me.uid, data);
      setCopied((c) => [...c, t.id]);
      toast({ title: 'Modèle copié', description: `« ${t.name} » est dans tes modèles.` });
    } catch (err) {
      logger.error('Copie du modèle :', err);
      toast({ title: 'Erreur', description: "Le modèle n'a pas pu être copié.", variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!friend} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Modèles de {friend?.displayName}</DialogTitle>
          <DialogDescription>Copie un modèle pour l'utiliser et le modifier à ta façon.</DialogDescription>
        </DialogHeader>
        {templates === null ? (
          <div className="h-24 rounded-xl bg-muted animate-pulse" aria-label="Chargement des modèles" />
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{friend?.displayName} n'a pas encore créé de modèle.</p>
        ) : (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {templates.map((t) => {
              const done = copied.includes(t.id);
              const count = t.exerciseIds?.length ?? t.muscuExercises?.length ?? 0;
              return (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <span className="text-2xl" aria-hidden>{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.workoutType === 'musculation' ? 'Muscu' : 'Renfo'} · {count} exercice{count > 1 ? 's' : ''}
                    </p>
                  </div>
                  <Button size="sm" variant={done ? 'ghost' : 'outline'} className="min-h-11" disabled={done} onClick={() => copy(t)}
                    aria-label={done ? `${t.name} copié` : `Copier ${t.name}`}>
                    {done ? <Check className="h-4 w-4" /> : <><Copy className="h-4 w-4 mr-1" /> Copier</>}
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
