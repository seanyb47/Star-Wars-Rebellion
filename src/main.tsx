import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ArtSheet } from './ui/ArtSheet';
import { StyleTest } from './ui/StyleTest';
import { StyleGallery } from './ui/StyleGallery';
import './ui/styles.css';

/**
 * Where the glass is, and how tall it is.
 *
 * Sean's question is the right one — why can we not simply put the console on
 * the bottom of the screen? We can, and it is: `.app` is a flex column with
 * the tab bar last, so the bar sits on the app's own floor and always has.
 * The app was the thing in the wrong place.
 *
 * Two separate faults did that, and both are measurements rather than layout.
 *
 * **Height.** `position: fixed; inset: 0` measures the *layout* viewport, and
 * an iPhone can make that most of a hundred points shorter than the screen.
 * `100dvh` is the right unit and the stylesheet asks for it, but a unit is an
 * opinion; `visualViewport.height` is a measurement, so it wins.
 *
 * **Position.** The height alone is not enough. A fixed element is still
 * anchored to the top of the *layout* viewport, and the visual viewport can
 * be offset from it — so the app comes out the right height in the wrong
 * place, which reads on the screen as a band of nothing along the bottom
 * edge. `offsetTop` is the difference, and the app is moved by it.
 *
 * No text inputs anywhere in the game, so the keyboard never shrinks this, and
 * the viewport is locked against pinch-zoom, so nothing else moves it either.
 */
/**
 * Does the page reach the bottom of the glass?
 *
 * Measured rather than assumed: a hidden probe padded by the bottom safe-area
 * inset. The inset is the height of the strip the home indicator sits in, and
 * a page only has one when there is no browser furniture between it and the
 * edge of the screen. Zero means something else owns the bottom — a toolbar —
 * and the app must not try to grow into it.
 */
function ownsTheGlass(): boolean {
  if (!document.body) return false;
  const probe = document.createElement('div');
  probe.style.cssText =
    'position:fixed;left:0;bottom:0;width:0;height:env(safe-area-inset-bottom,0px);' +
    'visibility:hidden;pointer-events:none';
  document.body.appendChild(probe);
  const inset = probe.getBoundingClientRect().height;
  probe.remove();
  return inset > 0;
}

function measureGlass(): void {
  const vv = window.visualViewport;
  const root = document.documentElement.style;

  /*
   * Take the largest credible number, not the most authoritative one.
   *
   * This is the sixth pass at the band under the console, and the first with
   * a measurement of it: Sean's screenshot has 164 device pixels of perfectly
   * flat page colour below the last row of console wood — 55 points on a
   * 393pt phone. Flat, not textured, so it is the page showing under a short
   * app rather than the tab bar padding itself.
   *
   * Every earlier pass picked one source and trusted it. `visualViewport` is
   * a measurement rather than a unit's opinion, which is true, and on that
   * phone it is also 55 points short of the glass. So the rule is not "which
   * number is right" — it is that the two failures are not symmetric. An app
   * taller than the glass hides the overflow and looks perfect. An app
   * shorter than it shows a dead band. So: overshoot on purpose, and take the
   * biggest of everything the browser will tell us.
   */
  const candidates = [
    window.innerHeight,
    document.documentElement.clientHeight,
    vv ? Math.round(vv.height + vv.offsetTop) : 0,
  ];

  /*
   * And the screen itself — where the page actually owns the bottom of it.
   *
   * This is the bit the last pass got wrong, and it is worth writing down
   * because the reasoning was sound and the gate was not. I only trusted
   * `screen.height` when the page was installed to the home screen, on the
   * grounds that standalone is the case with no browser chrome to account
   * for. True, but not the only one: Safari lets you hide the toolbar in an
   * ordinary tab, and then the page is *also* flush to the glass while
   * `display-mode: standalone` is false, `navigator.standalone` is false, and
   * `innerHeight` is still sized as though the toolbar were there. That is
   * Sean's phone — the little chevron in the top corner of his screenshot is
   * the tab to bring the toolbar back — so the branch never ran and the band
   * stayed exactly where it was.
   *
   * The right signal is not how the page was launched. It is whether the page
   * reaches the bottom of the glass, and the browser will say so directly:
   * with `viewport-fit=cover`, `env(safe-area-inset-bottom)` is non-zero only
   * when the page extends into the home indicator's strip. Browser toolbar in
   * the way and it is zero; toolbar hidden or installed and it is not. So the
   * inset is the gate, and it is right in both cases the standalone check got
   * wrong.
   *
   * Bounded, because `screen.height` reports the portrait dimension in
   * landscape on some versions, and because growing the app by half a screen
   * on a browser neither of us has seen would push the console off the bottom
   * — the one outcome worse than a gap.
   */
  if (ownsTheGlass() && screen.height > window.innerHeight) {
    candidates.push(Math.min(screen.height, window.innerHeight + 140));
  }

  root.setProperty('--app-h', `${Math.max(...candidates)}px`);
}
measureGlass();
// Again once the document is ready: the first call runs before <body> exists,
// and the probe that asks whether the page owns the glass needs somewhere to
// be attached.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', measureGlass, { once: true });
}
window.visualViewport?.addEventListener('resize', measureGlass);

