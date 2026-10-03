/**
 * Test de fumée de bout en bout sur la démo (émulateurs + données fictives).
 * Prérequis : `yarn dev:demo` lancé. Usage : `yarn e2e` (code de sortie ≠ 0 au premier échec).
 * Couvre les parcours où une régression bloque l'utilisateur : connexion, navigation,
 * séance muscu de bout en bout (note, repos auto, fin de séance), séance renfo, courbe de progression.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const DEMO = { email: 'demo@reps.test', password: 'reps-demo-2026' }; // compte fictif des émulateurs

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
await ctx.addInitScript(() => localStorage.setItem('reps_onboarding_v2', '1'));
const page = await ctx.newPage();
const pageErrors = [];
page.on('pageerror', (e) => pageErrors.push(e.message));

/** La page répond encore (une boucle de rendu la fige sans lever d'exception côté test). */
const assertAlive = async (where) => {
  const alive = await Promise.race([page.evaluate(() => true), new Promise((r) => setTimeout(() => r(false), 5000))]);
  assert.ok(alive, `page figée : ${where}`);
  assert.deepEqual(pageErrors, [], `erreurs JS : ${where}`);
};

const steps = [
  ['connexion', async () => {
    for (let i = 0; ; i++) {
      try { await page.goto(`${BASE}/login`); break; } catch (err) {
        if (i === 30) throw new Error('Démo injoignable : lance « yarn dev:demo » d\'abord.', { cause: err });
        await page.waitForTimeout(1000);
      }
    }
    await page.fill('#email', DEMO.email);
    await page.fill('#password', DEMO.password);
    await page.click('button[type=submit]');
    await page.waitForURL(`${BASE}/`);
    await page.getByText('Bonjour').waitFor();
  }],

  ['navigation', async () => {
    for (const [label, heading] of [['Stats', 'STATISTIQUES'], ['Social', 'SOCIAL'], ['Défis', 'MES DÉFIS'], ['Top', 'CLASSEMENT'], ['Accueil', 'Bonjour']]) {
      await page.getByRole('link', { name: label }).or(page.getByRole('button', { name: label })).first().click();
      await page.getByText(heading, { exact: false }).first().waitFor({ timeout: 10_000 });
    }
    await assertAlive('navigation');
  }],

  ['séance muscu : refaire, note, repos auto, terminer', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/gym`);
    const note = `e2e ${Date.now()}`;
    await page.getByRole('textbox', { name: /^Note pour/ }).first().fill(note);
    await page.getByRole('button', { name: 'Valider la série 1' }).first().click();
    await page.getByRole('switch', { name: /Repos auto/ }).waitFor(); // le repos s'est lancé tout seul
    // la barre « minuteur + Terminer » doit rester fixée à l'écran (un parent transformé la renvoyait en bas du contenu)
    const end = await page.getByRole('button', { name: /^Terminer/ }).boundingBox();
    assert.ok(end && end.y + end.height <= page.viewportSize().height, 'bouton Terminer hors de l\'écran');
    await page.getByRole('button', { name: /^Terminer/ }).click();
    await page.waitForURL(`${BASE}/`);
    await assertAlive('fin de séance muscu');
    await page.goto(`${BASE}/history`);
    await page.getByText(`« ${note} »`).waitFor();
  }],

  ['séance renfo : refaire, compter, terminer', async () => {
    await page.getByRole('tab', { name: /Renfo/ }).click();
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/session`);
    await page.getByText('+10', { exact: true }).first().click();
    await page.getByRole('button', { name: /Terminer la séance/ }).click();
    await page.waitForURL(`${BASE}/`);
    await assertAlive('fin de séance renfo');
  }],

  ['records : courbe de progression', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Records/ }).click();
    await page.getByRole('button', { name: /voir ta progression/ }).first().click();
    await page.getByText('Ta progression').waitFor();
    await page.locator('svg[role=img]').last().waitFor();
    await assertAlive('records');
  }],
];

let failed = false;
for (const [name, run] of steps) {
  try {
    await run();
    console.log(`✓ ${name}`);
  } catch (err) {
    failed = true;
    console.error(`✗ ${name}\n  ${err.message.split('\n')[0]}`);
    break; // les étapes suivantes dépendent de celle-ci
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
