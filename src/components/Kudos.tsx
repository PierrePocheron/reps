import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/userStore';
import { getKudos, getUnreadKudos, giveKudos, markKudosSeen, removeKudos } from '@/firebase/kudos';
import type { Notification } from '@/firebase/types';
import { logger } from '@/utils/logger';
import { cn } from '@/utils/cn';

/** 👏 sous la séance d'un ami (Strava) : un tap pour encourager, un autre pour retirer. */
export function KudosButton({ ownerId, sessionId, ownerName }: { ownerId: string; sessionId: string; ownerName: string }) {
  const user = useUserStore((s) => s.user);
  const [from, setFrom] = useState<string[] | null>(null);

  useEffect(() => {
    // Règles pas encore déployées ou hors ligne : on masque le bouton plutôt que d'afficher une erreur
    getKudos(ownerId, sessionId).then(setFrom).catch(() => setFrom(null));
  }, [ownerId, sessionId]);

  if (!user || from === null) return null;
  const mine = from.includes(user.uid);

  const toggle = async () => {
    const before = from;
    setFrom(mine ? from.filter((id) => id !== user.uid) : [...from, user.uid]); // optimiste
    try {
      if (mine) await removeKudos(ownerId, sessionId, user.uid);
      else await giveKudos(ownerId, sessionId, { uid: user.uid, displayName: user.firstName || user.displayName });
    } catch (err) {
      logger.error('Encouragement :', err);
      setFrom(before);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={mine}
      aria-label={mine ? `Retirer ton encouragement à ${ownerName}` : `Encourager la séance de ${ownerName}`}
      className={cn('mt-3 min-h-11 px-3 rounded-xl border text-sm font-medium inline-flex items-center gap-1.5 active:scale-95 transition-colors',
        mine ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground')}
    >
      <span aria-hidden>👏</span>
      {from.length > 0 ? from.length : 'Bravo'}
    </button>
  );
}

/** Encouragements reçus depuis la dernière visite, sur l'accueil. */
export function KudosBanner() {
  const uid = useUserStore((s) => s.user?.uid);
  const [kudos, setKudos] = useState<Notification[]>([]);

  useEffect(() => {
    if (uid) getUnreadKudos(uid).then(setKudos).catch(() => setKudos([]));
  }, [uid]);

  if (kudos.length === 0) return null;
  const names = [...new Set(kudos.map((k) => k.fromName).filter(Boolean))] as string[];
  const who = names.length <= 2 ? names.join(' et ') : `${names.slice(0, 2).join(', ')} et ${names.length - 2} autre${names.length > 3 ? 's' : ''}`;

  const dismiss = () => {
    markKudosSeen(kudos.map((k) => k.id)).catch((err) => logger.error('Encouragements vus :', err));
    setKudos([]);
  };

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-4" role="status">
      <span className="text-2xl" aria-hidden>👏</span>
      <p className="flex-1 text-sm">
        <span className="font-semibold">{who || 'Un ami'}</span> {names.length > 1 ? 'ont' : 'a'} encouragé ta séance
      </p>
      <button onClick={dismiss} className="min-h-11 px-3 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10">Merci !</button>
    </div>
  );
}
