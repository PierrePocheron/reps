import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
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
  await setDoc(doc(kudosCol(ownerId, sessionId), me.uid), { createdAt: serverTimestamp() });
  await createNotification({
    userId: ownerId, fromUserId: me.uid, fromName: me.displayName, type: 'kudos', read: false,
    title: 'Encouragement 👏', message: `${me.displayName} a encouragé ta séance`,
  });
}

export async function removeKudos(ownerId: string, sessionId: string, myUid: string): Promise<void> {
  await deleteDoc(doc(kudosCol(ownerId, sessionId), myUid));
}

/** Encouragements reçus et pas encore vus (égalités seules : pas d'index composite). */
export async function getUnreadKudos(uid: string): Promise<Notification[]> {
  const snap = await getDocs(query(collection(db, 'notifications'), where('userId', '==', uid), where('read', '==', false)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Notification).filter((n) => n.type === 'kudos');
}

export async function markKudosSeen(ids: string[]): Promise<void> {
  const batch = writeBatch(db);
  for (const id of ids) batch.update(doc(db, 'notifications', id), { read: true });
  await batch.commit();
}
