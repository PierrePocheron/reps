import type { GymSessionExercise, SessionExercise } from '@/firebase/types';
import { formatDurationLong, localDay, frDate } from '@/utils/formatters';
import { saveFile } from '@/utils/saveFile';
import { isWorkSet, isTimed } from '@/utils/records';

export interface SessionCard {
  title: string;
  date: Date;
  stats: { label: string; value: string }[];
  lines: { name: string; detail: string }[];
  more: number; // exercices non affichés
  subtitle?: string; // remplace la date (récap mensuel / annuel)
}

const MAX_LINES = 6;
const num = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });

/** Résumé d'une séance muscu : durée, volume, séries, records, meilleure série par exercice. */
export function gymCard(s: { date: Date; duration: number; exercises: GymSessionExercise[]; title?: string }): SessionCard {
  let volume = 0, sets = 0, records = 0;
  const lines = s.exercises.flatMap((ex) => {
    const done = ex.sets.filter(isWorkSet);
    if (done.length === 0) return [];
    if (isTimed(ex)) { sets += done.length; return [{ name: ex.name, detail: `${done.length} × ${Math.max(...done.map((st) => st.actualReps ?? st.reps))} s` }]; }
    let best = done[0]!;
    for (const set of done) {
      const w = set.actualWeight ?? set.weight, r = set.actualReps ?? set.reps;
      volume += w * r; sets++;
      if (set.isRecord) records++;
      if (w > (best.actualWeight ?? best.weight)) best = set;
    }
    const w = best.actualWeight ?? best.weight;
    return [{ name: ex.name, detail: `${done.length} × ${w > 0 ? `${num(w)} kg` : `${best.actualReps ?? best.reps} reps`}` }];
  });
  const stats = [
    { label: 'Durée', value: formatDurationLong(s.duration) },
    { label: 'Volume', value: `${num(Math.round(volume))} kg` },
    { label: 'Séries', value: String(sets) },
  ];
  if (records > 0) stats.push({ label: records > 1 ? 'Records' : 'Record', value: `🏆 ${records}` });
  return { title: s.title?.trim() || 'Séance muscu', date: s.date, stats, lines: lines.slice(0, MAX_LINES), more: Math.max(0, lines.length - MAX_LINES) };
}

/** Résumé d'une séance renfo : durée, reps, calories, reps par exercice. */
export function renfoCard(s: { date: Date; duration: number; exercises: SessionExercise[]; totalReps: number; totalCalories?: number }): SessionCard {
  const lines = s.exercises.filter((ex) => ex.reps > 0).map((ex) => ({ name: `${ex.emoji} ${ex.name}`, detail: `${ex.reps} reps` }));
  const stats = [
    { label: 'Durée', value: formatDurationLong(s.duration) },
    { label: 'Reps', value: num(s.totalReps) },
  ];
  if (s.totalCalories) stats.push({ label: 'Calories', value: `${Math.round(s.totalCalories)} kcal` });
  return { title: 'Séance renfo', date: s.date, stats, lines: lines.slice(0, MAX_LINES), more: Math.max(0, lines.length - MAX_LINES) };
}

/** Carte 1080 × 1350 (format portrait Instagram, passe aussi en story), aux couleurs de l'appli. */
export async function renderCard(card: SessionCard): Promise<string> {
  await document.fonts?.ready;
  const W = 1080, H = 1350, P = 90;
  const c = Object.assign(document.createElement('canvas'), { width: W, height: H });
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#7C3AED'); bg.addColorStop(0.55, '#3B1A86'); bg.addColorStop(1, '#0B0B14');
  g.fillStyle = bg; g.fillRect(0, 0, W, H);

  const font = (weight: number, size: number) => `${weight} ${size}px Outfit, Inter, system-ui, sans-serif`;
  g.fillStyle = '#FFFFFF'; g.textBaseline = 'alphabetic';
  g.font = font(600, 40); g.globalAlpha = 0.8;
  g.fillText(card.subtitle ?? frDate(card.date, { weekday: 'long', day: 'numeric', month: 'long' }), P, 150);
  // Titles go up to 60 characters and ran off the card at 96 px: shrink to fit, then ellipsis as a last resort
  g.globalAlpha = 1;
  let size = 96;
  g.font = font(800, size);
  while (size > 56 && g.measureText(card.title).width > W - 2 * P) g.font = font(800, (size -= 4));
  let title = card.title;
  while (title.length > 1 && g.measureText(title).width > W - 2 * P) title = `${title.slice(0, -2)}…`;
  g.fillText(title, P, 260);

  // Statistiques en tuiles
  const tileW = (W - 2 * P - 30 * (card.stats.length - 1)) / card.stats.length;
  card.stats.forEach((st, i) => {
    const x = P + i * (tileW + 30), y = 320;
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, tileW, 170, 28); else g.rect(x, y, tileW, 170); // vieilles WebView
    g.fill();
    g.fillStyle = '#FFFFFF'; g.font = font(800, card.stats.length > 3 ? 46 : 56);
    g.fillText(st.value, x + 28, y + 92, tileW - 56);
    g.globalAlpha = 0.75; g.font = font(600, 30); g.fillText(st.label, x + 28, y + 140); g.globalAlpha = 1;
  });

  // Exercices
  g.font = font(600, 42);
  card.lines.forEach((l, i) => {
    const y = 610 + i * 92;
    g.globalAlpha = 1; g.textAlign = 'left'; g.fillText(l.name, P, y, 620);
    g.globalAlpha = 0.8; g.textAlign = 'right'; g.fillText(l.detail, W - P, y);
  });
  g.textAlign = 'left'; g.globalAlpha = 0.7; g.font = font(600, 34);
  if (card.more > 0) g.fillText(`+ ${card.more} exercice${card.more > 1 ? 's' : ''}`, P, 610 + card.lines.length * 92);

  // Signature
  g.globalAlpha = 1; g.font = font(800, 64); g.fillText('REPS', P, H - P);
  g.globalAlpha = 0.7; g.font = font(600, 32); g.textAlign = 'right'; g.fillText('Chaque rep compte.', W - P, H - P - 6);
  return c.toDataURL('image/png');
}

/** Génère la carte et ouvre le partage (feuille native, partage web de fichiers, sinon téléchargement). */
export async function shareSessionCard(card: SessionCard): Promise<boolean> {
  const dataUrl = await renderCard(card);
  const name = `reps-${card.subtitle ? 'recap' : 'seance'}-${localDay(card.date)}.png`;
  return saveFile(name, dataUrl.split(',')[1]!, 'image/png', { base64: true });
}
