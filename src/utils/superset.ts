import type { GymSessionExercise } from '@/firebase/types';

/** Retire les « groupes » d'un seul exercice. */
function normalize(list: GymSessionExercise[]): GymSessionExercise[] {
  const size = new Map<string, number>();
  for (const ex of list) if (ex.supersetId) size.set(ex.supersetId, (size.get(ex.supersetId) ?? 0) + 1);
  return list.map((ex) => (ex.supersetId && size.get(ex.supersetId)! < 2 ? { ...ex, supersetId: undefined } : ex));
}

/** Lie l'exercice `i` au suivant (superset), ou les délie s'ils l'étaient déjà. */
export function toggleSupersetLink(list: GymSessionExercise[], i: number, newId = () => `ss_${Date.now().toString(36)}`): GymSessionExercise[] {
  const a = list[i], b = list[i + 1];
  if (!a || !b) return list;
  const out = list.map((ex) => ({ ...ex }));
  if (a.supersetId && a.supersetId === b.supersetId) {
    // Délier : la suite du groupe après `i` forme un nouveau groupe
    const fresh = newId();
    for (let k = i + 1; k < out.length && out[k]!.supersetId === a.supersetId; k++) out[k]!.supersetId = fresh;
  } else {
    // Lier : `b` (et son groupe éventuel) rejoint le groupe de `a`
    const id = a.supersetId ?? b.supersetId ?? newId();
    const bGroup = b.supersetId;
    out[i]!.supersetId = id;
    for (let k = i + 1; k < out.length && (k === i + 1 || (bGroup && out[k]!.supersetId === bGroup)); k++) out[k]!.supersetId = id;
  }
  return normalize(out);
}

/**
 * Échange l'exercice `i` et le suivant (réordonner, comme Hevy / Strong). Un groupe doit rester d'un seul
 * tenant : un exercice qui se retrouve séparé de son groupe le quitte (échanger au sein d'un groupe le garde).
 */
export function swapWithNext(list: GymSessionExercise[], i: number): GymSessionExercise[] {
  const a = list[i], b = list[i + 1];
  if (!a || !b) return list;
  const swapped = [...list.slice(0, i), b, a, ...list.slice(i + 2)];
  const seen = new Set<string>();
  let prev: string | undefined;
  const contiguous = swapped.map((ex) => {
    const id = ex.supersetId;
    if (id && id !== prev && seen.has(id)) { prev = undefined; return { ...ex, supersetId: undefined }; }
    if (id) seen.add(id);
    prev = id;
    return ex;
  });
  return normalize(contiguous);
}

/**
 * Repos après une série d'un superset : seulement quand aucun autre exercice du groupe n'attend
 * sa série du même tour (A1 → B1 → repos → A2 → B2…).
 */
export function restAfterSet(list: GymSessionExercise[], exerciseId: string): boolean {
  const ex = list.find((e) => e.exerciseId === exerciseId);
  if (!ex?.supersetId) return true;
  // rounds count work sets only: warm-ups (« Échauffement » on one exercise) made it rest mid-round
  const work = (e: GymSessionExercise) => e.sets.filter((s) => s.type !== 'warmup');
  const done = work(ex).filter((s) => s.completed).length; // tour qui vient d'être fait (0 après un échauffement)
  return list
    .filter((e) => e.supersetId === ex.supersetId && e.exerciseId !== exerciseId)
    .every((e) => work(e).length < done || work(e).filter((s) => s.completed).length >= done);
}

/** Lettre affichée par groupe, dans l'ordre d'apparition (Superset A, B…). */
export function supersetLetters(list: GymSessionExercise[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const ex of list) if (ex.supersetId && !(ex.supersetId in out)) out[ex.supersetId] = String.fromCharCode(65 + Object.keys(out).length);
  return out;
}
