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
import { createHash } from 'node:crypto';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, addDoc, getDocs, query, where, collectionGroup, serverTimestamp, arrayRemove, writeBatch, Timestamp, limit, orderBy, runTransaction, increment, deleteField, documentId } from 'firebase/firestore';

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
// the lists the app writes in the public doc, downloaded by every search and friends list, are capped
await test('mise à jour des stats et badges (forme réelle)', () => assertSucceeds(updateDoc(doc(alice, 'users/alice'), {
  totalReps: 120, totalSessions: 4, totalCalories: 50, badges: ['poussin'], newBadgeIds: ['poussin'], repButtons: [5, 10],
  exercisesDistribution: [{ name: 'Pompes', emoji: '💪', totalReps: 120, totalCalories: 50, count: 4 }], updatedAt: serverTimestamp() })));
await test('newBadgeIds borné', () => assertFails(updateDoc(doc(alice, 'users/alice'), { newBadgeIds: Array.from({ length: 301 }, (_, i) => `b${i}`) })));
await test('exercisesDistribution borné', () => assertFails(updateDoc(doc(alice, 'users/alice'), { exercisesDistribution: Array.from({ length: 501 }, () => ({ name: 'x' })) })));
await test('repButtons borné', () => assertFails(updateDoc(doc(alice, 'users/alice'), { repButtons: Array.from({ length: 21 }, (_, i) => i + 1) })));
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
// each negative case is otherwise valid (createdAt included): it fails only on the check it is named after
await test('création d\'une demande en son propre nom (ID déterministe)', () =>
  assertSucceeds(setDoc(doc(mallory, 'friend_requests/mallory_bob'), { fromUserId: 'mallory', toUserId: 'bob', status: 'pending', fromDisplayName: 'Mallory', fromAvatarEmoji: '😈', createdAt: serverTimestamp() })));
