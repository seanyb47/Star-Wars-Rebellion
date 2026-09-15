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
