import type { Exercise, ExerciseCategory } from '@/firebase/types';

/**
 * Bibliothèque complète d'exercices (1324) issue du dataset
 * hasaneyldrm/exercises-dataset.
 *
 * - Données (noms, muscles, instructions FR) : embarquées, chargées en lazy
 *   (~250 Ko gzippés) via import dynamique — aucun impact sur le démarrage.
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

/** Libellés français des équipements du dataset */
export const EQUIPMENT_FR: Record<string, string> = {
  assisted: 'Assisté',
  band: 'Élastique',
  barbell: 'Barre',
  'body weight': 'Poids du corps',
  'bosu ball': 'Bosu',
  cable: 'Poulie',
  dumbbell: 'Haltère',
  'elliptical machine': 'Elliptique',
  'ez barbell': 'Barre EZ',
  hammer: 'Machine Hammer',
  kettlebell: 'Kettlebell',
  'leverage machine': 'Machine',
  'medicine ball': 'Médecine ball',
  'olympic barbell': 'Barre olympique',
  'resistance band': 'Bande de résistance',
  roller: 'Rouleau',
  rope: 'Corde',
  'skierg machine': 'SkiErg',
  'sled machine': 'Presse / Sled',
  'smith machine': 'Smith machine',
  'stability ball': 'Swiss ball',
  'stationary bike': 'Vélo',
  'stepmill machine': 'Escalier',
  tire: 'Pneu',
  'trap bar': 'Trap bar',
  'upper body ergometer': 'Ergomètre',
  weighted: 'Lesté',
  'wheel roller': 'Roue abdominale',
};

export const equipmentLabel = (equipment: string): string =>
  EQUIPMENT_FR[equipment] ?? equipment;

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

let cache: LibraryExercise[] | null = null;
let pending: Promise<LibraryExercise[]> | null = null;

/** Charge la bibliothèque (import dynamique, mise en cache module) */
export function loadExerciseLibrary(): Promise<LibraryExercise[]> {
  if (cache) return Promise.resolve(cache);
  pending ??= import('@/data/exerciseLibrary.json').then((mod) => {
    cache = mod.default as LibraryExercise[];
    return cache;
  });
  return pending;
}

/** Retrouve un exercice bibliothèque depuis un id de séance (`lib_<id>`) */
export async function getLibraryExercise(sessionExerciseId: string): Promise<LibraryExercise | null> {
  if (!sessionExerciseId.startsWith(LIBRARY_ID_PREFIX)) return null;
  const id = sessionExerciseId.slice(LIBRARY_ID_PREFIX.length);
  const lib = await loadExerciseLibrary();
  return lib.find((e) => e.id === id) ?? null;
}

/** Convertit un exercice bibliothèque vers le modèle Exercise de REPS */
export function toExercise(ex: LibraryExercise): Exercise {
  return {
    id: `${LIBRARY_ID_PREFIX}${ex.id}`,
    name: ex.name,
    emoji: CATEGORY_EMOJI[ex.category] ?? '💪',
    category: ex.category,
    workoutType: 'musculation',
    imageUrl: libraryImageUrl(ex),
  };
}

/** Recherche insensible à la casse sur le nom, l'équipement et le muscle ciblé */
export function searchLibrary(
  library: LibraryExercise[],
  query: string,
  category: ExerciseCategory | 'all' = 'all',
  equipment?: string
): LibraryExercise[] {
  const q = query.trim().toLowerCase();
  return library.filter((ex) => {
    if (category !== 'all' && ex.category !== category) return false;
    if (equipment && ex.equipment !== equipment) return false;
    if (!q) return true;
    return (
      ex.name.toLowerCase().includes(q) ||
      ex.target.toLowerCase().includes(q) ||
      equipmentLabel(ex.equipment).toLowerCase().includes(q)
    );
  });
}