// the recipient's listener sorts by createdAt.seconds: one request without it hid all the others
await test('demande refusée sans createdAt serveur', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_carol'), { fromUserId: 'mallory', toUserId: 'carol', status: 'pending', fromDisplayName: 'Mallory' })));
await test('refusée si l\'ID du doc ne correspond pas à from_to', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/whatever'), { fromUserId: 'mallory', toUserId: 'bob', status: 'pending', fromDisplayName: 'Mallory', createdAt: serverTimestamp() })));
await test('pas de création d\'une demande AU NOM d\'autrui', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_zed'), { fromUserId: 'alice', toUserId: 'zed', status: 'pending', fromDisplayName: 'Alice', createdAt: serverTimestamp() })));
await test('pas de création directement en status accepted', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_yan'), { fromUserId: 'mallory', toUserId: 'yan', status: 'accepted', fromDisplayName: 'Mallory', createdAt: serverTimestamp() })));
await test('l\'EXPÉDITEUR ne peut pas s\'auto-accepter', () =>
  assertFails(updateDoc(doc(mallory, 'friend_requests/mallory_alice'), { status: 'accepted' })));
await test('le destinataire accepte', () => assertSucceeds(updateDoc(doc(alice, 'friend_requests/mallory_alice'), { status: 'accepted' })));
await test('un tiers ne lit pas la demande des autres', () => assertFails(getDoc(doc(bob, 'friend_requests/mallory_alice'))));
// the recipient's permanent listener downloads every pending request and renders fromAvatarEmoji: only the fields
// sendFriendRequest writes, a short emoji, and a recipient that exists
const request = (from, to, extra = {}) => ({ fromUserId: from, toUserId: to, status: 'pending', fromDisplayName: from,
  fromAvatarEmoji: '😈', createdAt: serverTimestamp(), ...extra });
await env.withSecurityRulesDisabled(async (ctx) => {
  for (const n of ['req1', 'req2', 'req3']) await setDoc(doc(ctx.firestore(), `users/${n}`), { displayName: n, searchName: n, totalReps: 0, totalSessions: 0, badges: [], friends: [] });
});
await test('demande avec un champ en plus refusée', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_req1'), request('mallory', 'req1', { junk: 'x'.repeat(1000) }))));
await test('fromAvatarEmoji : un texte court', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_req2'), request('mallory', 'req2', { fromAvatarEmoji: 'x'.repeat(17) }))));
await test('fromAvatarEmoji : pas une map (la liste des demandes plantait)', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_req3'), request('mallory', 'req3', { fromAvatarEmoji: { boom: 1 } }))));
await test('pas de demande vers un compte inexistant', () =>
  assertFails(setDoc(doc(mallory, 'friend_requests/mallory_ghost'), request('mallory', 'ghost'))));
// subscribeToFriendRequests (limit 50) and the reverse request lookup of acceptFriendRequest
await test('écoute des demandes reçues en attente (forme réelle)', () => assertSucceeds(getDocs(query(collection(bob, 'friend_requests'),
  where('toUserId', '==', 'bob'), where('status', '==', 'pending'), limit(50)))));
await test('recherche de la demande inverse (acceptation)', () => assertSucceeds(getDocs(query(collection(alice, 'friend_requests'),
  where('fromUserId', '==', 'alice'), where('toUserId', '==', 'mallory'), where('status', '==', 'pending')))));

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
  b.set(doc(collection(ivy, 'users/ivy/userEvents')), { type: 'new_friend', userId: 'ivy', friendId: 'jack', friendName: 'jack', createdAt: serverTimestamp() });
  return assertSucceeds(b.commit());
});
// sendFriendRequest after a removal that could not delete the request (offline): « accepted » but no longer friends
await test("demande « accepted » périmée : l'expéditeur la supprime puis en renvoie une", async () => {
  const jack = env.authenticatedContext('jack').firestore();
  await assertSucceeds(deleteDoc(doc(jack, 'friend_requests/jack_ivy')));
  await assertSucceeds(setDoc(doc(jack, 'friend_requests/jack_ivy'), { fromUserId: 'jack', toUserId: 'ivy', status: 'pending', fromDisplayName: 'jack', fromAvatarEmoji: '🐥', createdAt: serverTimestamp() }));
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
// a friend « removing himself » could leave hundreds of copies of another friend: over the 500 cap, every write of the
// owner's own profile was then refused (stats, badges, pseudo)
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users/pia'), { ...fresh('pia'), friends: ['quinn', 'rex'] }));
await test('un ami ne gonfle pas la liste friends avec des doublons', () =>
  assertFails(updateDoc(doc(env.authenticatedContext('quinn').firestore(), 'users/pia'), { friends: Array(600).fill('rex') })));
await test('le propriétaire met toujours ses stats à jour ensuite', () =>
  assertSucceeds(updateDoc(doc(env.authenticatedContext('pia').firestore(), 'users/pia'), { totalReps: 10, totalSessions: 1 })));

console.log('\n─ Recherche par e-mail (emailHash) ─');
// the e-mail search is an exact match on emailHash: anyone could claim another person's hash and be found as them
const sha = (email) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
const withEmail = (uid, email) => env.authenticatedContext(uid, { email }).firestore();
// createUserDocument (setDoc merge), with the e-mail of the Auth account
const newUserDoc = (name, email) => ({ displayName: name, searchName: name, avatarEmoji: '🐥', colorTheme: 'blue', totalReps: 0, totalSessions: 0,
  badges: ['poussin'], friends: [], currentStreak: 0, longestStreak: 0, lastTrainingDate: null, weeklyStreak: 0, lastMetWeek: null,
  createdAt: Timestamp.now(), updatedAt: Timestamp.now(), lastConnection: null, emailHash: sha(email) });
await test('création avec l\'emailHash d\'un autre e-mail refusée', () => assertFails(setDoc(doc(withEmail('newbie', 'newbie@example.com'), 'users/newbie'),
  { ...newUserDoc('newbie', 'newbie@example.com'), emailHash: sha('victim@example.com') }, { merge: true })));
await test('création du profil avec son emailHash (forme réelle)', () => assertSucceeds(setDoc(doc(withEmail('newbie', 'Newbie@Example.com'), 'users/newbie'),
  newUserDoc('newbie', 'newbie@example.com'), { merge: true })));
await test('emailHash remplacé par celui d\'un autre e-mail refusé', () =>
  assertFails(updateDoc(doc(withEmail('newbie', 'newbie@example.com'), 'users/newbie'), { emailHash: sha('victim@example.com') })));
await test('emailHash posé sans e-mail dans le jeton refusé', () => assertFails(updateDoc(doc(mallory, 'users/mallory'), { emailHash: sha('victim@example.com') })));
// migrateLegacyPublicFields: the public e-mail (old model) leaves for its hash
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), 'users/oldie'), { ...fresh('oldie'), email: 'oldie@example.com', weight: 70 });
  await setDoc(doc(ctx.firestore(), 'users/hashed'), { ...fresh('hashed'), emailHash: 'a'.repeat(64) });
});
await test('migration de l\'ancien profil vers emailHash (forme réelle)', () => assertSucceeds(updateDoc(doc(withEmail('oldie', 'oldie@example.com'), 'users/oldie'),
  { email: deleteField(), weight: deleteField(), emailHash: sha('oldie@example.com') })));
await test('un emailHash existant inchangé ne bloque pas les mises à jour', () =>
  assertSucceeds(updateDoc(doc(withEmail('hashed', 'other@example.com'), 'users/hashed'), { totalReps: 3, updatedAt: serverTimestamp() })));

console.log('\n─ Profils : totaux et listes ─');
// the « Légendes » leaderboard ranks friends by the profile's totalReps
await test('totalReps du profil borné', () => assertFails(updateDoc(doc(alice, 'users/alice'), { totalReps: 1e308 })));
await test('totalSessions du profil borné', () => assertFails(updateDoc(doc(alice, 'users/alice'), { totalSessions: 1e7 })));
// one unbounded list downloaded every profile (names, emailHash, friends): only the app's bounded queries
const users = collection(mallory, 'users');
await test('un compte ne liste pas tous les profils', () => assertFails(getDocs(users)));
await test('pas plus de 30 profils par requête', () => assertFails(getDocs(query(users, limit(31)))));
await test('détails des amis par paquets de 10 (forme réelle)', () =>
  assertSucceeds(getDocs(query(users, where(documentId(), 'in', ['alice', 'bob']), limit(10)))));
await test('recherche par pseudo et par nom (forme réelle)', () => Promise.all([['searchName', 'al'], ['displayName', 'Al']].map(([field, term]) =>
  assertSucceeds(getDocs(query(users, orderBy(field), where(field, '>=', term), where(field, '<=', term + ''), limit(10)))))));
await test('recherche par e-mail exact (forme réelle)', () =>
  assertSucceeds(getDocs(query(users, where('emailHash', '==', sha('newbie@example.com')), limit(1)))));
// checkUsernameAvailability: only needs to know whether another account holds the pseudo
await test('disponibilité d\'un pseudo (avec limit)', () => assertSucceeds(getDocs(query(users, where('searchName', '==', 'alice'), limit(2)))));

console.log('\n─ Séances / défis / templates ─');
await test('séances renfo lisibles par un authentifié (feed social)', () => assertSucceeds(getDoc(doc(bob, 'sessions/alice/userSessions/s1'))));
await test('séances renfo non modifiables par autrui', () => assertFails(setDoc(doc(mallory, 'sessions/alice/userSessions/s1'), { totalReps: 0 })));
// the feed and the leaderboards attribute a session or an event to its userId field, not to its path
const appSession = (uid) => ({ date: Timestamp.now(), duration: 60, exercises: [{ name: 'Pompes', emoji: '💪', reps: 10 }],
  totalReps: 10, totalCalories: 5, userId: uid, createdAt: serverTimestamp() });
const badgeEvent = (uid) => ({ type: 'badge_unlocked', userId: uid, badgeId: 'poussin', badgeName: 'Poussin', badgeEmoji: '🐥', createdAt: serverTimestamp() });
await test('séance renfo créée (forme réelle)', () => assertSucceeds(addDoc(collection(alice, 'sessions/alice/userSessions'), appSession('alice'))));
await test('séance au nom d\'un autre refusée', () => assertFails(addDoc(collection(mallory, 'sessions/mallory/userSessions'), appSession('alice'))));
await test('séance ancienne sans userId modifiable (updateSession)', () =>
  assertSucceeds(updateDoc(doc(alice, 'sessions/alice/userSessions/s1'), { exercises: [], totalReps: 0, totalCalories: 0 })));
await test('pas de séance réattribuée à un autre', () => assertFails(updateDoc(doc(alice, 'sessions/alice/userSessions/s1'), { userId: 'bob' })));
await test('événement de badge (forme réelle)', () => assertSucceeds(addDoc(collection(alice, 'users/alice/userEvents'), badgeEvent('alice'))));
await test('événement au nom d\'un autre refusé', () => assertFails(addDoc(collection(mallory, 'users/mallory/userEvents'), badgeEvent('alice'))));
// friends' feed sorts sessions and events by createdAt and lists the exercises: one wrong type broke it for all of them
// validateChallengeDay: one transaction (session stamped with the phone's clock + the user's stats)
const challengeSession = (ref, now) => ({ sessionId: ref.id, userId: 'alice', date: now, duration: 0,
  exercises: [{ id: 'pushups', name: 'Pompes', emoji: '💪', sets: 1, reps: 10, weight: 0 }], totalReps: 10,
  category: 'challenge', challengeId: 'c_pushups_beginner', createdAt: now, totalCalories: 3 });
await test('séance de défi validée (forme réelle, transaction)', () => assertSucceeds(runTransaction(alice, async (tx) => {
  const ref = doc(collection(alice, 'sessions/alice/userSessions')), now = Timestamp.now();
  await tx.get(doc(alice, 'users/alice'));
  tx.set(ref, challengeSession(ref, now));
  tx.update(doc(alice, 'users/alice'), { totalReps: increment(10), totalSessions: increment(1), totalCalories: increment(3), lastActivity: now });
})));
// the feed keeps the newest 20 by createdAt per query and the leaderboards sum every session dated in the period:
// a future-dated, oversized or ill-typed doc pinned, crashed or skewed them for every friend
const sessions = collection(alice, 'sessions/alice/userSessions');
const inDays = (n) => Timestamp.fromDate(new Date(Date.now() + n * 86400000));
await test('séance oubliée, antidatée (forme réelle)', () => assertSucceeds(addDoc(sessions, { ...appSession('alice'), date: inDays(-3) })));
await test('séance datée par un téléphone un peu en avance', () => assertSucceeds(addDoc(sessions, { ...appSession('alice'), date: inDays(0.1) })));
await test('séance avec une clé en plus refusée', () => assertFails(addDoc(sessions, { ...appSession('alice'), junk: 'x'.repeat(1000) })));
await test('séance datée dans le futur refusée', () => assertFails(addDoc(sessions, { ...appSession('alice'), date: inDays(2) })));
await test('séance avec une date non datée refusée', () => assertFails(addDoc(sessions, { ...appSession('alice'), date: 'zzz' })));
await test('séance avec un createdAt du client refusée', () => assertFails(addDoc(sessions, { ...appSession('alice'), createdAt: Timestamp.now() })));
await test('séance de défi avec un createdAt très en avance refusée', () => {
  const ref = doc(sessions);
  return assertFails(setDoc(ref, { ...challengeSession(ref, Timestamp.now()), createdAt: inDays(0.1) }));
});
await test('totalReps borné (négatif, NaN, infini, énorme)', () =>
  Promise.all([-1, NaN, Infinity, 1e15].map((totalReps) => assertFails(addDoc(sessions, { ...appSession('alice'), totalReps })))));
await test('totalCalories borné', () => assertFails(addDoc(sessions, { ...appSession('alice'), totalCalories: 1e15 })));
await test('exercises borné', () => assertFails(addDoc(sessions, { ...appSession('alice'),
  exercises: Array.from({ length: 101 }, () => ({ name: 'Pompes', emoji: '💪', reps: 1 })) })));
await test('textes de séance bornés', () => assertFails(addDoc(sessions, { ...appSession('alice'), category: 'x'.repeat(41) })));
await test('durée numérique', () => assertFails(addDoc(sessions, { ...appSession('alice'), duration: 'x'.repeat(1000) })));
const fresh1 = await addDoc(sessions, appSession('alice'));
await test('modifier une séance (updateSession, forme réelle)', () => assertSucceeds(updateDoc(fresh1,
  { exercises: [{ name: 'Pompes', emoji: '💪', reps: 12 }], totalReps: 12, totalCalories: 6 })));
await test('createdAt figé à la modification', () => assertFails(updateDoc(fresh1, { createdAt: Timestamp.now() })));
await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'sessions/alice/userSessions/legacy'),
  { userId: 'alice', date: inDays(-30), duration: 60, exercises: [], totalReps: 5, notes: 'ancien champ', createdAt: inDays(-30) }));
