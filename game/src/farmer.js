import { ARENA_BOTTOM, ARENA_TOP, FARMER_STATES } from './constants.js';
import { angleDiff, clamp, distance, hasLineOfSight, normalizeAngle, resolveCircleRect } from './geometry.js';

/** Multi-state Farmer AI with vision cone, suspicion buildup, search sweeps, and cornering lunges. */
export class FarmerAI {
  constructor() {
    this.x = 650;
    this.y = 360;
    this.radius = 24;
    this.facing = Math.PI;
    this.state = FARMER_STATES.PATROL;
    this.suspicion = 0; // 0..100
    this.stateTimer = 0;
    this.searchAngle = Math.PI;
    this.lastSeenPos = null;
    this.waypoints = [];
    this.waypointIndex = 0;
    this.lungeCooldown = 0;
    this.lungeWindup = 0;
    this.lungeTimer = 0;
    this.lungeDirX = -1;
    this.lungeDirY = 0;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.walkPhase = 0;
    this.activeDecoy = null;
    this.stunTimer = 0;
    this.isChef = false;
  }

  configureForStage(stageDef, turkeyStartX, rng) {
    this.state = FARMER_STATES.PATROL;
    this.suspicion = 0;
    this.stateTimer = 0;
    this.lastSeenPos = null;
    this.activeDecoy = null;
    this.lungeCooldown = 1.8;
    this.lungeWindup = 0;
    this.lungeTimer = 0;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.stunTimer = 0;
    this.isChef = stageDef.index >= 3;

    const midY = (ARENA_TOP + ARENA_BOTTOM) * 0.5;
    this.waypoints = [
      { x: Math.max(turkeyStartX + 460, stageDef.length * 0.28), y: ARENA_TOP + 110 },
      { x: stageDef.length * 0.48, y: ARENA_BOTTOM - 110 },
      { x: stageDef.length * 0.68, y: midY - 60 },
      { x: stageDef.length * 0.85, y: ARENA_BOTTOM - 120 },
      { x: stageDef.length * 0.62, y: ARENA_TOP + 100 },
    ];
    this.waypointIndex = 0;
    this.x = this.waypoints[0].x + rng.range(-25, 25);
    this.y = this.waypoints[0].y;
    this.facing = Math.PI;
  }

  setCallout(text, duration = 1.4) {
    this.calloutText = text;
    this.calloutTimer = duration;
  }

  stun(duration = 2.2) {
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.lungeWindup = 0;
    this.lungeTimer = 0;
    this.suspicion = Math.min(this.suspicion, 35);
    this.setCallout('ACHOO! BLINDED!', duration);
  }

  canSeeTurkey(turkey, stage, perks) {
    if (turkey.hiddenIn && (turkey.crouching || perks.has('haystack_ghost'))) {
      return { visible: false, dist: distance(this.x, this.y, turkey.x, turkey.y) };
    }
    const dist = distance(this.x, this.y, turkey.x, turkey.y);
    const effectiveRange = turkey.hiddenIn ? stage.def.farmerVisionRange * 0.42 : stage.def.farmerVisionRange;
    if (dist > effectiveRange) return { visible: false, dist };

    const angleToTurkey = Math.atan2(turkey.y - this.y, turkey.x - this.x);
    const halfCone = stage.def.farmerVisionAngle * 0.5;
    if (Math.abs(angleDiff(this.facing, angleToTurkey)) > halfCone && dist > 64) {
      return { visible: false, dist };
    }
    const los = hasLineOfSight(this.x, this.y, turkey.x, turkey.y, stage.obstacles);
    return { visible: los, dist };
  }

  isTurkeyCornered(turkey, stage) {
    const nearWall =
      turkey.x < 95 ||
      turkey.x > stage.def.length - 120 ||
      turkey.y < ARENA_TOP + 68 ||
      turkey.y > ARENA_BOTTOM - 68;
    const dist = distance(this.x, this.y, turkey.x, turkey.y);
    return nearWall && dist < 240;
  }

