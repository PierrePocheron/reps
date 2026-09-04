/**
 * Migration sécurité one-shot — À EXÉCUTER AVANT de déployer les nouvelles
 * règles Firestore (les comptes existants seraient sinon bloqués en écriture
 * jusqu'à leur prochaine connexion, qui migre aussi à la volée).
 *
 * 1. users/{uid} : déplace email, weight, height, birthDate, gender vers
 *    users/{uid}/private/profile ; fcmToken/notificationTime/notificationsEnabled
 *    vers users/{uid}/private/notifications ; écrit emailHash (SHA-256) ;
 *    purge les champs sensibles du doc public.
 * 2. friend_requests : réécrit chaque demande sous l'ID déterministe
 *    `${fromUserId}_${toUserId}` et supprime l'ancienne.
 *
 * Usage :
 *   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/serviceAccount.json
 *   node scripts/migrate-security.mjs [--dry-run]
 */

import { createHash } from 'node:crypto';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const DRY = process.argv.includes('--dry-run');
initializeApp({ credential: applicationDefault(), projectId: 'pedro-reps' });
const db = getFirestore();

const PROFILE_FIELDS = ['email', 'weight', 'height', 'birthDate', 'gender'];
const NOTIF_FIELDS = ['fcmToken', 'notificationTime', 'notificationsEnabled'];

const sha256 = (s) => createHash('sha256').update(s.trim().toLowerCase()).digest('hex');

// ─── 1. users ────────────────────────────────────────────────────────────────
let migratedUsers = 0;
const usersSnap = await db.collection('users').get();
for (const userDoc of usersSnap.docs) {
  const data = userDoc.data();
  const profile = {};
  const notifs = {};
  PROFILE_FIELDS.forEach((f) => { if (data[f] !== undefined) profile[f] = data[f]; });
  NOTIF_FIELDS.forEach((f) => { if (data[f] !== undefined) notifs[f] = data[f]; });

  const removals = {};
  [...PROFILE_FIELDS, ...NOTIF_FIELDS].forEach((f) => {
    if (data[f] !== undefined) removals[f] = FieldValue.delete();
  });
  if (typeof data.email === 'string' && data.email && !data.emailHash) {
    removals.emailHash = sha256(data.email);
  }

  if (Object.keys(removals).length === 0) continue;
  migratedUsers++;
  console.log(`user ${userDoc.id}: privé=${Object.keys(profile).join(',') || '—'} notifs=${Object.keys(notifs).join(',') || '—'}`);
  if (DRY) continue;

  const batch = db.batch();
  if (Object.keys(profile).length) batch.set(userDoc.ref.collection('private').doc('profile'), profile, { merge: true });
  if (Object.keys(notifs).length) batch.set(userDoc.ref.collection('private').doc('notifications'), notifs, { merge: true });
  batch.update(userDoc.ref, removals);
  await batch.commit();
}

// ─── 2. friend_requests → IDs déterministes ─────────────────────────────────
let migratedRequests = 0;
const reqSnap = await db.collection('friend_requests').get();
for (const reqDoc of reqSnap.docs) {
  const data = reqDoc.data();
  const wantedId = `${data.fromUserId}_${data.toUserId}`;
  if (reqDoc.id === wantedId) continue;
  migratedRequests++;
  console.log(`friend_request ${reqDoc.id} → ${wantedId} (${data.status})`);
  if (DRY) continue;
  const batch = db.batch();
  batch.set(db.collection('friend_requests').doc(wantedId), data, { merge: true });
  batch.delete(reqDoc.ref);
  await batch.commit();
}

console.log(`\n${DRY ? '[DRY-RUN] ' : ''}${migratedUsers} utilisateurs migrés, ${migratedRequests} demandes réécrites.`);
