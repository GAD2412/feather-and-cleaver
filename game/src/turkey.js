import { ARENA_BOTTOM, ARENA_TOP, TURKEY_DEFAULTS } from './constants.js';
import { clamp, distSq, resolveCircleRect } from './geometry.js';

/** Player-controlled turkey with movement, flap-dash i-frames, cover hiding, and decoy tosses. */
export class Turkey {
  constructor() {
    this.reset(120, (ARENA_TOP + ARENA_BOTTOM) * 0.5);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 0;
    this.radius = TURKEY_DEFAULTS.radius;
    this.lives = TURKEY_DEFAULTS.maxLives;
    this.maxLives = TURKEY_DEFAULTS.maxLives;
    this.maxDashes = TURKEY_DEFAULTS.maxDashes;
    this.dashCharges = TURKEY_DEFAULTS.maxDashes;
    this.dashRecharge = 0;
    this.dashTimer = 0;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.maxDecoys = TURKEY_DEFAULTS.maxDecoys;
    this.decoyCharges = TURKEY_DEFAULTS.maxDecoys;
    this.decoyRecharge = 0;
    this.invulnTimer = 0;
    this.speedBoostTimer = 0;
    this.hiddenIn = null;
    this.crouching = false;
    this.animPhase = 0;
    this.squash = 1;
    this.hitFlash = 0;
  }

  placeForStage(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 0;
    this.dashTimer = 0;
    this.hiddenIn = null;
    this.crouching = false;
    this.invulnTimer = 0.6;
    this.dashCharges = this.maxDashes;
    this.decoyCharges = this.maxDecoys;
  }

  getGrazeRadius(perks) {
    return perks.has('narrow_escape_sense') ? TURKEY_DEFAULTS.grazeRadius + 16 : TURKEY_DEFAULTS.grazeRadius;
  }

  isInvulnerable() {
    return this.dashTimer > 0 || this.invulnTimer > 0;
  }

  tryDash(aimDirX, aimDirY, perks, sound, emitParticles) {
    if (this.dashTimer > 0 || this.dashCharges <= 0) return false;
    this.dashCharges -= 1;
    this.dashTimer = TURKEY_DEFAULTS.dashDuration * (perks.has('greased_feathers') ? 1.22 : 1);
    const len = Math.hypot(aimDirX, aimDirY) || 1;
    this.dashDirX = aimDirX / len;
    this.dashDirY = aimDirY / len;
    this.facing = Math.atan2(this.dashDirY, this.dashDirX);
    this.squash = 1.32;
    this.hiddenIn = null;
    sound?.playDash();
    emitParticles?.(this.x, this.y, 10, 'feather');
    return true;
  }

