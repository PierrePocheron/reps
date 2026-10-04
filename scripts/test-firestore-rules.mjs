/**
 * Tests des règles Firestore contre l'émulateur.
 *
 * Usage :  firebase emulators:exec --only firestore "node scripts/test-firestore-rules.mjs"
 *   (ou :  yarn test:rules)
 *
 * Chaque test est un invariant de sécurité : si l'un échoue, les règles
 * laissent passer (ou bloquent) quelque chose qu'elles ne devraient pas.
 */

import { readFileSync } from 'node:fs';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, collectionGroup, serverTimestamp, arrayRemove, writeBatch } from 'firebase/firestore';

const PROJECT = 'reps-rules-test';
let passed = 0, failed = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed++;
    failures.push(name);
    console.error(`  ✗ ${name}\n    ${String(e).split('\n')[0]}`);
  }
}

const env = await initializeTestEnvironment({
  projectId: PROJECT,
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

// ─── Fixtures ────────────────────────────────────────────────────────────────
// alice et bob sont amis ; mallory est un compte hostile sans lien avec eux.
await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'users/alice'), {
    displayName: 'Alice', searchName: 'alice', avatarEmoji: '🦊',
    totalReps: 100, totalSessions: 3, badges: [], friends: ['bob'],
    currentStreak: 1, longestStreak: 2,
  });
  await setDoc(doc(db, 'users/bob'), {
    displayName: 'Bob', searchName: 'bob', avatarEmoji: '🐻',
    totalReps: 50, totalSessions: 2, badges: [], friends: ['alice'],
    currentStreak: 0, longestStreak: 1,
  });
  await setDoc(doc(db, 'users/mallory'), {
    displayName: 'Mallory', searchName: 'mallory', avatarEmoji: '😈',
    totalReps: 0, totalSessions: 0, badges: [], friends: [],
    currentStreak: 0, longestStreak: 0,
  });
  await setDoc(doc(db, 'users/alice/private/notifications'), { fcmToken: 'secret-token-alice' });
  await setDoc(doc(db, 'sessions/alice/userSessions/s1'), { totalReps: 42, duration: 600, exercises: [] });
  await setDoc(doc(db, 'gym_sessions/alice/userGymSessions/g1'), { totalVolume: 1000, exercises: [] });
  await setDoc(doc(db, 'user_challenges/c1'), { userId: 'alice', exerciseId: 'pushups', history: [] });
  await setDoc(doc(db, 'friend_requests/mallory_alice'), { fromUserId: 'mallory', toUserId: 'alice', status: 'pending', fromDisplayName: 'Mallory' });
  await setDoc(doc(db, 'friend_requests/alice_bob'), { fromUserId: 'alice', toUserId: 'bob', status: 'accepted', fromDisplayName: 'Alice' });
  // carol/dave : acceptation en cours (dave → carol acceptée, listes pas encore liées)
  await setDoc(doc(db, 'users/carol'), { displayName: 'Carol', searchName: 'carol', totalReps: 0, totalSessions: 0, badges: [], friends: [], currentStreak: 0, longestStreak: 0 });
  await setDoc(doc(db, 'users/dave'), { displayName: 'Dave', searchName: 'dave', totalReps: 0, totalSessions: 0, badges: [], friends: [], currentStreak: 0, longestStreak: 0 });
  await setDoc(doc(db, 'friend_requests/dave_carol'), { fromUserId: 'dave', toUserId: 'carol', status: 'accepted', fromDisplayName: 'Dave' });
  await setDoc(doc(db, 'phrases/p1'), { text: 'Chaque rep compte', emoji: '💪' });
});

const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const mallory = env.authenticatedContext('mallory').firestore();
const anon = env.unauthenticatedContext().firestore();
const carol = env.authenticatedContext('carol').firestore();

