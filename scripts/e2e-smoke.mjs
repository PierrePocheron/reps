/**
 * Test de fumée de bout en bout sur la démo (émulateurs + données fictives).
 * Prérequis : `yarn dev:demo` lancé. Usage : `yarn e2e` (code de sortie ≠ 0 au premier échec).
 * Couvre les parcours où une régression bloque l'utilisateur : connexion, navigation,
 * séance muscu de bout en bout (note, repos auto, fin de séance et récap, fin hors ligne), séance renfo, courbe de progression,
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
    // bouton central de la barre : le sélecteur de séance doit répondre (il était inerte, rendu sous un conteneur sans pointeur)
    await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Nouvelle séance' }).click();
    await page.getByRole('button', { name: /Partir d'un modèle/ }).click();
    await page.waitForURL(`${BASE}/templates`);
    await assertAlive('navigation');
  }],

  ['nouvelle séance depuis le bouton central (muscu puis renfo)', async () => {
    const center = () => page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('button', { name: 'Nouvelle séance' });
    const finish = async () => {
      await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor();
      await page.getByRole('button', { name: 'Terminer', exact: true }).click();
      await page.waitForURL(`${BASE}/`);
    };
    // muscu : séance libre, un exercice ajouté depuis le sélecteur
    await page.goto(`${BASE}/`);
    await center().click();
    await page.getByRole('button', { name: /^Musculation/ }).click();
    await page.waitForURL(`${BASE}/gym`);
    await page.getByRole('button', { name: /Ajouter un exercice/ }).first().click();
    await page.getByRole('button', { name: /Développé couché/ }).first().click();
    await page.getByRole('button', { name: /^Valider la série 1/ }).first().click();
    await page.getByRole('button', { name: /^Terminer/ }).click();
    await page.getByText(/de volume|volume que|Volume un peu/).first().waitFor(); // ended right away: the recap still compares
    await finish();
    // renfo : séance de base
    await center().click();
    await page.getByRole('button', { name: /^Renforcement/ }).click();
    await page.waitForURL(`${BASE}/session`);
    await page.getByRole('button', { name: /Séance de base/ }).click();
    await page.getByText('+10', { exact: true }).first().click();
    await page.getByRole('button', { name: /Terminer la séance/ }).click();
    await finish();
    // ménage : ces deux séances (les plus récentes) ne doivent pas servir de modèle aux parcours suivants
    for (const tab of [/Muscu/, /Renfo/]) {
      await page.goto(`${BASE}/history`);
      await page.getByRole('tab', { name: tab }).click();
      await page.getByRole('button', { name: 'Actions de la séance' }).first().click();
      await page.getByRole('menuitem', { name: 'Supprimer' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
      await page.getByText('Séance supprimée').first().waitFor();
    }
    await assertAlive('nouvelle séance');
  }],

  ['séance muscu : refaire, note, repos auto, terminer', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/gym`);
    const note = `e2e ${Date.now()}`;
    await page.getByRole('textbox', { name: /^Note pour/ }).first().fill(note);
    await page.getByRole('textbox', { name: 'Titre de la séance' }).fill('Haut du corps e2e'); // titre (#64)
    // valeur précédente (#65) : rappel dès qu'on s'écarte de la dernière fois, puis valeur remise
    const kg = page.getByRole('spinbutton', { name: /^Charge en kg, série 1/ }).first();
    const original = await kg.inputValue();
    await kg.fill(String(Number(original) + 1));
    await page.getByText(/^Précédent : /).first().waitFor();
    await kg.fill(original);
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
    await page.getByText('Haut du corps e2e').first().waitFor(); // titre affiché sur la carte
  }],

  ['séance renfo : refaire, compter, terminer', async () => {
    await page.getByRole('tab', { name: /Renfo/ }).click();
    // slow network + ending right away: the recap still compares (previous session was loaded asynchronously)
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 1500, downloadThroughput: -1, uploadThroughput: -1 });
    try {
      await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
      await page.waitForURL(`${BASE}/session`);
      await page.getByText('+10', { exact: true }).first().click();
      await page.getByRole('button', { name: /Terminer la séance/ }).click();
      await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor(); // récap renfo (#54)
      await page.getByText(/de reps|reps que/).first().waitFor(); // comparaison avec la séance précédente
    } finally {
      await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await cdp.detach();
    }
    await page.getByRole('button', { name: 'Terminer', exact: true }).click();
    await page.waitForURL(`${BASE}/`);
    await assertAlive('fin de séance renfo');
  }],

  ['séance terminée hors ligne (salle sans réseau)', async () => {
    // hors ligne, l'écriture Firestore n'est acquittée qu'au retour du réseau : « Terminer » restait bloqué
    await page.goto(`${BASE}/history`);
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/gym`);
    await page.getByRole('textbox', { name: 'Titre de la séance' }).fill('Hors ligne e2e');
    await page.getByRole('button', { name: 'Valider la série 1' }).first().click();
    await ctx.setOffline(true);
    try {
      // offline banner: one line, opaque, and the sticky session header stays below it once scrolled
      const banner = page.getByRole('status').filter({ hasText: 'Hors ligne' });
      await banner.waitFor();
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(500);
      const b = await banner.boundingBox();
      const header = await page.getByRole('button', { name: "Retour à l'accueil" }).boundingBox();
      assert.ok(b.height <= 40, `bandeau hors ligne sur plusieurs lignes (${b.height}px)`);
      assert.ok(header.y >= b.y + b.height, 'en-tête de séance caché sous le bandeau hors ligne');
      await page.getByRole('button', { name: /^Terminer/ }).click();
      await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor();
      await page.getByRole('button', { name: 'Terminer', exact: true }).click();
      await page.waitForURL(`${BASE}/`, { timeout: 15_000 });
    } finally {
      await ctx.setOffline(false);
    }
    // au retour du réseau : séance dans l'historique, puis supprimée (ne pas servir de modèle aux parcours suivants)
    await page.goto(`${BASE}/history`);
    await page.getByText('Hors ligne e2e').first().waitFor();
    // deletion offline too: must not spin forever, and must stick once back online
    await ctx.setOffline(true);
    try {
      await page.getByRole('button', { name: 'Actions de la séance' }).first().click();
      await page.getByRole('menuitem', { name: 'Supprimer' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Supprimer', exact: true }).click();
      await page.getByText('Séance supprimée').first().waitFor({ timeout: 10_000 });
    } finally {
      await ctx.setOffline(false);
    }
    await page.waitForTimeout(2000); // queued delete reaches the emulator
    await page.goto(`${BASE}/history`);
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().waitFor();
    assert.equal(await page.getByText('Hors ligne e2e').count(), 0, 'séance supprimée hors ligne revenue');
    await assertAlive('séance hors ligne');
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
    // exercice en durée (#55) : l'unité « reps » bascule en secondes pour tout l'exercice
    await cards.nth(0).getByRole('button', { name: /^Unité : répétitions/ }).first().click();
    await cards.nth(0).getByRole('spinbutton', { name: /^Durée en secondes, série/ }).first().waitFor();
    // chrono (#59) : l'arrêter remplit et valide la prochaine série
    const validated = () => cards.nth(0).getByRole('button', { name: /validée$/ }).count();
    const validatedBefore = await validated();
    await cards.nth(0).getByRole('button', { name: /^Lancer le chrono/ }).click();
    await page.waitForTimeout(1200);
    await cards.nth(0).getByRole('button', { name: /^Arrêter le chrono/ }).click();
    assert.equal(await validated(), validatedBefore + 1, 'le chrono valide la série');
    // remplacer (#62) : nouvel exercice à la même place, séries gardées
    const setsBefore = await cards.nth(0).getByRole('button', { name: /^Série \d+ : / }).count();
    await cards.nth(0).getByRole('button', { name: /voir la fiche/ }).click();
    await page.getByRole('button', { name: /Remplacer par un autre exercice/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /Développé couché/ }).first().click();
    await cards.nth(0).getByRole('button', { name: /^Développé couché : voir la fiche/ }).waitFor();
    assert.equal(await cards.nth(0).getByRole('button', { name: /^Série \d+ : / }).count(), setsBefore, 'séries conservées');
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

  ['séance oubliée muscu et renfo : enregistrée à une date passée', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/gym`);
    await page.getByRole('button', { name: /^Valider la série 1/ }).first().click();
    await page.getByRole('button', { name: /Séance faite plus tôt/ }).click();
    const d = new Date(Date.now() - 3 * 86_400_000);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    await page.fill('#backdate-at', `${day}T06:12`);
    await page.fill('#backdate-min', '45');
    await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click();
    await page.getByRole('button', { name: /^📅 Enregistrée le / }).waitFor();
    await page.getByRole('button', { name: /^Terminer/ }).click();
    await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor();
    await page.getByText('45min 00s').waitFor(); // durée saisie, pas le chrono
    await page.getByRole('button', { name: 'Terminer', exact: true }).click();
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    await page.getByText('06:12').first().waitFor(); // rangée à sa date dans l'historique
    // renfo : même chose
    await page.getByRole('tab', { name: /Renfo/ }).click();
    await page.getByRole('button', { name: 'Refaire cette séance' }).first().click();
    await page.waitForURL(`${BASE}/session`);
    await page.getByText('+10', { exact: true }).first().click();
    await page.getByRole('button', { name: /Séance faite plus tôt/ }).click();
    const d4 = new Date(Date.now() - 4 * 86_400_000);
    await page.fill('#backdate-at', `${d4.getFullYear()}-${String(d4.getMonth() + 1).padStart(2, '0')}-${String(d4.getDate()).padStart(2, '0')}T05:47`);
    await page.fill('#backdate-min', '30');
    await page.getByRole('dialog').getByRole('button', { name: 'Valider' }).click();
    await page.getByRole('button', { name: /Terminer la séance/ }).click();
    await page.getByRole('heading', { name: 'Séance terminée !' }).waitFor();
    await page.getByText('30min 00s').waitFor();
    await page.getByRole('button', { name: 'Terminer', exact: true }).click();
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Renfo/ }).click();
    await page.getByText('05:47').first().waitFor();
    await assertAlive('séance oubliée');
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

  ['filtrer l\'historique par exercice', async () => {
    await page.goto(`${BASE}/history`);
    await page.getByRole('tab', { name: /Muscu/ }).click();
    const filter = page.getByRole('combobox', { name: 'Filtrer les séances par exercice' });
    const cards = page.getByRole('button', { name: 'Actions de la séance' });
    await cards.first().waitFor();
    const all = await cards.count();
    const values = await filter.locator('option').evaluateAll((os) => os.map((o) => o.value));
    await filter.selectOption(values[values.length - 1]); // l'exercice le plus rare
    const some = await cards.count();
    assert.ok(some > 0 && some < all, `filtre : ${some} séance(s) sur ${all}`);
    await filter.selectOption('');
    assert.equal(await cards.count(), all, 'filtre effacé');
    // « Refaire » sur une carte basse : la séance s'ouvre en haut, pas au milieu
    const low = page.getByRole('button', { name: 'Refaire cette séance' }).nth(3);
    await low.scrollIntoViewIfNeeded();
    await low.click();
    await page.waitForURL(`${BASE}/gym`);
    for (let i = 0; i < 20 && await page.evaluate(() => scrollY) > 0; i++) await page.waitForTimeout(100);
    assert.equal(await page.evaluate(() => Math.round(scrollY)), 0, 'séance ouverte en haut de page');
    await page.getByRole('button', { name: 'Annuler la séance' }).first().click();
    await page.locator('[aria-labelledby=cancel-session-title]').getByRole('button', { name: 'Annuler la séance' }).click();
    await page.waitForURL(`${BASE}/`);
  }],

  ['importer un CSV Strong (aperçu, import, pas de doublon)', async () => {
    // past date unique per run (one minute slot in 2025 per run minute): duplicate detection is ±1 min, and the
    // previous HH:MM-only date clashed with any earlier run at the same time of day since the demo was seeded
    const d = new Date(new Date(2025, 0, 1).getTime() + (Math.floor(Date.now() / 60_000) % (360 * 1440)) * 60_000);
    const p2 = (n) => String(n).padStart(2, '0');
    const stamp = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}:00`;
    const csv = ['Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE',
      `${stamp},Push,0h 45m,Développé couché,1,40,10,,,,,`,
      `${stamp},Push,0h 45m,Machine inconnue e2e,1,20,12,,,,,`].join('\n');
    const file = { name: 'strong.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) };
    await page.goto(`${BASE}/settings`);
    const btn = page.getByRole('button', { name: /Importer depuis Strong ou Hevy/ });
    await btn.waitFor();
    for (let i = 0; i < 100 && await btn.isDisabled(); i++) await page.waitForTimeout(100); // historique chargé
    await page.locator('input[type=file][accept*=csv]').setInputFiles(file);
    const dialog = page.getByRole('dialog');
    await dialog.getByText(`1 séance du ${d.toLocaleDateString('fr-FR')}`, { exact: false }).waitFor();
    await dialog.getByText(/1\/2 exercices reconnus/).waitFor();
    await dialog.getByRole('button', { name: 'Importer' }).click();
    await page.getByText('1 séance importée').first().waitFor();
    for (let i = 0; i < 100 && await btn.isDisabled(); i++) await page.waitForTimeout(100); // historique rechargé
    await page.locator('input[type=file][accept*=csv]').setInputFiles(file); // réimport : déjà là
    await page.getByRole('dialog').getByText(/déjà dans ton historique/).waitFor();
    await page.getByRole('dialog').getByRole('button', { name: 'Annuler' }).click();
    await assertAlive('import CSV');
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
    // dialogs: a nowrap button used to widen the DialogContent grid past the screen edge
    await page.goto(`${BASE}/profil`);
    await page.getByRole('button', { name: 'Supprimer mon compte' }).click();
    const dialogOverflow = await page.getByRole('dialog').evaluate((d) => [...d.querySelectorAll('*')].some((e) => e.getBoundingClientRect().right > innerWidth + 1));
    assert.equal(dialogOverflow, false, 'débordement dans le dialogue de suppression du compte');
    await page.keyboard.press('Escape');
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
    console.error(`✗ ${name}\n  ${err.message.split('\n').slice(0, 4).join('\n  ')}`); // keep the awaited locator from the call log
    break; // les étapes suivantes dépendent de celle-ci
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
