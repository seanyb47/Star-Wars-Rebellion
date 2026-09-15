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
   * And the screen itself, where there is no browser chrome to account for.
   *
   * Installed to the home screen there is no toolbar and no address bar, so
   * the glass and the viewport should be the same thing; when they are not,
   * the difference is exactly the fault. Bounded, because `screen.height` can
   * report the portrait dimension in landscape, and because growing the app
   * by half a screen on some browser we have never seen would push the
   * console off the bottom — which is the one outcome worse than a gap.
   */
  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  if (standalone && screen.height > window.innerHeight) {
    candidates.push(Math.min(screen.height, window.innerHeight + 140));
  }

  root.setProperty('--app-h', `${Math.max(...candidates)}px`);
}
measureGlass();
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
