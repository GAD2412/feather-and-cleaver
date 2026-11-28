import { ARENA_BOTTOM, ARENA_HEIGHT, ARENA_TOP, VIEW_HEIGHT, VIEW_WIDTH } from './constants.js';

/** Renders 2.5D architectural back walls, textured floors, winding paths, lighting, and props. */
export function drawStageBackdrop(ctx, def, cameraX, timeSec) {
  ctx.fillStyle = '#241209';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  const wallHeight = 56;
  const floorTop = ARENA_TOP + wallHeight * 0.45;

  // 1. Arena floor base.
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
      const cellH = Math.min(tileSize, ARENA_BOTTOM - screenY);
      if (def.floorStyle === 'tile') {
        if ((col + row) % 2 === 0) {
          ctx.fillStyle = def.bgSecondary;
          ctx.fillRect(screenX, screenY, tileSize, cellH);
        }
        ctx.strokeStyle = 'rgba(91, 43, 26, 0.16)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX, screenY, tileSize, cellH);
      } else if (def.floorStyle === 'planks' || def.floorStyle === 'porch') {
        if (row % 2 === 1) {
          ctx.fillStyle = def.bgSecondary;
          ctx.fillRect(screenX, screenY, tileSize, cellH);
        }
        ctx.strokeStyle = 'rgba(30, 14, 6, 0.28)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(screenX, screenY);
        ctx.lineTo(screenX + tileSize, screenY);
        ctx.stroke();
      } else {
        // Painterly grass blade tufts instead of flat oval blobs.
        if ((col * 3 + row * 5) % 3 === 0) {
          ctx.strokeStyle = def.bgSecondary;
          ctx.lineWidth = 2;
          const gx = screenX + 26;
          const gy = screenY + 34;
          ctx.beginPath();
          ctx.moveTo(gx, gy);
          ctx.lineTo(gx - 5, gy - 9);
          ctx.moveTo(gx + 4, gy);
          ctx.lineTo(gx + 3, gy - 11);
          ctx.moveTo(gx + 8, gy);
          ctx.lineTo(gx + 13, gy - 8);
          ctx.stroke();
        }
      }
    }
  }

  // 2. Winding dirt escape path (outdoor stages) or woven kitchen runner rug (Kitchen).
  ctx.save();
  if (def.floorStyle === 'tile') {
    const rugY = ARENA_TOP + ARENA_HEIGHT * 0.48;
    ctx.fillStyle = 'rgba(153, 27, 27, 0.22)';
    ctx.fillRect(0, rugY - 36, VIEW_WIDTH, 72);
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(-4, rugY - 30, VIEW_WIDTH + 8, 60);
  } else {
    ctx.strokeStyle = def.floorStyle === 'woods' ? 'rgba(120, 82, 46, 0.42)' : 'rgba(161, 108, 52, 0.48)';
    ctx.lineWidth = 86;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let sx = -60; sx <= VIEW_WIDTH + 80; sx += 80) {
      const wx = sx + cameraX;
      const py = ARENA_TOP + ARENA_HEIGHT * 0.55 + Math.sin(wx * 0.0042) * 58;
      if (sx === -60) ctx.moveTo(sx, py);
      else ctx.lineTo(sx, py);
    }
    ctx.stroke();
  }
  ctx.restore();

  // 3. Illustrated 2.5D architectural back wall along top edge.
  _drawArchitecturalWall(ctx, def, cameraX, ARENA_TOP - 8, wallHeight, timeSec);

  // Subtle ambient wash + bottom border rail.
  ctx.fillStyle = def.ambientTint;
  ctx.fillRect(0, floorTop, VIEW_WIDTH, ARENA_BOTTOM - floorTop);
  ctx.fillStyle = def.trimColor;
  ctx.fillRect(0, ARENA_BOTTOM - 4, VIEW_WIDTH, 16);

  // Golden-hour sunlight shafts.
  const beamOffset = (timeSec * 14) % 280;
  ctx.fillStyle = 'rgba(255, 240, 195, 0.06)';
  for (let x = -220 + beamOffset; x < VIEW_WIDTH + 220; x += 280) {
    ctx.beginPath();
    ctx.moveTo(x, ARENA_TOP + wallHeight * 0.5);
    ctx.lineTo(x + 95, ARENA_TOP + wallHeight * 0.5);
    ctx.lineTo(x + 220, ARENA_BOTTOM);
    ctx.lineTo(x + 125, ARENA_BOTTOM);
    ctx.closePath();
    ctx.fill();
  }
}

