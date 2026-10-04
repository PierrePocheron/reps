/**
 * Audit de contraste WCAG AA (4,5:1, 3:1 pour le grand texte) sur les écrans principaux, en clair et en sombre,
 * contrôles sans nom accessible (WCAG 4.1.2 : bouton-icône sans aria-label, champ sans libellé)
 * et texte ou bouton coupé, y compris avec la plus grande police d'Android (WCAG 1.4.4).
 * Prérequis : `yarn dev:demo` lancé. Usage : `yarn a11y` (code de sortie ≠ 0 s'il reste des échecs).
 */
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const DEMO = { email: 'demo@reps.test', password: 'reps-demo-2026' }; // compte fictif des émulateurs
// Garde-fou : jamais de script bloqué indéfiniment (boucle d'amélioration, CI)
setTimeout(() => { console.error('✗ délai dépassé (4 min)'); process.exit(2); }, 240_000).unref();
// A11Y_THEME=blue yarn a11y : audits another accent colour (default: the demo account's violet; new accounts get blue)
const THEME = process.env.A11Y_THEME;
// picked through Réglages (the real path: applyThemeColor also derives the accent text colour), violet restored after
const themeName = THEME && readFileSync(new URL('../src/utils/theme-colors.ts', import.meta.url), 'utf8')
  .match(new RegExp(`${THEME}: \\{[^}]*?name: '([^']+)'`))?.[1];
if (THEME && !themeName) { console.error(`thème inconnu : ${THEME}`); process.exit(2); }
const pickTheme = async (page, name) => {
  await page.goto('http://localhost:5199/settings');
  await page.getByRole('button', { name: new RegExp(`^\\S*\\s*${name}$`) }).first().click();
  await page.waitForTimeout(800);
};
const b = await chromium.launch();
let failures = 0;
for (const pass of ['light', 'dark', 'large']) {
const scheme = pass === 'dark' ? 'dark' : 'light';
// Android « Très grande » police: the WebView scales the root font size (16 → 20.8 px, measured on API 33), so rem layouts grow too
const large = pass === 'large';
// same pass with « Supprimer les animations »: accessibility settings tend to go together
const ctx = await b.newContext({ viewport: large ? { width: 360, height: 780 } : { width: 390, height: 844 }, colorScheme: scheme, isMobile: true, hasTouch: true, reducedMotion: large ? 'reduce' : 'no-preference' });
await ctx.addInitScript((large) => {
  localStorage.setItem('reps_onboarding_v2', '1');
  if (large) document.addEventListener('DOMContentLoaded', () => document.documentElement.style.setProperty('font-size', '130%', 'important'));
}, large);
const p = await ctx.newPage();
await p.goto('http://localhost:5199/login'); await p.fill('#email', DEMO.email); await p.fill('#password', DEMO.password);
await p.click('button[type=submit]'); await p.waitForURL('http://localhost:5199/');
const audit = () => p.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b2, a = 1] = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r, g, b: b2, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const blend = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const bgOf = (el) => { const stack = []; for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0) { stack.push(c); if (c.a >= 1) break; } } let bg = { r: 255, g: 255, b: 255, a: 1 }; if (!stack.length || stack[stack.length - 1].a < 1) bg = parse(getComputedStyle(document.body).backgroundColor) ?? bg; for (const c of stack.reverse()) bg = blend(c, bg); return bg; };
  const out = new Map();
  for (const el of document.querySelectorAll('body *')) {
    const t = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join('');
    if (!t || el.closest('[aria-hidden=true],svg')) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    const size = parseFloat(cs.fontSize), bold = +cs.fontWeight >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const fg = parse(cs.color); if (!fg) continue;
    const bg = bgOf(el); const f = blend(fg, bg);
    const L1 = lum(f), L2 = lum(bg); const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const need = large ? 3 : 4.5;
    if (ratio < need) { const key = `${cs.color} on ${el.className.toString().match(/text-[a-z]+-\d+|text-muted-foreground|text-primary|opacity-\d+/g)?.join(' ') ?? ''}`; const k = `${ratio.toFixed(2)} | ${t.slice(0, 28)} | ${key}`; out.set(k, 1); }
  }
  return [...out.keys()].slice(0, 25);
});
if (themeName) await pickTheme(p, themeName);
// interactive elements a screen reader would announce without a name
const unnamed = () => p.evaluate(() => {
  const name = (el) => (el.getAttribute('aria-label') || '').trim()
    || (el.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.textContent ?? '').join('').trim()
    || (el.textContent || '').trim() || (el.getAttribute('title') || '').trim();
  return [...document.querySelectorAll('button, a[href], [role=button], [role=switch], [role=tab], input:not([type=hidden]), select, textarea')]
    .filter((el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !el.closest('[aria-hidden=true]'); })
    .filter((el) => (['INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)
      ? !(el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${el.id}"]`)) || el.closest('label') || el.getAttribute('aria-labelledby') || el.getAttribute('placeholder'))
      : !name(el)))
    .map((el) => `sans nom : ${el.outerHTML.slice(0, 90).replace(/\s+/g, ' ')}`);
});
// text or controls cut off on the right, by the screen or by an overflow-hidden parent (scrollers and ellipses are deliberate)
const cutOff = () => p.evaluate(() => [...document.querySelectorAll('main *, [role=dialog] *')].filter((el) => {
  // a field narrower than its own value (« 102.5 » shown as « 102. ») is cut inside its box
  if (el.matches('input, select, textarea') && el.scrollWidth > el.clientWidth + 1) return true;
  const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
  if (!text && !el.matches('button, a[href], input, select, [role=tab], [role=switch]')) return false;
  const r = el.getBoundingClientRect(); if (!r.width) return false;
  let limit = innerWidth;
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    const cs = getComputedStyle(a);
    if (['auto', 'scroll'].includes(cs.overflowX) || cs.textOverflow === 'ellipsis') return false;
    if (cs.overflowX !== 'visible') limit = Math.min(limit, a.getBoundingClientRect().right);
  }
  return r.right > limit + 1;
}).map((el) => `coupé : <${el.tagName.toLowerCase()}> « ${(el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 40)} »`).slice(0, 10));
// with reduced motion, nothing may still be moving once the screen has settled (pulses, loops, confetti)
const moving = () => (large ? p.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running')
  .map((a) => `animation en cours malgré « animations réduites » : ${a.animationName ?? a.constructor.name} sur <${a.effect?.target?.tagName?.toLowerCase()}>`)) : []);
