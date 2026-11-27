import { ARENA_BOTTOM, ARENA_HEIGHT, ARENA_TOP, FARMER_STATES, VIEW_HEIGHT, VIEW_WIDTH } from './constants.js';

/** 2.5D three-quarter illustrated Canvas renderer with Y-depth sorting and dynamic lighting. */
export class GameRenderer {
  drawWorld(ctx, engine, timeSec) {
    const { stage, turkey, farmer, hound, hazards, cameraX } = engine;
    const def = stage.def;

    ctx.save();
    if (engine.shakeTimer > 0) {
      const sx = (Math.random() - 0.5) * engine.shakeIntensity;
      const sy = (Math.random() - 0.5) * engine.shakeIntensity;
      ctx.translate(sx, sy);
    }

    this._drawBackground(ctx, def, cameraX, timeSec);
    ctx.save();
    ctx.translate(-cameraX, 0);

    // Floor-level layers.
    this._drawProps(ctx, stage.props ?? []);
    this._drawExitGate(ctx, stage.exitGate, def, timeSec);
    this._drawGreases(ctx, hazards.greases);
    this._drawVisionCone(ctx, farmer, def);
    this._drawOvenBlasts(ctx, hazards.ovens, timeSec);
    this._drawSweepKnifeLanes(ctx, hazards.sweepKnives, timeSec);
    this._drawCollectibles(ctx, hazards.collectibles, timeSec);
    this._drawDecoys(ctx, engine.decoys, timeSec);

    // Y-sorted 2.5D entities for authentic front/behind depth.
    const drawables = [];
    for (const o of stage.obstacles) {
      drawables.push({ y: o.y + o.h, draw: () => this._drawObstacle(ctx, o) });
    }
    for (const c of stage.covers) {
      drawables.push({ y: c.y + 12, draw: () => this._drawCover(ctx, c, timeSec) });
    }
    for (const oven of hazards.ovens) {
      drawables.push({ y: oven.y + 16, draw: () => this._drawOvenBody(ctx, oven, timeSec) });
    }
    drawables.push({
      y: turkey.y + 14,
      draw: () => this._drawTurkey(ctx, turkey, timeSec, engine.turkeyQuipTimer > 0 ? engine.turkeyQuip : ''),
    });
    drawables.push({
      y: farmer.y + 18,
      draw: () => this._drawFarmer(ctx, farmer, timeSec),
    });
    if (hound?.active) {
      drawables.push({
        y: hound.y + 14,
        draw: () => this._drawHound(ctx, hound, timeSec),
      });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) item.draw();

    // Foreground aerial hazards, particles, and comic popups.
    this._drawSweepKnifeBlades(ctx, hazards.sweepKnives);
    this._drawThrownKnives(ctx, hazards.thrownKnives);
    this._drawParticles(ctx, engine.particles);
    this._drawPopups(ctx, engine.popups);

    ctx.restore();

    this._drawVignette(ctx);
    this._drawAimReticle(ctx, engine);
    ctx.restore();
  }

  _drawBackground(ctx, def, cameraX, timeSec) {
    ctx.fillStyle = '#241209';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.fillStyle = def.bgPrimary;
    ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);

    const tileSize = 64;
    const startCol = Math.floor(cameraX / tileSize) - 1;
    const endCol = startCol + Math.ceil(VIEW_WIDTH / tileSize) + 2;
    const rows = Math.ceil(ARENA_HEIGHT / tileSize);

