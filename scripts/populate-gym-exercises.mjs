/**
 * Script admin — à exécuter UNE SEULE FOIS pour peupler Firestore
 * avec les exercices de musculation + leurs images depuis l'API Wger.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   node scripts/populate-gym-exercises.mjs
 *
 * Résultat : collection Firestore "default_exercises" peuplée avec
 *   { id, name, emoji, category, workoutType, imageUrl, wgerExerciseId }
 *
 * Après l'exécution, l'app lit depuis Firestore — aucun appel Wger nécessaire.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Configuration ────────────────────────────────────────────────────────────

const WGER_BASE = 'https://wger.de/api/v2';
const LANGUAGE_FRENCH = 2; // Wger language ID pour le français
const LANGUAGE_ENGLISH = 2; // fallback anglais si pas de traduction française

/**
 * Mapping entre nos IDs d'exercices et les mots-clés de recherche Wger (en anglais)
 * Le script cherchera par nom dans la réponse Wger et associera le premier match.
 */
const EXERCISE_MAPPING = [
  // Poitrine
  { id: 'bench_press',       wgerSearch: ['bench press', 'barbell bench'] },
  { id: 'incline_bench',     wgerSearch: ['incline bench', 'incline barbell'] },
  { id: 'dumbbell_fly',      wgerSearch: ['dumbbell fly', 'chest fly'] },
  { id: 'cable_fly',         wgerSearch: ['cable fly', 'cable crossover'] },
  { id: 'chest_dips',        wgerSearch: ['chest dip', 'weighted dip'] },

  // Dos
  { id: 'deadlift',          wgerSearch: ['deadlift', 'conventional deadlift'] },
  { id: 'barbell_row',       wgerSearch: ['barbell row', 'bent over row'] },
  { id: 'dumbbell_row',      wgerSearch: ['dumbbell row', 'one arm row'] },
  { id: 'lat_pulldown',      wgerSearch: ['lat pulldown', 'pull down'] },
  { id: 'cable_row',         wgerSearch: ['seated cable row', 'cable row'] },
  { id: 'weighted_pullups',  wgerSearch: ['weighted pull-up', 'pull-up'] },

  // Jambes
  { id: 'barbell_squat',     wgerSearch: ['barbell squat', 'back squat'] },
  { id: 'leg_press',         wgerSearch: ['leg press', '45 degree'] },
  { id: 'leg_curl',          wgerSearch: ['leg curl', 'hamstring curl'] },
  { id: 'leg_extension',     wgerSearch: ['leg extension', 'quad extension'] },
  { id: 'romanian_deadlift', wgerSearch: ['romanian deadlift', 'rdl'] },
  { id: 'weighted_hip_thrust',wgerSearch: ['hip thrust', 'barbell hip thrust'] },
  { id: 'machine_calf',      wgerSearch: ['calf raise', 'seated calf'] },

  // Épaules
  { id: 'overhead_press',    wgerSearch: ['overhead press', 'military press', 'shoulder press'] },
  { id: 'db_lateral_raise',  wgerSearch: ['lateral raise', 'side raise'] },
  { id: 'front_raise',       wgerSearch: ['front raise', 'dumbbell front'] },
  { id: 'face_pull',         wgerSearch: ['face pull', 'cable face pull'] },

  // Bras
  { id: 'barbell_curl',      wgerSearch: ['barbell curl', 'standing barbell curl'] },
  { id: 'dumbbell_curl',     wgerSearch: ['dumbbell curl', 'standing dumbbell'] },
  { id: 'hammer_curl',       wgerSearch: ['hammer curl', 'neutral grip curl'] },
  { id: 'skull_crusher',     wgerSearch: ['skull crusher', 'lying tricep', 'ez bar skull'] },
  { id: 'tricep_pushdown',   wgerSearch: ['tricep pushdown', 'cable pushdown'] },
  { id: 'overhead_ext',      wgerSearch: ['overhead tricep', 'overhead extension'] },

  // Core
  { id: 'crunch_machine',    wgerSearch: ['crunch machine', 'machine crunch'] },
  { id: 'ab_wheel',          wgerSearch: ['ab wheel', 'wheel rollout'] },
  { id: 'weighted_plank',    wgerSearch: ['plank', 'weighted plank'] },
];

// ─── Initialisation Firebase Admin ───────────────────────────────────────────

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS non défini');
  console.error('   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  await (await import('fs')).promises.readFile(serviceAccountPath, 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

console.log('✅ Firebase Admin initialisé');

// ─── Fetch Wger exercises ─────────────────────────────────────────────────────

async function fetchWgerExercises() {
  console.log('📥 Récupération des exercices Wger (anglais)...');
  const exercises = [];
  let url = `${WGER_BASE}/exercise/?format=json&language=2&limit=100&offset=0`;

  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    exercises.push(...data.results);
    url = data.next;
    console.log(`   ${exercises.length} exercices récupérés...`);
  }

  console.log(`✅ ${exercises.length} exercices Wger chargés`);
  return exercises;
}

async function fetchExerciseImage(exerciseId) {
  try {
    const res = await fetch(`${WGER_BASE}/exerciseimage/?format=json&exercise=${exerciseId}&limit=1`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].image; // URL de l'image Wger
    }
  } catch {
    // Pas d'image disponible
  }
  return null;
}

// ─── Matching et population ───────────────────────────────────────────────────

async function run() {
  const wgerExercises = await fetchWgerExercises();
  const collectionRef = db.collection('default_exercises');

  let populated = 0;
  let notFound = 0;

  for (const mapping of EXERCISE_MAPPING) {
    // Chercher dans Wger par nom (case-insensitive)
    const wgerMatch = wgerExercises.find((ex) =>
      mapping.wgerSearch.some((keyword) =>
        ex.name.toLowerCase().includes(keyword.toLowerCase())
      )
    );

    if (!wgerMatch) {
      console.warn(`⚠️  Pas de match Wger pour: ${mapping.id} (${mapping.wgerSearch[0]})`);
      notFound++;
      continue;
    }

    console.log(`🔍 ${mapping.id} → Wger #${wgerMatch.id} "${wgerMatch.name}"`);

    // Récupérer l'image
    const imageUrl = await fetchExerciseImage(wgerMatch.id);
    if (imageUrl) {
      console.log(`   📸 Image: ${imageUrl}`);
    } else {
      console.log('   ⚠️  Aucune image disponible');
    }

    // Écrire dans Firestore
    await collectionRef.doc(mapping.id).set({
      wgerExerciseId: wgerMatch.id,
      wgerName: wgerMatch.name,
      imageUrl: imageUrl ?? null,
      updatedAt: new Date(),
    }, { merge: true }); // merge pour ne pas écraser les autres champs

    populated++;

    // Pause pour ne pas surcharger l'API
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log('\n─────────────────────────────────────');
  console.log(`✅ ${populated} exercices populés dans Firestore`);
  if (notFound > 0) {
    console.log(`⚠️  ${notFound} exercices sans correspondance Wger`);
  }
  console.log('\nCollection Firestore: default_exercises');
  console.log('L\'app lira ces données au démarrage via useExerciseImages()');
}

run().catch(console.error);
