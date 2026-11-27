import { ARENA_BOTTOM, ARENA_HEIGHT, ARENA_TOP, SCORE_VALUES } from './constants.js';
import { clamp, distance } from './geometry.js';

/** Manages Thanksgiving Ovens, Carving Knives, Grease Puddles, and Collectibles. */
export class HazardManager {
  constructor() {
    this.ovens = [];
    this.sweepKnives = [];
    this.thrownKnives = [];
    this.greases = [];
    this.collectibles = [];
    this.throwTimer = 2.0;
  }

  populateForStage(stage, rng) {
    const { def } = stage;
    this.ovens = [];
    this.sweepKnives = [];
    this.thrownKnives = [];
    this.greases = [];
    this.collectibles = [];
    this.throwTimer = def.thrownKnifeInterval;

    // 1. Cast-iron Thanksgiving Ovens along walls/lanes with telegraphed heat blasts.
    for (let i = 0; i < def.ovenCount; i++) {
      const ox = 330 + ((def.length - 580) * (i + 0.5)) / def.ovenCount + rng.range(-30, 30);
      const fromTop = i % 2 === 0;
      const oy = fromTop ? ARENA_TOP + 26 : ARENA_BOTTOM - 26;
      this.ovens.push({
        id: i,
        x: ox,
        y: oy,
        dirY: fromTop ? 1 : -1,
        width: 68,
        height: 46,
        phase: rng.range(0, 2.2),
        cycleDuration: Math.max(2.6, 3.9 - def.index * 0.25),
        blastRange: Math.min(240, ARENA_HEIGHT * 0.48),
        blastHalfWidth: 52,
        state: 'IDLE', // IDLE | PREHEAT | BLAST
        grazedThisCycle: false,
      });
    }

    // 2. Sweeping Carving Knife lanes with dashed warning telegraphs.
    for (let i = 0; i < def.knifeSweeperCount; i++) {
      const kx = 410 + ((def.length - 660) * (i + 0.5)) / def.knifeSweeperCount;
      const horizontal = i % 3 === 2;
      this.sweepKnives.push({
        id: i,
        x: kx,
        y: (ARENA_TOP + ARENA_BOTTOM) * 0.5,
        horizontal,
        laneStart: horizontal ? kx - 170 : ARENA_TOP + 12,
        laneEnd: horizontal ? kx + 170 : ARENA_BOTTOM - 12,
        bladePos: 0,
        timer: rng.range(0.4, 2.4),
        period: Math.max(2.1, 3.2 - def.index * 0.2),
        state: 'WAIT', // WAIT | TELEGRAPH | SLICE
        spin: 0,
        grazedThisSlice: false,
      });
    }

    // 3. Grease / gravy slicks.
    const greaseList = [];
    for (let i = 0; i < def.greaseCount; i++) {
      const gx = 450 + ((def.length - 820) * (i + 0.5)) / Math.max(1, def.greaseCount);
      const gy = rng.range(ARENA_TOP + 95, ARENA_BOTTOM - 95);
      greaseList.push({ x: gx, y: gy, radius: 42 });
    }
    this.greases = greaseList;
    stage.greases = greaseList;

    // 4. Collectibles: Golden Corn, Cranberries, and Bonus Tail Feathers.
    const itemCount = 12 + def.index * 2;
    for (let i = 0; i < itemCount; i++) {
      const ix = 220 + ((def.length - 360) * i) / itemCount + rng.range(-25, 25);
      let iy = rng.range(ARENA_TOP + 55, ARENA_BOTTOM - 55);
      for (const rect of stage.obstacles) {
        if (ix >= rect.x - 18 && ix <= rect.x + rect.w + 18 && iy >= rect.y - 18 && iy <= rect.y + rect.h + 18) {
          iy = iy < (ARENA_TOP + ARENA_BOTTOM) * 0.5 ? ARENA_TOP + 52 : ARENA_BOTTOM - 52;
        }
      }
      const roll = rng.next();
      const kind = roll < 0.14 ? 'feather' : roll < 0.42 ? 'cranberry' : 'corn';
      this.collectibles.push({
        x: ix,
        y: iy,
        kind,
        radius: 13,
        bob: rng.range(0, Math.PI * 2),
        collected: false,
      });
    }
  }

  spawnThrownKnife(turkey, farmer, stage, rng, sound) {
    const startX = clamp(farmer.x, turkey.x - 420, turkey.x + 560);
    const fromRight = rng.next() < 0.7;
    const sx = fromRight ? Math.min(stage.def.length - 40, turkey.x + 540) : Math.max(40, turkey.x - 460);
    const sy = clamp(turkey.y + rng.range(-120, 120), ARENA_TOP + 34, ARENA_BOTTOM - 34);
    const angle = Math.atan2(turkey.y - sy, turkey.x - sx);
    const speed = 335 + stage.def.index * 32;
    this.thrownKnives.push({
      x: sx,
      y: sy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle,
      spin: 0,
      telegraph: 0.52,
      life: 3.1,
      radius: 16,
      grazed: false,
      playedWhoosh: false,
    });
    if (sound && distance(sx, sy, turkey.x, turkey.y) < 700) {
      sound.playKnifeWhoosh();
    }
  }