  update(dt, turkey, stage, decoys, perks, sound, onScoreDecoyLure) {
    if (this.calloutTimer > 0) this.calloutTimer = Math.max(0, this.calloutTimer - dt);
    if (this.lungeCooldown > 0) this.lungeCooldown = Math.max(0, this.lungeCooldown - dt);
    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      return;
    }

    // Check active decoys nearby.
    let heardDecoy = null;
    for (const d of decoys) {
      if (!d.active) continue;
      if (distance(this.x, this.y, d.destX, d.destY) < 460) {
        heardDecoy = d;
        break;
      }
    }

    const sight = this.canSeeTurkey(turkey, stage, perks);
    const dashNoise = turkey.dashTimer > 0 && sight.dist < 270;

    if (sight.visible || dashNoise) {
      this.lastSeenPos = { x: turkey.x, y: turkey.y };
      const distFactor = 1.4 - clamp(sight.dist / stage.def.farmerVisionRange, 0, 1) * 0.7;
      const gain = (turkey.hiddenIn ? 48 : 115) * distFactor;
      const prevState = this.state;
      this.suspicion = Math.min(100, this.suspicion + gain * dt);

      if (this.suspicion >= 100) {
        if (this.isTurkeyCornered(turkey, stage)) {
          this.state = FARMER_STATES.CORNERING;
          if (prevState !== FARMER_STATES.CORNERING) this.setCallout('CORNERED!', 1.2);
        } else {
          this.state = FARMER_STATES.CHASING;
          if (prevState !== FARMER_STATES.CHASING && prevState !== FARMER_STATES.CORNERING) {
            this.setCallout('! DINNER TIME !', 1.3);
            sound?.playAlert(false);
          }
        }
      } else if (this.suspicion >= 22 && this.state === FARMER_STATES.PATROL) {
        this.state = FARMER_STATES.SUSPICIOUS;
        this.setCallout('? WHO GOES ?', 1.1);
        sound?.playAlert(true);
      }
    } else {
      const decayRate = turkey.hiddenIn && perks.has('haystack_ghost') ? 48 : turkey.hiddenIn ? 26 : 16;
      this.suspicion = Math.max(0, this.suspicion - decayRate * dt);
      if (
        (this.state === FARMER_STATES.CHASING || this.state === FARMER_STATES.CORNERING) &&
        this.suspicion < 45
      ) {
        this.state = FARMER_STATES.SEARCHING;
        this.stateTimer = 3.4;
        this.searchAngle = this.facing;
        this.setCallout('? WHERE DID IT GO ?', 1.3);
      } else if (this.state === FARMER_STATES.SUSPICIOUS && this.suspicion <= 5) {
        this.state = FARMER_STATES.PATROL;
      }
    }

    // Decoy overrides patrol/suspicious/searching, or briefly pulls chase if decoy is closer/fresh.
    if (heardDecoy && this.state !== FARMER_STATES.CORNERING && sight.dist > 145) {
      if (!heardDecoy.lured) {
        heardDecoy.lured = true;
        onScoreDecoyLure?.(heardDecoy);
      }
      this.activeDecoy = heardDecoy;
      this.lastSeenPos = { x: heardDecoy.destX, y: heardDecoy.destY };
      if (this.state === FARMER_STATES.CHASING) {
        this.state = FARMER_STATES.SEARCHING;
        this.stateTimer = 2.6;
        this.suspicion = Math.min(this.suspicion, 35);
      } else if (this.state === FARMER_STATES.PATROL) {
        this.state = FARMER_STATES.SUSPICIOUS;
        this.setCallout('? CORN ?', 1.0);
      }
    } else if (this.activeDecoy && !this.activeDecoy.active) {
      this.activeDecoy = null;
    }

    let targetX = this.x;
    let targetY = this.y;
    let speed = stage.def.farmerSpeed * (stage.speedMult ?? 1);