await test('séance ancienne avec un champ hérité modifiable', () =>
  assertSucceeds(updateDoc(doc(alice, 'sessions/alice/userSessions/legacy'), { exercises: [], totalReps: 0, totalCalories: 0 })));
const events = collection(alice, 'users/alice/userEvents');
await test('événement avec une clé en plus refusé', () => assertFails(addDoc(events, { ...badgeEvent('alice'), junk: 'x'.repeat(1000) })));
await test('badgeEmoji en map refusé (le fil plantait)', () => assertFails(addDoc(events, { ...badgeEvent('alice'), badgeEmoji: { boom: 1 } })));
await test('événement avec un createdAt du client refusé', () => assertFails(addDoc(events, { ...badgeEvent('alice'), createdAt: inDays(1) })));
await test('nom d\'ami borné', () => assertFails(addDoc(events, { type: 'new_friend', userId: 'alice', friendId: 'bob', friendName: 'x'.repeat(51), createdAt: serverTimestamp() })));
// updateUserStatsAfterSession when a badge unlocks
await test('badge débloqué : stats et événement en un batch (forme réelle)', () => {
  const b = writeBatch(alice);
  b.update(doc(alice, 'users/alice'), { totalReps: 130, totalSessions: 5, totalCalories: 60, currentStreak: 2, longestStreak: 2,
    lastTrainingDate: Timestamp.now(), lastJokerDay: null, weeklyStreak: 0, lastMetWeek: null, badges: ['poussin', 'centurion'],
    updatedAt: serverTimestamp(), morningSessions: 0, lunchSessions: 1, nightSessions: 0, exercisesDistribution: [], newBadgeIds: ['centurion'] });
  b.set(doc(events), { ...badgeEvent('alice'), badgeId: 'centurion', badgeName: 'Centurion', badgeEmoji: '💯' });
  return assertSucceeds(b.commit());
});
// getFriendsActivity and getLeaderboardStats
await test('fil des amis : séances et événements (forme réelle)', () => Promise.all(['userSessions', 'userEvents'].map((group) =>
  assertSucceeds(getDocs(query(collectionGroup(bob, group), where('userId', 'in', ['alice', 'mallory']), orderBy('createdAt', 'desc'), limit(20)))))));
