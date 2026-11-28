import { FARMER_STATES, VIEW_HEIGHT, VIEW_WIDTH } from './constants.js';
import { drawArenaVignette, drawStageBackdrop, drawStageProps } from './environment.js';
import { drawBladeSprite, drawFarmerSprite, drawFlourCloud, drawFlourSackSprite, drawHoundSprite, drawTurkeySprite } from './sprites.js';

/** 2.5D Y-sorted Canvas renderer orchestrating environment, hazards, sprites, and FX. */
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

    drawStageBackdrop(ctx, def, cameraX, timeSec);
    ctx.save();
    ctx.translate(-cameraX, 0);

    drawStageProps(ctx, stage.props ?? []);
    this._drawExitGate(ctx, stage.exitGate, def, timeSec);
    this._drawGreases(ctx, hazards.greases);
    this._drawVisionCone(ctx, farmer, def);
    this._drawOvenBlasts(ctx, hazards.ovens, timeSec);
    this._drawSweepKnifeLanes(ctx, hazards.sweepKnives, timeSec);
    this._drawCollectibles(ctx, hazards.collectibles, timeSec);
    this._drawDecoys(ctx, engine.decoys, timeSec);

    // Y-depth sorted entities for 2.5D occlusion.
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
    for (const sack of engine.gadgets?.sacks ?? []) {
      drawables.push({ y: sack.y + 10, draw: () => drawFlourSackSprite(ctx, sack) });
    }
    drawables.push({
      y: turkey.y + 14,
      draw: () => drawTurkeySprite(ctx, turkey, timeSec, engine.turkeyQuipTimer > 0 ? engine.turkeyQuip : ''),
    });
    drawables.push({
      y: farmer.y + 18,
      draw: () => drawFarmerSprite(ctx, farmer, timeSec),
    });
    if (hound?.active) {
      drawables.push({
        y: hound.y + 14,
        draw: () => drawHoundSprite(ctx, hound, timeSec),
      });
    }
    drawables.sort((a, b) => a.y - b.y);
    for (const item of drawables) item.draw();

    this._drawSweepKnifeBlades(ctx, hazards.sweepKnives, turkey);
    this._drawThrownKnives(ctx, hazards.thrownKnives);
    for (const cloud of engine.gadgets?.clouds ?? []) {
      drawFlourCloud(ctx, cloud);
    }
    this._drawParticles(ctx, engine.particles);
    this._drawPopups(ctx, engine.popups);

    ctx.restore();

    drawArenaVignette(ctx);
    this._drawAimReticle(ctx, engine);
    ctx.restore();
  }

  _drawExitGate(ctx, gate, def, timeSec) {
    const pulse = 0.78 + Math.sin(timeSec * 5) * 0.22;
    ctx.save();
    ctx.fillStyle = `rgba(101, 163, 13, ${0.28 * pulse})`;
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
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.fillRect(o.x + 6, o.y + 9, o.w, o.h);
    const depth = 14;
    if (o.kind === 'island') {
      ctx.fillStyle = '#78350F';
      ctx.fillRect(o.x, o.y + o.h - depth, o.w, depth);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x, o.y + o.h - depth, o.w, depth);
      ctx.fillStyle = '#FAF3E7';
      ctx.fillRect(o.x, o.y - 4, o.w, o.h - depth + 6);
      ctx.strokeStyle = '#92400E';
      ctx.strokeRect(o.x, o.y - 4, o.w, o.h - depth + 6);
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
        ctx.ellipse(0, 0, 7, 12, 0, 0, Math.PI * 2);
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
        const glow = ctx.createRadialGradient(
          oven.x,
          oven.y + oven.dirY * (hh + 70),
          14,
          oven.x,
          oven.y + oven.dirY * (hh + 70),
          155,
        );
        glow.addColorStop(0, 'rgba(251, 146, 60, 0.48)');
        glow.addColorStop(1, 'rgba(251, 146, 60, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(oven.x, oven.y + oven.dirY * (hh + 70), 155, 0, Math.PI * 2);
        ctx.fill();

        const grad = ctx.createLinearGradient(
          oven.x,
          oven.dirY > 0 ? oven.y + hh : oven.y - hh,
          oven.x,
          oven.dirY > 0 ? oven.y + oven.blastRange : oven.y - oven.blastRange,
        );
        grad.addColorStop(0, 'rgba(254, 249, 195, 0.96)');
        grad.addColorStop(0.32, 'rgba(249, 115, 22, 0.90)');
        grad.addColorStop(1, 'rgba(220, 38, 38, 0.24)');
        ctx.fillStyle = grad;
        ctx.fillRect(oven.x - oven.blastHalfWidth, laneTop, oven.blastHalfWidth * 2, laneHeight);

        for (let f = -2; f <= 2; f++) {
          const fx = oven.x + f * 18 + Math.sin(timeSec * 22 + f) * 5;
          const fy = oven.y + oven.dirY * (hh + 28 + ((timeSec * 150 + f * 34) % (laneHeight - 28)));
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.arc(fx, fy, 13, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FEF08A';
          ctx.beginPath();
          ctx.arc(fx, fy, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }
  }

  _drawOvenBody(ctx, oven, timeSec) {
    ctx.save();
    const hw = oven.width * 0.56;
    const hh = oven.height * 0.56;
    const rattle = oven.state === 'PREHEAT' ? Math.sin(timeSec * 40) * 2 : 0;
    ctx.translate(oven.x + rattle, oven.y);

    ctx.fillStyle = 'rgba(0,0,0,0.44)';
    ctx.fillRect(-hw + 5, -hh + 6, hw * 2, hh * 2 + 6);

    ctx.fillStyle = '#111827';
    ctx.fillRect(-hw, -hh - 6, hw * 2, hh * 2 + 6);
    ctx.fillStyle = '#374151';
    ctx.fillRect(-hw, -hh - 6, hw * 2, 18);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(-hw, -hh - 6, hw * 2, hh * 2 + 6);

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

    ctx.fillStyle = oven.state === 'IDLE' ? '#7C2D12' : oven.state === 'PREHEAT' ? '#F97316' : '#FEF08A';
    ctx.fillRect(-hw + 12, -hh + 16, hw * 2 - 24, hh * 2 - 22);
    ctx.strokeStyle = '#1F2937';
    ctx.lineWidth = 2;
    ctx.strokeRect(-hw + 12, -hh + 16, hw * 2 - 24, hh * 2 - 22);

    ctx.fillStyle = '#FBBF24';
    ctx.fillRect(-hw + 14, -hh + 12, hw * 2 - 28, 3.5);

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

  _drawSweepKnifeBlades(ctx, knives, turkey) {
    for (const k of knives) {
      if (k.state !== 'SLICE') continue;
      const bx = k.horizontal ? k.bladePos : k.x;
      const by = k.horizontal ? k.y : k.bladePos;
      drawBladeSprite(ctx, bx, by, k.spin, 1.38, k.id % 2 === 1);
      if (!turkey || Math.hypot(bx - turkey.x, by - turkey.y) > 120) {
        this._drawHazardTag(ctx, k.id % 2 === 1 ? 'CLEAVER' : 'CARVING KNIFE', bx + 30, by + 34);
      }
    }
  }

  _drawHazardTag(ctx, text, x, y) {
    ctx.save();
    ctx.font = '800 11px system-ui, sans-serif';
    const w = ctx.measureText(text).width + 14;
    ctx.fillStyle = 'rgba(69, 10, 10, 0.86)';
    ctx.beginPath();
    ctx.roundRect(x - w * 0.5, y - 9, w, 18, 5);
    ctx.fill();
    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#FEF2F2';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
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
      drawBladeSprite(ctx, tk.x, tk.y, tk.spin, 1.25, true);
    }
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
      ctx.font = '900 19px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#1C0F07';
      ctx.lineWidth = 4.8;
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
