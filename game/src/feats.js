import { GAME_STATES } from './constants.js';

/** Twelve unlockable Thanksgiving Escape Feats evaluated at end of run. */
export const FEAT_CATALOG = [
  { id: 'woods_survivor', name: 'Woods Survivor', check: (e) => e.state === GAME_STATES.ESCAPED },
  { id: 'untouched_plume', name: 'Untouched Plume', check: (e) => e.state === GAME_STATES.ESCAPED && e.turkey.lives === e.turkey.maxLives },
  { id: 'close_call_virtuoso', name: 'Close-Call Virtuoso', check: (e) => e.closeCalls >= 6 },
  { id: 'featherweight_dodger', name: 'Featherweight Dodger', check: (e) => e.closeCalls >= 3 },
  { id: 'harvest_legend', name: 'Harvest Legend', check: (e) => e.score >= 4000 },
  { id: 'kitchen_sprinter', name: 'Kitchen Sprinter', check: (e) => e.stageIndex >= 3 },
  { id: 'decoy_trickster', name: 'Decoy Trickster', check: (e) => e.decoysLured >= 2 },
  { id: 'hound_outsmarted', name: 'Hound Outsmarted', check: (e) => e.stageIndex >= 2 },
  { id: 'chefs_rush_victor', name: "Chef's Rush Victor", check: (e) => e.state === GAME_STATES.ESCAPED && e.difficulty?.id === 'rush' },
  { id: 'perk_collector', name: 'Perk Collector', check: (e) => e.perks.ownedIds.length >= 3 },
  { id: 'blade_dancer', name: 'Blade Dancer', check: (e) => e.hazardsDodged >= 8 },
  { id: 'brave_gobbler', name: 'Brave Gobbler', check: () => true },
];

export function evaluateRunFeats(engine) {
  const earned = [];
  for (const feat of FEAT_CATALOG) {
    if (feat.id === 'brave_gobbler' && earned.length > 0) continue;
    if (feat.check(engine)) earned.push(feat.name);
    if (earned.length >= 4) break;
  }
  return earned;
}