console.log('\n─ Profils utilisateurs ─');
await test('anonyme ne lit PAS un profil', () => assertFails(getDoc(doc(anon, 'users/alice'))));
await test('authentifié lit un profil (recherche/leaderboard)', () => assertSucceeds(getDoc(doc(mallory, 'users/alice'))));
await test('personne ne modifie le profil d\'autrui', () => assertFails(updateDoc(doc(mallory, 'users/alice'), { displayName: 'PWNED' })));
await test('le propriétaire modifie son profil', () => assertSucceeds(updateDoc(doc(alice, 'users/alice'), { displayName: 'Alice B' })));
await test('les champs sensibles sont INTERDITS dans le doc public (weight)', () =>
  assertFails(updateDoc(doc(alice, 'users/alice'), { weight: 70 })));
await test('les champs sensibles sont INTERDITS dans le doc public (email, fcmToken)', () =>
  assertFails(updateDoc(doc(alice, 'users/alice'), { email: 'a@a.fr', fcmToken: 'tok' })));
await test('mallory ne peut PAS s\'ajouter dans friends d\'alice (pas de demande acceptée)', () =>
  assertFails(updateDoc(doc(mallory, 'users/alice'), { friends: ['bob', 'mallory'] })));

console.log('\n─ Sous-collection privée (fcmToken…) ─');
await test('autrui ne lit PAS users/{uid}/private', () => assertFails(getDoc(doc(mallory, 'users/alice/private/notifications'))));
await test('le propriétaire lit sa sous-collection privée', () => assertSucceeds(getDoc(doc(alice, 'users/alice/private/notifications'))));
await test('autrui n\'écrit PAS users/{uid}/private', () => assertFails(setDoc(doc(mallory, 'users/alice/private/notifications'), { fcmToken: 'hack' })));

console.log('\n─ Demandes d\'amis ─');
await test('création d\'une demande en son propre nom (ID déterministe)', () =>
  assertSucceeds(setDoc(doc(mallory, 'friend_requests/mallory_bob'), { fromUserId: 'mallory', toUserId: 'bob', status: 'pending', fromDisplayName: 'Mallory', fromAvatarEmoji: '😈' })));
