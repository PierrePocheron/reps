import type { Exercise, ExerciseCategory, WorkoutType } from '@/firebase/types';
import type { Language } from '@/hooks/useLanguage';
import { equipmentLabel, targetLabel } from '@/utils/exerciseLabels';

/**
 * Bibliothèque complète d'exercices (1324) issue du dataset
 * hasaneyldrm/exercises-dataset.
 *
 * - Données (noms FR/EN, muscles, instructions FR/EN) : embarquées, un fichier
 *   par langue chargé en lazy (~125 Ko gzippés) via import dynamique — aucun
 *   impact sur le démarrage.
 * - Médias : servis à la demande depuis le CDN jsDelivr (fichiers statiques
 *   du repo GitHub, pas d'API). Les 55 exercices par défaut de REPS gardent
 *   leurs médias embarqués et restent disponibles hors ligne.
 */
export interface LibraryExercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  bodyPart: string;
  target: string;
  secondaryMuscles: string[];
  equipment: string;
  steps: string[];
  media: string;
}

/** Préfixe des ids bibliothèque dans les séances (évite toute collision) */
export const LIBRARY_ID_PREFIX = 'lib_';

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';

export const libraryImageUrl = (ex: LibraryExercise): string =>
  `${CDN_BASE}/images/${ex.media}.jpg`;

export const libraryGifUrl = (ex: LibraryExercise): string =>
  `${CDN_BASE}/videos/${ex.media}.gif`;

/** Emoji par catégorie pour les exercices de la bibliothèque */
const CATEGORY_EMOJI: Record<string, string> = {
  chest: '💪',
  back: '🧗',
  legs: '🦵',
  shoulders: '🤸',
  arms: '💈',
  core: '🍫',
  cardio: '🔥',
};

/** MET indicatif par catégorie pour le calcul calorique en renforcement */
const CATEGORY_MET: Record<string, number> = {
  cardio: 7.0,
  legs: 5.0,
  back: 5.0,
  chest: 4.5,
  shoulders: 4.0,
  core: 3.5,
  arms: 3.5,
};

const cache: Partial<Record<Language, LibraryExercise[]>> = {};
const pending: Partial<Record<Language, Promise<LibraryExercise[]>>> = {};

/** Charge la bibliothèque dans la langue demandée (import dynamique, cache module) */
export function loadExerciseLibrary(lang: Language = 'fr'): Promise<LibraryExercise[]> {
  const cached = cache[lang];
  if (cached) return Promise.resolve(cached);
  pending[lang] ??= (
    lang === 'en'
      ? import('@/data/exerciseLibrary.en.json')
      : import('@/data/exerciseLibrary.fr.json')
  ).then((mod) => {
    const data = mod.default as LibraryExercise[];
    cache[lang] = data;
    return data;
  }).catch((err: unknown) => {
    // Permet un nouvel essai (bouton « Réessayer ») après un échec réseau
    pending[lang] = undefined;
    throw err;
  });
  return pending[lang]!;
}

/** Retrouve un exercice bibliothèque depuis un id de séance (`lib_<id>`) */
export async function getLibraryExercise(
  sessionExerciseId: string,
  lang: Language = 'fr'
): Promise<LibraryExercise | null> {
  if (!sessionExerciseId.startsWith(LIBRARY_ID_PREFIX)) return null;
  const id = sessionExerciseId.slice(LIBRARY_ID_PREFIX.length);
  const lib = await loadExerciseLibrary(lang);
  return lib.find((e) => e.id === id) ?? null;
}

/** Convertit un exercice bibliothèque vers le modèle Exercise de REPS */
export function toExercise(ex: LibraryExercise, workoutType: WorkoutType = 'musculation'): Exercise {
  const base: Exercise = {
    id: `${LIBRARY_ID_PREFIX}${ex.id}`,
    name: ex.name,
    emoji: CATEGORY_EMOJI[ex.category] ?? '💪',
    category: ex.category,
    workoutType,
    imageUrl: libraryImageUrl(ex),
  };
  if (workoutType === 'renforcement') {
    base.met = CATEGORY_MET[ex.category] ?? 4.0;
    base.timePerRep = 2.0;
  }
  return base;
}

/** Recherche insensible à la casse/accents sur le nom, l'équipement et le muscle ciblé */
export function searchLibrary(
  library: LibraryExercise[],
  query: string,
  category: ExerciseCategory | 'all' = 'all',
  equipment?: string,
  lang: Language = 'fr'
): LibraryExercise[] {
  // Every word must appear somewhere: « curl haltère » finds « Curl … aux haltères »
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return library.filter((ex) => {
    if (category !== 'all' && ex.category !== category) return false;
    if (equipment && ex.equipment !== equipment) return false;
    if (!words.length) return true;
    const hay = normalize(
      `${ex.name} ${ex.target} ${targetLabel(ex.target, lang)} ${equipmentLabel(ex.equipment, lang)}`
    );
    return words.every((w) => hay.includes(w));
  });
}

/** Minuscules + suppression des accents pour une recherche tolérante */
export function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
