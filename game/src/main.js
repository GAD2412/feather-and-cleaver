import { SoundEngine } from './audio.js';
import { GameEngine } from './engine.js';
import { HudRenderer } from './hud.js';
import { InputController } from './input.js';
import { GameRenderer } from './renderer.js';

/** Bootstraps canvas, input, procedural audio, and the main animation loop. */
function bootstrapGame() {
  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Missing #game-canvas element');
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }

  const sound = new SoundEngine();
  const engine = new GameEngine(sound);
  const input = new InputController(canvas, () => sound.unlock());
  const worldRenderer = new GameRenderer();
  const hudRenderer = new HudRenderer();

  const params = new URLSearchParams(window.location.search);
  engine.applyQueryScenario(params);

  // Expose read-only inspection snapshot for automated browser playtesting.
  window.__TURKEY_GAME__ = {
    getState: () => ({
      state: engine.state,
      stageIndex: engine.stageIndex,
      score: engine.score,
      distance: engine.totalDistance,
      lives: engine.turkey.lives,
      turkeyX: Math.round(engine.turkey.x),
      turkeyY: Math.round(engine.turkey.y),
      farmerState: engine.farmer.state,
      closeCalls: engine.closeCalls,
      muted: sound.muted,
    }),
  };

  let lastTs = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
    lastTs = now;
    engine.lastMouse = { x: input.mouse.x, y: input.mouse.y };

    engine.update(dt, input);
    worldRenderer.drawWorld(ctx, engine, now / 1000);
    hudRenderer.render(ctx, engine, now / 1000);

    input.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

bootstrapGame();
