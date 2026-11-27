/** Shared canvas dimensions and gameplay tuning constants. */
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_TOP_HEIGHT = 68;
export const HUD_BOTTOM_HEIGHT = 44;
export const ARENA_TOP = HUD_TOP_HEIGHT + 14;
export const ARENA_BOTTOM = VIEW_HEIGHT - HUD_BOTTOM_HEIGHT - 14;
export const ARENA_HEIGHT = ARENA_BOTTOM - ARENA_TOP;

export const GAME_STATES = {
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  PERK_SELECT: 'PERK_SELECT',
  PAUSED: 'PAUSED',
  CAUGHT: 'CAUGHT',
  ESCAPED: 'ESCAPED',
};

export const FARMER_STATES = {
  PATROL: 'PATROL',
  SUSPICIOUS: 'SUSPICIOUS',
  CHASING: 'CHASING',
  SEARCHING: 'SEARCHING',
  CORNERING: 'CORNERING',
};

export const TURKEY_DEFAULTS = {
  radius: 17,
  grazeRadius: 40,
  baseSpeed: 245,
  dashSpeed: 640,
  dashDuration: 0.24,
  dashCooldown: 2.1,
  maxDashes: 2,
  maxDecoys: 2,
  decoyCooldown: 5.5,
  maxLives: 3,
  invulnDuration: 1.35,
  hideSpeedFactor: 0.55,
};

export const SCORE_VALUES = {
  corn: 50,
  cranberry: 120,
  featherHeal: 150,
  closeCall: 150,
  decoyLure: 80,
  stageClear: 450,
  escapeVictory: 1500,
};

export const DIFFICULTY_MODES = {
  classic: {
    id: 'classic',
    label: 'Classic Escape',
    desc: 'Balanced stealth & dodge',
    speedMult: 1.0,
    hazardMult: 1.0,
    scoreMult: 1.0,
  },
  rush: {
    id: 'rush',
    label: "Chef's Rush",
    desc: 'Faster farmer • 1.5x score',
    speedMult: 1.14,
    hazardMult: 1.2,
    scoreMult: 1.5,
  },
};

export const PALETTE = {
  cream: '#FFF4DF',
  parchment: '#F5E1BE',
  amber: '#F59E0B',
  gold: '#FBBF24',
  rust: '#C2410C',
  crimson: '#DC2626',
  burgundy: '#7F1D1D',
  plum: '#451A14',
  sage: '#65A30D',
  pine: '#1E4620',
  woodDark: '#4A2511',
  woodMid: '#7C3F1D',
  steel: '#E2E8F0',
  steelDark: '#64748B',
  ink: '#1E1109',
};

export const PERK_CATALOG = [
  {
    id: 'greased_feathers',
    name: 'Greased Feathers',
    tag: 'MOBILITY',
    desc: '+22% dash burst and 25% faster dash recharge.',
    color: '#F59E0B',
  },
  {
    id: 'corn_bait_master',
    name: 'Corn Bait Master',
    tag: 'STEALTH',
    desc: '+1 max decoy and decoys distract the farmer longer.',
    color: '#EAB308',
  },
  {
    id: 'haystack_ghost',
    name: 'Haystack Ghost',
    tag: 'COVER',
    desc: 'Rapidly sheds farmer suspicion inside cover.',
    color: '#65A30D',
  },
  {
    id: 'iron_gizzard',
    name: 'Iron Gizzard',
    tag: 'SURVIVAL',
    desc: '+1 max tail feather and restores 1 feather now.',
    color: '#EF4444',
  },
  {
    id: 'double_flap',
    name: 'Double Flap',
    tag: 'AGILITY',
    desc: '+1 max dash charge for chained knife dodges.',
    color: '#FB923C',
  },
  {
    id: 'cranberry_rush',
    name: 'Cranberry Rush',
    tag: 'SCORE',
    desc: '+18% sprint speed and +50% Close Call bonus.',
    color: '#E11D48',
  },
  {
    id: 'narrow_escape_sense',
    name: 'Sixth Plumage',
    tag: 'REFLEX',
    desc: 'Wider Close Call radius + brief speed surge on graze.',
    color: '#38BDF8',
  },
];
