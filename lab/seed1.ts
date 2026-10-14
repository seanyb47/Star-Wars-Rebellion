import { playGame } from './play';
for (const seed of [1, 2, 3]) {
  const r = playGame(seed, 'alliance', { maxDays: 4000 });
  console.log('seed', seed, '->', r.winner ?? 'unfinished', 'd' + r.days, r.stall ?? '');
}
