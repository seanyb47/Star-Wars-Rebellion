/**
 * Several named wars, and a lobby you can put away.
 *
 *   npm run build && npx vite preview --port 4319 &
 *   npm install --no-save playwright-core
 *   node lab/browser/games.mjs
 */
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4319/Star-Wars-Rebellion/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 180)));
await page.addInitScript(() => localStorage.setItem('seven-seas.taught.v4', 'yes'));

const click = async (label) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('button')].find(
    (x) => (x.textContent ?? '').includes(l) || (x.getAttribute('aria-label') ?? '').includes(l));
  if (!b) return false;
  b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
}, label);
const text = () => page.evaluate(() => document.body.innerText);
const rows = () => page.evaluate(() =>
  [...document.querySelectorAll('.games__open')].map((b) => b.innerText.replace(/\n/g, ' · ')));

// --- begin a war, let it autosave, go back to the title -----------------
await page.goto(`${BASE}?cb=${Date.now()}`);
await click('Crown Imperium'); await page.waitForTimeout(300);
await click('Take command of the'); await page.waitForTimeout(1500);
console.log('war 1 started:', (await text()).includes('DAY'));

await page.reload(); await page.waitForTimeout(1200);
console.log('after reload, wars listed:', JSON.stringify(await rows()));

// --- a second war, as the other side ------------------------------------
await click('Free Confederacy'); await page.waitForTimeout(300);
await click('Take command of the'); await page.waitForTimeout(1500);
await page.reload(); await page.waitForTimeout(1200);
const two = await rows();
console.log('two wars, both kept:', two.length === 2, JSON.stringify(two));

// --- reopen the first and check it is the Crown's ------------------------
await page.evaluate(() => {
  const crown = [...document.querySelectorAll('.games__open')].find((b) => b.innerText.includes('Crown'));
  crown?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(1200);
console.log('reopened side:', await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-side')));

// --- rename, then give one up -------------------------------------------
await page.reload(); await page.waitForTimeout(1200);
await page.evaluate(() => { window.prompt = () => 'The long war'; });
await page.evaluate(() => {
  const pencil = [...document.querySelectorAll('.games__act')].find((b) => b.textContent === '✎');
  pencil?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(500);
console.log('renamed:', JSON.stringify(await rows()));

await page.evaluate(() => { window.confirm = () => true; });
await page.evaluate(() => {
  const cross = [...document.querySelectorAll('.games__act')].find((b) => b.textContent === '×');
  cross?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(500);
console.log('after giving one up:', JSON.stringify(await rows()));
console.log('errors:', errs.length ? errs.slice(0, 3) : 'none');
await browser.close();