    for (let col = startCol; col <= endCol; col++) {
      const screenX = col * tileSize - cameraX;
      for (let row = 0; row < rows; row++) {
        const screenY = ARENA_TOP + row * tileSize;
        if (def.floorStyle === 'tile') {
          if ((col + row) % 2 === 0) {
            ctx.fillStyle = def.bgSecondary;
            ctx.fillRect(screenX, screenY, tileSize, Math.min(tileSize, ARENA_BOTTOM - screenY));
          }
          ctx.strokeStyle = 'rgba(91, 43, 26, 0.14)';
          ctx.lineWidth = 1;
          ctx.strokeRect(screenX, screenY, tileSize, Math.min(tileSize, ARENA_BOTTOM - screenY));
        } else if (def.floorStyle === 'planks' || def.floorStyle === 'porch') {
          if (row % 2 === 1) {
            ctx.fillStyle = def.bgSecondary;
            ctx.fillRect(screenX, screenY, tileSize, Math.min(tileSize, ARENA_BOTTOM - screenY));
          }
          ctx.strokeStyle = 'rgba(30, 14, 6, 0.28)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + tileSize, screenY);
          ctx.stroke();
        } else {
          if ((col * 3 + row * 5) % 4 === 0) {
            ctx.fillStyle = def.bgSecondary;
            ctx.beginPath();
            ctx.ellipse(screenX + 32, screenY + 32, 24, 13, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    ctx.fillStyle = def.ambientTint;
    ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);

    // Top & bottom architectural trim walls.
    ctx.fillStyle = def.trimColor;
    ctx.fillRect(0, ARENA_TOP - 12, VIEW_WIDTH, 14);
    ctx.fillRect(0, ARENA_BOTTOM - 2, VIEW_WIDTH, 14);

    // Warm golden-hour diagonal sunlight shafts.
    const beamOffset = (timeSec * 14) % 280;
    ctx.fillStyle = 'rgba(255, 240, 195, 0.06)';
    for (let x = -220 + beamOffset; x < VIEW_WIDTH + 220; x += 280) {
      ctx.beginPath();
      ctx.moveTo(x, ARENA_TOP);
      ctx.lineTo(x + 95, ARENA_TOP);
      ctx.lineTo(x + 220, ARENA_BOTTOM);
      ctx.lineTo(x + 125, ARENA_BOTTOM);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawProps(ctx, props) {
    for (const p of props) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.scale, p.scale);
      if (p.kind === 'leaf') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.78;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(6, -1);
        ctx.lineTo(3, 6);
        ctx.lineTo(0, 3);
        ctx.lineTo(-3, 6);
        ctx.lineTo(-6, -1);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'herb') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'pumpkin') {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(2, 7, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.ellipse(-5, 0, 8, 10, 0, 0, Math.PI * 2);
        ctx.ellipse(5, 0, 8, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 10.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3F6212';
        ctx.fillRect(-2, -13, 4, 6);
      } else if (p.kind === 'spice_rack') {
        ctx.fillStyle = '#57534E';
        ctx.fillRect(-15, -5, 30, 10);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(-12, -3, 6, 6);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = '#65A30D';
        ctx.fillRect(6, -3, 6, 6);
      }
      ctx.restore();
    }
  }

  _drawVignette(ctx) {
    ctx.save();
    const grad = ctx.createRadialGradient(
      VIEW_WIDTH * 0.5,
      VIEW_HEIGHT * 0.5,
      VIEW_HEIGHT * 0.36,
      VIEW_WIDTH * 0.5,
      VIEW_HEIGHT * 0.5,
      VIEW_WIDTH * 0.64,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20, 8, 2, 0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);
    ctx.restore();
  }

  _drawExitGate(ctx, gate, def, timeSec) {
    const pulse = 0.78 + Math.sin(timeSec * 5) * 0.22;
    ctx.save();
    ctx.fillStyle = `rgba(101, 163, 13, ${0.26 * pulse})`;
    ctx.fillRect(gate.x - 16, gate.y - 10, gate.w + 30, gate.h + 20);

    ctx.fillStyle = '#4A2511';
    ctx.fillRect(gate.x, gate.y - 14, 16, 22);
    ctx.fillRect(gate.x, gate.y + gate.h - 8, 16, 22);
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 4;
    ctx.strokeRect(gate.x + 4, gate.y, gate.w - 8, gate.h);

    ctx.fillStyle = 'rgba(132, 204, 22, 0.38)';
    ctx.fillRect(gate.x + 6, gate.y + 2, gate.w - 12, gate.h - 4);

    ctx.fillStyle = '#FFF4DF';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(def.index === 4 ? 'FREEDOM!' : 'EXIT GATE', gate.x + gate.w * 0.5, gate.y - 20);

    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 3;
    const shift = (timeSec * 24) % 16;
    for (let i = 0; i < 3; i++) {
      const ay = gate.y + 38 + i * 44;
      const ax = gate.x + 18 + shift * 0.5;
      ctx.beginPath();
      ctx.moveTo(ax, ay - 9);
      ctx.lineTo(ax + 12, ay);
      ctx.lineTo(ax, ay + 9);
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawGreases(ctx, greases) {
    for (const g of greases) {
      ctx.save();
      ctx.fillStyle = 'rgba(161, 98, 7, 0.56)';
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.65, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.38)';
      ctx.beginPath();
      ctx.ellipse(g.x - 10, g.y - 6, g.radius * 0.35, g.radius * 0.18, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawObstacle(ctx, o) {
    ctx.save();
    // 2.5D drop shadow + front extruded face.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fillRect(o.x + 6, o.y + 9, o.w, o.h);

    const depth = 14;
    if (o.kind === 'island') {
      // Extruded wooden cabinet front face.
      ctx.fillStyle = '#78350F';
      ctx.fillRect(o.x, o.y + o.h - depth, o.w, depth);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y + o.h - depth, o.w, depth);
      // Marble/butcher-block top surface.
      ctx.fillStyle = '#FAF3E7';
      ctx.fillRect(o.x, o.y - 4, o.w, o.h - depth + 6);
      ctx.strokeStyle = '#92400E';
      ctx.strokeRect(o.x, o.y - 4, o.w, o.h - depth + 6);
      // Cutting board, sliced carrots, herb sprig & copper stew pot.
      ctx.fillStyle = '#D97706';
      ctx.fillRect(o.x + 12, o.y + 3, 36, 17);
      ctx.fillStyle = '#F97316';
      ctx.fillRect(o.x + 17, o.y + 8, 15, 4);
      ctx.fillStyle = '#65A30D';
      ctx.beginPath();
      ctx.arc(o.x + 38, o.y + 11, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.arc(o.x + o.w - 22, o.y + 12, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FDE68A';
      ctx.beginPath();
      ctx.arc(o.x + o.w - 22, o.y + 12, 5.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 3D split-rail wooden fence / barn beam.
      ctx.fillStyle = '#5C2C0E';
      ctx.fillRect(o.x, o.y + o.h - depth, o.w, depth);
      ctx.fillStyle = '#92400E';
      ctx.fillRect(o.x, o.y - 4, o.w, o.h - depth + 6);
      ctx.fillStyle = '#4A2511';
      ctx.fillRect(o.x + 6, o.y - 10, 12, o.h + 10);
      ctx.fillRect(o.x + o.w - 18, o.y - 10, 12, o.h + 10);
      ctx.fillStyle = '#CBD5E1';
      ctx.fillRect(o.x + 10, o.y + 2, 3, 3);
      ctx.fillRect(o.x + o.w - 14, o.y + 2, 3, 3);
      ctx.strokeStyle = '#3B1B08';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y - 4, o.w, o.h + 4);
    }
    ctx.restore();
  }

  _drawCover(ctx, c, timeSec) {
    ctx.save();
    const wobble = c.rustle > 0 ? Math.sin(timeSec * 36) * c.rustle * 4 : 0;
    ctx.translate(c.x + wobble, c.y);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(3, 12, c.radius * 1.04, c.radius * 0.56, 0, 0, Math.PI * 2);
    ctx.fill();

    if (c.type === 'haystack') {
      // 3D golden haystack dome.
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.ellipse(0, 4, c.radius, c.radius * 0.72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EAB308';
      ctx.beginPath();
      ctx.arc(0, -4, c.radius * 0.9, Math.PI, 0);
      ctx.lineTo(c.radius * 0.9, 6);
      ctx.ellipse(0, 6, c.radius * 0.9, c.radius * 0.45, 0, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.ellipse(-6, -12, c.radius * 0.45, c.radius * 0.25, -0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-c.radius * 0.85, 2);
      ctx.quadraticCurveTo(0, 12, c.radius * 0.85, 2);
      ctx.stroke();
    } else if (c.type === 'barrel') {
      // 3D oak cider barrel.
      ctx.fillStyle = '#7C2D12';
      ctx.beginPath();
      ctx.roundRect(-26, -24, 52, 46, 12);
      ctx.fill();
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-25, -8);
      ctx.lineTo(25, -8);
      ctx.moveTo(-25, 10);
      ctx.lineTo(25, 10);
      ctx.stroke();
      ctx.fillStyle = '#B45309';
      ctx.beginPath();
      ctx.ellipse(0, -22, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (c.type === 'cabinet') {
      // 3D kitchen pantry cabinet.
      ctx.fillStyle = '#57534E';
      ctx.fillRect(-30, -32, 60, 52);
      ctx.fillStyle = '#E7E5E4';
      ctx.fillRect(-26, -18, 52, 34);
      ctx.fillStyle = '#A8A29E';
      ctx.fillRect(-30, -32, 60, 14);
      ctx.strokeStyle = '#78716C';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(0, 16);
      ctx.stroke();
      ctx.fillStyle = '#F59E0B';
      ctx.fillRect(-6, -4, 3, 9);
      ctx.fillRect(3, -4, 3, 9);
      ctx.strokeStyle = '#292524';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-30, -32, 60, 52);
    } else if (c.type === 'crate') {
      ctx.fillStyle = '#9A3412';
      ctx.fillRect(-28, -26, 56, 48);
      ctx.fillStyle = '#C2410C';
      ctx.fillRect(-28, -26, 56, 14);
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.arc(0, -16, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#431407';
      ctx.lineWidth = 2;
      ctx.strokeRect(-28, -26, 56, 48);
    } else {
      ctx.fillStyle = '#14532D';
      ctx.beginPath();
      ctx.arc(-12, 4, 22, 0, Math.PI * 2);
      ctx.arc(12, 2, 22, 0, Math.PI * 2);
      ctx.arc(0, -10, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16A34A';
      ctx.beginPath();
      ctx.arc(-4, -14, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  _drawCollectibles(ctx, items, timeSec) {
    for (const item of items) {
      if (item.collected) continue;
      const bobY = Math.sin(timeSec * 4 + item.bob) * 3.5;
      ctx.save();
      ctx.translate(item.x, item.y + bobY);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 12 - bobY, 10, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (item.kind === 'corn') {
        ctx.rotate(-0.35);
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6.5, 11.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#A16207';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = '#65A30D';
        ctx.beginPath();
        ctx.ellipse(-4, 6, 4, 7, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (item.kind === 'cranberry') {
        ctx.fillStyle = '#E11D48';
        ctx.beginPath();
        ctx.arc(-4, 2, 6, 0, Math.PI * 2);
        ctx.arc(4, 2, 6, 0, Math.PI * 2);
        ctx.arc(0, -4, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FDA4AF';
        ctx.beginPath();
        ctx.arc(-2, -5, 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.rotate(-0.4);
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5.5, 13.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFF4DF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(0, 11);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _drawDecoys(ctx, decoys, timeSec) {
    for (const d of decoys) {
      ctx.save();
      ctx.translate(d.x, d.y);
      if (d.active) {
        const ringR = 18 + ((timeSec * 42) % 38);
        const alpha = 1 - (ringR - 18) / 38;
        ctx.strokeStyle = `rgba(250, 204, 21, ${alpha * 0.8})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.ellipse(-5, -3, 5, 2.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawOvenBlasts(ctx, ovens, timeSec) {
    for (const oven of ovens) {
      ctx.save();
      const hh = oven.height * 0.5;
      const laneTop = oven.dirY > 0 ? oven.y + hh : oven.y - oven.blastRange;
      const laneHeight = oven.blastRange - hh;

      if (oven.state === 'PREHEAT') {
        const pulse = 0.45 + Math.sin(timeSec * 18) * 0.25;
        ctx.fillStyle = `rgba(249, 115, 22, ${pulse * 0.34})`;
        ctx.fillRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);
        ctx.strokeStyle = '#FB923C';
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2.5;
        ctx.strokeRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);
        ctx.setLineDash([]);
      } else if (oven.state === 'BLAST') {
        // Warm floor firelight glow.
        const glow = ctx.createRadialGradient(
          oven.x,
          oven.y + oven.dirY * (hh + 70),
          12,
          oven.x,
          oven.y + oven.dirY * (hh + 70),
          140,
        );
        glow.addColorStop(0, 'rgba(251, 146, 60, 0.42)');
        glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(oven.x, oven.y + oven.dirY * (hh + 70), 140, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createLinearGradient(
          oven.x,
          oven.dirY > 0 ? oven.y + hh : oven.y - hh,
          oven.x,
          oven.dirY > 0 ? oven.y + oven.blastRange : oven.y - oven.blastRange,
        );
        grad.addColorStop(0, 'rgba(254, 249, 195, 0.96)');
        grad.addColorStop(0.32, 'rgba(249, 115, 22, 0.88)');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);

        // Layered dancing flame tongues.
        for (let f = -2; f <= 2; f++) {
          const fx = oven.x + f * 18 + Math.sin(timeSec * 22 + f) * 5;
          const fy = oven.y + oven.dirY * (hh + 28 + ((timeSec * 150 + f * 34) % (laneHeight - 28)));
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.arc(fx, fy, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(fx, fy, 6.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  _drawOvenBody(ctx, oven, timeSec) {
    ctx.save();
    const hw = oven.width * 0.5;
    const hh = oven.height * 0.5;
    const rattle = oven.state === 'PREHEAT' ? Math.sin(timeSec * 40) * 2 : 0;
    ctx.translate(oven.x + rattle, oven.y);

    // 3D drop shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.44)';
    ctx.fillRect(-hw + 5, -hh + 6, oven.width, oven.height + 6);

    // Cast-iron body + top stovetop perspective.
    ctx.fillStyle = '#111827';
    ctx.fillRect(-hw, -hh - 6, oven.width, oven.height + 6);
    ctx.fillStyle = '#374151';
    ctx.fillRect(-hw, -hh - 6, oven.width, 18);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw, -hh - 6, oven.width, oven.height + 6);

    // 4 stovetop burners on top deck.
    for (const bx of [-hw + 16, hw - 16]) {
      for (const by of [-hh - 1, -hh + 7]) {
        ctx.fillStyle = '#0F172A';
        ctx.beginPath();
        ctx.ellipse(bx, by, 7, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = oven.state === 'IDLE' ? '#64748B' : '#F97316';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // Glowing front roast window + brass door handle.
    ctx.fillStyle = oven.state === 'IDLE' ? '#7C2D12' : oven.state === 'PREHEAT' ? '#F97316' : '#FEF08A';
    ctx.fillRect(-hw + 12, -hh + 16, oven.width - 24, oven.height - 22);
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw + 12, -hh + 16, oven.width - 24, oven.height - 22);

    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-hw + 14, -hh + 12, oven.width - 28, 3.5);

    ctx.fillStyle = '#FFF4DF';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(oven.state === 'PREHEAT' ? 'OVEN 450°F!' : 'OVEN 450°F', 0, oven.dirY > 0 ? -hh - 10 : hh + 14);
    ctx.restore();
  }

  _drawSweepKnifeLanes(ctx, knives, timeSec) {
    for (const k of knives) {
      ctx.save();
      if (k.state === 'TELEGRAPH' || k.state === 'SLICE') {
        ctx.strokeStyle = k.state === 'SLICE' ? 'rgba(239, 68, 68, 0.78)' : 'rgba(251, 146, 60, 0.82)';
        ctx.lineWidth = k.state === 'SLICE' ? 8 : 3;
        ctx.setLineDash(k.state === 'SLICE' ? [] : [10, 8]);
        ctx.beginPath();
        if (k.horizontal) {
          ctx.moveTo(k.laneStart, k.y);
          ctx.lineTo(k.laneEnd, k.y);
        } else {
          ctx.moveTo(k.x, k.laneStart);
          ctx.lineTo(k.x, k.laneEnd);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      if (k.state === 'TELEGRAPH') {
        const wx = k.horizontal ? k.laneStart : k.x;
        const wy = k.horizontal ? k.y : k.laneStart;
        const pulse = 0.65 + Math.sin(timeSec * 20) * 0.35;
        ctx.fillStyle = `rgba(239, 68, 68, ${pulse})`;
        ctx.beginPath();
        ctx.arc(wx, wy, 10, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawSweepKnifeBlades(ctx, knives) {
    for (const k of knives) {
      if (k.state !== 'SLICE') continue;
      const bx = k.horizontal ? k.bladePos : k.x;
      const by = k.horizontal ? k.y : k.bladePos;
      this._drawCarvingKnifeSprite(ctx, bx, by, k.spin, 1.25);
    }
  }

  _drawThrownKnives(ctx, knives) {
    for (const tk of knives) {
      if (tk.telegraph > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.75)';
        ctx.setLineDash([7, 7]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tk.x, tk.y);
        ctx.lineTo(tk.x + Math.cos(tk.angle) * 280, tk.y + Math.sin(tk.angle) * 280);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      this._drawCarvingKnifeSprite(ctx, tk.x, tk.y, tk.spin, 1.12);
    }
  }

  _drawCarvingKnifeSprite(ctx, x, y, angle, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0.15, 2.2);
    ctx.stroke();

    // Riveted walnut handle.
    ctx.fillStyle = '#5C2C0E';
    ctx.fillRect(-22, -4.5, 14, 9);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-19, -1.5, 2.5, 3);
    ctx.fillRect(-13, -1.5, 2.5, 3);

    // Gleaming curved chef carving blade.
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(24, -2.5);
    ctx.lineTo(28, 2);
    ctx.lineTo(19, 7);
    ctx.lineTo(-8, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -3.5);
    ctx.lineTo(22, -1);
    ctx.stroke();
    ctx.restore();
  }

  _drawVisionCone(ctx, farmer, def) {
    ctx.save();
    const halfAngle = def.farmerVisionAngle * 0.5;
    const range = def.farmerVisionRange;
    const isChase = farmer.state === FARMER_STATES.CHASING || farmer.state === FARMER_STATES.CORNERING;
    const isSuspicious = farmer.state === FARMER_STATES.SUSPICIOUS || farmer.state === FARMER_STATES.SEARCHING;

    const grad = ctx.createRadialGradient(farmer.x, farmer.y, 20, farmer.x, farmer.y, range);
    if (isChase) {
      grad.addColorStop(0, 'rgba(220, 38, 38, 0.44)');
      grad.addColorStop(1, 'rgba(220, 38, 38, 0.04)');
    } else if (isSuspicious) {
      grad.addColorStop(0, 'rgba(249, 115, 22, 0.38)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0.04)');
    } else {
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.30)');
      grad.addColorStop(1, 'rgba(250, 204, 21, 0.03)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(farmer.x, farmer.y);
    ctx.arc(farmer.x, farmer.y, range, farmer.facing - halfAngle, farmer.facing + halfAngle);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Upright 3/4-view illustrated Thanksgiving Turkey (Barnaby). */
  _drawTurkey(ctx, turkey, timeSec, quip = '') {
    ctx.save();
    ctx.translate(turkey.x, turkey.y);

    if (turkey.invulnTimer > 0 && turkey.dashTimer <= 0 && Math.floor(timeSec * 16) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    } else if (turkey.hiddenIn) {
      ctx.globalAlpha = 0.8;
    }

    const flipX = Math.cos(turkey.facing) < -0.15 ? -1 : 1;
    const bob = Math.abs(Math.sin(turkey.animPhase)) * 3.5;

    // Dash trail aura + speed streaks.
    if (turkey.dashTimer > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.32)';
      ctx.beginPath();
      ctx.arc(0, -4, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.9)';
      ctx.lineWidth = 2.5;
      for (const oy of [-16, -6, 4]) {
        ctx.beginPath();
        ctx.moveTo(-22 * flipX, oy);
        ctx.lineTo(-46 * flipX, oy);
        ctx.stroke();
      }
    }

    // Ground shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 15, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, -bob);
    ctx.scale(flipX * turkey.squash, 2 - turkey.squash);

    // Kicking orange legs & webbed feet.
    const stride = Math.sin(turkey.animPhase * 1.4) * 6;
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-4, 6);
    ctx.lineTo(-6 + stride, 16);
    ctx.moveTo(4, 6);
    ctx.lineTo(6 - stride, 16);
    ctx.stroke();

    // Tall 7-feather scalloped Thanksgiving tail fan behind body.
    const fanColors = ['#7F1D1D', '#B91C1C', '#EA580C', '#F59E0B', '#EA580C', '#B91C1C', '#7F1D1D'];
    for (let i = -3; i <= 3; i++) {
      ctx.save();
      ctx.translate(-9, -4);
      ctx.rotate(-0.65 + i * 0.24 + Math.sin(turkey.animPhase) * 0.03);
      ctx.fillStyle = fanColors[i + 3];
      ctx.beginPath();
      ctx.ellipse(-10, -10, 6.5, 16, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.ellipse(-14, -22, 3.8, 3.2, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(-10, -10, 6.5, 16, -0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Plump 3D-shaded chestnut body.
    ctx.fillStyle = turkey.hitFlash > 0 ? '#FCA5A5' : '#92400E';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 14, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.ellipse(4, -3, 10, 8, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 14, -0.1, 0, Math.PI * 2);
    ctx.stroke();

    // Flapping side wing.
    const wingLift = Math.sin(turkey.animPhase * (turkey.dashTimer > 0 ? 2.6 : 1.3)) * 5;
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.ellipse(-2, -1 - wingLift * 0.45, 11, 6.5, -0.35 - wingLift * 0.04, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Neck & expressive cartoon head.
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.arc(13, -12, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Curved bright orange beak.
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(21, -15);
    ctx.lineTo(31, -11);
    ctx.lineTo(21, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Dangling crimson snood & wattle.
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.ellipse(20, -6, 4.2, 5.5, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // Wide panicked eyes with catchlights.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(15, -14, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(16.5, -14, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(17.1, -14.8, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (turkey.hiddenIn) {
      ctx.fillStyle = 'rgba(22, 101, 52, 0.94)';
      ctx.beginPath();
      ctx.roundRect(-28, -48, 56, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ECFCCB';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', 0, -35);
    } else if (quip) {
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.roundRect(-34, -56, 68, 21, 8);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#9A3412';
      ctx.font = '900 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(quip, 0, -42);
    }
    ctx.restore();
  }

  /** Upright 3/4-view illustrated Farmer Silas with straw hat, overalls, apron, lantern & pitchfork. */
  _drawFarmer(ctx, farmer, timeSec) {
    ctx.save();
    ctx.translate(farmer.x, farmer.y);

    const flipX = Math.cos(farmer.facing) < -0.15 ? -1 : 1;
    const stride = Math.sin(farmer.walkPhase) * 6;
    const isChase = farmer.state === FARMER_STATES.CHASING || farmer.state === FARMER_STATES.CORNERING;
    const isWarn = farmer.state === FARMER_STATES.SUSPICIOUS || farmer.state === FARMER_STATES.SEARCHING;

    // Pulsing danger ring under feet when chasing.
    if (isChase) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.45 + Math.sin(timeSec * 14) * 0.25})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(0, 14, 28, 12, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
    ctx.beginPath();
    ctx.ellipse(0, 16, 22, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.scale(flipX, 1);

    // Stepping leather boots.
    ctx.fillStyle = '#3B1E08';
    ctx.beginPath();
    ctx.ellipse(-6 + stride, 14, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(6 - stride, 14, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Red flannel torso + blue denim overalls + white butcher apron.
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.roundRect(-16, -16, 32, 26, 8);
    ctx.fill();
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(-12, -8, 24, 18);
    ctx.fillStyle = '#FEF3C7';
    ctx.fillRect(-9, -4, 18, 15);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-10, -7, 3, 3);
    ctx.fillRect(7, -7, 3, 3);
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.8;
    ctx.strokeRect(-16, -16, 32, 26);

    // Gleaming 3-prong pitchfork / carving fork in front hand.
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(30, -8);
    ctx.stroke();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(27, -14);
    ctx.lineTo(38, -16);
    ctx.moveTo(28, -8);
    ctx.lineTo(40, -10);
    ctx.moveTo(29, -2);
    ctx.lineTo(38, -4);
    ctx.stroke();

    // Glowing brass lantern in back hand.
    ctx.fillStyle = 'rgba(253, 224, 71, 0.25)';
    ctx.beginPath();
    ctx.arc(-18, 2, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-22, -3, 8, 10);
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-22, -3, 8, 10);

    // Expressive angry face + bushy mustache.
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(0, -24, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(4, -25, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -29);
    ctx.lineTo(8, -27);
    ctx.stroke();
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.ellipse(5, -20, 6.5, 2.8, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Tall golden straw hat with red ribbon band.
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.ellipse(0, -32, 20, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#A16207';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.fillStyle = '#EAB308';
    ctx.beginPath();
    ctx.roundRect(-11, -43, 22, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.fillRect(-11, -35, 22, 3.5);

    ctx.restore();

    // State badge above Farmer's hat.
    const badgeColor = isChase ? '#DC2626' : isWarn ? '#EA580C' : '#3F6212';
    const label =
      farmer.calloutTimer > 0 && farmer.calloutText
        ? `FARMER: ${farmer.calloutText}`
        : farmer.state === FARMER_STATES.CORNERING
          ? 'FARMER !! CORNER'
          : farmer.state === FARMER_STATES.CHASING
            ? 'FARMER ! CHASING'
            : farmer.state === FARMER_STATES.SEARCHING
              ? 'FARMER ? SEARCH'
              : farmer.state === FARMER_STATES.SUSPICIOUS
                ? 'FARMER ? ALERT'
                : 'FARMER PATROL';

    ctx.fillStyle = badgeColor;
    ctx.beginPath();
    ctx.roundRect(-64, -68, 128, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFBEB';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -54);

    if (farmer.suspicion > 4 && farmer.suspicion < 100) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-28, -75, 56, 5);
      ctx.fillStyle = isWarn ? '#FB923C' : '#FACC15';
      ctx.fillRect(-28, -75, 56 * (farmer.suspicion / 100), 5);
    }

    if (farmer.lungeWindup > 0) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(timeSec * 30) * 0.5})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(0, -10, 34, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Upright 3/4-view illustrated Farm Hound (Biscuit) with scent ring. */
  _drawHound(ctx, hound, timeSec) {
    ctx.save();
    ctx.translate(hound.x, hound.y);
    const flipX = Math.cos(hound.facing) < -0.15 ? -1 : 1;

    // Scent-tracking ring when sniffing/barking.
    if (hound.scentMeter > 20 || hound.calloutTimer > 0) {
      const r = 20 + ((timeSec * 32) % 24);
      ctx.strokeStyle = `rgba(251, 146, 60, ${1 - (r - 20) / 24})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 8, r, r * 0.45, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 12, 16, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.scale(flipX, 1);
    const runBob = Math.abs(Math.sin(hound.runPhase)) * 3;
    ctx.translate(0, -runBob);

    // Wagging tail.
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-13, -2);
    ctx.lineTo(-20, -10 + Math.sin(timeSec * 16) * 4);
    ctx.stroke();

    // Legs.
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-10, 4, 4, 9);
    ctx.fillRect(6, 4, 4, 9);

    // Spotted hound body.
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.arc(-2, -1, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Head, floppy ear & black nose.
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.arc(12, -6, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#451A03';
    ctx.beginPath();
    ctx.ellipse(9, -3, 3.5, 6.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(19, -5, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(14, -8, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (hound.calloutTimer > 0 && hound.calloutText) {
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.roundRect(-36, -38, 72, 18, 6);
      ctx.fill();
      ctx.fillStyle = '#FFFBEB';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(hound.calloutText, 0, -25);
    }
    ctx.restore();
  }

  _drawParticles(ctx, particles) {
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.kind === 'feather') {
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 1.4, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawPopups(ctx, popups) {
    for (const pop of popups) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, pop.life / (pop.maxLife * 0.45));
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1C0F07';
      ctx.lineWidth = 4.5;
      ctx.strokeText(pop.text, pop.x, pop.y);
      ctx.fillStyle = pop.color;
      ctx.fillText(pop.text, pop.x, pop.y);
      ctx.restore();
    }
  }

  _drawAimReticle(ctx, engine) {
    if (engine.state !== 'PLAYING') return;
    const { x, y } = engine.lastMouse ?? { x: VIEW_WIDTH * 0.5, y: VIEW_HEIGHT * 0.5 };
    ctx.save();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.78)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.moveTo(x - 14, y);
    ctx.lineTo(x - 6, y);
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 14, y);
    ctx.moveTo(x, y - 14);
    ctx.lineTo(x, y - 6);
    ctx.moveTo(x, y + 6);
    ctx.lineTo(x, y + 14);
    ctx.stroke();
    ctx.restore();
  }
}