  tryDecoy(targetX, targetY, decoys, perks, sound) {
    if (this.decoyCharges <= 0) return false;
    this.decoyCharges -= 1;
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.min(260, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    const destX = this.x + Math.cos(angle) * dist;
    const destY = clamp(this.y + Math.sin(angle) * dist, ARENA_TOP + 22, ARENA_BOTTOM - 22);
    const duration = perks.has('corn_bait_master') ? 6.2 : 4.2;
    decoys.push({
      x: this.x,
      y: this.y,
      startX: this.x,
      startY: this.y,
      destX,
      destY,
      flight: 0,
      flightDuration: 0.24,
      active: false,
      timer: duration,
      maxTimer: duration,
      pulse: 0,
      lured: false,
    });
    this.squash = 1.18;
    sound?.playDecoy();
    return true;
  }

  takeDamage(perks, sound, emitParticles) {
    if (this.isInvulnerable()) return false;
    this.lives = Math.max(0, this.lives - 1);
    this.invulnTimer = TURKEY_DEFAULTS.invulnDuration;
    this.hitFlash = 0.4;
    this.squash = 0.68;
    this.hiddenIn = null;
    sound?.playHit();
    emitParticles?.(this.x, this.y, 16, 'feather');
    return true;
  }

  update(dt, input, cameraX, stage, perks, sound, emitParticles) {
    if (this.invulnTimer > 0) this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    if (this.hitFlash > 0) this.hitFlash = Math.max(0, this.hitFlash - dt);
    if (this.speedBoostTimer > 0) this.speedBoostTimer = Math.max(0, this.speedBoostTimer - dt);
    this.squash += (1 - this.squash) * Math.min(1, dt * 12);

    const dashCooldown = TURKEY_DEFAULTS.dashCooldown * (perks.has('greased_feathers') ? 0.75 : 1);
    if (this.dashCharges < this.maxDashes) {
      this.dashRecharge += dt;
      if (this.dashRecharge >= dashCooldown) {
        this.dashRecharge = 0;
        this.dashCharges += 1;
      }
    } else {
      this.dashRecharge = 0;
    }

    const decoyCooldown = TURKEY_DEFAULTS.decoyCooldown;
    if (this.decoyCharges < this.maxDecoys) {
      this.decoyRecharge += dt;
      if (this.decoyRecharge >= decoyCooldown) {
        this.decoyRecharge = 0;
        this.decoyCharges += 1;
      }
    } else {
      this.decoyRecharge = 0;
    }

    const move = input.getMoveVector();
    this.crouching = input.isDown('KeyC') || input.isDown('ControlLeft');

    // Check grease slick speedup.
    let onGrease = false;
    for (const puddle of stage.greases ?? []) {
      if (distSq(this.x, this.y, puddle.x, puddle.y) <= puddle.radius * puddle.radius) {
        onGrease = true;
        break;
      }
    }

    if (this.dashTimer > 0) {
      this.dashTimer = Math.max(0, this.dashTimer - dt);
      const speed = TURKEY_DEFAULTS.dashSpeed * (perks.has('greased_feathers') ? 1.15 : 1);
      this.vx = this.dashDirX * speed;
      this.vy = this.dashDirY * speed;
      if (Math.random() < 0.45) emitParticles?.(this.x, this.y, 1, 'feather');
    } else {
      let baseSpeed = TURKEY_DEFAULTS.baseSpeed * (perks.has('cranberry_rush') ? 1.18 : 1);
      if (this.speedBoostTimer > 0) baseSpeed *= 1.24;
      if (onGrease) baseSpeed *= 1.25;
      if (this.crouching) baseSpeed *= TURKEY_DEFAULTS.hideSpeedFactor;

      const targetVx = move.dx * baseSpeed;
      const targetVy = move.dy * baseSpeed;
      const accel = onGrease ? 4.5 : 14;
      const blend = Math.min(1, dt * accel);
      this.vx += (targetVx - this.vx) * blend;
      this.vy += (targetVy - this.vy) * blend;

      if (Math.hypot(move.dx, move.dy) > 0.1) {
        this.facing = Math.atan2(move.dy, move.dx);
      } else {
        const worldMouseX = input.mouse.x + cameraX;
        const worldMouseY = input.mouse.y;
        this.facing = Math.atan2(worldMouseY - this.y, worldMouseX - this.x);
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.x = clamp(this.x, this.radius + 14, stage.def.length - this.radius - 14);
    this.y = clamp(this.y, ARENA_TOP + this.radius + 6, ARENA_BOTTOM - this.radius - 6);

    for (const rect of stage.obstacles) {
      resolveCircleRect(this, this.radius, rect);
    }

    // Cover hiding detection.
    this.hiddenIn = null;
    for (const cover of stage.covers) {
      if (distSq(this.x, this.y, cover.x, cover.y) <= (cover.radius + 4) * (cover.radius + 4)) {
        this.hiddenIn = cover;
        cover.rustle = Math.max(cover.rustle, Math.hypot(this.vx, this.vy) > 30 ? 0.6 : 0.15);
        break;
      }
    }

    const movingSpeed = Math.hypot(this.vx, this.vy);
    this.animPhase += dt * (movingSpeed > 20 ? 11 + movingSpeed * 0.025 : 3);
    return movingSpeed;
  }
}