function _drawArchitecturalWall(ctx, def, cameraX, topY, wallH, timeSec) {
  ctx.save();
  if (def.floorStyle === 'tile') {
    // Thanksgiving Kitchen tiled backsplash + wooden wainscot + hanging copper pans & clock.
    ctx.fillStyle = '#5B2B1A';
    ctx.fillRect(0, topY, VIEW_WIDTH, wallH);
    ctx.fillStyle = '#F3E5D0';
    ctx.fillRect(0, topY + 6, VIEW_WIDTH, wallH - 16);
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
    ctx.lineWidth = 1;
    const brickW = 36;
    const start = Math.floor(cameraX / brickW) - 1;
    for (let i = start; i < start + Math.ceil(VIEW_WIDTH / brickW) + 2; i++) {
      const bx = i * brickW - cameraX;
      ctx.strokeRect(bx, topY + 6, brickW, 18);
      ctx.strokeRect(bx + 18, topY + 24, brickW, 16);
    }
    // Iron pot rack + hanging copper skillets & kitchen clock.
    const repeat = 320;
    const first = Math.floor(cameraX / repeat) - 1;
    for (let k = first; k < first + 6; k++) {
      const rx = k * repeat - cameraX;
      ctx.fillStyle = '#374151';
      ctx.fillRect(rx + 40, topY + 11, 130, 4);
      for (const px of [rx + 65, rx + 105, rx + 145]) {
        ctx.fillStyle = '#B45309';
        ctx.beginPath();
        ctx.arc(px, topY + 28, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(px - 2, topY + 26, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      // Kitchen wall clock ("5:55").
      const cx = rx + 235;
      const cy = topY + 24;
      ctx.fillStyle = '#FFFBEB';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.strokeStyle = '#1E1109';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + 6, cy + 5);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx - 2, cy - 9);
      ctx.stroke();
    }
  } else if (def.floorStyle === 'woods') {
    // Autumn forest canopy trunks & foliage along top edge.
    ctx.fillStyle = '#1E3A24';
    ctx.fillRect(0, topY, VIEW_WIDTH, wallH);
    const repeat = 160;
    const first = Math.floor(cameraX / repeat) - 1;
    for (let k = first; k < first + 10; k++) {
      const tx = k * repeat - cameraX;
      ctx.fillStyle = '#4A2511';
      ctx.fillRect(tx + 46, topY + 14, 24, wallH - 10);
      ctx.fillStyle = k % 2 === 0 ? '#B45309' : '#991B1B';
      ctx.beginPath();
      ctx.arc(tx + 58, topY + 16, 30, 0, Math.PI * 2);
      ctx.arc(tx + 32, topY + 22, 22, 0, Math.PI * 2);
      ctx.arc(tx + 84, topY + 22, 22, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Red painted barn siding / porch clapboard + X-braced barn doors + glowing lanterns.
    ctx.fillStyle = def.floorStyle === 'grass' ? '#8C2D19' : '#5C2C0E';
    ctx.fillRect(0, topY, VIEW_WIDTH, wallH);
    ctx.strokeStyle = 'rgba(30, 14, 6, 0.35)';
    ctx.lineWidth = 2;
    const repeat = 260;
    const first = Math.floor(cameraX / repeat) - 1;
    for (let k = first; k < first + 7; k++) {
      const bx = k * repeat - cameraX;
      // Vertical siding seams.
      for (let s = 0; s < repeat; s += 32) {
        ctx.beginPath();
        ctx.moveTo(bx + s, topY);
        ctx.lineTo(bx + s, topY + wallH);
        ctx.stroke();
      }
      // White X-braced barn window / door trim.
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(bx + 28, topY + 10, 56, 36);
      ctx.beginPath();
      ctx.moveTo(bx + 28, topY + 10);
      ctx.lineTo(bx + 84, topY + 46);
      ctx.moveTo(bx + 84, topY + 10);
      ctx.lineTo(bx + 28, topY + 46);
      ctx.stroke();

      // Warm glowing hanging barn lantern.
      const lx = bx + 165;
      const ly = topY + 26;
      const glowPulse = 0.22 + Math.sin(timeSec * 4 + k) * 0.05;
      const lg = ctx.createRadialGradient(lx, ly, 4, lx, ly, 46);
      lg.addColorStop(0, `rgba(253, 224, 71, ${glowPulse * 2})`);
      lg.addColorStop(1, 'rgba(253, 224, 71, 0)');
      ctx.fillStyle = lg;
      ctx.beginPath();
      ctx.arc(lx, ly, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.fillRect(lx - 5, ly - 7, 10, 13);
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 2;
      ctx.strokeRect(lx - 5, ly - 7, 10, 13);
      ctx.strokeStyle = 'rgba(30, 14, 6, 0.35)';
    }
  }
  // Wall base shadow on floor.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(0, topY + wallH, VIEW_WIDTH, 10);
  ctx.restore();
}

/** Draws scattered autumn maple leaves, pumpkins, and kitchen spice racks. */
export function drawStageProps(ctx, props) {
  for (const p of props) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.scale(p.scale, p.scale);
    if (p.kind === 'leaf') {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.8;
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
      ctx.ellipse(2, 8, 15, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EA580C';
      ctx.beginPath();
      ctx.ellipse(-5, 0, 9, 11, 0, 0, Math.PI * 2);
      ctx.ellipse(5, 0, 9, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.ellipse(0, 0, 8, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3F6212';
      ctx.fillRect(-2, -14, 4, 6);
    } else if (p.kind === 'spice_rack') {
      ctx.fillStyle = '#57534E';
      ctx.fillRect(-16, -5, 32, 11);
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-13, -3, 6, 6);
      ctx.fillStyle = '#FACC15';
      ctx.fillRect(-3, -3, 6, 6);
      ctx.fillStyle = '#65A30D';
      ctx.fillRect(7, -3, 6, 6);
    }
    ctx.restore();
  }
}

export function drawArenaVignette(ctx) {
  ctx.save();
  const grad = ctx.createRadialGradient(
    VIEW_WIDTH * 0.5,
    VIEW_HEIGHT * 0.5,
    VIEW_HEIGHT * 0.38,
    VIEW_WIDTH * 0.5,
    VIEW_HEIGHT * 0.5,
    VIEW_WIDTH * 0.65,
  );
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(18, 7, 2, 0.32)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, ARENA_TOP, VIEW_WIDTH, ARENA_HEIGHT);
  ctx.restore();
}
