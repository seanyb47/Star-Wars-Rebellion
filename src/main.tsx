import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ArtSheet } from './ui/ArtSheet';
import { StyleTest } from './ui/StyleTest';
import { StyleGallery } from './ui/StyleGallery';
import './ui/styles.css';

/**
 * How tall the glass actually is.
 *
 * `position: fixed; inset: 0` measures the layout viewport, and an iPhone can
 * make that most of a hundred points shorter than the screen — the console
 * floated that far up with a slab of nothing under it. `100dvh` is the right
 * unit and the stylesheet asks for it, but a unit is still the browser's
 * opinion. `visualViewport` is a measurement, so it wins where it exists: it
 * reports the visible area whether or not the browser is currently showing
 * its own furniture, and it tells us when that changes.
 *
 * No text inputs anywhere in the game, so the keyboard never shrinks this, and
 * the viewport is locked against pinch-zoom, so nothing else moves it either.
 */
function measureGlass(): void {
  const vv = window.visualViewport;
  if (!vv) return;
  document.documentElement.style.setProperty('--app-h', `${Math.round(vv.height)}px`);
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
    const bar = document.querySelector('.tabbar')?.getBoundingClientRect();
    const app = document.querySelector('.app')?.getBoundingClientRect();
    const px = (v?: number) => (v === undefined ? '–' : Math.round(v));
    box.textContent = [
      `inner ${window.innerHeight}  visual ${Math.round(window.visualViewport?.height ?? 0)}  client ${document.documentElement.clientHeight}`,
      `inset top ${top}  bottom ${bottom}  dpr ${window.devicePixelRatio}`,
      `app ${px(app?.top)}→${px(app?.bottom)} (${px(app?.height)})  tabbar ${px(bar?.top)}→${px(bar?.bottom)} (${px(bar?.height)})`,
      `standalone ${window.matchMedia('(display-mode: standalone)').matches}  gap below tabbar ${px(
        (window.visualViewport?.height ?? window.innerHeight) - (bar?.bottom ?? 0),
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