await test('classement par période (forme réelle)', () => assertSucceeds(getDocs(query(collectionGroup(bob, 'userSessions'),
  where('userId', 'in', ['alice', 'mallory']), where('date', '>=', inDays(-7))))));
await test('séance avec createdAt non daté refusée', () =>
  assertFails(addDoc(collection(alice, 'sessions/alice/userSessions'), { ...appSession('alice'), createdAt: 'zzz' })));
await test('séance avec exercises hors liste refusée', () =>
  assertFails(addDoc(collection(alice, 'sessions/alice/userSessions'), { ...appSession('alice'), exercises: 'x' })));
await test('séance avec totalReps non numérique refusée', () =>
  assertFails(addDoc(collection(alice, 'sessions/alice/userSessions'), { ...appSession('alice'), totalReps: '10' })));
await test('pas de createdAt non daté glissé par une modification', () =>
  assertFails(updateDoc(doc(alice, 'sessions/alice/userSessions/s1'), { createdAt: { a: 1 } })));
await test('événement avec createdAt non daté refusé', () =>
  assertFails(addDoc(collection(alice, 'users/alice/userEvents'), { ...badgeEvent('alice'), createdAt: 'zzz' })));
await test('séances muscu d\'autrui illisibles', () => assertFails(getDoc(doc(mallory, 'gym_sessions/alice/userGymSessions/g1'))));
await test('défis d\'autrui illisibles', () => assertFails(getDoc(doc(mallory, 'user_challenges/c1'))));
// the document the app really writes (joinChallenge / createCustomChallenge): the exercise sits in definitionSnapshot
const realChallenge = (userId) => ({ id: 'x', userId, challengeId: 'c_pushups_beginner', status: 'active', totalProgress: 0, lastLogDate: null,
  history: [], startDate: serverTimestamp(), definitionSnapshot: { id: 'c_pushups_beginner', exerciseId: 'pushups', durationDays: 21, baseAmount: 10, increment: 1 } });
