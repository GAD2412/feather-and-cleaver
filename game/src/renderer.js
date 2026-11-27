import { ARENA_BOTTOM, ARENA_HEIGHT, ARENA_TOP, FARMER_STATES, PALETTE, VIEW_HEIGHT, VIEW_WIDTH } from './constants.js';

/** Custom 2D Canvas renderer for stages, hazards, characters, particles, and comic callouts. */
export class GameRenderer {
  drawWorld(ctx, engine, timeSec) {
    const { stage, turkey, farmer, hazards, cameraX } = engine;
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

    this._drawProps(ctx, stage.props ?? []);
    this._drawExitGate(ctx, stage.exitGate, def, timeSec);
    this._drawGreases(ctx, hazards.greases);
    this._drawObstacles(ctx, stage.obstacles);
    this._drawCovers(ctx, stage.covers, timeSec);
    this._drawCollectibles(ctx, hazards.collectibles, timeSec);
    this._drawDecoys(ctx, engine.decoys, timeSec);
    this._drawOvens(ctx, hazards.ovens, timeSec);
    this._drawSweepKnives(ctx, hazards.sweepKnives, timeSec);
    this._drawVisionCone(ctx, farmer, def);
    this._drawTurkey(ctx, turkey, timeSec, engine.turkeyQuipTimer > 0 ? engine.turkeyQuip : '');
    this._drawFarmer(ctx, farmer, timeSec);
    this._drawThrownKnives(ctx, hazards.thrownKnives);
    this._drawParticles(ctx, engine.particles);
    this._drawPopups(ctx, engine.popups);

    ctx.restore();

    // Subtle warm edge vignette for atmospheric depth.
    this._drawVignette(ctx);
    // Subtle aim reticle during active play.
    this._drawAimReticle(ctx, engine);
    ctx.restore();
  }