    // Lunge execution during CHASING or CORNERING.
    if (this.lungeWindup > 0) {
      this.lungeWindup -= dt;
      this.facing = Math.atan2(turkey.y - this.y, turkey.x - this.x);
      if (this.lungeWindup <= 0) {
        this.lungeTimer = 0.28;
        this.lungeDirX = Math.cos(this.facing);
        this.lungeDirY = Math.sin(this.facing);
        this.lungeCooldown = 2.8;
        sound?.playKnifeWhoosh();
      }
      return;
    }

    if (this.lungeTimer > 0) {
      this.lungeTimer -= dt;
      const lungeSpeed = speed * 2.15;
      this.x += this.lungeDirX * lungeSpeed * dt;
      this.y += this.lungeDirY * lungeSpeed * dt;
      this._clampAndResolve(stage);
      this.walkPhase += dt * 16;
      return;
    }

    if (this.state === FARMER_STATES.CHASING || this.state === FARMER_STATES.CORNERING) {
      targetX = turkey.x;
      targetY = turkey.y;
      speed *= this.state === FARMER_STATES.CORNERING ? 1.24 : 1.16;

      // Trigger lunge if close enough and off cooldown.
      if (sight.visible && sight.dist < 165 && sight.dist > 55 && this.lungeCooldown <= 0) {
        this.lungeWindup = 0.36;
        this.setCallout('GRAB!', 0.7);
        return;
      }
    } else if (this.state === FARMER_STATES.SUSPICIOUS && this.lastSeenPos) {
      targetX = this.lastSeenPos.x;
      targetY = this.lastSeenPos.y;
      speed *= 0.9;
    } else if (this.state === FARMER_STATES.SEARCHING) {
      this.stateTimer -= dt;
      // If a cover is close to lastSeenPos, inspect that cover directly.
      let searchTarget = this.lastSeenPos;
      if (this.lastSeenPos && this.stateTimer < 2.2) {
        let nearestCover = null;
        let bestDist = 135;
        for (const c of stage.covers) {
          const cd = distance(this.lastSeenPos.x, this.lastSeenPos.y, c.x, c.y);
          if (cd < bestDist) {
            bestDist = cd;
            nearestCover = c;
          }
        }
        if (nearestCover) {
          searchTarget = { x: nearestCover.x, y: nearestCover.y };
          if (distance(this.x, this.y, nearestCover.x, nearestCover.y) < 52) {
            nearestCover.rustle = Math.max(nearestCover.rustle, 0.7);
            if (this.calloutTimer <= 0) this.setCallout('CHECKING COVER!', 0.9);
          }
        }
      }
      if (searchTarget && distance(this.x, this.y, searchTarget.x, searchTarget.y) > 26) {
        targetX = searchTarget.x;
        targetY = searchTarget.y;
        speed *= 0.94;
      } else {
        speed = 0;
        this.facing = normalizeAngle(this.searchAngle + Math.sin(this.stateTimer * 3.8) * 1.25);
      }
      if (this.stateTimer <= 0) {
        this.state = FARMER_STATES.PATROL;
        this.lastSeenPos = null;
      }
    } else {
      // PATROL: keep farmer reasonably paced near player's forward progression as well.
      const wp = this.waypoints[this.waypointIndex];
      targetX = wp.x;
      targetY = wp.y;
      if (distance(this.x, this.y, wp.x, wp.y) < 34) {
        this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
      }
      speed *= 0.78;
    }

    if (speed > 0) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 4) {
        const desiredAngle = Math.atan2(dy, dx);
        this.facing = normalizeAngle(this.facing + angleDiff(this.facing, desiredAngle) * Math.min(1, dt * 8));
        this.x += (dx / d) * speed * dt;
        this.y += (dy / d) * speed * dt;
        this.walkPhase += dt * (speed * 0.055);
      }
    }

    this._clampAndResolve(stage);
  }

  _clampAndResolve(stage) {
    this.x = clamp(this.x, this.radius + 14, stage.def.length - this.radius - 14);
    this.y = clamp(this.y, ARENA_TOP + this.radius + 6, ARENA_BOTTOM - this.radius - 6);
    for (const rect of stage.obstacles) {
      resolveCircleRect(this, this.radius, rect);
    }
  }
}