await test('rejoindre un défi (forme réelle du document)', () => assertSucceeds(addDoc(collection(alice, 'user_challenges'), realChallenge('alice'))));
await test('pas de défi créé au nom d\'un autre (forme réelle)', () => assertFails(addDoc(collection(mallory, 'user_challenges'), realChallenge('alice'))));
await test('pas de création de défi au nom d\'autrui', () =>
  assertFails(addDoc(collection(mallory, 'user_challenges'), { userId: 'alice', exerciseId: 'hack', history: [] })));
// the owner keeps validating and abandoning, but cannot hand the challenge over (it filled the other's 6 slots)
const malloryChallenge = await addDoc(collection(mallory, 'user_challenges'), realChallenge('mallory'));
await test('valider un jour de défi (mise à jour réelle)', () => assertSucceeds(updateDoc(malloryChallenge, {
  lastLogDate: serverTimestamp(), totalProgress: 10, history: [{ date: '2026-10-06', amount: 10, completed: true, catchUp: false }], status: 'active' })));
await test('pas de transfert de défi à un autre', () => assertFails(updateDoc(malloryChallenge, { userId: 'alice' })));
await test('abandonner son défi (setDoc merge)', () => assertSucceeds(setDoc(malloryChallenge, { status: 'abandoned' }, { merge: true })));
const malloryExercise = await addDoc(collection(mallory, 'exercises'), { name: 'Burpees', emoji: '🔥', category: 'cardio', userId: 'mallory', createdAt: serverTimestamp() });
await test('pas de transfert d\'exercice perso à un autre', () => assertFails(updateDoc(malloryExercise, { userId: 'alice' })));
await test('supprimer son exercice perso', () => assertSucceeds(deleteDoc(malloryExercise)));

