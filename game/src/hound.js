import { ARENA_BOTTOM, ARENA_TOP } from './constants.js';
import { angleDiff, clamp, distance, normalizeAngle, resolveCircleRect } from './geometry.js';

export const HOUND_STATES = {
  ROAM: 'ROAM',
  SNIFFING: 'SNIFFING',
  BARKING: 'BARKING',
  DISTRACTED: 'DISTRACTED',
};

/** Secondary pursuer: Farmer Silas's scent-tracking hound that sniffs out hidden turkeys in cover. */
export class ScentHoundAI {
  constructor() {
    this.active = false;
    this.x = 900;
    this.y = 400;
    this.radius = 16;
    this.facing = Math.PI;
    this.state = HOUND_STATES.ROAM;
    this.scentMeter = 0;
    this.barkCooldown = 0;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.runPhase = 0;
    this.patrolDir = -1;
  }

  configureForStage(stageDef, rng) {
    // Active from Stage 2 onward (and in showcase scenarios).
    this.active = stageDef.index >= 1;
    this.state = HOUND_STATES.ROAM;
    this.scentMeter = 0;
    this.barkCooldown = 1.5;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.x = stageDef.length * 0.58 + rng.range(-60, 60);
    this.y = rng.range(ARENA_TOP + 90, ARENA_BOTTOM - 90);
    this.facing = Math.PI;
    this.patrolDir = -1;
  }

  setCallout(text, duration = 1.2) {
    this.calloutText = text;
    this.calloutTimer = duration;
  }

  update(dt, turkey, farmer, stage, decoys, sound) {
    if (!this.active) return;
    if (this.calloutTimer > 0) this.calloutTimer = Math.max(0, this.calloutTimer - dt);
    if (this.barkCooldown > 0) this.barkCooldown = Math.max(0, this.barkCooldown - dt);

    // Decoys strongly distract the hound!
    let decoy = null;
    for (const d of decoys) {
      if (d.active && distance(this.x, this.y, d.destX, d.destY) < 420) {
        decoy = d;
        break;
      }
    }

    const distToTurkey = distance(this.x, this.y, turkey.x, turkey.y);
    let targetX = this.x;
    let targetY = this.y;
    let speed = (stage.def.farmerSpeed * 0.92) * (stage.speedMult ?? 1);

    if (decoy) {
      this.state = HOUND_STATES.DISTRACTED;
      targetX = decoy.destX;
      targetY = decoy.destY;
      speed *= 1.05;
      if (this.calloutTimer <= 0) this.setCallout('SNIFF CORN!', 1.0);
    } else if (distToTurkey < 280) {
      this.state = HOUND_STATES.SNIFFING;
      this.scentMeter = Math.min(100, this.scentMeter + (turkey.hiddenIn ? 48 : 75) * dt);
      targetX = turkey.x;
      targetY = turkey.y;
      speed *= 1.08;

      if (this.scentMeter >= 85 && this.barkCooldown <= 0) {
        this.state = HOUND_STATES.BARKING;
        this.barkCooldown = 4.2;
        this.setCallout('WOOF! FOUND!', 1.3);
        sound?.playAlert(true);
        // Alert the Farmer toward the turkey's position!
        farmer.lastSeenPos = { x: turkey.x, y: turkey.y };
        farmer.suspicion = Math.max(farmer.suspicion, 78);
      }
    } else {
      this.state = HOUND_STATES.ROAM;
      this.scentMeter = Math.max(0, this.scentMeter - 30 * dt);
      targetX = this.x + this.patrolDir * 140;
      targetY = this.y + Math.sin(this.runPhase * 0.4) * 55;
      if (this.x < 340) this.patrolDir = 1;
      if (this.x > stage.def.length - 260) this.patrolDir = -1;
      speed *= 0.72;
    }

    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 8) {
      const desired = Math.atan2(dy, dx);
      this.facing = normalizeAngle(this.facing + angleDiff(this.facing, desired) * Math.min(1, dt * 9));
      this.x += (dx / d) * speed * dt;
      this.y += (dy / d) * speed * dt;
      this.runPhase += dt * (speed * 0.08);
    }

    this.x = clamp(this.x, this.radius + 16, stage.def.length - this.radius - 16);
    this.y = clamp(this.y, ARENA_TOP + this.radius + 8, ARENA_BOTTOM - this.radius - 8);
    for (const rect of stage.obstacles) {
      resolveCircleRect(this, this.radius, rect);
    }
  }
}
