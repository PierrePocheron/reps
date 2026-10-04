/**
 * Audit de contraste WCAG AA (4,5:1, 3:1 pour le grand texte) sur les écrans principaux, en clair et en sombre.
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
for (const scheme of ['light', 'dark']) {
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: scheme, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => localStorage.setItem('reps_onboarding_v2', '1'));
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
const run = audit;
for (const path of ['/', '/statistics', '/history', '/profil', '/settings', '/challenges', '/leaderboard']) {
  await p.goto('http://localhost:5199' + path); await p.waitForTimeout(2200);
  const r = await run(); failures += r.length; if (r.length) console.log(`\n== ${scheme} ${path}\n` + r.join('\n'));
}
await p.goto('http://localhost:5199/history'); await p.getByRole('button', { name: 'Refaire cette séance' }).first().click(); await p.waitForURL(/gym$/);
p.setDefaultTimeout(10_000); // une action introuvable échoue vite au lieu d'épuiser le délai global
const card = p.locator('div.rounded-2xl.border-2').first();
// 3 séries de types différents (É, D, !) : la dernière séance de la démo peut n'en avoir qu'une
const typeBtns = card.getByRole('button', { name: /^Série \d+ : / });
while (await typeBtns.count() < 4) await card.getByRole('button', { name: /^Série \d+$/ }).click();
for (let i = 1; i <= 3; i++) for (let k = 0; k < i; k++) await typeBtns.nth(i).click();
await card.getByRole('button', { name: /^Valider la série 1/ }).click(); // minuteur de repos (±15 s, préréglages)
await p.waitForTimeout(500); const g = await run(); failures += g.length; if (g.length) console.log(`\n== ${scheme} /gym\n` + g.join('\n'));
await p.goto('http://localhost:5199/settings'); await p.evaluate(() => localStorage.removeItem('reps_gym_session'));
if (themeName) await pickTheme(p, 'Violet');
await ctx.close();
}
await b.close();
console.log(failures ? `\n✗ ${failures} texte(s) sous le contraste AA${THEME ? ` (thème ${THEME})` : ''}` : `✓ contraste AA respecté (clair et sombre${THEME ? `, thème ${THEME}` : ''})`);
process.exit(failures ? 1 : 0);
