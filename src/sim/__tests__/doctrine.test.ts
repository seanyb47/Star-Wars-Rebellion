import { describe, expect, it } from 'vitest';
// The opponent's own source, as text: the gates in it and the ids in the file
// have to be the same set, and nothing else can check that.
import aiSource from '../ai.ts?raw';
import { generateGalaxy } from '../galaxy';
import { advanceDay } from '../advanceDay';
import {
  ARTICLES,
  TIERS,
  article,
  articlesFor,
  doctrineOf,
  follows,
} from '../doctrine';
import type { GameState } from '../types';

/**
 * The doctrine file is read by the opponent, so it is code as much as prose:
 * an article the code asks about by an id the file has lost would silently
 * turn a tactic on for everybody, and an article nothing asks about is a claim
 * with no teeth. Both are cheap to check and expensive to find by playing.
 */
describe('the book itself', () => {
  it('gives every article an id, a tier, a rule and a reason', () => {
    expect(ARTICLES.length).toBeGreaterThan(10);
    for (const a of ARTICLES) {
      expect(a.id, JSON.stringify(a)).toMatch(/^[a-z-]+$/);
      expect(TIERS).toContain(a.tier);
      expect(a.title.length).toBeGreaterThan(4);
      expect(a.rule.length).toBeGreaterThan(20);
      expect(a.why.length).toBeGreaterThan(20);
    }
  });

  it('has no two articles with the same id', () => {
    expect(new Set(ARTICLES.map((a) => a.id)).size).toBe(ARTICLES.length);
  });

  it('every gate in the opponent names an article that exists', () => {
    const gates = [...aiSource.matchAll(/follows\(state, '([^']+)'\)/g)].map((m) => m[1]);
    expect(gates.length).toBeGreaterThan(4);
    for (const id of gates) expect(article(id), `no article "${id}"`).toBeDefined();
  });

  it('opens the tiers out, plain into sharp into ruthless', () => {
    expect(articlesFor('plain').length).toBeLessThan(articlesFor('sharp').length);
    expect(articlesFor('sharp').length).toBeLessThan(articlesFor('ruthless').length);
    expect(articlesFor('ruthless').length).toBe(ARTICLES.length);
  });
});

describe('what a given opponent knows', () => {
  const world = () => generateGalaxy(4, 'empire');

  it('plays by the whole book when nothing says otherwise', () => {
    const state = world();
    expect(doctrineOf(state).tier).toBe('ruthless');
    for (const a of ARTICLES) expect(follows(state, a.id)).toBe(true);
  });

  it('keeps the sharp and ruthless articles from a plain opponent', () => {
    const state: GameState = { ...world(), doctrine: { tier: 'plain' } };
    expect(follows(state, 'solvency-first')).toBe(true);
    expect(follows(state, 'spend-the-bank')).toBe(false);
    expect(follows(state, 'hunt-the-principals')).toBe(false);
  });

  it('lets one article be withheld on its own, for measuring', () => {
    const state: GameState = {
      ...world(),
      doctrine: { tier: 'ruthless', without: ['hunt-the-principals'] },
    };
    expect(follows(state, 'hunt-the-principals')).toBe(false);
    expect(follows(state, 'commit-to-the-siege')).toBe(true);
  });

  it('answers yes to a rule the file has never heard of, rather than turning it off', () => {
    const state: GameState = { ...world(), doctrine: { tier: 'plain' } };
    expect(follows(state, 'no-such-article')).toBe(true);
  });
});

describe('a difficulty is carried through the game', () => {
  it('survives the days and the save', () => {
    let state: GameState = { ...generateGalaxy(9, 'empire'), doctrine: { tier: 'plain' } };
    for (let d = 0; d < 40; d++) state = advanceDay(state);
    expect(doctrineOf(state).tier).toBe('plain');
    const reloaded: GameState = JSON.parse(JSON.stringify(state));
    expect(follows(reloaded, 'spend-the-bank')).toBe(false);
  });

  it('a plain opponent leaves its principals on the quay and a ruthless one seats them', () => {
    const seated = (tier: 'plain' | 'ruthless') => {
      let state: GameState = { ...generateGalaxy(12, 'empire'), doctrine: { tier } };
      let days = 0;
      for (let d = 0; d < 200; d++) {
        state = advanceDay(state);
        if (state.systems.some((s) => s.commanderId)) days += 1;
      }
      return days;
    };
    expect(seated('plain')).toBe(0);
    expect(seated('ruthless')).toBeGreaterThan(0);
  });
});
