/**
 * Driven in a real browser, because some of this cannot be proved any other way.
 *
 * Needs a preview server and a one-off, unsaved Playwright:
 *
 *   npm run build && npx vite preview --port 4318 &
 *   npm install --no-save playwright-core
 *   node lab/browser/twotabs.mjs
 *
 * Not a dependency of the project: it is a harness, it is run by hand, and
 * nothing ships from it. `playwright-core` is deliberately **not** in
 * package.json — it is 100 MB of browser driver and the deploy has no use for
 * it.
 */
// Two tabs of one browser playing each other, which is the only end-to-end
// check available in here: the egress policy refuses the broker.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4318/Star-Wars-Rebellion/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
// One context, so both pages share an origin and therefore a BroadcastChannel.
const ctx = await browser.newContext({ viewport: { width: 393, height: 852 } });
const log = [];
const open = async (which) => {
  const page = await ctx.newPage();
  page.on('console', (m) => log.push(`[${which}] ${m.type()}: ${m.text().slice(0, 160)}`));
  page.on('pageerror', (e) => log.push(`[${which}] PAGEERROR: ${String(e).slice(0, 200)}`));
  await page.addInitScript(() => localStorage.setItem('seven-seas.taught.v4', 'yes'));
  await page.goto(`${BASE}?cb=${Date.now()}#tabs=${which}`);
  return page;
};
const host = await open('host');
const guest = await open('guest');
await host.waitForTimeout(3000);

const read = async (page) => page.evaluate(() => {
  const txt = document.body.innerText;
  return {
    day: (txt.match(/Day\s+(\d+)/i) ?? [])[1] ?? null,
    side: document.querySelector('.app')?.getAttribute('data-side') ?? null,
    waiting: txt.includes('Waiting for the other'),
    speed: (txt.match(/(Paused|Very slow|Slow|Medium|Fast)/) ?? [])[1] ?? null,
    chars: txt.length,
  };
});
console.log('host :', JSON.stringify(await read(host)));
console.log('guest:', JSON.stringify(await read(guest)));

// --- the speed request, which is how the clock starts in a two-player war ---
const tap = async (page, label) => {
  await page.evaluate((l) => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      (b.getAttribute('aria-label') ?? '').includes(l),
    );
    btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, label);
};
await tap(host, 'Start the clock');
await host.waitForTimeout(600);
const asked = await guest.evaluate(() => ({
  popup: document.body.innerText.includes('requests the speed to be'),
  text: (document.body.innerText.match(/.{0,70}requests the speed to be.{0,30}/s) ?? [])[0] ?? '',
}));
console.log('guest sees request:', asked.popup, '|', asked.text.replace(/\n/g, ' ').trim());
// innerText is the *rendered* text, and the bar is uppercased by CSS.
const has = async (page, needle) =>
  page.evaluate((n) => document.body.innerText.toLowerCase().includes(n.toLowerCase()), needle);
console.log('host says it is waiting on them:', await has(host, 'Nothing changes unless they agree'));

// Agree, and the clock should start for both.
await guest.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Agree');
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await host.waitForTimeout(2500);
const s1 = await read(host), g1 = await read(guest);
console.log('after agreeing -> host speed', s1.speed, '| guest speed', g1.speed);
// Very Slow is 30s a day, so watch the day cross rather than waiting one out.
console.log('waiting out a day at Very Slow (32s)...');
await host.waitForTimeout(32000);
const a = await read(host), b = await read(guest);
console.log('a day later    -> host day', a.day, '| guest day', b.day, '| in step:', a.day === b.day);
console.log('sides          -> host', a.side, '| guest', b.side);

// --- and the other way round: the guest asks, the host answers ---------
console.log('GUEST BODY >>>', (await guest.evaluate(() => document.body.innerText)).replace(/\n/g, ' | ').slice(0, 300));
console.log('GUEST buttons >>>', JSON.stringify(await guest.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') ?? b.textContent?.trim()).slice(0, 12))));
await tap(guest, 'Pause the clock');
await guest.waitForTimeout(700);
console.log('host sees their request:', await has(host, 'requests the speed to be'));
const whose = await host.evaluate(
  () => (document.body.innerText.match(/The \w+[\w ]*? requests the speed to be [\w ]+/i) ?? [])[0] ?? '',
);
console.log('   reads as:', whose.trim());
await host.evaluate(() => {
  const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Decline');
  btn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await host.waitForTimeout(900);
const after = await read(host), afterG = await read(guest);
console.log('declined -> host speed', after.speed, '| guest speed', afterG.speed, '(unchanged is the point)');
console.log('dialog gone on host:', !(await has(host, 'requests the speed to be')));

console.log('--- console ---');
for (const line of log.slice(0, 18)) console.log(line);
await browser.close();
