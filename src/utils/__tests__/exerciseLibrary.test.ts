import { describe, it, expect, vi } from 'vitest';

// settingsStore applique le thème au chargement (window.matchMedia absent en jsdom)
vi.mock('@/store/settingsStore', () => ({
  useSettingsStore: Object.assign(vi.fn(), { getState: () => ({ language: 'auto' }) }),
}));

import {
  searchLibrary,
  toExercise,
  libraryImageUrl,
  libraryGifUrl,
  LIBRARY_ID_PREFIX,
  type LibraryExercise,
} from '../exerciseLibrary';
import { resolveLanguage } from '@/hooks/useLanguage';
import { targetLabel, equipmentLabel } from '../exerciseLabels';

const LIB: LibraryExercise[] = [
  {
    id: '0025',
    name: 'Développé couché à la barre',
    category: 'chest',
    bodyPart: 'chest',
    target: 'pectorals',
    secondaryMuscles: ['triceps', 'shoulders'],
    equipment: 'barbell',
    steps: ['Allonge-toi.', 'Pousse.'],
    media: '0025-abc',
  },
  {
    id: '0662',
    name: 'Pompes',
    category: 'chest',
    bodyPart: 'chest',
    target: 'pectorals',
    secondaryMuscles: ['triceps'],
    equipment: 'body weight',
    steps: ['Descends.', 'Remonte.'],
    media: '0662-def',
  },
  {
    id: '0198',
    name: 'Tirage vertical à la poulie',
    category: 'back',
    bodyPart: 'back',
    target: 'lats',
    secondaryMuscles: [],
    equipment: 'cable',
    steps: [],
    media: '0198-ghi',
  },
];

describe('searchLibrary', () => {
  it('retourne tout sans filtre', () => {
    expect(searchLibrary(LIB, '')).toHaveLength(3);
  });

  it('filtre par catégorie', () => {
    expect(searchLibrary(LIB, '', 'back').map((e) => e.id)).toEqual(['0198']);
  });

  it('filtre par équipement (poids du corps pour le renforcement)', () => {
    expect(searchLibrary(LIB, '', 'all', 'body weight').map((e) => e.id)).toEqual(['0662']);
  });

  it('recherche insensible à la casse et aux accents', () => {
    expect(searchLibrary(LIB, 'DEVELOPPE').map((e) => e.id)).toEqual(['0025']);
    expect(searchLibrary(LIB, 'développé').map((e) => e.id)).toEqual(['0025']);
  });

  it('recherche sur le libellé français de l\'équipement', () => {
    expect(searchLibrary(LIB, 'poulie', 'all', undefined, 'fr').map((e) => e.id)).toEqual(['0198']);
    expect(searchLibrary(LIB, 'barre', 'all', undefined, 'fr').map((e) => e.id)).toEqual(['0025']);
  });

  it('recherche sur le muscle ciblé', () => {
    expect(searchLibrary(LIB, 'lats').map((e) => e.id)).toEqual(['0198']);
  });

  it('recherche sur le libellé du muscle affiché sous chaque ligne', () => {
    expect(searchLibrary(LIB, 'grand dorsal', 'all', undefined, 'fr').map((e) => e.id)).toEqual(['0198']);
    expect(searchLibrary(LIB, 'pectoraux', 'all', undefined, 'fr').map((e) => e.id)).toEqual(['0025', '0662']);
    expect(searchLibrary(LIB, 'chest', 'all', undefined, 'en').map((e) => e.id)).toEqual(['0025', '0662']);
  });

  it('plusieurs mots : chacun doit apparaître, pas forcément côte à côte', () => {
    expect(searchLibrary(LIB, 'developpe barre').map((e) => e.id)).toEqual(['0025']);
    expect(searchLibrary(LIB, 'tirage poulie').map((e) => e.id)).toEqual(['0198']);
    expect(searchLibrary(LIB, 'tirage barre')).toEqual([]);
  });
});

describe('toExercise', () => {
  it('préfixe l\'id et fournit une image CDN', () => {
    const ex = toExercise(LIB[0]!);
    expect(ex.id).toBe(`${LIBRARY_ID_PREFIX}0025`);
    expect(ex.name).toBe('Développé couché à la barre');
    expect(ex.workoutType).toBe('musculation');
    expect(ex.imageUrl).toBe(libraryImageUrl(LIB[0]!));
    expect(ex.met).toBeUndefined();
  });

  it('ajoute un MET indicatif en mode renforcement', () => {
    const ex = toExercise(LIB[1]!, 'renforcement');
    expect(ex.workoutType).toBe('renforcement');
    expect(ex.met).toBeGreaterThan(0);
    expect(ex.timePerRep).toBe(2.0);
  });
});

describe('URLs CDN', () => {
  it('construit les chemins images/ et videos/ depuis le media id', () => {
    expect(libraryImageUrl(LIB[0]!)).toMatch(/\/images\/0025-abc\.jpg$/);
    expect(libraryGifUrl(LIB[0]!)).toMatch(/\/videos\/0025-abc\.gif$/);
  });
});

describe('resolveLanguage', () => {
  it('respecte un choix explicite', () => {
    expect(resolveLanguage('fr')).toBe('fr');
    expect(resolveLanguage('en')).toBe('en');
  });

  it('auto → langue de l\'appareil (fr ou en)', () => {
    const lang = resolveLanguage('auto');
    expect(['fr', 'en']).toContain(lang);
  });
});

describe('labels bilingues', () => {
  it('traduit les muscles et équipements en français', () => {
    expect(targetLabel('pectorals', 'fr')).toBe('Pectoraux');
    expect(equipmentLabel('body weight', 'fr')).toBe('Poids du corps');
  });

  it('capitalise proprement en anglais', () => {
    expect(targetLabel('pectorals', 'en')).toBe('Chest');
    expect(targetLabel('upper back', 'en')).toBe('Upper back');
    expect(equipmentLabel('body weight', 'en')).toBe('Body weight');
  });

  it('retombe sur la valeur brute capitalisée si inconnue', () => {
    expect(targetLabel('mystery muscle', 'fr')).toBe('Mystery muscle');
  });
});
