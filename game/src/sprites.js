import { FARMER_STATES } from './constants.js';

/** Hero-scaled 1.45x upright 3/4-view illustrated Barnaby Turkey sprite. */
export function drawTurkeySprite(ctx, turkey, timeSec, quip = '', scaleMult = 1.42) {
  ctx.save();
  ctx.translate(turkey.x, turkey.y);

  if (turkey.invulnTimer > 0 && turkey.dashTimer <= 0 && Math.floor(timeSec * 16) % 2 === 0) {
    ctx.globalAlpha = 0.58;
  } else if (turkey.hiddenIn) {
    ctx.globalAlpha = 0.84;
  }

  const flipX = Math.cos(turkey.facing) < -0.15 ? -1 : 1;
  const bob = Math.abs(Math.sin(turkey.animPhase)) * 4;

  // Golden dash aura + speed streaks.
  if (turkey.dashTimer > 0) {
    ctx.fillStyle = 'rgba(251, 191, 36, 0.34)';
    ctx.beginPath();
    ctx.arc(0, -6, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.92)';
    ctx.lineWidth = 3;
    for (const oy of [-20, -6, 8]) {
      ctx.beginPath();
      ctx.moveTo(-26 * flipX, oy);
      ctx.lineTo(-56 * flipX, oy);
      ctx.stroke();
    }
  }

  // Ground shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(0, 18, 26, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(0, -bob);
  ctx.scale(flipX * turkey.squash * scaleMult, (2 - turkey.squash) * scaleMult);

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

  // Tall 7-feather scalloped Thanksgiving tail fan with cream-gold tips.
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

  // Plump chestnut body with chest highlight.
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

  // Flapping wing.
  const wingLift = Math.sin(turkey.animPhase * (turkey.dashTimer > 0 ? 2.6 : 1.3)) * 5;
  ctx.fillStyle = '#78350F';
  ctx.beginPath();
  ctx.ellipse(-2, -1 - wingLift * 0.45, 11, 6.5, -0.35 - wingLift * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Expressive head, beak, wattle & eyes.
  ctx.fillStyle = '#B45309';
  ctx.beginPath();
  ctx.arc(13, -12, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#451A03';
  ctx.lineWidth = 1.8;
  ctx.stroke();

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

  ctx.fillStyle = '#DC2626';
  ctx.beginPath();
  ctx.ellipse(20, -6, 4.2, 5.5, 0.25, 0, Math.PI * 2);
  ctx.fill();

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
    ctx.fillStyle = 'rgba(22, 101, 52, 0.95)';
    ctx.beginPath();
    ctx.roundRect(-30, -62, 60, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#ECFCCB';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', 0, -48);
  } else if (quip) {
    ctx.fillStyle = '#FFFBEB';
    ctx.beginPath();
    ctx.roundRect(-36, -68, 72, 22, 8);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#9A3412';
    ctx.font = '900 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(quip, 0, -53);
  }
  ctx.restore();
}

/** Hero-scaled 1.4x upright 3/4-view illustrated Farmer Silas sprite. */
export function drawFarmerSprite(ctx, farmer, timeSec, scaleMult = 1.38) {
  ctx.save();
  ctx.translate(farmer.x, farmer.y);

  const flipX = Math.cos(farmer.facing) < -0.15 ? -1 : 1;
  const stride = Math.sin(farmer.walkPhase) * 6;
  const isChase = farmer.state === FARMER_STATES.CHASING || farmer.state === FARMER_STATES.CORNERING;
  const isWarn = farmer.state === FARMER_STATES.SUSPICIOUS || farmer.state === FARMER_STATES.SEARCHING;

  if (isChase) {
    ctx.strokeStyle = `rgba(239, 68, 68, ${0.48 + Math.sin(timeSec * 14) * 0.25})`;
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.ellipse(0, 18, 34, 14, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 28, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(flipX * scaleMult, scaleMult);

  // Boots.
  ctx.fillStyle = '#3B1E08';
  ctx.beginPath();
  ctx.ellipse(-6 + stride, 14, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.ellipse(6 - stride, 14, 7, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Plaid shirt + denim overalls + butcher apron.
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

  // 3-prong pitchfork / carving fork.
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

  // Glowing brass lantern.
  ctx.fillStyle = 'rgba(253, 224, 71, 0.28)';
  ctx.beginPath();
  ctx.arc(-18, 2, 18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FACC15';
  ctx.fillRect(-22, -3, 8, 10);
  ctx.strokeStyle = '#78350F';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-22, -3, 8, 10);

  // Angry face + mustache.
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

  // Tall woven straw hat (Farmyard/Barn/Porch) OR pleated white Chef Toque (Kitchen!).
  if (farmer.isChef) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.roundRect(-12, -40, 24, 10, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-8, -42, 7.5, 0, Math.PI * 2);
    ctx.arc(0, -45, 9, 0, Math.PI * 2);
    ctx.arc(8, -42, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-12, -36, 24, 5);
  } else {
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
  }

  ctx.restore();

  const rolePrefix = farmer.isChef ? 'CHEF SILAS' : 'FARMER';
  const badgeColor = farmer.stunTimer > 0 ? '#64748B' : isChase ? '#DC2626' : isWarn ? '#EA580C' : '#3F6212';
  const label =
    farmer.calloutTimer > 0 && farmer.calloutText
      ? `${rolePrefix}: ${farmer.calloutText}`
      : farmer.state === FARMER_STATES.CORNERING
        ? `${rolePrefix} !! CORNER`
        : farmer.state === FARMER_STATES.CHASING
          ? `${rolePrefix} ! CHASING`
          : farmer.state === FARMER_STATES.SEARCHING
            ? `${rolePrefix} ? SEARCH`
            : farmer.state === FARMER_STATES.SUSPICIOUS
              ? `${rolePrefix} ? ALERT`
              : `${rolePrefix} PATROL`;

  ctx.fillStyle = badgeColor;
  ctx.beginPath();
  ctx.roundRect(-78, -88, 156, 22, 6);
  ctx.fill();
  ctx.fillStyle = '#FFFBEB';
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, 0, -73);

  if (farmer.suspicion > 4 && farmer.suspicion < 100) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-30, -94, 60, 5);
    ctx.fillStyle = isWarn ? '#FB923C' : '#FACC15';
    ctx.fillRect(-30, -94, 60 * (farmer.suspicion / 100), 5);
  }
  ctx.restore();
}

/** Hero-scaled 1.35x upright 3/4-view illustrated Farm Hound (Biscuit). */
export function drawHoundSprite(ctx, hound, timeSec, scaleMult = 1.32) {
  ctx.save();
  ctx.translate(hound.x, hound.y);
  const flipX = Math.cos(hound.facing) < -0.15 ? -1 : 1;

  if (hound.scentMeter > 20 || hound.calloutTimer > 0) {
    const r = 24 + ((timeSec * 32) % 28);
    ctx.strokeStyle = `rgba(251, 146, 60, ${1 - (r - 24) / 28})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 10, r, r * 0.45, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 20, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.scale(flipX * scaleMult, scaleMult);
  const runBob = Math.abs(Math.sin(hound.runPhase)) * 3;
  ctx.translate(0, -runBob);

  ctx.strokeStyle = '#92400E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-13, -2);
  ctx.lineTo(-20, -10 + Math.sin(timeSec * 16) * 4);
  ctx.stroke();

  ctx.fillStyle = '#78350F';
  ctx.fillRect(-10, 4, 4, 9);
  ctx.fillRect(6, 4, 4, 9);

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
    ctx.roundRect(-38, -46, 76, 20, 6);
    ctx.fill();
    ctx.fillStyle = '#FFFBEB';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(hound.calloutText, 0, -32);
  }
  ctx.restore();
}

/** Gleaming Chef Carving Knife or Heavy Butcher Cleaver sprite. */
export function drawBladeSprite(ctx, x, y, angle, scale = 1.35, isCleaver = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
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

  ctx.fillStyle = '#E2E8F0';
  ctx.beginPath();
  if (isCleaver) {
    ctx.moveTo(-8, -9);
    ctx.lineTo(24, -10);
    ctx.lineTo(26, 8);
    ctx.lineTo(-8, 7);
  } else {
    ctx.moveTo(-8, -6);
    ctx.lineTo(25, -2.5);
    ctx.lineTo(29, 2);
    ctx.lineTo(19, 7.5);
    ctx.lineTo(-8, 5.5);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.6;
  ctx.stroke();

  if (isCleaver) {
    ctx.fillStyle = '#475569';
    ctx.beginPath();
    ctx.arc(18, -5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(-6, isCleaver ? -6.5 : -3.5);
  ctx.lineTo(22, isCleaver ? -7 : -1);
  ctx.stroke();
  ctx.restore();
}

/** Tied burlap Flour Sack trap (dash past to burst blinding flour cloud). */
export function drawFlourSackSprite(ctx, sack) {
  if (sack.triggered) return;
  ctx.save();
  ctx.translate(sack.x, sack.y);
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 12, 18, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#EFE3CE';
  ctx.beginPath();
  ctx.ellipse(0, 2, 17, 15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8C6239';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tied sack neck.
  ctx.fillStyle = '#D6C2A3';
  ctx.beginPath();
  ctx.moveTo(-8, -11);
  ctx.lineTo(8, -11);
  ctx.lineTo(5, -18);
  ctx.lineTo(-5, -18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#B91C1C';
  ctx.fillRect(-7, -12, 14, 3);

  ctx.fillStyle = '#78350F';
  ctx.font = '800 8px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FLOUR', 0, 5);
  ctx.restore();
}

/** Expanding creamy-white flour dust cloud that blinds the Farmer. */
export function drawFlourCloud(ctx, cloud) {
  ctx.save();
  const alpha = Math.min(0.82, (cloud.life / cloud.maxLife) * 1.1);
  ctx.globalAlpha = alpha;
  const grad = ctx.createRadialGradient(cloud.x, cloud.y, 12, cloud.x, cloud.y, cloud.radius);
  grad.addColorStop(0, 'rgba(255, 251, 235, 0.95)');
  grad.addColorStop(0.65, 'rgba(245, 235, 215, 0.72)');
  grad.addColorStop(1, 'rgba(245, 235, 215, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cloud.x, cloud.y, cloud.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