  update(dt, turkey, farmer, stage, perks, rng, sound, callbacks) {
    const grazeR = turkey.getGrazeRadius(perks);

    // Update Ovens.
    for (const oven of this.ovens) {
      oven.phase = (oven.phase + dt) % oven.cycleDuration;
      const t = oven.phase / oven.cycleDuration;
      const prevState = oven.state;

      if (t < 0.48) {
        oven.state = 'IDLE';
        oven.grazedThisCycle = false;
      } else if (t < 0.74) {
        oven.state = 'PREHEAT';
      } else {
        oven.state = 'BLAST';
        if (prevState !== 'BLAST' && distance(oven.x, oven.y, turkey.x, turkey.y) < 620) {
          sound?.playOvenBlast();
        }
      }

      if (oven.state === 'BLAST') {
        const minY = oven.dirY > 0 ? oven.y + 18 : oven.y - oven.blastRange;
        const maxY = oven.dirY > 0 ? oven.y + oven.blastRange : oven.y - 18;
        const inLaneX = Math.abs(turkey.x - oven.x) <= oven.blastHalfWidth + turkey.radius;
        const inLaneY = turkey.y >= minY - turkey.radius && turkey.y <= maxY + turkey.radius;
        if (inLaneX && inLaneY) {
          if (turkey.isInvulnerable()) {
            if (!oven.grazedThisCycle) {
              oven.grazedThisCycle = true;
              callbacks.onCloseCall?.('OVEN DODGE!', oven.x, turkey.y);
            }
          } else {
            callbacks.onTurkeyHit?.('Roast Oven Blast!');
          }
        } else if (!oven.grazedThisCycle) {
          const nearX = Math.abs(turkey.x - oven.x) <= oven.blastHalfWidth + grazeR;
          const nearY = turkey.y >= minY - grazeR && turkey.y <= maxY + grazeR;
          if (nearX && nearY) {
            oven.grazedThisCycle = true;
            callbacks.onCloseCall?.('CLOSE CALL!', turkey.x, turkey.y - 24);
          }
        }
      }
    }

    // Update Sweeping Carving Knives.
    for (const knife of this.sweepKnives) {
      knife.timer = (knife.timer + dt) % knife.period;
      const t = knife.timer / knife.period;
      const prev = knife.state;
      if (t < 0.42) {
        knife.state = 'WAIT';
        knife.grazedThisSlice = false;
      } else if (t < 0.72) {
        knife.state = 'TELEGRAPH';
      } else {
        knife.state = 'SLICE';
        if (prev !== 'SLICE' && distance(knife.x, knife.y, turkey.x, turkey.y) < 640) {
          sound?.playKnifeWhoosh();
        }
        const sliceT = (t - 0.72) / 0.28;
        knife.bladePos = knife.laneStart + (knife.laneEnd - knife.laneStart) * sliceT;
        knife.spin += dt * 18;

        const bx = knife.horizontal ? knife.bladePos : knife.x;
        const by = knife.horizontal ? knife.y : knife.bladePos;
        const d = distance(turkey.x, turkey.y, bx, by);
        if (d <= turkey.radius + 15) {
          if (turkey.isInvulnerable()) {
            if (!knife.grazedThisSlice) {
              knife.grazedThisSlice = true;
              callbacks.onCloseCall?.('BLADE DASH!', bx, by);
            }
          } else {
            callbacks.onTurkeyHit?.('Carving Knife!');
          }
        } else if (!knife.grazedThisSlice && d <= grazeR + 18) {
          knife.grazedThisSlice = true;
          callbacks.onCloseCall?.('CLOSE CALL!', turkey.x, turkey.y - 24);
        }
      }
    }

    // Thrown Chef Knives / Cleavers.
    this.throwTimer -= dt;
    if (this.throwTimer <= 0) {
      this.throwTimer = stage.def.thrownKnifeInterval;
      this.spawnThrownKnife(turkey, farmer, stage, rng, sound);
    }

    for (let i = this.thrownKnives.length - 1; i >= 0; i--) {
      const tk = this.thrownKnives[i];
      if (tk.telegraph > 0) {
        tk.telegraph -= dt;
        continue;
      }
      tk.x += tk.vx * dt;
      tk.y += tk.vy * dt;
      tk.spin += dt * 15;
      tk.life -= dt;

      const d = distance(turkey.x, turkey.y, tk.x, tk.y);
      if (d <= turkey.radius + tk.radius - 2) {
        if (turkey.isInvulnerable()) {
          if (!tk.grazed) {
            tk.grazed = true;
            callbacks.onCloseCall?.('CLOSE CALL!', tk.x, tk.y);
          }
        } else {
          callbacks.onTurkeyHit?.('Flying Cleaver!');
          this.thrownKnives.splice(i, 1);
          continue;
        }
      } else if (!tk.grazed && d <= grazeR + tk.radius) {
        tk.grazed = true;
        callbacks.onCloseCall?.('CLOSE CALL!', turkey.x, turkey.y - 24);
      }

      if (tk.life <= 0 || tk.y < ARENA_TOP - 40 || tk.y > ARENA_BOTTOM + 40) {
        this.thrownKnives.splice(i, 1);
      }
    }

    // Collectibles.
    for (const item of this.collectibles) {
      if (item.collected) continue;
      item.bob += dt * 4.5;
      if (distance(turkey.x, turkey.y, item.x, item.y) <= turkey.radius + item.radius + 4) {
        item.collected = true;
        if (item.kind === 'corn') {
          turkey.decoyCharges = Math.min(turkey.maxDecoys, turkey.decoyCharges + 1);
          callbacks.onPickup?.(item, SCORE_VALUES.corn);
        } else if (item.kind === 'cranberry') {
          callbacks.onPickup?.(item, SCORE_VALUES.cranberry);
        } else {
          if (turkey.lives < turkey.maxLives) turkey.lives += 1;
          callbacks.onPickup?.(item, SCORE_VALUES.featherHeal);
        }
        sound?.playPickup(item.kind !== 'corn');
      }
    }
  }
}
