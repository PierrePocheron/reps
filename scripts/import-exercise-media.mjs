/**
 * Import des médias et instructions d'exercices depuis le dataset
 * https://github.com/hasaneyldrm/exercises-dataset (1324 exercices).
 *
 * - Données (noms, muscles, instructions FR) : licence MIT
 * - Médias (vignettes 180×180 + GIFs) : © Gym visual — https://gymvisual.com/
 *   Redistribués avec permission à condition de conserver l'attribution
 *   et la résolution 180×180 (voir NOTICE.md du dataset).
 *
 * Produit :
 *   public/exercises/<repsId>.jpg   — vignette 180×180
 *   public/exercises/<repsId>.gif   — animation
 *   src/data/exerciseDetails.json     — instructions FR/EN + muscles + chemins locaux
 *   src/data/exerciseLibrary.fr.json  — bibliothèque complète en français
 *   src/data/exerciseLibrary.en.json  — bibliothèque complète en anglais
 *                                        (médias servis via CDN jsDelivr à la demande)
 *
 * Les noms français des 1324 exercices proviennent de
 * scripts/data/exercise-names.fr.json (traduction relue, versionnée).
 *
 * Usage :  node scripts/import-exercise-media.mjs [--data-only]
 */

import { mkdir, writeFile, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW_BASE = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main';
const CACHE = path.join(ROOT, 'scripts', '.cache', 'exercises-dataset.json');
const MEDIA_DIR = path.join(ROOT, 'public', 'exercises');
const OUT_JSON = path.join(ROOT, 'src', 'data', 'exerciseDetails.json');
const OUT_LIBRARY_FR = path.join(ROOT, 'src', 'data', 'exerciseLibrary.fr.json');
const OUT_LIBRARY_EN = path.join(ROOT, 'src', 'data', 'exerciseLibrary.en.json');
const NAMES_FR = path.join(ROOT, 'scripts', 'data', 'exercise-names.fr.json');
const ATTRIBUTION = '© Gym visual — https://gymvisual.com/';

/** body_part du dataset → catégorie REPS */
const BODY_PART_TO_CATEGORY = {
  back: 'back',
  cardio: 'cardio',
  chest: 'chest',
  'lower arms': 'arms',
  'upper arms': 'arms',
  'lower legs': 'legs',
  'upper legs': 'legs',
  neck: 'shoulders',
  shoulders: 'shoulders',
  waist: 'core',
};

/**
 * Mapping curaté : id d'exercice REPS → id du dataset.
 * Choisi manuellement pour que le visuel corresponde au mouvement.
 * Sans correspondance satisfaisante (fallback emoji dans l'app) :
 *   superman, side_lunges, pike_pushups, face_pull
 */
const MAPPING = {
  // ─── Renforcement (poids du corps) ────────────────────────────────────
  pushups: '0662',            // push-up
  diamond_pushups: '0283',    // diamond push-up
  wide_pushups: '1311',       // wide hand push up
  decline_pushups: '0279',    // decline push-up
  dips: '0251',               // chest dip
  pullups: '0652',            // pull-up
  chin_ups: '1326',           // chin-up
  inverted_rows: '0499',      // inverted row
  squats: '1685',             // squat to overhead reach (pas d'air squat pur dans le dataset)
  jump_squats: '0514',        // jump squat
  lunges: '3470',             // forward lunge (male)
  bulgarian_squats: '0410',   // dumbbell single leg split squat (pied arrière surélevé)
  glute_bridge: '3523',       // glute bridge two legs on bench (male)
  calf_raises: '1373',        // bodyweight standing calf raise
  shoulder_taps: '3699',      // shoulder tap
  abs: '0274',                // crunch floor
  leg_raises: '0620',         // lying leg raise flat bench
  russian_twists: '0687',     // russian twist
  mountain_climbers: '0630',  // mountain climber
  v_ups: '0507',              // jackknife sit-up
  bicycle_crunches: '0003',   // air bike
  burpees: '1160',            // burpee
  jumping_jacks: '3224',      // jack jump (male)
  high_knees: '3636',         // high knee against wall
  box_jumps: '1374',          // box jump down with one leg stabilization

  // ─── Musculation ──────────────────────────────────────────────────────
  bench_press: '0025',        // barbell bench press
  incline_bench: '0047',      // barbell incline bench press
  dumbbell_fly: '0308',       // dumbbell fly
  cable_fly: '0188',          // cable middle fly
  chest_dips: '0251',         // chest dip
  deadlift: '0032',           // barbell deadlift
  barbell_row: '0027',        // barbell bent over row
  dumbbell_row: '0293',       // dumbbell bent over row
  lat_pulldown: '0198',       // cable pulldown
  cable_row: '0861',          // cable seated row
  weighted_pullups: '0841',   // weighted pull-up
  barbell_squat: '0043',      // barbell full squat
  leg_press: '0739',          // sled 45° leg press
  leg_curl: '0586',           // lever lying leg curl
  leg_extension: '0585',      // lever leg extension
  romanian_deadlift: '0085',  // barbell romanian deadlift
  weighted_hip_thrust: '1409',// barbell glute bridge
  machine_calf: '0605',       // lever standing calf raise
  overhead_press: '1457',     // barbell standing wide military press
  db_lateral_raise: '0334',   // dumbbell lateral raise
  front_raise: '0310',        // dumbbell front raise
  barbell_curl: '0031',       // barbell curl
  dumbbell_curl: '0294',      // dumbbell biceps curl
  hammer_curl: '0313',        // dumbbell hammer curl
  skull_crusher: '0060',      // barbell lying triceps extension skull crusher
  tricep_pushdown: '0200',    // cable pushdown (with rope attachment)
  overhead_ext: '0430',       // dumbbell standing triceps extension
  crunch_machine: '0595',     // lever seated crunch (chest pad)
  ab_wheel: '0857',           // wheel rollerout
  weighted_plank: '2135',     // weighted front plank
};

async function fetchDataset() {
  try {
    await access(CACHE);
    console.log('→ Dataset en cache :', CACHE);
    return JSON.parse(await readFile(CACHE, 'utf8'));
  } catch {
    console.log('→ Téléchargement du dataset (~17 Mo)…');
    const res = await fetch(`${RAW_BASE}/data/exercises.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status} sur exercises.json`);
    const text = await res.text();
    await mkdir(path.dirname(CACHE), { recursive: true });
    await writeFile(CACHE, text);
    return JSON.parse(text);
  }
}

async function downloadMedia(remotePath, localPath) {
  const res = await fetch(`${RAW_BASE}/${remotePath}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} sur ${remotePath}`);
  await writeFile(localPath, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const dataOnly = process.argv.includes('--data-only');
  const dataset = await fetchDataset();
  const byId = new Map(dataset.map((e) => [e.id, e]));

  await mkdir(MEDIA_DIR, { recursive: true });
  await mkdir(path.dirname(OUT_JSON), { recursive: true });

  const out = {};
  let downloaded = 0;

  for (const [repsId, datasetId] of Object.entries(MAPPING)) {
    const ex = byId.get(datasetId);
    if (!ex) {
      console.error(`✗ ${repsId} : id ${datasetId} introuvable dans le dataset`);
      process.exitCode = 1;
      continue;
    }

    const steps = ex.instruction_steps?.fr ?? [];
    const stepsEn = ex.instruction_steps?.en ?? [];
    if (steps.length === 0) console.warn(`⚠ ${repsId} : pas d'instructions FR`);

    out[repsId] = {
      datasetId,
      datasetName: ex.name,
      target: ex.target,
      secondaryMuscles: ex.secondary_muscles ?? [],
      equipment: ex.equipment,
      steps,
      stepsEn,
      image: `/exercises/${repsId}.jpg`,
      gif: `/exercises/${repsId}.gif`,
      attribution: ATTRIBUTION,
    };

    if (!dataOnly) {
      await downloadMedia(ex.image, path.join(MEDIA_DIR, `${repsId}.jpg`));
      await downloadMedia(ex.gif_url, path.join(MEDIA_DIR, `${repsId}.gif`));
      downloaded += 2;
      console.log(`✓ ${repsId} ← ${ex.name} (${datasetId})`);
    }
  }

  await writeFile(OUT_JSON, JSON.stringify(out, null, 2) + '\n');
  console.log(`\n${Object.keys(out).length} exercices → ${path.relative(ROOT, OUT_JSON)}`);
  if (!dataOnly) console.log(`${downloaded} fichiers médias → ${path.relative(ROOT, MEDIA_DIR)}`);

  // ─── Bibliothèque complète (données embarquées, médias via CDN) ─────────
  let namesFr = {};
  try {
    namesFr = JSON.parse(await readFile(NAMES_FR, 'utf8'));
  } catch {
    console.warn(`⚠ ${path.relative(ROOT, NAMES_FR)} introuvable — noms FR = noms EN`);
  }
  const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

  const buildLibrary = (lang) => dataset.map((ex) => ({
    id: ex.id,
    name: lang === 'fr' ? (namesFr[ex.id] ?? capitalize(ex.name)) : capitalize(ex.name),
    category: BODY_PART_TO_CATEGORY[ex.body_part] ?? 'core',
    bodyPart: ex.body_part,
    target: ex.target,
    secondaryMuscles: ex.secondary_muscles ?? [],
    equipment: ex.equipment,
    steps: ex.instruction_steps?.[lang] ?? [],
    // "0001-2gPfomN" → images/<media>.jpg et videos/<media>.gif sur le CDN
    media: ex.image.split('/').pop().replace(/\.jpg$/, ''),
  }));

  const libFr = buildLibrary('fr');
  const libEn = buildLibrary('en');
  const missingFr = libFr.filter((e) => !namesFr[e.id]).length;
  await writeFile(OUT_LIBRARY_FR, JSON.stringify(libFr));
  await writeFile(OUT_LIBRARY_EN, JSON.stringify(libEn));
  console.log(`${libFr.length} exercices → ${path.relative(ROOT, OUT_LIBRARY_FR)} (${missingFr} sans nom FR)`);
  console.log(`${libEn.length} exercices → ${path.relative(ROOT, OUT_LIBRARY_EN)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
