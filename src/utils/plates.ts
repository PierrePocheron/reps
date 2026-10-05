export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const UNIT = 0.25; // kg — plus petit pas géré
// 500 kg per side, beyond any real load: the DP below is O(weight), a typo (10 000 000 kg) froze the session page
const MAX_WANT = Math.round(500 / UNIT);

/**
 * Disques à mettre de chaque côté de la barre pour approcher `target` au plus près (paires illimitées).
 * Programmation dynamique et non glouton : avec {20, 15, 10}, 25 kg par côté = 15 + 10 (le glouton s'arrête à 20).
 */
export function platesPerSide(target: number, bar: number, available: number[]): { plates: number[]; total: number } {
  const units = available.map((p) => Math.round(p / UNIT)).filter((u) => u > 0);
  const want = Math.min(MAX_WANT, Math.max(0, Math.round((target - bar) / 2 / UNIT))); // min also absorbs Infinity
  if (units.length === 0 || want === 0) return { plates: [], total: bar };

  const limit = want + Math.max(...units);
  const count = new Array<number>(limit + 1).fill(Infinity); // nb minimal de disques pour chaque poids exact
  const last = new Array<number>(limit + 1).fill(0);
  count[0] = 0;
  for (let w = 1; w <= limit; w++) {
    for (const u of units) {
      if (u <= w && count[w - u]! + 1 < count[w]!) { count[w] = count[w - u]! + 1; last[w] = u; }
    }
  }
  // poids réalisable le plus proche (à égalité, le plus léger)
  let best = 0;
  for (let w = 0; w <= limit; w++) {
    if (count[w] !== Infinity && Math.abs(w - want) < Math.abs(best - want)) best = w;
  }
  const plates: number[] = [];
  for (let w = best; w > 0; w -= last[w]!) plates.push(last[w]! * UNIT);
  plates.sort((a, b) => b - a);
  return { plates, total: bar + 2 * best * UNIT };
}

const PREFS_KEY = 'reps_plates'; // barre et disques disponibles : préférence locale à l'appareil

export function loadPlatePrefs(): { bar: number; plates: number[] } {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '');
    if (typeof p.bar === 'number' && Array.isArray(p.plates)) return p;
  } catch { /* préférences absentes ou illisibles */ }
  return { bar: 20, plates: DEFAULT_PLATES };
}

export function savePlatePrefs(prefs: { bar: number; plates: number[] }) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* stockage indisponible */ }
}

/**
 * Séries d'échauffement avant la charge de travail : ~40 % × 8, 60 % × 5, 80 % × 3, arrondies au réalisable
 * (disques disponibles pour une barre, 2,5 kg sinon) ; doublons et charges inutiles écartés.
 */
export function warmupSets(work: number, barbell: { bar: number; plates: number[] } | null): { weight: number; reps: number }[] {
  const out: { weight: number; reps: number }[] = [];
  for (const [pct, reps] of [[0.4, 8], [0.6, 5], [0.8, 3]] as const) {
    const weight = barbell ? platesPerSide(work * pct, barbell.bar, barbell.plates).total : Math.round((work * pct) / 2.5) * 2.5;
    if (weight > 0 && weight < work && !out.some((s) => s.weight === weight)) out.push({ weight, reps });
  }
  return out;
}
