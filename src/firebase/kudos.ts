import { collection, deleteDoc, doc, getDocs, limit, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from './config';
import { createNotification } from './firestore';
import type { Notification } from './types';

// sessions/{owner}/userSessions/{session}/kudos/{fromUid} : une réaction par ami (cf. firestore.rules)
const kudosCol = (ownerId: string, sessionId: string) => collection(db, 'sessions', ownerId, 'userSessions', sessionId, 'kudos');

/** UID des amis qui ont encouragé la séance. */
export async function getKudos(ownerId: string, sessionId: string): Promise<string[]> {
  const snap = await getDocs(kudosCol(ownerId, sessionId));
  return snap.docs.map((d) => d.id);
}

/** Encourage la séance d'un ami et le prévient (notification in-app). */
export async function giveKudos(ownerId: string, sessionId: string, me: { uid: string; displayName: string }): Promise<void> {
  // fromUid (= doc id): lets account deletion find the kudos one gave (collection group query)
  await setDoc(doc(kudosCol(ownerId, sessionId), me.uid), { createdAt: serverTimestamp(), fromUid: me.uid });
  await createNotification({
    userId: ownerId, fromUserId: me.uid, fromName: me.displayName, type: 'kudos', read: false, sessionId,
    title: 'Encouragement 👏', message: `${me.displayName} a encouragé ta séance`,
  });
}

export async function removeKudos(ownerId: string, sessionId: string, myUid: string): Promise<void> {
  await deleteDoc(doc(kudosCol(ownerId, sessionId), myUid));
}

/**
 * Encouragements reçus et pas encore vus (égalités seules : pas d'index composite). Un kudos retiré ou donné deux fois
 * laissait sa notification (« X a encouragé ta séance » sans kudos) : seules celles dont le kudos existe encore
 * s'affichent, une par ami et par séance ; les autres passent en lues.
 */
export async function getUnreadKudos(uid: string): Promise<Notification[]> {
  // the type filter skips friend notifications nothing ever marks read, which were billed on every Home visit.
  // A friend can pile up thousands: 50 at a time, the stale ones are marked read and the next visit reads the rest
  const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', uid), where('read', '==', false),
    where('type', '==', 'kudos'), limit(50)));
  const unread = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Notification);
  // written by the friend, unchecked by the rules: anything but a plain id threw building the kudos path
  const isId = (id: unknown): id is string => typeof id === 'string' && id !== '' && !id.includes('/');
  const sessions = [...new Set(unread.map((n) => n.sessionId).filter(isId))];
  const givers = new Map(await Promise.all(sessions.map(async (id) => [id, new Set(await getKudos(uid, id))] as const)));
  const seen = new Set<string>(), shown: Notification[] = [], stale: string[] = [];
  for (const n of unread) {
    const live = !n.sessionId // older ones have no sessionId
      || (isId(n.sessionId) && !!givers.get(n.sessionId)?.has(n.fromUserId ?? ''));
    const key = live ? `${n.sessionId}|${n.fromUserId}` : '';
    if (live && !seen.has(key)) { seen.add(key); shown.push(n); } else stale.push(n.id);
  }
  if (stale.length) await markKudosSeen(stale).catch(() => {}); // best effort: shown again next time otherwise
  return shown;
}

export async function markKudosSeen(ids: string[]): Promise<void> {
  // a batch takes at most 500 writes: a bigger one failed every time
  for (let i = 0; i < ids.length; i += 500) {
    const batch = writeBatch(db);
    for (const id of ids.slice(i, i + 500)) batch.update(doc(db, 'notifications', id), { read: true });
    await batch.commit();
  }
}
