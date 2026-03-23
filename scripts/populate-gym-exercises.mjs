/**
 * Script admin — à exécuter UNE SEULE FOIS pour peupler Firestore
 * avec les exercices de musculation + leurs images depuis l'API Wger.
 *
 * Usage:
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json
 *   node scripts/populate-gym-exercises.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const WGER_BASE = 'https://wger.de/api/v2';

const EXERCISE_MAPPING = [
  // Poitrine
  { id: 'bench_press',        search: 'bench press' },
  { id: 'incline_bench',      search: 'incline bench press' },
  { id: 'dumbbell_fly',       search: 'dumbbell fly' },
  { id: 'cable_fly',          search: 'cable crossover' },
  { id: 'chest_dips',         search: 'chest dips' },

  // Dos
  { id: 'deadlift',           search: 'deadlift' },
  { id: 'barbell_row',        search: 'bent over row' },
  { id: 'dumbbell_row',       search: 'dumbbell row' },
  { id: 'lat_pulldown',       search: 'lat pulldown' },
  { id: 'cable_row',          search: 'seated cable row' },
  { id: 'weighted_pullups',   search: 'pull-up' },

  // Jambes
  { id: 'barbell_squat',      search: 'barbell squat' },
  { id: 'leg_press',          search: 'leg press' },
  { id: 'leg_curl',           search: 'leg curl' },
  { id: 'leg_extension',      search: 'leg extension' },
  { id: 'romanian_deadlift',  search: 'romanian deadlift' },
  { id: 'weighted_hip_thrust',search: 'hip thrust' },
  { id: 'machine_calf',       search: 'calf raise' },

  // Épaules
  { id: 'overhead_press',     search: 'overhead press' },
  { id: 'db_lateral_raise',   search: 'lateral raise' },
  { id: 'front_raise',        search: 'front raise' },
  { id: 'face_pull',          search: 'face pull' },

  // Bras
  { id: 'barbell_curl',       search: 'barbell curl' },
  { id: 'dumbbell_curl',      search: 'dumbbell curl' },
  { id: 'hammer_curl',        search: 'hammer curl' },
  { id: 'skull_crusher',      search: 'skull crusher' },
  { id: 'tricep_pushdown',    search: 'tricep pushdown' },
  { id: 'overhead_ext',       search: 'overhead tricep extension' },

  // Core
  { id: 'crunch_machine',     search: 'crunch' },
  { id: 'ab_wheel',           search: 'ab wheel' },
  { id: 'weighted_plank',     search: 'plank' },
];

// ─── Firebase Admin ───────────────────────────────────────────────────────────

const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (!serviceAccountPath) {
  console.error('❌ GOOGLE_APPLICATION_CREDENTIALS non défini');
  process.exit(1);
}

const serviceAccount = JSON.parse(
  await (await import('fs')).promises.readFile(serviceAccountPath, 'utf8')
);

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();
console.log('✅ Firebase Admin initialisé');

// ─── Search ───────────────────────────────────────────────────────────────────

async function fetchExerciseInfo(baseId) {
  try {
    const res = await fetch(`${WGER_BASE}/exerciseinfo/${baseId}/?format=json`);
    const data = await res.json();
    // Récupérer description anglaise
    const enTranslation = data.translations?.find((t) => t.language === 2);
    const description = enTranslation?.description
      ? enTranslation.description.replace(/<[^>]*>/g, '').trim()
      : null;
    // Préférer les GIFs aux images statiques
    const gif = data.images?.find((img) => img.image?.endsWith('.gif'));
    const anyImage = data.images?.[0];
    const imageUrl = gif?.image ?? anyImage?.image ?? null;
    const fullUrl = imageUrl
      ? (imageUrl.startsWith('http') ? imageUrl : `https://wger.de${imageUrl}`)
      : null;
    return { description, imageUrl: fullUrl };
  } catch {
    return { description: null, imageUrl: null };
  }
}

async function searchExercise(term) {
  try {
    const url = `${WGER_BASE}/exercise/search/?term=${encodeURIComponent(term)}&language=english&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    // Préférer résultat avec image
    const withImage = data.suggestions?.find((s) => s.data?.image);
    const first = withImage ?? data.suggestions?.[0];
    if (!first) return null;

    const baseId = first.data.base_id;
    const info = await fetchExerciseInfo(baseId);

    return {
      name: first.data.name,
      imageUrl: info.imageUrl ?? (first.data.image ? `https://wger.de${first.data.image}` : null),
      description: info.description,
    };
  } catch {
    return null;
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────

async function run() {
  const collectionRef = db.collection('default_exercises');
  let populated = 0;
  let notFound = 0;

  for (const mapping of EXERCISE_MAPPING) {
    const result = await searchExercise(mapping.search);

    if (!result) {
      console.warn(`⚠️  Pas de résultat pour: ${mapping.id} ("${mapping.search}")`);
      notFound++;
      continue;
    }

    const imageUrl = result.imageUrl;
    if (imageUrl) {
      console.log(`✅ ${mapping.id} → "${result.name}" 📸 ${imageUrl}`);
    } else {
      console.log(`⚠️  ${mapping.id} → "${result.name}" (pas d'image)`);
    }

    await collectionRef.doc(mapping.id).set({
      wgerName: result.name,
      imageUrl: imageUrl ?? null,
      description: result.description ?? null,
      updatedAt: new Date(),
    }, { merge: true });

    populated++;
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n─────────────────────────────────────');
  console.log(`✅ ${populated} exercices populés dans Firestore`);
  if (notFound > 0) console.log(`⚠️  ${notFound} sans résultat`);
}

run().catch(console.error);
