/**
 * What a size band is worth, in the only currency that matters: being shot at.
 *
 * The ship audit of 22 September asks whether the Sovereign and the Justiciar
 * can both be right at seventy-four guns, one Gigantic and one Large. That is
 * not a naming question — `GUN_VS_SIZE` gives a Gigantic target +10 to an
 * enemy's Long Gun hit chance and +15 to a Heavy, so the band is worth real
 * damage every round of every action she is ever in.
 */
import { ROSTER_CLASSES } from '../src/sim/roster';
import { expectedDamagePerShot, hitChance } from '../src/sim/navycombat';
import type { ShipSize } from '../src/sim/shipdefs';

const stats = (c: (typeof ROSTER_CLASSES)[number], size: ShipSize) => ({
  size,
  speed: c.speedCategory,
  armor: c.armor,
  hull: c.hull,
});

for (const name of ['Sovereign', 'Justiciar', 'Vanguard', 'Tempest']) {
  const c = ROSTER_CLASSES.find((x) => x.name === name)!;
  console.log(`\n${c.name} — ${c.size}, ${c.guns} guns, ${c.hull} hull, armor ${c.armor}, ${c.costGold} gold`);
  for (const size of ['Medium', 'Large', 'Gigantic'] as ShipSize[]) {
    const t = stats(c, size);
    const heavy = expectedDamagePerShot('Heavy', t);
    const long = expectedDamagePerShot('Long', t);
    const mark = size === c.size ? '  <- as shipped' : '';
    console.log(
      `   as ${size.padEnd(8)} heavy ${hitChance('Heavy', t).toString().padStart(3)}% -> ${heavy.toFixed(1).padStart(5)} dmg/shot` +
        `   long ${hitChance('Long', t).toString().padStart(3)}% -> ${long.toFixed(1).padStart(5)}` +
        `   rounds under 20 heavy ${(c.hull / (20 * heavy)).toFixed(1).padStart(5)}` +
        `   under 20 long ${(c.hull / (20 * long)).toFixed(1).padStart(5)}${mark}`,
    );
  }
}
