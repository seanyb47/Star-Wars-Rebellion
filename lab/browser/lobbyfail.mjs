/**
 * What "Play a friend" says when it cannot reach the introduction service.
 *
 * This container's egress policy blocks the broker, which makes it the one
 * place the *failure* path can be checked properly.
 */
import { chromium } from 'playwright-core';
const BASE = 'http://localhost:4319/Star-Wars-Rebellion/';
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await (await browser.newContext({ viewport: { width: 393, height: 852 } })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));
await page.addInitScript(() => localStorage.setItem('seven-seas.taught.v4', 'yes'));
await page.goto(`${BASE}?cb=${Date.now()}`);
const text = () => page.evaluate(() => document.body.innerText.replace(/\n/g, ' | '));

await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) => x.textContent?.includes('Play a friend'));
  b?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(1500);
console.log('straight away :', (await text()).slice(0, 150));
await page.waitForTimeout(8000);
console.log('once it fails :', (await text()).slice(0, 260));
console.log('has a way out :', await page.evaluate(() =>
  [...document.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter(Boolean)));
console.log('errors:', errs.length ? errs.slice(0, 2) : 'none');
await browser.close();
