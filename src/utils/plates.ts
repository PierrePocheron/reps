export const DEFAULT_PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
const UNIT = 0.25; // kg — plus petit pas géré

/**
 * Disques à mettre de chaque côté de la barre pour approcher `target` au plus près (paires illimitées).
 * Programmation dynamique et non glouton : avec {20, 15, 10}, 25 kg par côté = 15 + 10 (le glouton s'arrête à 20).
 */
export function platesPerSide(target: number, bar: number, available: number[]): { plates: number[]; total: number } {
  const units = available.map((p) => Math.round(p / UNIT)).filter((u) => u > 0);
  const want = Math.max(0, Math.round((target - bar) / 2 / UNIT));
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
