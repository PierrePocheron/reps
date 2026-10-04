/**
 * Test de fumée de bout en bout sur la démo (émulateurs + données fictives).
 * Prérequis : `yarn dev:demo` lancé. Usage : `yarn e2e` (code de sortie ≠ 0 au premier échec).
 * Couvre les parcours où une régression bloque l'utilisateur : connexion, navigation,
 * séance muscu de bout en bout (note, repos auto, fin de séance et récap), séance renfo, courbe de progression,
 * mise en page sans débordement sur petit écran.
 */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const BASE = 'http://localhost:5199';
const DEMO = { email: 'demo@reps.test', password: 'reps-demo-2026' }; // compte fictif des émulateurs

// Garde-fou : jamais de script bloqué indéfiniment (boucle d'amélioration, CI)
setTimeout(() => { console.error('✗ délai dépassé (6 min)'); process.exit(2); }, 360_000).unref();
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
    // écran de récap (#54) : durée, volume, séries, records, puis retour à l'accueil
    await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor();
    assert.equal(await page.locator('dl dt').count(), 4, 'récap : 4 chiffres');
    await assertAlive('récap de fin de séance');
    await page.getByRole('button', { name: 'Terminer', exact: true }).click();
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
    await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor(); // récap renfo (#54)
    await page.getByText(/de reps|reps que/).first().waitFor(); // comparaison avec la séance précédente
    await page.getByRole('button', { name: 'Terminer', exact: true }).click();
    await page.waitForURL(`${BASE}/`);
    await assertAlive('fin de séance renfo');
  }],

  ['séance muscu : échauffement, superset et repos, annulation', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/gym`);
    const cards = page.locator('div.rounded-2xl.border-2');
    // échauffement (séries É en tête)
    await cards.nth(0).getByRole('button', { name: /^Ajouter l'échauffement/ }).click();
    await cards.nth(0).getByRole('button', { name: /: échauffement/ }).first().waitFor();
    // réordonner : « Échanger » inverse les deux premiers exercices (#53)
    const firstName = async () => (await cards.nth(0).getByRole('button', { name: /voir la fiche/ }).getAttribute('aria-label')).split(' : ')[0];
    const first = await firstName();
    await page.getByRole('button', { name: /^Échanger / }).first().click();
    assert.notEqual(await firstName(), first, 'les deux premiers exercices sont échangés');
    await page.getByRole('button', { name: /^Échanger / }).first().click(); // retour à l'ordre initial
    assert.equal(await firstName(), first);
    // superset entre les deux premiers exercices
    await page.getByRole('button', { name: /^Faire un superset avec/ }).first().click();
    assert.equal(await page.getByText(/^Superset A/).count(), 2, 'deux cartes « Superset A »');
    // pas de repos au milieu du tour, repos à la fin du tour
    await cards.nth(0).getByRole('button', { name: /^Valider la série 1/ }).click();
    assert.equal(await page.getByRole('switch', { name: /Repos auto/ }).count(), 0, 'pas de repos après A1');
    await cards.nth(1).getByRole('button', { name: /^Valider la série 1/ }).click();
    await page.getByRole('switch', { name: /Repos auto/ }).waitFor();
    await page.getByText(/^Durée retenue pour /).waitFor(); // repos propre à l'exercice (#49)
    // +15 s décale la fin du repos sans relancer le décompte (#51)
    const left = async () => { const [m, sec] = (await page.locator('.tabular-nums.text-2xl').first().innerText()).split(':').map(Number); return m * 60 + sec; };
    const before = await left();
    await page.getByRole('button', { name: 'Allonger le repos de 15 secondes' }).click();
    for (let i = 0; i < 20 && (await left()) < before + 13; i++) await page.waitForTimeout(100);
    const after = await left();
    assert.ok(after >= before + 13, `+15 s ajoute 15 s au repos (${before} → ${after})`);
    // annuler : rien n'est enregistré, retour à l'accueil
    await page.getByRole('button', { name: 'Annuler la séance' }).first().click();
    await page.getByRole('dialog').or(page.locator('[aria-labelledby=cancel-session-title]')).getByRole('button', { name: 'Annuler la séance' }).click();
    await page.waitForURL(`${BASE}/`);
    await assertAlive('séance muscu annulée');
  }],

  ['mensurations et récap', async () => {
    await page.goto(`${BASE}/profil`);
    await page.getByRole('button', { name: /Mesure$/ }).click();
    const d = page.getByRole('dialog');
    await d.getByLabel(/^Tour de bras/).fill('36.5');
    await d.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByRole('button', { name: /Tour de bras 36,5 cm/ }).waitFor();
    await page.goto(`${BASE}/statistics`);
    const recap = page.locator('div.bg-card', { has: page.getByRole('heading', { name: 'Récap' }) });
    await recap.getByRole('button', { name: 'Période précédente' }).click();
    await recap.getByText(/Séances?$/).first().waitFor();
    await page.getByRole('heading', { name: 'Muscles travaillés' }).waitFor();
    await assertAlive('mensurations et récap');
  }],

  ['records : courbe de progression', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Records/ }).click();
    await page.getByRole('button', { name: /voir ta progression/ }).first().click();
    await page.getByText('Ta progression').waitFor();
    await page.locator('svg[role=img]').last().waitFor();
    // la feuille passe au-dessus de la navigation (un contexte d'empilement parasite la mettait dessous)
    const coveredByNav = await page.evaluate(() => !!document.elementFromPoint(innerWidth / 2, innerHeight - 20)?.closest('nav'));
    assert.ok(!coveredByNav, 'la navigation recouvre la feuille ouverte');
    await assertAlive('records');
  }],

  ['modifier une séance muscu et renfo (cartes à jour)', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    await page.getByRole('button', { name: 'Actions de la séance' }).first().click();
    await page.getByRole('menuitem', { name: 'Modifier' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('spinbutton', { name: /^Charge en kg, série 1 de / }).first().fill('123');
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByText('Séance modifiée').first().waitFor();
    await page.getByText(/× 123 kg/).first().waitFor(); // carte mise à jour sans rechargement
    // renfo : reps corrigées
    await page.getByRole('tab', { name: /Renfo/ }).click();
    await page.getByRole('button', { name: 'Actions de la séance' }).first().click();
    await page.getByRole('menuitem', { name: 'Modifier' }).click();
    await page.getByRole('dialog').getByRole('spinbutton', { name: /^Répétitions de / }).first().fill('77');
    await page.getByRole('dialog').getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByText('Séance modifiée').first().waitFor();
    await page.getByText(/\b77\b/).first().waitFor();
    await assertAlive('modification de séance');
  }],

  ['supprimer une séance (confirmation, liste mise à jour)', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    const menus = page.getByRole('button', { name: 'Actions de la séance' });
    await menus.first().waitFor();
    const before = await menus.count();
    await menus.first().click();
    await page.getByRole('menuitem', { name: 'Supprimer' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
    await page.getByText('Séance supprimée').first().waitFor();
    for (let i = 0; i < 30 && (await menus.count()) >= before; i++) await page.waitForTimeout(100);
    assert.equal(await menus.count(), before - 1, 'une séance de moins dans l\'historique');
    await assertAlive('suppression de séance');
  }],

  ['petit écran (320 px) : rien ne déborde', async () => {
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 640 });
    // boutons shadcn en nowrap : une rangée trop large pousse la page ou se fait rogner par sa carte
    const overflowing = () => page.evaluate(() => {
      // décor en position absolue et rangées défilantes (overflow-x: auto) exclus : débordements voulus
      const inFlow = (e, box) => {
        for (let n = e; n && n !== box; n = n.parentElement) {
          const cs = getComputedStyle(n);
          if (['absolute', 'fixed'].includes(cs.position) || (n !== e && ['auto', 'scroll'].includes(cs.overflowX))) return false;
        }
        return true;
      };
      return [...document.querySelectorAll('[role=group], [role=tablist], .rounded-2xl.border, .rounded-lg.border, .rounded-xl')]
        .filter((box) => getComputedStyle(box).overflowX !== 'auto')
        .filter((box) => { const r = box.getBoundingClientRect().right; return [...box.querySelectorAll('*')].some((e) => inFlow(e, box) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > r + 1); })
        .map((box) => box.getAttribute('aria-label') || box.innerText.trim().split('\n')[0].slice(0, 30));
    });
    for (const path of ['/', '/history', '/statistics', '/profil', '/settings', '/friends', '/challenges', '/leaderboard', '/templates']) {
      await page.goto(`${BASE}${path}`);
      await page.waitForTimeout(800);
      assert.deepEqual(await overflowing(), [], `débordement sur ${path}`);
    }
    // séance muscu, repos ouvert : lignes de série dans leur carte, bas de liste encore atteignable
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/gym`);
    await page.locator('div.rounded-2xl.border-2').nth(0).getByRole('button', { name: /^Valider la série 1/ }).click();
    await page.getByRole('switch', { name: /Repos auto/ }).waitFor();
    assert.deepEqual(await overflowing(), [], 'débordement en séance muscu');
    await page.getByRole('button', { name: /Ajouter un exercice/ }).first().click({ trial: true, timeout: 3000 }); // pas caché par la barre
    await page.getByRole('button', { name: 'Annuler la séance' }).first().click();
    await page.locator('[aria-labelledby=cancel-session-title]').getByRole('button', { name: 'Annuler la séance' }).click();
    await page.waitForURL(`${BASE}/`);
    await page.setViewportSize({ width: 390, height: 844 });
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