await test('refusée si l\'ID du doc ne correspond pas à from_to', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/whatever'), { fromUserId: 'mallory', toUserId: 'bob', status: 'pending', fromDisplayName: 'Mallory' })));
await test('pas de création d\'une demande AU NOM d\'autrui', () =>
  assertFails(addDoc(collection(mallory, 'friend_requests'), { fromUserId: 'alice', toUserId: 'bob', status: 'pending', fromDisplayName: 'Alice' })));
await test('pas de création directement en status accepted', () =>
  assertFails(addDoc(collection(mallory, 'friend_requests'), { fromUserId: 'mallory', toUserId: 'bob', status: 'accepted', fromDisplayName: 'Mallory' })));
await test('l\'EXPÉDITEUR ne peut pas s\'auto-accepter', () =>
  assertFails(updateDoc(doc(mallory, 'friend_requests/mallory_alice'), { status: 'accepted' })));
await test('le destinataire accepte', () => assertSucceeds(updateDoc(doc(alice, 'friend_requests/mallory_alice'), { status: 'accepted' })));
await test('un tiers ne lit pas la demande des autres', () => assertFails(getDoc(doc(bob, 'friend_requests/mallory_alice'))));

console.log('\n─ Acceptation : écriture croisée friends ─');
// carol accepte la demande de dave → elle s'ajoute dans users/dave.friends
await test('écriture croisée friends autorisée si demande acceptée entre les deux', () =>
  assertSucceeds(updateDoc(doc(carol, 'users/dave'), { friends: ['carol'] })));
await test('l\'écriture croisée ne peut PAS toucher d\'autres champs', () =>
  assertFails(updateDoc(doc(carol, 'users/dave'), { friends: ['carol'], totalReps: 9999 })));
await test('l\'écriture croisée ne peut PAS ajouter quelqu\'un d\'autre que soi', () =>
  assertFails(updateDoc(doc(carol, 'users/dave'), { friends: ['carol', 'mallory'] })));
await test('retrait croisé : un ami peut se retirer lui-même (suppression d\'ami)', () =>
  assertSucceeds(updateDoc(doc(bob, 'users/alice'), { friends: [] })));

// the real acceptance (acceptFriendRequest): ONE batch — request → accepted + both friends lists.
// Rules' get() sees the state before the batch (still pending): the cross write must look after it
const fresh = (name) => ({ displayName: name, searchName: name, totalReps: 0, totalSessions: 0, badges: [], friends: [], currentStreak: 0, longestStreak: 0 });
await env.withSecurityRulesDisabled(async (ctx) => {
  const f = ctx.firestore();
  for (const n of ['ivy', 'jack', 'kim', 'leo']) await setDoc(doc(f, `users/${n}`), fresh(n));
  await setDoc(doc(f, 'friend_requests/jack_ivy'), { fromUserId: 'jack', toUserId: 'ivy', status: 'pending', fromDisplayName: 'jack' });
  await setDoc(doc(f, 'friend_requests/leo_kim'), { fromUserId: 'leo', toUserId: 'kim', status: 'pending', fromDisplayName: 'leo' });
});
await test("acceptation en un seul batch depuis une demande en attente (comme l'appli)", () => {
  const ivy = env.authenticatedContext('ivy').firestore(), b = writeBatch(ivy);
  b.update(doc(ivy, 'friend_requests/jack_ivy'), { status: 'accepted' });
  b.update(doc(ivy, 'users/ivy'), { friends: ['jack'] });
  b.update(doc(ivy, 'users/jack'), { friends: ['ivy'] });
  return assertSucceeds(b.commit());
});
await test("pas d'écriture croisée dans un batch qui laisse la demande en attente", () => {
  const kim = env.authenticatedContext('kim').firestore(), b = writeBatch(kim);
  b.update(doc(kim, 'users/kim'), { friends: ['leo'] });
  b.update(doc(kim, 'users/leo'), { friends: ['kim'] });
  return assertFails(b.commit());
});

await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users/erin'), { displayName: 'erin', friends: ['frank', 'gus', 'hal'] }));
await test('suppression du compte : on se retire des amis d\'un ami (arrayRemove)', () =>
  assertSucceeds(updateDoc(doc(env.authenticatedContext('frank').firestore(), 'users/erin'), { friends: arrayRemove('frank') })));
await test('on ne retire pas un autre que soi', () =>
  assertFails(updateDoc(doc(env.authenticatedContext('gus').firestore(), 'users/erin'), { friends: arrayRemove('hal') })));

console.log('\n─ Séances / défis / templates ─');
await test('séances renfo lisibles par un authentifié (feed social)', () => assertSucceeds(getDoc(doc(bob, 'sessions/alice/userSessions/s1'))));
await test('séances renfo non modifiables par autrui', () => assertFails(setDoc(doc(mallory, 'sessions/alice/userSessions/s1'), { totalReps: 0 })));
await test('séances muscu d\'autrui illisibles', () => assertFails(getDoc(doc(mallory, 'gym_sessions/alice/userGymSessions/g1'))));
await test('défis d\'autrui illisibles', () => assertFails(getDoc(doc(mallory, 'user_challenges/c1'))));
await test('pas de création de défi au nom d\'autrui', () =>
  assertFails(addDoc(collection(mallory, 'user_challenges'), { userId: 'alice', exerciseId: 'hack', history: [] })));

console.log('\n─ Notifications ─');
await test('pas de notification forgée vers un inconnu', () =>
  assertFails(addDoc(collection(mallory, 'notifications'), { userId: 'carol', fromUserId: 'mallory', title: 'SPAM', message: 'spam', type: 'friend_activity', read: false })));
await test('pas de notification en se faisant passer pour un autre', () =>
  assertFails(addDoc(collection(mallory, 'notifications'), { userId: 'alice', fromUserId: 'bob', title: 'x', message: 'x', type: 'friend_activity', read: false })));
await test('notification légitime vers un ami', () =>
  assertSucceeds(addDoc(collection(bob, 'notifications'), { userId: 'alice', fromUserId: 'bob', title: 'Bravo', message: 'gg', type: 'friend_activity', read: false })));
await test('autrui ne lit pas mes notifications', async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'notifications/n1'), { userId: 'alice', fromUserId: 'bob', title: 'x', message: 'x', type: 'friend_activity', read: false });
  });
  return assertFails(getDoc(doc(mallory, 'notifications/n1')));
});

