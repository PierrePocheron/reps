import type { Language } from '@/hooks/useLanguage';

/** Traductions FR des groupes musculaires du dataset (clés = valeurs brutes EN) */
const TARGET_FR: Record<string, string> = {
  abs: 'Abdominaux',
  abductors: 'Abducteurs',
  adductors: 'Adducteurs',
  biceps: 'Biceps',
  calves: 'Mollets',
  'cardiovascular system': 'Cardio',
  delts: 'Épaules',
  forearms: 'Avant-bras',
  glutes: 'Fessiers',
  hamstrings: 'Ischio-jambiers',
  lats: 'Grand dorsal',
  'levator scapulae': 'Élévateur de la scapula',
  pectorals: 'Pectoraux',
  quads: 'Quadriceps',
  serratus: 'Dentelé',
  'serratus anterior': 'Dentelé antérieur',
  spine: 'Lombaires',
  traps: 'Trapèzes',
  triceps: 'Triceps',
  'upper back': 'Haut du dos',
  'lower back': 'Bas du dos',
  'hip flexors': 'Fléchisseurs de hanche',
  shoulders: 'Épaules',
  'inner thighs': 'Adducteurs',
  obliques: 'Obliques',
  'rotator cuff': 'Coiffe des rotateurs',
  core: 'Sangle abdominale',
  neck: 'Cou',
  chest: 'Pectoraux',
  back: 'Dos',
  legs: 'Jambes',
  arms: 'Bras',
  wrists: 'Poignets',
  ankles: 'Chevilles',
  'wrist extensors': 'Extenseurs du poignet',
  'wrist flexors': 'Fléchisseurs du poignet',
  'brachialis': 'Brachial',
  'sternocleidomastoid': 'Sterno-cléido-mastoïdien',
  'rhomboids': 'Rhomboïdes',
  'soleus': 'Soléaire',
  'feet': 'Pieds',
  'groin': 'Aine',
  'hips': 'Hanches',
  'quadriceps': 'Quadriceps',
  'gluteus maximus': 'Grand fessier',
  'hamstring': 'Ischio-jambiers',
  'lower abs': 'Bas des abdominaux',
  'upper abs': 'Haut des abdominaux',
  'latissimus dorsi': 'Grand dorsal',
  'trapezius': 'Trapèzes',
  'deltoids': 'Deltoïdes',
  'erector spinae': 'Érecteurs du rachis',
};

/** Traductions FR des équipements du dataset */
const EQUIPMENT_FR: Record<string, string> = {
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
  'medicine ball': 'Médecine-ball',
  'olympic barbell': 'Barre olympique',
  'resistance band': 'Bande élastique',
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

/** Traductions EN « propres » des valeurs brutes (capitalisation, cas spéciaux) */
const TARGET_EN: Record<string, string> = {
  'cardiovascular system': 'Cardio',
  delts: 'Shoulders',
  lats: 'Lats',
  pectorals: 'Chest',
  quads: 'Quads',
  spine: 'Lower back',
  traps: 'Traps',
};

const capitalize = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Libellé localisé d'un muscle ciblé/secondaire */
export function targetLabel(target: string, lang: Language = 'fr'): string {
  if (lang === 'fr') return TARGET_FR[target] ?? capitalize(target);
  return TARGET_EN[target] ?? capitalize(target);
}

/** Libellé localisé d'un équipement */
export function equipmentLabel(equipment: string, lang: Language = 'fr'): string {
  if (lang === 'fr') return EQUIPMENT_FR[equipment] ?? capitalize(equipment);
  return capitalize(equipment);
}
