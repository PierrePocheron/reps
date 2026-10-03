/**
 * Données de démo pour les ÉMULATEURS Firebase (yarn dev:demo).
 * Refuse de tourner hors émulateur : ne touche jamais la prod.
 *
 * Compte démo (émulateur uniquement) : demo@reps.test / reps-demo-2026
 * Personnages fictifs : Camille (compte démo), Léa et Sam (amis), Noa (demande en attente),
 * Alex (compte neuf, aucune donnée : premier lancement et états vides).
 */

import { createHash } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('✗ Émulateurs non détectés — ce script ne tourne que via « yarn dev:demo ».');
  process.exit(1);
}

initializeApp({ projectId: 'demo-reps' });
const auth = getAuth();
const db = getFirestore();

const DAY = 86_400_000;
const now = Date.now();
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; // déterministe
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const at = (daysAgo, hour) => {
  const d = new Date(now - daysAgo * DAY);
  d.setHours(hour, Math.floor(rand() * 50), 0, 0);
  return Timestamp.fromDate(d);
};
const sha256 = (s) => createHash('sha256').update(s.trim().toLowerCase()).digest('hex');

const PEOPLE = [
  { uid: 'demo', email: 'demo@reps.test', password: 'reps-demo-2026', firstName: 'Camille', displayName: 'camille', avatarEmoji: '🦊', gender: 'female', weight: 64, height: 168, birthDate: '1997-04-12' },
  { uid: 'lea', email: 'lea@reps.test', password: 'reps-demo-2026', firstName: 'Léa', displayName: 'lea', avatarEmoji: '🐯', gender: 'female', weight: 58, height: 163, birthDate: '1999-09-02' },
  { uid: 'sam', email: 'sam@reps.test', password: 'reps-demo-2026', firstName: 'Sam', displayName: 'sam', avatarEmoji: '🐻', gender: 'male', weight: 81, height: 182, birthDate: '1994-01-23' },
  { uid: 'noa', email: 'noa@reps.test', password: 'reps-demo-2026', firstName: 'Noa', displayName: 'noa', avatarEmoji: '🐼', gender: 'other', weight: 70, height: 175, birthDate: '2000-06-30' },
];
const FRIENDS = { demo: ['lea', 'sam'], lea: ['demo', 'sam'], sam: ['demo', 'lea'], noa: [] };

const RENFO = [
  ['Pompes', '💪', [15, 35]], ['Squats', '🦵', [20, 50]], ['Tractions', '🧗', [4, 12]],
  ['Dips', '♣️', [8, 20]], ['Abdos', '🍫', [20, 40]], ['Burpees', '💀', [8, 20]], ['Fentes avant', '🚶', [12, 30]],
];
// [id, nom, emoji, charge de départ (kg), progression sur 90 jours (kg)]
const GYM = [
  ['bench_press', 'Développé couché', '🏋️', 45, 12.5], ['barbell_squat', 'Squat barre', '🦵', 60, 17.5],
  ['deadlift', 'Soulevé de terre', '⚓', 70, 20], ['overhead_press', 'Développé militaire', '🏋️', 27.5, 5],
  ['barbell_row', 'Rowing barre', '🚣', 40, 10], ['lat_pulldown', 'Tirage poulie haute', '⬇️', 40, 10],
  ['barbell_curl', 'Curl barre', '🥊', 20, 5],
];
const round = (kg) => Math.round(kg / 2.5) * 2.5;