const run = async () => [...await audit(), ...await unnamed(), ...await cutOff(), ...await moving()];
for (const path of ['/', '/statistics', '/history', '/profil', '/settings', '/challenges', '/leaderboard']) {
  await p.goto('http://localhost:5199' + path); await p.waitForTimeout(2200);
  const r = await run(); failures += r.length; if (r.length) console.log(`\n== ${pass} ${path}\n` + r.join('\n'));
}
await p.goto('http://localhost:5199/history'); await p.getByRole('button', { name: 'Refaire cette séance' }).first().click(); await p.waitForURL(/gym$/);
p.setDefaultTimeout(10_000); // une action introuvable échoue vite au lieu d'épuiser le délai global
const card = p.locator('div.rounded-2xl.border-2').first();
// 3 séries de types différents (É, D, !) : la dernière séance de la démo peut n'en avoir qu'une
const typeBtns = card.getByRole('button', { name: /^Série \d+ : / });
while (await typeBtns.count() < 4) await card.getByRole('button', { name: /^Série \d+$/ }).click();
for (let i = 1; i <= 3; i++) for (let k = 0; k < i; k++) await typeBtns.nth(i).click();
await card.getByRole('spinbutton', { name: /^Charge en kg, série 1/ }).fill('102.5'); // decimal load: widest common value
await card.getByRole('button', { name: /^Valider la série 1/ }).click(); // minuteur de repos (±15 s, préréglages)
await p.waitForTimeout(500); const g = await run(); failures += g.length; if (g.length) console.log(`\n== ${pass} /gym\n` + g.join('\n'));
await p.getByRole('button', { name: 'Annuler la séance' }).click(); // confirmation sheet (long button label)
await p.waitForTimeout(300); const c = await cutOff(); failures += c.length; if (c.length) console.log(`\n== ${pass} /gym (annulation)\n` + c.join('\n'));
await p.locator('[aria-labelledby=cancel-session-title]').getByRole('button', { name: 'Continuer' }).click();
await p.goto('http://localhost:5199/settings'); await p.evaluate(() => localStorage.removeItem('reps_gym_session'));
if (themeName) await pickTheme(p, 'Violet');
await ctx.close();
}
await b.close();
console.log(failures ? `\n✗ ${failures} problème(s) d'accessibilité (contraste AA, nom manquant, texte coupé ou animation)${THEME ? ` (thème ${THEME})` : ''}` : `✓ contraste AA, noms accessibles, texte entier et animations réduites (clair, sombre et grande police${THEME ? `, thème ${THEME}` : ''})`);
process.exit(failures ? 1 : 0);
