/**
 * Captures légendées de la fiche Play Store (1080×1920, PNG), générées depuis la démo.
 * Prérequis : `yarn dev:demo` lancé dans un autre terminal. Usage : `yarn store:screenshots`
 * Sortie : store/fr-FR/screenshots/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const OUT = new URL('../store/fr-FR/screenshots/', import.meta.url);
// Compte fictif des émulateurs (cf. scripts/seed-emulator.mjs), jamais un vrai compte
const DEMO = { email: 'demo@reps.test', password: 'reps-demo-2026' };

// Séance muscu en cours (état persistant du store, cf. gymSessionStore)
const set = (weight, reps, done, extra = {}) => ({ weight, reps, completed: done, ...(done ? { actualReps: reps, actualWeight: weight } : {}), ...extra });
const GYM_SESSION = {
  state: {
    phase: 'execute', currentExerciseIndex: 0, currentSetIndex: 0, restDuration: 90,
    startTime: Date.now() - 34 * 60_000,
    exercises: [
      { exerciseId: 'barbell_squat', name: 'Squat barre', emoji: '🦵', sets: [set(75, 8, true), set(80, 8, true, { isRecord: true }), set(80, 7, false)] },
      { exerciseId: 'bench_press', name: 'Développé couché', emoji: '🏋️', sets: [set(57.5, 8, false), set(57.5, 8, false), set(57.5, 6, false)] },
    ],
  },
  version: 0,
};

const SHOTS = [
  { file: '01-accueil', title: 'Ton carnet d\'entraînement', sub: 'Gratuit, simple et en français', go: (p) => p.goto(`${BASE}/`) },
  {
    file: '02-seance-muscu', title: 'Note tes séries en 2 taps', sub: 'Records détectés en direct',
    go: async (p) => {
      await p.evaluate((gym) => localStorage.setItem('reps_gym_session', gym), JSON.stringify(GYM_SESSION));
      await p.goto(`${BASE}/gym`); // rechargement complet : le store se réhydrate avec la séance
    },
  },
  {
    file: '03-progression', title: 'Vois tes charges grimper', sub: 'Une courbe par exercice',
    go: async (p) => {
      await p.goto(`${BASE}/history`);
      await p.getByRole('tab', { name: /Records/ }).click();
      await p.getByRole('button', { name: /Squat barre : voir ta progression/ }).click();
      await p.waitForTimeout(800);
      await p.locator('svg[role=img]').last().evaluate((el) => el.scrollIntoView({ block: 'center' }));
    },
  },
  {
    file: '04-statistiques', title: 'Reste régulier', sub: 'Séries, activité, habitudes',
    go: async (p) => {
      await p.goto(`${BASE}/statistics`);
      await p.waitForTimeout(1500);
      await p.getByText('Série actuelle').evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); });
    },
  },
  {
    file: '05-exercices', title: '1 324 exercices illustrés', sub: 'Muscles ciblés et consignes',
    go: async (p) => { await p.goto(`${BASE}/gym`); await p.getByRole('button', { name: 'Ajouter un exercice' }).click(); },
  },
  { file: '06-defis', title: 'Des défis pour progresser', sub: 'Un objectif chaque jour', go: (p) => p.goto(`${BASE}/challenges`) },
  { file: '07-amis', title: 'Motive-toi avec tes amis', sub: 'Classement et fil d\'activité', go: (p) => p.goto(`${BASE}/leaderboard`) },
  {
    file: '08-recap', title: 'Ton mois en un coup d\'œil', sub: 'Un récap à partager',
    go: async (p) => {
      await p.goto(`${BASE}/statistics`);
      const recap = p.locator('div.bg-card', { has: p.getByRole('heading', { name: 'Récap' }) });
      await recap.getByRole('button', { name: 'Mois précédent' }).click(); // mois complet
      await recap.evaluate((el) => { el.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); });
    },
  },
];

const frame = (png, { title, sub }) => `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1080px; height: 1920px; overflow: hidden; font-family: Outfit, system-ui, sans-serif; color: #fff;
    background: radial-gradient(120% 70% at 50% 0%, hsl(262 83% 58%) 0%, hsl(262 60% 22%) 55%, hsl(240 30% 7%) 100%); }
  header { text-align: center; padding: 120px 60px 0; }
  h1 { font-size: 84px; font-weight: 800; line-height: 1.05; letter-spacing: -1px; }
  p { margin-top: 24px; font-size: 44px; font-weight: 600; opacity: .8; }
  .phone { position: absolute; left: 50%; top: 470px; width: 780px; transform: translateX(-50%);
    border-radius: 64px; border: 14px solid #0b0b12; overflow: hidden; box-shadow: 0 40px 120px rgba(0,0,0,.55); }
  .phone img { display: block; width: 100%; }
</style></head><body>
<header><h1>${title}</h1><p>${sub}</p></header>
<div class="phone"><img src="data:image/png;base64,${png.toString('base64')}"></div>
</body></html>`;

const browser = await chromium.launch();
try {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, colorScheme: 'dark', locale: 'fr-FR', isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('reps_onboarding_v2', '1');
    // Pas de toasts sur les captures (badges débloqués au chargement…)
    document.addEventListener('DOMContentLoaded', () => {
      document.head.append(Object.assign(document.createElement('style'), { textContent: '[role=region][aria-label^="Notifications"] { display: none !important; }' }));
    });
  });
  const page = await ctx.newPage();

  for (let i = 0; ; i++) { // la démo peut encore démarrer (seed + Vite)
    try { await page.goto(`${BASE}/login`); break; } catch (err) {
      if (i === 30) throw new Error('Démo injoignable : lance « yarn dev:demo » d\'abord.', { cause: err });
      await page.waitForTimeout(1000);
    }
  }
  await page.fill('#email', DEMO.email);
  await page.fill('#password', DEMO.password);
  await page.click('button[type=submit]');
  await page.waitForURL(`${BASE}/`);

  const composer = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await mkdir(OUT, { recursive: true });
  for (const shot of SHOTS) {
    await shot.go(page);
    await page.waitForTimeout(2500); // données Firestore + animations d'entrée (écouteurs temps réel : jamais « networkidle »)
    const raw = await page.screenshot();
    await composer.setContent(frame(raw, shot), { waitUntil: 'networkidle' });
    await writeFile(new URL(`${shot.file}.png`, OUT), await composer.screenshot());
    console.log(`✓ ${shot.file}.png`);
  }
} finally {
  await browser.close();
}
