import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './config';
import type { BodyEntry } from '@/utils/body';

// Document privé (règles : propriétaire uniquement), supprimé avec le compte comme tout users/{uid}/private
const bodyDoc = (uid: string) => doc(db, 'users', uid, 'private', 'body');

export async function getBodyEntries(uid: string): Promise<BodyEntry[]> {
  const snap = await getDoc(bodyDoc(uid));
  return (snap.data()?.entries as BodyEntry[] | undefined) ?? [];
}

export async function saveBodyEntries(uid: string, entries: BodyEntry[]): Promise<void> {
  await setDoc(bodyDoc(uid), { entries });
}