  _drawProps(ctx, props) {
    for (const p of props) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(p.scale, p.scale);
      if (p.kind === 'leaf') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(5, -1);
        ctx.lineTo(3, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(-3, 5);
        ctx.lineTo(-5, -1);
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === 'herb') {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 2.5, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === 'pumpkin') {
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(2, 6, 13, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.ellipse(-4, 0, 8, 9, 0, 0, Math.PI * 2);
        ctx.ellipse(4, 0, 8, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F97316';
        ctx.beginPath();
        ctx.ellipse(0, 0, 7, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#3F6212';
        ctx.fillRect(-2, -12, 4, 5);
      } else if (p.kind === 'spice_rack') {
        ctx.fillStyle = '#57534E';
        ctx.fillRect(-14, -5, 28, 10);
        ctx.fillStyle = '#DC2626';
        ctx.fillRect(-11, -3, 6, 6);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(-3, -3, 6, 6);
        ctx.fillStyle = '#65A30D';
        ctx.fillRect(5, -3, 6, 6);
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
      VIEW_WIDTH * 0.62,
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(20, 8, 2, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);
    ctx.restore();
  }

  _drawBackground(ctx, def, cameraX, timeSec) {
    ctx.fillStyle = '#241209';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Arena floor base.
    ctx.fillStyle = def.bgPrimary;
    ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);

    // Alternating textured pattern scrolled by cameraX.
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
        } else if (def.floorStyle === 'planks' || def.floorStyle === 'porch') {
          if (row % 2 === 1) {
            ctx.fillStyle = def.bgSecondary;
            ctx.fillRect(screenX, screenY, tileSize, Math.min(tileSize, ARENA_BOTTOM - screenY));
          }
          ctx.strokeStyle = 'rgba(30, 14, 6, 0.25)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(screenX, screenY);
          ctx.lineTo(screenX + tileSize, screenY);
          ctx.stroke();
        } else {
          if ((col * 3 + row * 5) % 4 === 0) {
            ctx.fillStyle = def.bgSecondary;
            ctx.beginPath();
            ctx.ellipse(screenX + 32, screenY + 32, 22, 12, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Autumn fallen leaves along floor edges.
    ctx.fillStyle = def.ambientTint;
    ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);

    // Top & bottom border trims.
    ctx.fillStyle = def.trimColor;
    ctx.fillRect(0, ARENA_TOP - 10, VIEW_WIDTH, 12);
    ctx.fillRect(0, ARENA_BOTTOM - 2, VIEW_WIDTH, 12);

    // Subtle sunlit shafts.
    const beamOffset = (timeSec * 12) % 260;
    ctx.fillStyle = 'rgba(255, 236, 179, 0.05)';
    for (let x = -200 + beamOffset; x < VIEW_WIDTH + 200; x += 260) {
      ctx.beginPath();
      ctx.moveTo(x, ARENA_TOP);
      ctx.lineTo(x + 90, ARENA_TOP);
      ctx.lineTo(x + 210, ARENA_BOTTOM);
      ctx.lineTo(x + 120, ARENA_BOTTOM);
      ctx.closePath();
      ctx.fill();
    }
  }

  _drawExitGate(ctx, gate, def, timeSec) {
    const pulse = 0.75 + Math.sin(timeSec * 5) * 0.25;
    ctx.save();
    ctx.fillStyle = `rgba(101, 163, 13, ${0.22 * pulse})`;
    ctx.fillRect(gate.x - 16, gate.y - 10, gate.w + 30, gate.h + 20);

    // Wooden gate posts + glowing archway.
    ctx.fillStyle = '#4A2511';
    ctx.fillRect(gate.x, gate.y - 12, 16, 20);
    ctx.fillRect(gate.x, gate.y + gate.h - 8, 16, 20);
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 4;
    ctx.strokeRect(gate.x + 4, gate.y, gate.w - 8, gate.h);

    ctx.fillStyle = 'rgba(132, 204, 22, 0.35)';
    ctx.fillRect(gate.x + 6, gate.y + 2, gate.w - 12, gate.h - 4);

    ctx.fillStyle = '#FFF4DF';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    const label = def.index === 4 ? 'FREEDOM!' : 'EXIT GATE';
    ctx.fillText(label, gate.x + gate.w * 0.5, gate.y - 18);

    // Animated chevron arrows pointing right.
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
      ctx.fillStyle = 'rgba(180, 118, 22, 0.52)';
      ctx.beginPath();
      ctx.ellipse(g.x, g.y, g.radius, g.radius * 0.68, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
      ctx.beginPath();
      ctx.ellipse(g.x - 10, g.y - 6, g.radius * 0.35, g.radius * 0.18, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawObstacles(ctx, obstacles) {
    for (const o of obstacles) {
      ctx.save();
      // Drop shadow.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(o.x + 5, o.y + 7, o.w, o.h);

      if (o.kind === 'island') {
        ctx.fillStyle = '#92400E';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#F7EFE5';
        ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, o.h - 10);
        // Butcher-block cutting board + carrots & herbs.
        ctx.fillStyle = '#D97706';
        ctx.fillRect(o.x + 12, o.y + 8, 34, 18);
        ctx.fillStyle = '#F97316';
        ctx.fillRect(o.x + 18, o.y + 13, 14, 4);
        ctx.fillStyle = '#65A30D';
        ctx.beginPath();
        ctx.arc(o.x + 36, o.y + 16, 4, 0, Math.PI * 2);
        ctx.fill();
        // Copper pot on right side of island.
        ctx.fillStyle = '#B45309';
        ctx.beginPath();
        ctx.arc(o.x + o.w - 22, o.y + 17, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FDE68A';
        ctx.beginPath();
        ctx.arc(o.x + o.w - 22, o.y + 17, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
      } else {
        ctx.fillStyle = '#6B3410';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.fillStyle = '#92400E';
        ctx.fillRect(o.x + 3, o.y + 4, o.w - 6, o.h - 12);
        // Fence posts & iron nail rivets.
        ctx.fillStyle = '#4A2511';
        ctx.fillRect(o.x + 6, o.y - 3, 10, o.h + 4);
        ctx.fillRect(o.x + o.w - 16, o.y - 3, 10, o.h + 4);
        ctx.fillStyle = '#CBD5E1';
        ctx.fillRect(o.x + 10, o.y + 8, 2.5, 2.5);
        ctx.fillRect(o.x + o.w - 12, o.y + 8, 2.5, 2.5);
        ctx.strokeStyle = '#3B1B08';
        ctx.lineWidth = 2;
        ctx.strokeRect(o.x, o.y, o.w, o.h);
      }
      ctx.restore();
    }
  }

  _drawCovers(ctx, covers, timeSec) {
    for (const c of covers) {
      ctx.save();
      const wobble = c.rustle > 0 ? Math.sin(timeSec * 36) * c.rustle * 4 : 0;
      ctx.translate(c.x + wobble, c.y);

      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.ellipse(3, 8, c.radius, c.radius * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();

      if (c.type === 'haystack') {
        ctx.fillStyle = '#CA8A04';
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.arc(-3, -4, c.radius * 0.76, 0, Math.PI * 2);
        ctx.fill();
        // Straw wisps & twine band.
        ctx.strokeStyle = '#92400E';
        ctx.lineWidth = 2;
        for (let s = 0; s < 6; s++) {
          const a = (s * Math.PI) / 3;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 14, Math.sin(a) * 14);
          ctx.lineTo(Math.cos(a) * (c.radius + 3), Math.sin(a) * (c.radius + 3));
          ctx.stroke();
        }
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (c.type === 'barrel') {
        ctx.fillStyle = '#7C2D12';
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 0.92, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#451A03';
        ctx.lineWidth = 1.5;
        for (let k = -16; k <= 16; k += 8) {
          ctx.beginPath();
          ctx.moveTo(k, -c.radius * 0.8);
          ctx.lineTo(k, c.radius * 0.8);
          ctx.stroke();
        }
        ctx.strokeStyle = '#94A3B8';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(0, 0, c.radius * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      } else if (c.type === 'cabinet') {
        ctx.fillStyle = '#44403C';
        ctx.fillRect(-c.radius * 0.9, -c.radius * 0.78, c.radius * 1.8, c.radius * 1.56);
        ctx.fillStyle = '#D6D3D1';
        ctx.fillRect(-c.radius * 0.76, -c.radius * 0.64, c.radius * 1.52, c.radius * 1.28);
        ctx.strokeStyle = '#78716C';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -c.radius * 0.64);
        ctx.lineTo(0, c.radius * 0.64);
        ctx.stroke();
        ctx.fillStyle = '#F59E0B';
        ctx.fillRect(-5, -4, 3, 8);
        ctx.fillRect(2, -4, 3, 8);
        ctx.strokeStyle = '#292524';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-c.radius * 0.9, -c.radius * 0.78, c.radius * 1.8, c.radius * 1.56);
      } else if (c.type === 'crate') {
        ctx.fillStyle = '#9A3412';
        ctx.fillRect(-c.radius * 0.85, -c.radius * 0.85, c.radius * 1.7, c.radius * 1.7);
        ctx.fillStyle = '#EA580C';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Woodland bush.
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(-10, 4, c.radius * 0.65, 0, Math.PI * 2);
        ctx.arc(10, 2, c.radius * 0.65, 0, Math.PI * 2);
        ctx.arc(0, -8, c.radius * 0.72, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _drawCollectibles(ctx, items, timeSec) {
    for (const item of items) {
      if (item.collected) continue;
      const bobY = Math.sin(timeSec * 4 + item.bob) * 3.5;
      ctx.save();
      ctx.translate(item.x, item.y + bobY);

      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 12 - bobY, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      if (item.kind === 'corn') {
        ctx.rotate(-0.35);
        ctx.fillStyle = '#FACC15';
        ctx.beginPath();
        ctx.ellipse(0, 0, 6, 11, 0, 0, Math.PI * 2);
        ctx.fill();
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
        // Golden Tail Feather (heal).
        ctx.rotate(-0.4);
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.ellipse(0, 0, 5, 13, 0, 0, Math.PI * 2);
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
        const ringR = 18 + ((timeSec * 42) % 36);
        const alpha = 1 - (ringR - 18) / 36;
        ctx.strokeStyle = `rgba(250, 204, 21, ${alpha * 0.75})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, ringR, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#FDE047';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.ellipse(-5, -3, 5, 2.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  _drawOvens(ctx, ovens, timeSec) {
    for (const oven of ovens) {
      ctx.save();
      const hw = oven.width * 0.5;
      const hh = oven.height * 0.5;

      // Heat zone telegraph or blast cone.
      const laneTop = oven.dirY > 0 ? oven.y + hh : oven.y - oven.blastRange;
      const laneHeight = oven.blastRange - hh;

      if (oven.state === 'PREHEAT') {
        const pulse = 0.4 + Math.sin(timeSec * 18) * 0.25;
        ctx.fillStyle = `rgba(249, 115, 22, ${pulse * 0.32})`;
        ctx.fillRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);
        ctx.strokeStyle = '#FB923C';
        ctx.setLineDash([8, 6]);
        ctx.lineWidth = 2.5;
        ctx.strokeRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);
        ctx.setLineDash([]);
      } else if (oven.state === 'BLAST') {
        const grad = ctx.createLinearGradient(
          oven.x,
          oven.dirY > 0 ? oven.y + hh : oven.y - hh,
          oven.x,
          oven.dirY > 0 ? oven.y + oven.blastRange : oven.y - oven.blastRange,
        );
        grad.addColorStop(0, 'rgba(254, 240, 138, 0.92)');
        grad.addColorStop(0.35, 'rgba(249, 115, 22, 0.84)');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0.22)');
        ctx.fillStyle = grad;
        ctx.fillRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);

        // Dancing flame tongues.
        ctx.fillStyle = '#FEF08A';
        for (let f = -2; f <= 2; f++) {
          const fx = oven.x + f * 18 + Math.sin(timeSec * 20 + f) * 4;
          const fy = oven.y + oven.dirY * (hh + 34 + ((timeSec * 140 + f * 30) % (laneHeight - 30)));
          ctx.beginPath();
          ctx.arc(fx, fy, 9, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Cast-iron oven body.
      const rattle = oven.state === 'PREHEAT' ? Math.sin(timeSec * 40) * 2 : 0;
      ctx.translate(oven.x + rattle, oven.y);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(-hw + 4, -hh + 5, oven.width, oven.height);

      ctx.fillStyle = '#1F2937';
      ctx.fillRect(-hw, -hh, oven.width, oven.height);
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-hw, -hh, oven.width, oven.height);

      // 4 cast-iron stovetop burners + brass door handle.
      ctx.fillStyle = '#111827';
      ctx.strokeStyle = oven.state === 'IDLE' ? '#4B5563' : '#F97316';
      ctx.lineWidth = 1.5;
      for (const bx of [-hw + 14, hw - 14]) {
        for (const by of [-hh + 9, hh - 9]) {
          ctx.beginPath();
          ctx.arc(bx, by, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
      }

      // Glowing oven window.
      ctx.fillStyle = oven.state === 'IDLE' ? '#7C2D12' : oven.state === 'PREHEAT' ? '#F97316' : '#FEF08A';
      ctx.fillRect(-hw + 20, -hh + 11, oven.width - 40, oven.height - 22);
      ctx.fillStyle = '#FBBF24';
      ctx.fillRect(-hw + 16, oven.dirY > 0 ? hh - 4 : -hh + 1, oven.width - 32, 3);

      // Tag label for instant readability.
      ctx.fillStyle = '#FFF4DF';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(oven.state === 'PREHEAT' ? 'OVEN 450°F!' : 'OVEN 450°F', 0, oven.dirY > 0 ? -hh - 5 : hh + 13);
      ctx.restore();
    }
  }

  _drawSweepKnives(ctx, knives, timeSec) {
    for (const k of knives) {
      ctx.save();
      if (k.state === 'TELEGRAPH' || k.state === 'SLICE') {
        ctx.strokeStyle = k.state === 'SLICE' ? 'rgba(239, 68, 68, 0.72)' : 'rgba(251, 146, 60, 0.78)';
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

      if (k.state === 'SLICE') {
        const bx = k.horizontal ? k.bladePos : k.x;
        const by = k.horizontal ? k.y : k.bladePos;
        this._drawCarvingKnifeSprite(ctx, bx, by, k.spin, 1.15);
      } else if (k.state === 'TELEGRAPH') {
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

  _drawThrownKnives(ctx, knives) {
    for (const tk of knives) {
      if (tk.telegraph > 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(248, 113, 113, 0.7)';
        ctx.setLineDash([7, 7]);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(tk.x, tk.y);
        ctx.lineTo(tk.x + Math.cos(tk.angle) * 280, tk.y + Math.sin(tk.angle) * 280);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      this._drawCarvingKnifeSprite(ctx, tk.x, tk.y, tk.spin, 1.0);
    }
  }

  _drawCarvingKnifeSprite(ctx, x, y, angle, scale = 1) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scale, scale);

    // Subtle motion glint ring.
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 22, 0.2, 2.1);
    ctx.stroke();

    // Wooden handle.
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-20, -4, 13, 8);
    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-17, -1.5, 2.5, 3);
    ctx.fillRect(-12, -1.5, 2.5, 3);

    // Gleaming carving blade.
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(-7, -5);
    ctx.lineTo(22, -2);
    ctx.lineTo(26, 2);
    ctx.lineTo(18, 6);
    ctx.lineTo(-7, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Razor edge highlight.
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -3);
    ctx.lineTo(21, -1);
    ctx.stroke();
    ctx.restore();
  }

  _drawVisionCone(ctx, farmer, def) {
    ctx.save();
    const halfAngle = def.farmerVisionAngle * 0.5;
    const range = def.farmerVisionRange;
    const isChase = farmer.state === FARMER_STATES.CHASING || farmer.state === FARMER_STATES.CORNERING;
    const isSuspicious = farmer.state === FARMER_STATES.SUSPICIOUS || farmer.state === FARMER_STATES.SEARCHING;

    const grad = ctx.createRadialGradient(farmer.x, farmer.y, 18, farmer.x, farmer.y, range);
    if (isChase) {
      grad.addColorStop(0, 'rgba(220, 38, 38, 0.42)');
      grad.addColorStop(1, 'rgba(220, 38, 38, 0.04)');
    } else if (isSuspicious) {
      grad.addColorStop(0, 'rgba(249, 115, 22, 0.36)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0.04)');
    } else {
      grad.addColorStop(0, 'rgba(250, 204, 21, 0.28)');
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

  _drawTurkey(ctx, turkey, timeSec, quip = '') {
    ctx.save();
    ctx.translate(turkey.x, turkey.y);

    if (turkey.invulnTimer > 0 && turkey.dashTimer <= 0 && Math.floor(timeSec * 16) % 2 === 0) {
      ctx.globalAlpha = 0.55;
    } else if (turkey.hiddenIn) {
      ctx.globalAlpha = 0.76;
    }

    // Dash trail aura + speed lines.
    if (turkey.dashTimer > 0) {
      ctx.fillStyle = 'rgba(251, 191, 36, 0.34)';
      ctx.beginPath();
      ctx.arc(0, 0, turkey.radius + 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.lineWidth = 2.5;
      for (const oy of [-10, 0, 10]) {
        ctx.beginPath();
        ctx.moveTo(-22, oy);
        ctx.lineTo(-42, oy);
        ctx.stroke();
      }
    }

    // Ground shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(2, 13, 18, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(turkey.facing);
    ctx.scale(turkey.squash * 1.22, (2 - turkey.squash) * 1.22);

    // Scurrying orange feet.
    const footStride = Math.sin(turkey.animPhase * 1.6) * 4;
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(-3 + footStride, -10, 6, 3);
    ctx.fillRect(-3 - footStride, 7, 6, 3);

    // 7-feather layered Thanksgiving tail fan with cream-and-gold tips.
    const featherColors = ['#991B1B', '#DC2626', '#EA580C', '#F59E0B', '#EA580C', '#DC2626', '#991B1B'];
    for (let i = -3; i <= 3; i++) {
      ctx.save();
      ctx.rotate(i * 0.22 + Math.sin(turkey.animPhase) * 0.04);
      ctx.fillStyle = featherColors[i + 3];
      ctx.beginPath();
      ctx.ellipse(-16, 0, 13, 4.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.beginPath();
      ctx.ellipse(-25, 0, 3.2, 2.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(-16, 0, 13, 4.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Flapping wings.
    const flap = Math.sin(turkey.animPhase * (turkey.dashTimer > 0 ? 2.4 : 1)) * 6;
    ctx.fillStyle = '#78350F';
    ctx.beginPath();
    ctx.ellipse(-2, -13 - flap * 0.35, 9, 5, -0.35, 0, Math.PI * 2);
    ctx.ellipse(-2, 13 + flap * 0.35, 9, 5, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Plump turkey body.
    ctx.fillStyle = turkey.hitFlash > 0 ? '#FCA5A5' : '#92400E';
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#451A03';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Head & eyes.
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.arc(12, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Orange beak.
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(19, -3.5);
    ctx.lineTo(27, 0);
    ctx.lineTo(19, 3.5);
    ctx.closePath();
    ctx.fill();

    // Red wattle / snood.
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.ellipse(17, 5, 4, 3, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Expressive eyes.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(14, -3.5, 3, 0, Math.PI * 2);
    ctx.arc(14, 3.5, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(15, -3.5, 1.5, 0, Math.PI * 2);
    ctx.arc(15, 3.5, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    if (turkey.hiddenIn) {
      ctx.fillStyle = 'rgba(22, 101, 52, 0.92)';
      ctx.beginPath();
      ctx.roundRect(-28, -38, 56, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ECFCCB';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN', 0, -25);
    } else if (quip) {
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.roundRect(-34, -46, 68, 20, 8);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#9A3412';
      ctx.font = '900 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(quip, 0, -32);
    }
    ctx.restore();
  }

  _drawFarmer(ctx, farmer, timeSec) {
    ctx.save();
    ctx.translate(farmer.x, farmer.y);

    // Shadow.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(3, 14, 23, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.rotate(farmer.facing);
    ctx.scale(1.16, 1.16);

    // Swinging arms & carving fork/pitchfork.
    const swing = Math.sin(farmer.walkPhase) * 3;
    // Stepping boots.
    const step = Math.sin(farmer.walkPhase) * 5;
    ctx.fillStyle = '#3B1E08';
    ctx.beginPath();
    ctx.ellipse(4 + step, -10, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.ellipse(4 - step, 10, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, 15 + swing);
    ctx.lineTo(36, 13 + swing);
    ctx.stroke();
    // Fork prongs.
    ctx.beginPath();
    ctx.moveTo(33, 8 + swing);
    ctx.lineTo(41, 8 + swing);
    ctx.moveTo(33, 13 + swing);
    ctx.lineTo(42, 13 + swing);
    ctx.moveTo(33, 18 + swing);
    ctx.lineTo(41, 18 + swing);
    ctx.stroke();

    // Flannel shoulders, denim overalls & white apron.
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(-10, -13, 16, 26);
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.ellipse(7, 0, 11, 13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Face & determined brow peeking ahead.
    ctx.fillStyle = '#FDBA74';
    ctx.beginPath();
    ctx.arc(10, 0, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.arc(13, -3, 1.6, 0, Math.PI * 2);
    ctx.arc(13, 3, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(15, -5);
    ctx.lineTo(15, 5);
    ctx.stroke();

    // Straw hat.
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(-1, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#A16207';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(-1, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(-1, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // State indicator badge & suspicion bar above Farmer.
    const isChase = farmer.state === FARMER_STATES.CHASING || farmer.state === FARMER_STATES.CORNERING;
    const isWarn = farmer.state === FARMER_STATES.SUSPICIOUS || farmer.state === FARMER_STATES.SEARCHING;
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
    ctx.roundRect(-62, -50, 124, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFBEB';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, 0, -36);

    if (farmer.suspicion > 4 && farmer.suspicion < 100) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(-26, -53, 52, 5);
      ctx.fillStyle = isWarn ? '#FB923C' : '#FACC15';
      ctx.fillRect(-26, -53, 52 * (farmer.suspicion / 100), 5);
    }

    if (farmer.lungeWindup > 0) {
      ctx.strokeStyle = `rgba(239, 68, 68, ${0.5 + Math.sin(timeSec * 30) * 0.5})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.stroke();
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
      ctx.font = '900 17px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1C0F07';
      ctx.lineWidth = 4;
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
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.75)';
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
