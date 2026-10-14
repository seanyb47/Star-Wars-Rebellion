/**
 * Driven in a real browser, because some of this cannot be proved any other way.
 *
 * Needs a preview server and a one-off, unsaved Playwright:
 *
 *   npm run build && npx vite preview --port 4318 &
 *   npm install --no-save playwright-core
 *   node lab/browser/solo.mjs
 *
 * Not a dependency of the project: it is a harness, it is run by hand, and
 * nothing ships from it. `playwright-core` is deliberately **not** in
 * package.json — it is 100 MB of browser driver and the deploy has no use for
 * it.
 */
// The single-player game, after a large change to how orders are given.
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4319/Star-Wars-Rebellion/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
page.on('console', (m) => m.type() === 'error' && errs.push(`console: ${m.text().slice(0, 180)}`));
await page.addInitScript(() => localStorage.setItem('seven-seas.taught.v4', 'yes'));
await page.goto(`${BASE}?cb=${Date.now()}`);
const click = async (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find(
    (x) => (x.textContent ?? '').includes(l) || (x.getAttribute('aria-label') ?? '').includes(l));
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}, label);
const text = () => page.evaluate(() => document.body.innerText);

await click('Crown Imperium');
await page.waitForTimeout(400);
await click('Take command of the');
await page.waitForTimeout(900);
const t1 = await text();
console.log('in the game:', t1.includes('DAY'), '| side:', await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-side')));
console.log('no "Play a friend" leaking into the war:', !t1.includes('Play a friend'));

// Clear the opening card, start the clock, and watch a day pass.
console.log('BODY BEFORE >>>', (await text()).replace(/\n/g, ' | ').slice(0, 300));
console.log('BUTTONS >>>', JSON.stringify(await page.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim()).slice(0, 10))));
// The opening briefing holds the clock until it is read, which is the
// single-player rule and has nothing to do with any of this.
await page.evaluate(() => {
  const b = [...document.querySelectorAll('.dispatch button')].find((x) => x.textContent?.trim() === 'Continue');
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(400);
console.log('BODY AFTER CARD >>>', (await text()).replace(/\n/g, ' | ').slice(0, 220));
const speedNow = () => page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) =>
    (x.getAttribute('aria-label') ?? '').startsWith('Speed:'));
  return b?.getAttribute('aria-label') ?? 'no speed button';
});
console.log('speed before:', await speedNow());
await click('Start the clock');
await page.waitForTimeout(500);
console.log('speed after :', await speedNow());
const progress = () => page.evaluate(() =>
  getComputedStyle(document.documentElement).getPropertyValue('--day-progress').trim());
const dayNow = () => page.evaluate(() =>
  document.querySelector('.banner__day')?.getAttribute('aria-label') ?? '?');
console.log('visible speed badge:', await page.evaluate(() => {
  const el = [...document.querySelectorAll('button')].find((x) => (x.getAttribute('aria-label') ?? '').startsWith('Speed:'));
  return el?.innerText?.trim() ?? '?';
}));
console.log('dispatch card in the DOM:', await page.evaluate(() => Boolean(document.querySelector('.dispatch'))));
console.log('dispatch buttons:', JSON.stringify(await page.evaluate(() =>
  [...document.querySelectorAll('.dispatch button')].map((b) => b.textContent?.trim()))));
console.log('day:', await dayNow(), '| progress:', await progress());
await page.waitForTimeout(6000);
console.log('6s  ->', await dayNow(), '| progress:', await progress());
await page.waitForTimeout(26000);
console.log('32s ->', await dayNow(), '| progress:', await progress());

// An order, through the new seam, with no network anywhere.
await click('Menu');
await page.waitForTimeout(400);
console.log('menu opens:', (await text()).length > 400);
console.log('errors:', errs.length ? errs.slice(0, 4) : 'none');
await browser.close();