console.log('\n─ Notifications ─');
await test('pas de notification forgée vers un inconnu', () =>
  assertFails(addDoc(collection(mallory, 'notifications'), { userId: 'carol', fromUserId: 'mallory', title: 'SPAM', message: 'spam', type: 'friend_activity', read: false, createdAt: serverTimestamp() })));
await test('pas de notification en se faisant passer pour un autre', () =>
  assertFails(addDoc(collection(alice, 'notifications'), { userId: 'bob', fromUserId: 'carol', title: 'x', message: 'x', type: 'friend_activity', read: false, createdAt: serverTimestamp() })));
// what the app sends: a kudos (giveKudos) and the acceptance notice once both friends lists are linked (acceptFriendRequest)
const kudosNotif = (from, to, extra = {}) => ({ userId: to, fromUserId: from, fromName: from, type: 'kudos', read: false, sessionId: 'n1',
  title: 'Encouragement 👏', message: `${from} a encouragé ta séance`, createdAt: serverTimestamp(), ...extra });
await env.withSecurityRulesDisabled(async (ctx) => {
  for (const id of ['n1', 'n2']) await setDoc(doc(ctx.firestore(), `sessions/bob/userSessions/${id}`), { userId: 'bob', totalReps: 10, exercises: [] });
});
await test('encouragement notifié à un ami (forme réelle : le kudos, puis la notification)', async () => {
  await assertSucceeds(setDoc(doc(alice, 'sessions/bob/userSessions/n1/kudos/alice'), { createdAt: serverTimestamp(), fromUid: 'alice' }));
  await assertSucceeds(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob')));
});
// the home banner reads every unread kudos notification and fans out one kudos query per sessionId: a friend could
// pile up ~1 MB ones, of any type, with invented sessions
await test('notification avec une clé en plus refusée', () =>
  assertFails(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob', { junk: 'x'.repeat(1000) }))));
await test('type limité à ceux de l\'appli', () =>
  assertFails(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob', { type: 'support' }))));
await test('notification de kudos sans sessionId refusée', async () => {
  const { sessionId, ...noSession } = kudosNotif('alice', 'bob');
  void sessionId;
  await assertFails(addDoc(collection(alice, 'notifications'), noSession));
});
await test('notification de kudos avec un sessionId non textuel refusée', () =>
  assertFails(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob', { sessionId: 7 }))));
await test('notification de kudos sans kudos réel refusée (séance inventée)', () =>
  assertFails(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob', { sessionId: 'n2' }))));
// getUnreadKudos (limit 50) then markKudosSeen
await test('lecture des kudos non lus (forme réelle)', () => assertSucceeds(getDocs(query(collection(bob, 'notifications'),
  where('userId', '==', 'bob'), where('read', '==', false), where('type', '==', 'kudos'), limit(50)))));
await test('kudos marqués comme vus (batch)', async () => {
  const unread = await getDocs(query(collection(bob, 'notifications'), where('userId', '==', 'bob'), where('read', '==', false), where('type', '==', 'kudos'), limit(50)));
  const b = writeBatch(bob);
  unread.docs.forEach((d) => b.update(d.ref, { read: true }));
  await assertSucceeds(b.commit());
});
await test('acceptation notifiée après le batch (forme réelle)', () =>
  assertSucceeds(addDoc(collection(env.authenticatedContext('ivy').firestore(), 'notifications'), { userId: 'jack', fromUserId: 'ivy',
    title: 'Demande acceptée', message: 'ivy a accepté ta demande d\'ami', type: 'friend_activity', read: false, createdAt: serverTimestamp() })));
await test('pas de notification grâce à une simple demande en attente', () =>
  assertFails(addDoc(collection(mallory, 'notifications'), kudosNotif('mallory', 'bob'))));
await test('fromName borné', () => assertFails(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob', { fromName: 'x'.repeat(51) }))));
await test('createdAt = heure du serveur', () => assertFails(addDoc(collection(alice, 'notifications'), kudosNotif('alice', 'bob', { createdAt: 'zzz' }))));
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
await env.withSecurityRulesDisabled(async (ctx) => {
  for (const id of ['b1', 'b2', 'b3']) await setDoc(doc(ctx.firestore(), `sessions/bob/userSessions/${id}`), { userId: 'bob', totalReps: 10, exercises: [] });
});
// account deletion walks the existing sessions only: a kudos on a missing one stayed behind
await test('pas de réaction à une séance inexistante', () => assertFails(setDoc(doc(alice, 'sessions/bob/userSessions/nope/kudos/alice'), k('alice'))));
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
