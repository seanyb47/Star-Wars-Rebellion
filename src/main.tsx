import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ArtSheet } from './ui/ArtSheet';
import { StyleTest } from './ui/StyleTest';
import { StyleGallery } from './ui/StyleGallery';
import './ui/styles.css';

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
