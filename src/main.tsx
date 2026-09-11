import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { ArtSheet } from './ui/ArtSheet';
import './ui/styles.css';

// `?art` opens the contact sheet instead of the game: every drawing in one
// place, which is the only way to tell whether they look like one set. Never
// linked from the game — it is an instrument, not a screen.
const showArt = new URLSearchParams(window.location.search).has('art');

createRoot(document.getElementById('root')!).render(
  <StrictMode>{showArt ? <ArtSheet /> : <App />}</StrictMode>,
);
