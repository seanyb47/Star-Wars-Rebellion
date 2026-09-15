import { generateGalaxy } from '../src/sim/galaxy';
import { islandTrade, islandIncome } from '../src/sim/economy';
import { isSurveyTarget, isMissionTarget, missionTypeFor } from '../src/sim/missions';
import { supportMultiplier } from '../src/sim/helpers';
import { GOLD_PER_DAY, UPKEEP_PER_DAY } from '../src/sim/constants';

const state = generateGalaxy(31, 'empire');
const d = state.systems.find((s) => !s.populated && !s.explored.empire)!;
console.log(`an unexplored empty island (${d.name}, ${d.slots} slots):`);
console.log(`  surveyTarget=${isSurveyTarget(d, 'empire')} missionTarget=${isMissionTarget(state, d, 'empire')} type=${missionTypeFor(state, d, 'empire')}`);
console.log(`  support ${d.support.empire}/${d.support.alliance} → output multiplier ${supportMultiplier(d.support.empire)}`);

// Settle it and fill it with earners; what does it clear a day?
d.explored.empire = true; d.control = 'empire'; d.garrison = 1;
for (let i = 0; i < d.slots; i++) {
  d.facilities.push({ id: `f${i}`, type: i % 2 ? 'refinery' : 'mine', owner: 'empire' });
}
const gross = islandTrade(d, 'empire');
const net = islandIncome(d, 'empire');
const cost = d.facilities.reduce((n, f) => n + UPKEEP_PER_DAY[f.type], 0) + d.garrison * UPKEEP_PER_DAY.troop;
console.log(`  filled with ${d.slots} earners: trade ${gross.toFixed(1)}, kept ${net.toFixed(1)}, upkeep ${cost} → ${(net - cost).toFixed(1)} a day clear`);

// Against a populated island of the same size, for comparison.
const p = state.systems.find((s) => s.populated && s.control === 'empire')!;
console.log(`  a settled island of ours (${p.name}, ${p.slots} slots, support ${p.support.empire.toFixed(0)}): multiplier ${supportMultiplier(p.support.empire).toFixed(2)}`);
console.log(`  a mine yields ${GOLD_PER_DAY.mine}/day gross, a refinery ${GOLD_PER_DAY.refinery}; upkeep mine ${UPKEEP_PER_DAY.mine} refinery ${UPKEEP_PER_DAY.refinery}`);
