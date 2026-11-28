import { ARENA_BOTTOM, ARENA_TOP } from './constants.js';
import { distance } from './geometry.js';

/** Interactive environmental traps: Flour Sacks that burst into blinding dust clouds when dashed past. */
export class GadgetManager {
  constructor() {
    this.sacks = [];
    this.clouds = [];
  }

  populateForStage(stage, ovens, rng) {
    this.sacks = [];
    this.clouds = [];
    const count = 2 + Math.min(3, stage.def.index);
    for (let i = 0; i < count; i++) {
      let sx = 410 + ((stage.def.length - 740) * (i + 0.5)) / count + rng.range(-25, 25);
      let sy = i % 2 === 0 ? ARENA_TOP + 155 : ARENA_BOTTOM - 145;

      // Never spawn a flour sack inside an oven blast corridor or obstacle!
      for (const oven of ovens ?? []) {
        if (Math.abs(sx - oven.x) < oven.blastHalfWidth + 46) {
          sx += oven.x <= sx ? 92 : -92;
        }
      }
      for (const rect of stage.obstacles) {
        if (sx >= rect.x - 28 && sx <= rect.x + rect.w + 28 && sy >= rect.y - 28 && sy <= rect.y + rect.h + 28) {
          sy = sy < (ARENA_TOP + ARENA_BOTTOM) * 0.5 ? ARENA_TOP + 125 : ARENA_BOTTOM - 125;
        }
      }

      this.sacks.push({
        id: i,
        x: sx,
        y: sy,
        radius: 22,
        triggered: false,
      });
    }
  }

  update(dt, turkey, farmer, hound, sound, onStun) {
    for (const sack of this.sacks) {
      if (sack.triggered) continue;
      if (turkey.dashTimer > 0 && distance(turkey.x, turkey.y, sack.x, sack.y) <= turkey.radius + sack.radius + 16) {
        sack.triggered = true;
        this.clouds.push({
          x: sack.x,
          y: sack.y,
          radius: 108,
          life: 3.4,
          maxLife: 3.4,
        });
        sound?.playDash();
      }
    }

    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i];
      c.life -= dt;
      if (distance(farmer.x, farmer.y, c.x, c.y) <= c.radius && farmer.stunTimer <= 0) {
        farmer.stun(2.3);
        onStun?.(c.x, c.y);
      }
      if (hound?.active && distance(hound.x, hound.y, c.x, c.y) <= c.radius) {
        hound.scentMeter = 0;
        if (hound.calloutTimer <= 0) hound.setCallout('ACHOO!', 1.1);
      }
      if (c.life <= 0) this.clouds.splice(i, 1);
    }
  }
}
