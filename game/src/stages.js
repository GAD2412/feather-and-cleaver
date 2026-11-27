import { ARENA_BOTTOM, ARENA_TOP } from './constants.js';

/** Five-stage escape progression from the Harvest Farmyard to the Freedom Woods Gate. */
export const STAGE_DEFS = [
  {
    index: 0,
    name: 'Harvest Farmyard',
    shortName: 'Farmyard',
    length: 2100,
    floorStyle: 'grass',
    bgPrimary: '#6D7F32',
    bgSecondary: '#5A6B27',
    trimColor: '#8B5A2B',
    ambientTint: 'rgba(245, 158, 11, 0.08)',
    farmerSpeed: 158,
    farmerVisionRange: 300,
    farmerVisionAngle: 0.92,
    ovenCount: 2,
    knifeSweeperCount: 2,
    thrownKnifeInterval: 3.1,
    coverType: 'haystack',
    coverCount: 5,
    greaseCount: 0,
  },
  {
    index: 1,
    name: 'Timber Coop & Barn',
    shortName: 'Timber Barn',
    length: 2300,
    floorStyle: 'planks',
    bgPrimary: '#7C4A26',
    bgSecondary: '#663B1D',
    trimColor: '#4A2511',
    ambientTint: 'rgba(217, 119, 6, 0.11)',
    farmerSpeed: 175,
    farmerVisionRange: 330,
    farmerVisionAngle: 0.98,
    ovenCount: 3,
    knifeSweeperCount: 3,
    thrownKnifeInterval: 2.5,
    coverType: 'barrel',
    coverCount: 6,
    greaseCount: 1,
  },
  {
    index: 2,
    name: 'Farmhouse Porch',
    shortName: 'Porch',
    length: 2450,
    floorStyle: 'porch',
    bgPrimary: '#8E5B37',
    bgSecondary: '#7B4D2C',
    trimColor: '#3B1E0D',
    ambientTint: 'rgba(234, 88, 12, 0.12)',
    farmerSpeed: 190,
    farmerVisionRange: 350,
    farmerVisionAngle: 1.05,
    ovenCount: 4,
    knifeSweeperCount: 4,
    thrownKnifeInterval: 2.1,
    coverType: 'crate',
    coverCount: 6,
    greaseCount: 2,
  },
  {
    index: 3,
    name: 'Thanksgiving Kitchen',
    shortName: 'Kitchen',
    length: 2650,
    floorStyle: 'tile',
    bgPrimary: '#E8D5B7',
    bgSecondary: '#C87D55',
    trimColor: '#5B2B1A',
    ambientTint: 'rgba(220, 38, 38, 0.12)',
    farmerSpeed: 204,
    farmerVisionRange: 370,
    farmerVisionAngle: 1.12,
    ovenCount: 5,
    knifeSweeperCount: 5,
    thrownKnifeInterval: 1.75,
    coverType: 'cabinet',
    coverCount: 6,
    greaseCount: 3,
  },
  {
    index: 4,
    name: 'Freedom Woods Gate',
    shortName: 'Woods Gate',
    length: 2500,
    floorStyle: 'woods',
    bgPrimary: '#3D5A36',
    bgSecondary: '#2B4227',
    trimColor: '#6B4226',
    ambientTint: 'rgba(251, 191, 36, 0.10)',
    farmerSpeed: 215,
    farmerVisionRange: 385,
    farmerVisionAngle: 1.15,
    ovenCount: 4,
    knifeSweeperCount: 6,
    thrownKnifeInterval: 1.55,
    coverType: 'bush',
    coverCount: 6,
    greaseCount: 2,
  },
];

/** Generates deterministic stage layout (obstacles, hiding cover, and exit gate) for a given stage index. */
export function buildStageLayout(stageIndex, rng) {
  const def = STAGE_DEFS[Math.min(stageIndex, STAGE_DEFS.length - 1)];
  const midY = (ARENA_TOP + ARENA_BOTTOM) * 0.5;
  const covers = [];
  const obstacles = [];

  const minX = 250;
  const maxX = def.length - 260;
  const spacing = (maxX - minX) / Math.max(1, def.coverCount);

  for (let i = 0; i < def.coverCount; i++) {
    const cx = minX + spacing * (i + 0.45) + rng.range(-35, 35);
    const laneTop = i % 2 === 0;
    const cy = laneTop
      ? rng.range(ARENA_TOP + 62, midY - 45)
      : rng.range(midY + 45, ARENA_BOTTOM - 62);
    covers.push({
      id: i,
      x: cx,
      y: cy,
      radius: 34,
      type: def.coverType,
      rustle: 0,
    });
  }

  // Solid counters, fences, or hay wagons that create tactical flanking & cornering lanes.
  const obstacleCount = 3 + stageIndex;
  for (let i = 0; i < obstacleCount; i++) {
    const ox = 360 + ((def.length - 660) * (i + 0.5)) / obstacleCount + rng.range(-30, 30);
    const oy = i % 2 === 0 ? midY + rng.range(-20, 55) : midY + rng.range(-55, 20);
    const w = def.floorStyle === 'tile' ? 116 : 94;
    const h = 40;
    obstacles.push({
      x: ox - w * 0.5,
      y: oy - h * 0.5,
      w,
      h,
      kind: def.floorStyle === 'tile' ? 'island' : def.floorStyle === 'planks' ? 'beam' : 'fence',
    });
  }

  const exitGate = {
    x: def.length - 96,
    y: midY - 82,
    w: 66,
    h: 164,
  };

  // Decorative non-blocking autumn props (fallen leaves, pumpkins, kitchen floor rugs) for rich atmosphere.
  const props = [];
  const leafCount = def.floorStyle === 'tile' ? 14 : 38;
  for (let i = 0; i < leafCount; i++) {
    props.push({
      kind: def.floorStyle === 'tile' ? 'herb' : 'leaf',
      x: rng.range(70, def.length - 120),
      y: rng.range(ARENA_TOP + 18, ARENA_BOTTOM - 18),
      rot: rng.range(0, Math.PI * 2),
      scale: rng.range(0.75, 1.3),
      color: rng.pick(
        def.floorStyle === 'tile'
          ? ['#65A30D', '#F59E0B', '#DC2626']
          : ['#EA580C', '#D97706', '#B91C1C', '#EAB308'],
      ),
    });
  }
  const borderPropCount = 8;
  for (let i = 0; i < borderPropCount; i++) {
    const px = 160 + ((def.length - 320) * i) / borderPropCount + rng.range(-25, 25);
    const topEdge = i % 2 === 0;
    props.push({
      kind: def.floorStyle === 'tile' ? 'spice_rack' : 'pumpkin',
      x: px,
      y: topEdge ? ARENA_TOP + 12 : ARENA_BOTTOM - 12,
      rot: 0,
      scale: rng.range(0.85, 1.15),
      color: '#EA580C',
    });
  }

  return { def, covers, obstacles, exitGate, props };
}