console.log('\n─ Encouragements (kudos) ─');
// (bob s'est retiré des amis d'alice plus haut ; bob a toujours alice en ami)
const kudo = (ctx, from) => doc(ctx, `sessions/bob/userSessions/b1/kudos/${from}`);
const k = (from) => ({ createdAt: serverTimestamp(), fromUid: from });
await test('un ami encourage une séance', () => assertSucceeds(setDoc(kudo(alice, 'alice'), k('alice'))));
await test('une seule réaction par personne (pas de réécriture)', () => assertFails(setDoc(kudo(alice, 'alice'), k('alice'))));
await test('pas de réaction au nom d\'un autre', () => assertFails(setDoc(kudo(alice, 'mallory'), k('mallory'))));
await test('fromUid = l\'auteur (retrouvable à la suppression du compte)', () => assertFails(setDoc(doc(alice, 'sessions/bob/userSessions/b3/kudos/alice'), k('mallory'))));
await test('un inconnu ne peut pas encourager', () => assertFails(setDoc(kudo(mallory, 'mallory'), k('mallory'))));
await test('pas de réaction à sa propre séance', () => assertFails(setDoc(kudo(bob, 'bob'), k('bob'))));
await test('pas de champ en plus', () => assertFails(setDoc(doc(alice, 'sessions/bob/userSessions/b2/kudos/alice'), { ...k('alice'), msg: 'spam' })));
await test('on retrouve ses propres réactions (suppression du compte)', () =>
  assertSucceeds(getDocs(query(collectionGroup(alice, 'kudos'), where('fromUid', '==', 'alice')))));
await test('un tiers ne retire pas la réaction d\'un autre', () => assertFails(deleteDoc(kudo(mallory, 'alice'))));
await test('le propriétaire de la séance retire les réactions reçues (suppression du compte)', async () => {
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'sessions/bob/userSessions/b1/kudos/carol'), { createdAt: new Date(), fromUid: 'carol' }));
  await assertSucceeds(deleteDoc(doc(bob, 'sessions/bob/userSessions/b1/kudos/carol')));
});
await test('on retire sa propre réaction', () => assertSucceeds(deleteDoc(kudo(alice, 'alice'))));

console.log('\n─ Modèles des amis ─');
// (bob a toujours alice en ami ; alice ne l'a plus depuis le test de suppression)
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'userTemplates/bob/templates/t1'), { name: 'Push', workoutType: 'musculation' }));
await test('un ami lit les modèles pour les copier', () => assertSucceeds(getDoc(doc(alice, 'userTemplates/bob/templates/t1'))));
await test('un inconnu ne lit pas les modèles', () => assertFails(getDoc(doc(mallory, 'userTemplates/bob/templates/t1'))));
await test('un ami ne modifie pas les modèles d\'autrui', () => assertFails(setDoc(doc(alice, 'userTemplates/bob/templates/t1'), { name: 'pwn' })));

console.log('\n─ Divers ─');
await test('phrases lisibles par tous', () => assertSucceeds(getDoc(doc(anon, 'phrases/p1'))));
await test('phrases non modifiables', () => assertFails(setDoc(doc(mallory, 'phrases/p1'), { text: 'pwn' })));
await test('collection group userSessions lisible par authentifié (feed)', () =>
  assertSucceeds(getDocs(query(collectionGroup(bob, 'userSessions')))));

await env.cleanup();
console.log(`\n${passed} réussis, ${failed} échoués${failed ? ' : ' + failures.join(' | ') : ''}`);
process.exit(failed ? 1 : 0);
