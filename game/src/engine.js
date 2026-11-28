import {
  ARENA_BOTTOM,
  ARENA_TOP,
  DIFFICULTY_MODES,
  FARMER_STATES,
  GAME_STATES,
  SCORE_VALUES,
  TURKEY_DEFAULTS,
  VIEW_WIDTH,
} from './constants.js';
import { FarmerAI } from './farmer.js';
import { evaluateRunFeats } from './feats.js';
import { GadgetManager } from './gadgets.js';
import { clamp, distance } from './geometry.js';
import { HazardManager } from './hazards.js';
import { HOUND_STATES, ScentHoundAI } from './hound.js';
import { PerkSystem } from './perks.js';
import { SeededRng } from './rng.js';
import { buildStageLayout, STAGE_DEFS } from './stages.js';
import { Turkey } from './turkey.js';

/** Core game state machine, collision orchestration, close-call streaks, and run metrics. */
export class GameEngine {
  constructor(sound) {
    this.sound = sound;
    this.rng = new SeededRng(20261127);
    this.turkey = new Turkey();
    this.farmer = new FarmerAI();
    this.hound = new ScentHoundAI();
    this.hazards = new HazardManager();
    this.gadgets = new GadgetManager();
    this.perks = new PerkSystem();

    this.state = GAME_STATES.TITLE;
    this.difficulty = DIFFICULTY_MODES.classic;
    this.stageIndex = 0;
    this.stage = null;
    this.cameraX = 0;

    this.score = 0;
    this.bestScore = 0;
    this.totalDistance = 0;
    this.stageStartDist = 0;
    this.closeCalls = 0;
    this.hazardsDodged = 0;
    this.decoysLured = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runTime = 0;
    this.caughtReason = '';
    this.turkeyQuip = '';
    this.turkeyQuipTimer = 0;

    this.decoys = [];
    this.particles = [];
    this.popups = [];
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.hitStopTimer = 0;

    this.uiButtons = [];
    this.hoveredButtonId = null;

    this.setupStage(0, true);
  }

  startNewRun(seed = 20261127) {
    this.rng = new SeededRng(seed);
    this.perks.reset();
    this.turkey.reset(120, (ARENA_TOP + ARENA_BOTTOM) * 0.5);
    this.score = 0;
    this.totalDistance = 0;
    this.stageStartDist = 0;
    this.closeCalls = 0;
    this.hazardsDodged = 0;
    this.decoysLured = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.runTime = 0;
    this.caughtReason = '';
    this.particles = [];
    this.popups = [];
    this.setupStage(0, false);
    this.state = GAME_STATES.PLAYING;
    this.sound?.playGobble();
  }

  setDifficulty(id) {
    this.difficulty = DIFFICULTY_MODES[id] ?? DIFFICULTY_MODES.classic;
  }

  setTurkeyQuip(text, duration = 1.0) {
    this.turkeyQuip = text;
    this.turkeyQuipTimer = duration;
  }

  setupStage(index, titlePreview = false) {
    this.stageIndex = index;
    this.stage = buildStageLayout(index, this.rng);
    this.stage.speedMult = this.difficulty.speedMult;
    this.turkey.placeForStage(110, (ARENA_TOP + ARENA_BOTTOM) * 0.5);
    this.farmer.configureForStage(this.stage.def, this.turkey.x, this.rng);
    this.hound.configureForStage(this.stage.def, this.rng);
    this.hazards.populateForStage(this.stage, this.rng);
    this.gadgets.populateForStage(this.stage, this.hazards.ovens, this.rng);
    this.decoys = [];
    this.cameraX = 0;
    this.turkeyQuip = '';
    this.turkeyQuipTimer = 0;
    if (titlePreview) {
      this.popups = [];
    } else {
      this.addPopup(`STAGE ${index + 1}: ${this.stage.def.name.toUpperCase()}`, this.turkey.x + 120, this.turkey.y - 50, '#FBBF24', 1.9);
      this.setTurkeyQuip('GOBBLE!', 0.9);
    }
  }