async function seedPerson(p, { renfoEvery, gymEvery, activityScale, dailySince = -1 }) {
  await auth.createUser({ uid: p.uid, email: p.email, password: p.password, displayName: p.displayName, emailVerified: true });

  const batch = db.batch();
  let totalReps = 0, totalCalories = 0, sessions = 0;
  const slots = { morningSessions: 0, lunchSessions: 0, nightSessions: 0 };
  const slot = (ts) => { const h = ts.toDate().getHours(); slots[h < 11 ? 'morningSessions' : h < 15 ? 'lunchSessions' : 'nightSessions']++; return ts; };

  // dailySince : une séance par jour sur les derniers jours (série en cours visible)
  for (let d = 88; d >= 0; d -= d <= dailySince ? 1 : renfoEvery + Math.floor(rand() * 2)) {
    const exs = [...RENFO].sort(() => rand() - 0.5).slice(0, 3 + Math.floor(rand() * 2))
      .map(([name, emoji, [lo, hi]]) => ({ name, emoji, reps: Math.round((lo + rand() * (hi - lo)) * activityScale) * 2 }));
    const reps = exs.reduce((s, e) => s + e.reps, 0);
    const kcal = Math.round(reps * 0.45);
    const ref = db.collection('sessions').doc(p.uid).collection('userSessions').doc();
    batch.set(ref, { userId: p.uid, date: slot(at(d, pick([7, 12, 18, 19]))), duration: 900 + Math.floor(rand() * 1500), exercises: exs, totalReps: reps, totalCalories: kcal, createdAt: at(d, 20) });
    totalReps += reps; totalCalories += kcal; sessions++;
  }

  for (let d = 87; d >= 1; d -= gymEvery + Math.floor(rand() * 2)) {
    const progress = (90 - d) / 90;
    const day = sessions % 2 === 0 ? GYM.slice(0, 4) : [GYM[2], ...GYM.slice(4)];
    let volume = 0, sets = 0;
    const exercises = day.map(([exerciseId, name, emoji, start, gain]) => {
      const w = round((start + gain * progress) * activityScale);
      const s = Array.from({ length: 3 + (rand() > 0.6 ? 1 : 0) }, (_, i) => {
        const reps = Math.max(5, 10 - i - Math.floor(rand() * 2));
        volume += w * reps; sets++;
        return { weight: w, reps, completed: true, restDuration: 90 };
      });
      return { exerciseId, name, emoji, imageUrl: `/exercises/${exerciseId}.jpg`, sets: s };
    });
    const ref = db.collection('gym_sessions').doc(p.uid).collection('userGymSessions').doc();
    batch.set(ref, { userId: p.uid, date: slot(at(d, pick([7, 18, 19]))), duration: 2700 + Math.floor(rand() * 1500), exercises, totalVolume: volume, totalSets: sets, createdAt: at(d, 21) });
    sessions++;
  }

  batch.set(db.doc(`users/${p.uid}`), {
    displayName: p.displayName, searchName: p.displayName, firstName: p.firstName, avatarEmoji: p.avatarEmoji,
    colorTheme: 'violet', emailHash: sha256(p.email), repButtons: [5, 10, 20],
    totalReps, totalSessions: sessions, totalCalories, ...slots,
    badges: ['poussin', 'mosquito', 'streak-3', 'streak-7', 'sessions-10', 'cal-cookie', 'early_bird'].slice(0, 3 + Math.floor(activityScale * 4)),
    friends: FRIENDS[p.uid], currentStreak: Math.round(5 * activityScale), longestStreak: Math.round(12 * activityScale),
    lastConnection: Timestamp.now(), createdAt: at(90, 9), updatedAt: Timestamp.now(),
  });
  batch.set(db.doc(`users/${p.uid}/private/profile`), { email: p.email, weight: p.weight, height: p.height, birthDate: p.birthDate, gender: p.gender });
  await batch.commit();
  return sessions;
}

// Compte neuf : profil créé comme à l'inscription, aucune séance ni ami
await auth.createUser({ uid: 'alex', email: 'alex@reps.test', password: 'reps-demo-2026', displayName: 'alex', emailVerified: true });
await db.doc('users/alex').set({
  displayName: 'alex', searchName: 'alex', firstName: 'Alex', avatarEmoji: '🐥', colorTheme: 'violet', emailHash: sha256('alex@reps.test'),
  totalReps: 0, totalSessions: 0, totalCalories: 0, badges: ['poussin'], friends: [], currentStreak: 0, longestStreak: 0,
  lastTrainingDate: null, weeklyStreak: 0, lastMetWeek: null, lastConnection: null, createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
});
await db.doc('users/alex/private/profile').set({ email: 'alex@reps.test' });

