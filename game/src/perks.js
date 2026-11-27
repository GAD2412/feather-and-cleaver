import { PERK_CATALOG } from './constants.js';

/** Manages mid-run Escape Perk selection and modifier aggregation. */
export class PerkSystem {
  constructor() {
    this.ownedIds = [];
    this.currentChoices = [];
  }

  reset() {
    this.ownedIds = [];
    this.currentChoices = [];
  }

  rollChoices(rng, count = 3) {
    const pool = PERK_CATALOG.filter((p) => !this.ownedIds.includes(p.id));
    const source = pool.length >= count ? [...pool] : [...PERK_CATALOG];
    const picked = [];
    while (picked.length < count && source.length > 0) {
      const idx = rng.int(0, source.length - 1);
      picked.push(source.splice(idx, 1)[0]);
    }
    this.currentChoices = picked;
    return picked;
  }

  choose(index) {
    const perk = this.currentChoices[index];
    if (!perk) return null;
    if (!this.ownedIds.includes(perk.id)) {
      this.ownedIds.push(perk.id);
    }
    this.currentChoices = [];
    return perk;
  }

  has(id) {
    return this.ownedIds.includes(id);
  }

  getOwnedPerks() {
    return this.ownedIds.map((id) => PERK_CATALOG.find((p) => p.id === id)).filter(Boolean);
  }
}