  emitParticles(x, y, count, kind = 'feather') {
    const colors =
      kind === 'ember'
        ? ['#F97316', '#EF4444', '#FDE047']
        : kind === 'corn'
          ? ['#FACC15', '#FEF08A', '#F59E0B']
          : ['#FFF4DF', '#D97706', '#92400E', '#DC2626'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 45 + Math.random() * 145;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 20,
        size: 3 + Math.random() * 5,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.9,
        rot: Math.random() * Math.PI * 2,
        rotVel: (Math.random() - 0.5) * 9,
        color: colors[i % colors.length],
        kind,
      });
    }
  }

  addPopup(text, x, y, color = '#FFF4DF', duration = 1.1) {
    let py = y;
    for (const existing of this.popups) {
      if (Math.abs(existing.x - x) < 120 && Math.abs(existing.y - py) < 28) {
        py -= 30;
      }
    }
    this.popups.push({ text, x, y: py, vy: -34, color, life: duration, maxLife: duration });
  }

  triggerShake(intensity, duration = 0.22) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeTimer = Math.max(this.shakeTimer, duration);
  }

  applyPerkChoice(index) {
    const chosen = this.perks.choose(index);
    if (!chosen) return;
    if (chosen.id === 'iron_gizzard') {
      this.turkey.maxLives += 1;
      this.turkey.lives = Math.min(this.turkey.maxLives, this.turkey.lives + 1);
    } else if (chosen.id === 'double_flap') {
      this.turkey.maxDashes += 1;
      this.turkey.dashCharges = this.turkey.maxDashes;
    } else if (chosen.id === 'corn_bait_master') {
      this.turkey.maxDecoys += 1;
      this.turkey.decoyCharges = this.turkey.maxDecoys;
    }
    this.sound?.playStageClear();
    this.stageStartDist = this.totalDistance;
    this.setupStage(this.stageIndex + 1, false);
    this.state = GAME_STATES.PLAYING;
  }

  handleUiClick(mx, my) {
    for (const btn of this.uiButtons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        btn.onClick();
        return true;
      }
    }
    return false;
  }

  updateHover(mx, my) {
    this.hoveredButtonId = null;
    for (const btn of this.uiButtons) {
      if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
        this.hoveredButtonId = btn.id;
        break;
      }
    }
  }

  update(dt, input) {
    this.updateHover(input.mouse.x, input.mouse.y);

    if (input.wasPressed('KeyM')) {
      this.sound?.toggleMute();
    }

    if (this.state === GAME_STATES.TITLE) {
      if (input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.startNewRun();
      } else if (input.mouse.leftClicked) {
        if (!this.handleUiClick(input.mouse.x, input.mouse.y)) {
          this.startNewRun();
        }
      }
      return;
    }

    if (this.state === GAME_STATES.CAUGHT || this.state === GAME_STATES.ESCAPED) {
      if (input.wasPressed('KeyR') || input.wasPressed('Enter') || input.wasPressed('Space')) {
        this.startNewRun();
      } else if (input.mouse.leftClicked) {
        this.handleUiClick(input.mouse.x, input.mouse.y);
      }
      this._updateEffects(dt);
      return;
    }

    if (this.state === GAME_STATES.PERK_SELECT) {
      if (input.wasPressed('Digit1')) this.applyPerkChoice(0);
      else if (input.wasPressed('Digit2')) this.applyPerkChoice(1);
      else if (input.wasPressed('Digit3')) this.applyPerkChoice(2);
      else if (input.mouse.leftClicked) this.handleUiClick(input.mouse.x, input.mouse.y);
      this._updateEffects(dt);
      return;
    }

    if (input.wasPressed('KeyP') || input.wasPressed('Escape')) {
      this.state = this.state === GAME_STATES.PAUSED ? GAME_STATES.PLAYING : GAME_STATES.PAUSED;
      return;
    }

    if (this.state === GAME_STATES.PAUSED) {
      if (input.wasPressed('KeyR')) {
        this.startNewRun();
      } else if (input.mouse.leftClicked) {
        this.handleUiClick(input.mouse.x, input.mouse.y);
      }
      return;
    }

    // Active PLAYING state.
    if (input.mouse.leftClicked && this.handleUiClick(input.mouse.x, input.mouse.y)) {
      return;
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
      this._updateEffects(dt);
      return;
    }

    this.runTime += dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    const worldMouseX = input.mouse.x + this.cameraX;
    const worldMouseY = input.mouse.y;

    // Keyboard or Mouse Dash.
    let dashed = false;
    if (input.wasPressed('Space') || input.wasPressed('ShiftLeft') || input.wasPressed('ShiftRight')) {
      const mv = input.getMoveVector();
      const dirX = Math.abs(mv.dx) + Math.abs(mv.dy) > 0.1 ? mv.dx : worldMouseX - this.turkey.x;
      const dirY = Math.abs(mv.dx) + Math.abs(mv.dy) > 0.1 ? mv.dy : worldMouseY - this.turkey.y;
      dashed = this.turkey.tryDash(dirX, dirY, this.perks, this.sound, (x, y, n, k) => this.emitParticles(x, y, n, k));
    } else if (input.mouse.leftClicked) {
      dashed = this.turkey.tryDash(
        worldMouseX - this.turkey.x,
        worldMouseY - this.turkey.y,
        this.perks,
        this.sound,
        (x, y, n, k) => this.emitParticles(x, y, n, k),
      );
    }
    if (dashed && this.perks.has('gravy_slick_trap')) {
      this.hazards.greases.push({ x: this.turkey.x, y: this.turkey.y, radius: 34 });
    }

    // Decoy throw via E or Right-Click.
    if (input.wasPressed('KeyE') || input.mouse.rightClicked) {
      this.turkey.tryDecoy(worldMouseX, worldMouseY, this.decoys, this.perks, this.sound);
    }

    // Update decoys.
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      if (!d.active) {
        d.flight += dt;
        const p = Math.min(1, d.flight / d.flightDuration);
        d.x = d.startX + (d.destX - d.startX) * p;
        d.y = d.startY + (d.destY - d.startY) * p;
        if (p >= 1) {
          d.active = true;
          this.emitParticles(d.x, d.y, 8, 'corn');
        }
      } else {
        d.timer -= dt;
        d.pulse += dt * 6;
        if (d.timer <= 0) this.decoys.splice(i, 1);
      }
    }

    // Update covers rustle decay.
    for (const c of this.stage.covers) {
      c.rustle = Math.max(0, c.rustle - dt * 1.6);
    }

    const movingSpeed = this.turkey.update(
      dt,
      input,
      this.cameraX,
      this.stage,
      this.perks,
      this.sound,
      (x, y, n, k) => this.emitParticles(x, y, n, k),
    );

    const stageProgressMeters = Math.max(0, Math.round((this.turkey.x - 110) * 0.12));
    this.totalDistance = Math.max(this.totalDistance, this.stageStartDist + stageProgressMeters);

    this.farmer.update(dt, this.turkey, this.stage, this.decoys, this.perks, this.sound, (decoy) => {
      this.decoysLured += 1;
      this.score += SCORE_VALUES.decoyLure;
      this.addPopup(`DECOYED! +${SCORE_VALUES.decoyLure}`, decoy.destX, decoy.destY - 22, '#FACC15', 1.1);
    });
    if (!this.perks.has('scarecrow_cloak') || !this.turkey.hiddenIn || movingSpeed > 18) {
      this.hound.update(dt, this.turkey, this.farmer, this.stage, this.decoys, this.sound);
    }

    // Hound nip contact check.
    if (this.hound.active) {
      const houndDist = distance(this.turkey.x, this.turkey.y, this.hound.x, this.hound.y);
      if (houndDist <= this.turkey.radius + this.hound.radius - 3 && !this.turkey.isInvulnerable()) {
        this._handleTurkeyHit('Nipped by Hound Biscuit!');
      }
    }

    const dangerRatio = this.farmer.suspicion / 100;
    this.sound?.tickFootstep(dt, movingSpeed > 35 && !this.turkey.hiddenIn, dangerRatio);

    // Farmer contact check.
    const farmerDist = distance(this.turkey.x, this.turkey.y, this.farmer.x, this.farmer.y);
    if (farmerDist <= this.turkey.radius + this.farmer.radius - 4) {
      if (this.turkey.isInvulnerable()) {
        if (this.turkey.dashTimer > 0 && this.comboTimer < 1.2) {
          this._awardCloseCall('SLIPPED PAST!', this.turkey.x, this.turkey.y - 28);
        }
      } else {
        this._handleTurkeyHit('Grabbed by the Farmer!');
      }
    } else if (
      (this.farmer.state === FARMER_STATES.CHASING || this.farmer.state === FARMER_STATES.CORNERING) &&
      this.farmer.lungeTimer > 0 &&
      farmerDist <= this.turkey.getGrazeRadius(this.perks) + this.farmer.radius &&
      this.comboTimer < 1.8
    ) {
      this._awardCloseCall('NARROW ESCAPE!', this.turkey.x, this.turkey.y - 28);
    }

    // Interactive Flour-Sack stun traps.
    this.gadgets.update(dt, this.turkey, this.farmer, this.hound, this.sound, (sx, sy) => {
      this.score += 200;
      this.addPopup('FLOUR STUN! +200', sx, sy - 26, '#FFFBEB', 1.2);
      this.setTurkeyQuip('NICE TRY!', 0.9);
    });

    // Hazards & Collectibles.
    this.hazards.update(dt, this.turkey, this.farmer, this.stage, this.perks, this.rng, this.sound, {
      onCloseCall: (label, px, py) => this._awardCloseCall(label, px, py),
      onTurkeyHit: (reason) => this._handleTurkeyHit(reason),
      onPickup: (item, pts) => {
        const gained = pts * this.combo;
        this.score += gained;
        this.emitParticles(item.x, item.y, 7, 'corn');
        this.addPopup(`+${gained}`, item.x, item.y - 16, '#FDE047', 0.85);
      },
    });

    // Camera follow.
    const desiredCam = clamp(this.turkey.x - VIEW_WIDTH * 0.34, 0, this.stage.def.length - VIEW_WIDTH);
    this.cameraX += (desiredCam - this.cameraX) * Math.min(1, dt * 7);

    // Check Exit Gate reached.
    const gate = this.stage.exitGate;
    if (
      this.turkey.x + this.turkey.radius >= gate.x + 8 &&
      this.turkey.y >= gate.y &&
      this.turkey.y <= gate.y + gate.h
    ) {
      this.score += SCORE_VALUES.stageClear * (this.stageIndex + 1);
      if (this.stageIndex >= STAGE_DEFS.length - 1) {
        this.score += SCORE_VALUES.escapeVictory + this.turkey.lives * 250;
        this.bestScore = Math.max(this.bestScore, this.score);
        this.state = GAME_STATES.ESCAPED;
        this.sound?.playVictory();
        this.emitParticles(this.turkey.x, this.turkey.y, 28, 'feather');
      } else {
        this.perks.rollChoices(this.rng, 3);
        this.state = GAME_STATES.PERK_SELECT;
        this.sound?.playStageClear();
      }
    }

    this._updateEffects(dt);
  }

  _awardCloseCall(label, x, y) {
    this.closeCalls += 1;
    this.hazardsDodged += 1;
    const maxCombo = this.perks.has('golden_spur') ? 6 : 5;
    this.combo = Math.min(maxCombo, this.combo + 1);
    this.comboTimer = this.perks.has('golden_spur') ? 6.2 : 4.2;
    const mult = (this.perks.has('cranberry_rush') ? 1.5 : 1) * this.difficulty.scoreMult;
    const pts = Math.round(SCORE_VALUES.closeCall * this.combo * mult);
    this.score += pts;
    if (this.perks.has('narrow_escape_sense')) {
      this.turkey.speedBoostTimer = 1.1;
    }
    this.sound?.playCloseCall();
    this.addPopup(`${label} +${pts}`, x, y, '#FBBF24', 1.25);
    this.setTurkeyQuip(label.includes('OVEN') ? 'TOO HOT!' : 'YIKES!', 0.85);
  }

  _handleTurkeyHit(reason) {
    const took = this.turkey.takeDamage(this.perks, this.sound, (x, y, n, k) => this.emitParticles(x, y, n, k));
    if (!took) return;
    this.combo = 1;
    this.comboTimer = 0;
    this.hitStopTimer = 0.07;
    this.triggerShake(10, 0.26);
    this.addPopup('-1 FEATHER!', this.turkey.x, this.turkey.y - 26, '#EF4444', 1.1);
    if (this.turkey.lives <= 0) {
      this.caughtReason = reason;
      this.bestScore = Math.max(this.bestScore, this.score);
      this.state = GAME_STATES.CAUGHT;
      this.sound?.playCaught();
    }
  }

  _updateEffects(dt) {
    if (this.turkeyQuipTimer > 0) {
      this.turkeyQuipTimer = Math.max(0, this.turkeyQuipTimer - dt);
    }
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      if (this.shakeTimer <= 0) this.shakeIntensity = 0;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy += 90 * dt;
      p.rot += p.rotVel * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.popups.length - 1; i >= 0; i--) {
      const pop = this.popups[i];
      pop.y += pop.vy * dt;
      pop.life -= dt;
      if (pop.life <= 0) this.popups.splice(i, 1);
    }
  }

  getFeats() {
    return evaluateRunFeats(this);
  }

  getRankGrade() {
    if (this.state === GAME_STATES.ESCAPED && this.score >= 4000) return { grade: 'S', title: 'GRAND GOBBLER', color: '#FACC15' };
    if (this.state === GAME_STATES.ESCAPED || this.score >= 2800) return { grade: 'A', title: 'FLEET FEATHER', color: '#84CC16' };
    if (this.score >= 1500) return { grade: 'B', title: 'CRAFTY FOWL', color: '#38BDF8' };
    return { grade: 'C', title: 'LUCKY PLUME', color: '#FB923C' };
  }

  /**
   * Optional deterministic scenario setup via URL query (?shot=cover|kitchen|perk|caught|escaped)
   * using real engine objects for repeatable visual inspection.
   */
  applyQueryScenario(params) {
    const shot = params.get('shot');
    if (!shot) return;
    const seed = Number(params.get('seed')) || 20261127;
    this.startNewRun(seed);

    if (shot === 'title') {
      this.state = GAME_STATES.TITLE;
      return;
    }

    if (shot === 'cover' || shot === 'kitchen') {
      const idx = shot === 'kitchen' ? 3 : 0;
      this.setupStage(idx, true);
      this.perks.ownedIds = shot === 'kitchen' ? ['greased_feathers', 'corn_bait_master', 'double_flap'] : ['greased_feathers', 'corn_bait_master'];
      this.turkey.maxDashes = 3;
      this.turkey.dashCharges = 2;
      this.turkey.lives = 3;
      this.score = shot === 'kitchen' ? 3420 : 1890;
      this.totalDistance = shot === 'kitchen' ? 465 : 195;
      this.closeCalls = shot === 'kitchen' ? 8 : 4;
      this.combo = shot === 'kitchen' ? 4 : 3;
      this.comboTimer = 3.2;

      const focusOven = this.hazards.ovens.find((o) => o.dirY > 0 && o.x > 650) ?? this.hazards.ovens[0];
      const baseX = focusOven ? focusOven.x - 18 : 780;
      this.turkey.x = baseX;
      this.turkey.y = (ARENA_TOP + ARENA_BOTTOM) * 0.56;
      this.turkey.dashTimer = 0.18;
      this.turkey.invulnTimer = 0.6;
      this.turkey.facing = 0.05;

      this.farmer.x = baseX - 245;
      this.farmer.y = this.turkey.y - 34;
      this.farmer._clampAndResolve(this.stage);
      if (this.stage.obstacles.some((o) => Math.abs(this.farmer.x - (o.x + o.w * 0.5)) < o.w * 0.65 && Math.abs(this.farmer.y - (o.y + o.h * 0.5)) < o.h + 10)) {
        this.farmer.y = ARENA_TOP + 130;
      }
      this.farmer.facing = Math.atan2(this.turkey.y - this.farmer.y, this.turkey.x - this.farmer.x);
      this.farmer.state = shot === 'kitchen' ? FARMER_STATES.CORNERING : FARMER_STATES.CHASING;
      this.farmer.suspicion = 100;
      this.farmer.spottedTimer = 1.7;
      this.farmer.spottedLabel = shot === 'kitchen' ? 'CORNERED!' : 'SPOTTED!';
      this.farmer.setCallout(shot === 'kitchen' ? 'CORNERED!' : '! CHASING !', 1.5);

      for (const oven of this.hazards.ovens) {
        oven.grazedThisCycle = true;
        if (oven === focusOven || (shot === 'kitchen' && Math.abs(oven.x - baseX) < 760)) {
          oven.state = 'BLAST';
          oven.phase = oven.cycleDuration * 0.745;
        }
      }
      for (const k of this.hazards.sweepKnives) {
        k.grazedThisSlice = true;
      }
      const focusKnife = this.hazards.sweepKnives[1] ?? this.hazards.sweepKnives[0];
      if (focusKnife) {
        focusKnife.x = baseX + 195;
        focusKnife.state = 'SLICE';
        focusKnife.timer = focusKnife.period * 0.76;
        focusKnife.bladePos = this.turkey.y - 36;
      }
      this.hazards.thrownKnives.push({
        x: baseX + 340,
        y: this.turkey.y + 48,
        vx: -340,
        vy: -18,
        angle: Math.PI + 0.06,
        spin: 0.7,
        telegraph: 0,
        life: 2.0,
        radius: 16,
        grazed: true,
      });

      this.cameraX = clamp(this.turkey.x - VIEW_WIDTH * 0.42, 0, this.stage.def.length - VIEW_WIDTH);
      this.hound.active = true;
      this.hound.x = shot === 'kitchen' ? baseX - 115 : baseX - 135;
      this.hound.y = this.turkey.y + 115;
      this.hound.facing = Math.atan2(this.turkey.y - this.hound.y, this.turkey.x - this.hound.x);
      this.hound.state = HOUND_STATES.BARKING;
      this.hound.setCallout('WOOF!', 1.5);
      // Place an active corn decoy on the right to showcase stealth distraction mechanics.
      this.decoys.push({
        x: baseX + 365,
        y: this.turkey.y - 72,
        startX: baseX,
        startY: this.turkey.y,
        destX: baseX + 365,
        destY: this.turkey.y - 72,
        flight: 0.24,
        flightDuration: 0.24,
        active: true,
        timer: 3.0,
        maxTimer: 4.2,
        pulse: 1.2,
        lured: true,
      });
      this.emitParticles(this.turkey.x - 28, this.turkey.y, 14, 'feather');
      this.popups = [];
      this.addPopup('CLOSE CALL! +450', this.turkey.x + 118, this.turkey.y - 88, '#FBBF24', 1.5);
      this.setTurkeyQuip(shot === 'kitchen' ? 'TOO HOT!' : 'YIKES!', 1.5);
      this.state = GAME_STATES.PLAYING;
      return;
    }

    if (shot === 'perk') {
      this.setupStage(1, true);
      this.score = 1350;
      this.totalDistance = 240;
      this.perks.rollChoices(this.rng, 3);
      this.state = GAME_STATES.PERK_SELECT;
      return;
    }

    if (shot === 'escaped' || shot === 'caught') {
      this.setupStage(shot === 'escaped' ? 4 : 3, true);
      this.perks.ownedIds = ['greased_feathers', 'corn_bait_master', 'double_flap'];
      this.score = shot === 'escaped' ? 4620 : 2180;
      this.bestScore = this.score;
      this.totalDistance = shot === 'escaped' ? 680 : 410;
      this.closeCalls = shot === 'escaped' ? 9 : 5;
      this.hazardsDodged = shot === 'escaped' ? 14 : 8;
      this.turkey.lives = shot === 'escaped' ? 2 : 0;
      this.caughtReason = shot === 'caught' ? 'Carving Knife in Thanksgiving Kitchen' : '';
      this.state = shot === 'escaped' ? GAME_STATES.ESCAPED : GAME_STATES.CAUGHT;
    }
  }
}