const counts = [];
counts.push(await seedPerson(PEOPLE[0], { renfoEvery: 4, gymEvery: 3, activityScale: 1, dailySince: 7 }));
counts.push(await seedPerson(PEOPLE[1], { renfoEvery: 3, gymEvery: 6, activityScale: 0.9 }));
counts.push(await seedPerson(PEOPLE[2], { renfoEvery: 6, gymEvery: 3, activityScale: 1.15 }));
counts.push(await seedPerson(PEOPLE[3], { renfoEvery: 9, gymEvery: 12, activityScale: 0.6 }));

// Amitiés acceptées (IDs déterministes, cf. firestore.rules) + une demande en attente
const fr = db.batch();
for (const [from, to] of [['lea', 'demo'], ['demo', 'sam'], ['sam', 'lea']]) {
  fr.set(db.doc(`friend_requests/${from}_${to}`), { fromUserId: from, toUserId: to, fromDisplayName: from, fromAvatarEmoji: '🐥', status: 'accepted', createdAt: at(60, 10) });
}
fr.set(db.doc('friend_requests/noa_demo'), { fromUserId: 'noa', toUserId: 'demo', fromDisplayName: 'noa', fromAvatarEmoji: '🐼', status: 'pending', createdAt: at(1, 9) });

// Défi en cours : pompes, démarré il y a 6 jours, à jour (J7 à faire aujourd'hui)
const def = { id: 'c_pushups_medium', exerciseId: 'pushups', title: 'Pompes Intermédiaire', description: '21 jours pour progresser aux pompes.', difficulty: 'medium', logic: 'progressive', durationDays: 21, baseAmount: 15, increment: 2 };
const history = Array.from({ length: 6 }, (_, i) => ({ date: new Date(now - (6 - i) * DAY).toISOString().slice(0, 10), amount: 15 + 2 * i, completed: true }));
fr.set(db.doc('user_challenges/demo_pushups'), { id: 'demo_pushups', userId: 'demo', challengeId: def.id, definitionSnapshot: def, startDate: at(6, 8), lastLogDate: at(1, 19), totalProgress: 6, status: 'active', history });

// Modèle perso de Léa (copiable par ses amis)
fr.set(db.doc('userTemplates/lea/templates/lea_haut'), {
  name: 'Haut du corps', emoji: '💪', description: 'Développé couché · Rowing · Développé militaire', workoutType: 'musculation', userId: 'lea',
  muscuExercises: [
    { exerciseId: 'bench_press', sets: [{ weight: 40, reps: 10 }, { weight: 40, reps: 10 }, { weight: 40, reps: 8 }] },
    { exerciseId: 'barbell_row', sets: [{ weight: 35, reps: 10 }, { weight: 35, reps: 10 }, { weight: 35, reps: 10 }] },
    { exerciseId: 'overhead_press', sets: [{ weight: 25, reps: 8 }, { weight: 25, reps: 8 }] },
  ],
  createdAt: Timestamp.now(),
});

// Événement de badge dans le fil d'activité
fr.set(db.collection('users').doc('lea').collection('userEvents').doc(), { type: 'badge_unlocked', userId: 'lea', badgeName: 'Série de 7 jours', badgeEmoji: '🔥', createdAt: at(2, 18) });
await fr.commit();

console.log(`✓ Démo prête : ${PEOPLE.length} comptes, ${counts.reduce((a, b) => a + b, 0)} séances. Connexion : demo@reps.test (mot de passe dans scripts/seed-emulator.mjs)`);