/**
 * `?diag` prints what the phone is actually telling us, on the phone.
 *
 * Four rounds of the dead band under the console went by on inference, because
 * every measurement I can take is on a browser that does not have the problem.
 * This is three lines of numbers a screenshot can carry back: how tall each
 * viewport thinks it is, what the insets come back as, and where the console
 * ends up. It costs nothing when the parameter is absent.
 */
if (new URLSearchParams(window.location.search).has('diag')) {
  const box = document.createElement('pre');
  box.style.cssText =
    'position:fixed;left:6px;right:6px;bottom:6px;z-index:99999;margin:0;padding:8px;' +
    'font:11px/1.35 ui-monospace,Menlo,monospace;white-space:pre-wrap;color:#e4eef1;' +
    'background:rgba(3,10,16,.92);border:1px solid #4ec98a;border-radius:8px';
  const read = () => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;top:0;left:0;height:env(safe-area-inset-top,0px);' +
      'width:env(safe-area-inset-bottom,0px);visibility:hidden';
    document.body.appendChild(probe);
    const top = Math.round(probe.getBoundingClientRect().height);
    const bottom = Math.round(probe.getBoundingClientRect().width);
    probe.remove();
    // What the stylesheet actually resolved --safe-bottom to, which is what
    // pads the tab bar — as against the raw env() above, which is only what
    // the phone offered.
    const paid = getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-bottom')
      .trim();
    const bar = document.querySelector('.tabbar')?.getBoundingClientRect();
    const app = document.querySelector('.app')?.getBoundingClientRect();
    const px = (v?: number) => (v === undefined ? '–' : Math.round(v));
    box.textContent = [
      `inner ${window.innerHeight}  visual ${Math.round(window.visualViewport?.height ?? 0)}  client ${document.documentElement.clientHeight}`,
      `inset top ${top}  bottom ${bottom}  paid ${paid || '0px'}  dpr ${window.devicePixelRatio}`,
      `app ${px(app?.top)}→${px(app?.bottom)} (${px(app?.height)})  tabbar ${px(bar?.top)}→${px(bar?.bottom)} (${px(bar?.height)})`,
      `standalone ${window.matchMedia('(display-mode: standalone)').matches}  nav.standalone ${
        (navigator as { standalone?: boolean }).standalone
      }  offsetTop ${Math.round(window.visualViewport?.offsetTop ?? -1)}`,
      // Every number the browser offers for "how tall is the glass", side by
      // side. The app takes the largest of them, so the one to look at is
      // whether any of them is bigger than the one the console reached.
      `screen ${screen.height}  inner ${window.innerHeight}  visual ${Math.round(
        window.visualViewport?.height ?? 0,
      )}  app-h ${getComputedStyle(document.documentElement).getPropertyValue('--app-h').trim() || 'unset'}`,
      `gap below tabbar: vs screen ${px(screen.height - (bar?.bottom ?? 0))}  vs inner ${px(
        window.innerHeight - (bar?.bottom ?? 0),
      )}`,
    ].join('\n');
  };
  document.body.appendChild(box);
  setInterval(read, 500);
  read();
}
window.addEventListener('orientationchange', () => setTimeout(measureGlass, 120));

// `?art` opens the contact sheet instead of the game: every drawing in one
// place, which is the only way to tell whether they look like one set. Never
// linked from the game — it is an instrument, not a screen.
// `?art` is the contact sheet, `?art=style` the inking comparison, and
// `?art=gallery` four whole styles across the three subjects.
const art = new URLSearchParams(window.location.search).get('art');
const page =
  art === null ? (
    <App />
  ) : art === 'style' ? (
    <StyleTest />
  ) : art === 'gallery' ? (
    <StyleGallery />
  ) : (
    <ArtSheet />
  );

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>);
