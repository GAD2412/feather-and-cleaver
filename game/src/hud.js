import { GAME_STATES, HUD_BOTTOM_HEIGHT, HUD_TOP_HEIGHT, VIEW_HEIGHT, VIEW_WIDTH } from './constants.js';
import { STAGE_DEFS } from './stages.js';

/** Renders HUD bars, Title screen, Perk Draft cards, Pause menu, and Caught/Escaped End screen. */
export class HudRenderer {
  render(ctx, engine, timeSec) {
    engine.uiButtons = [];

    if (engine.state === GAME_STATES.TITLE) {
      this._drawTitleScreen(ctx, engine, timeSec);
      return;
    }

    this._drawTopHud(ctx, engine);
    this._drawBottomBar(ctx, engine);

    if (engine.state === GAME_STATES.PERK_SELECT) {
      this._drawPerkSelect(ctx, engine);
    } else if (engine.state === GAME_STATES.PAUSED) {
      this._drawPauseOverlay(ctx, engine);
    } else if (engine.state === GAME_STATES.CAUGHT || engine.state === GAME_STATES.ESCAPED) {
      this._drawEndScreen(ctx, engine);
    }
  }

  _drawButton(ctx, engine, { id, x, y, w, h, label, sublabel = '', bg = '#D97706', hoverBg = '#F59E0B', textColor = '#1E1109', onClick }) {
    const hovered = engine.hoveredButtonId === id;
    engine.uiButtons.push({ id, x, y, w, h, onClick });

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 2, y + 4, w, h, 10);
    ctx.fill();

    ctx.fillStyle = hovered ? hoverBg : bg;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();

    ctx.strokeStyle = '#FEF3C7';
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w * 0.5, sublabel ? y + h * 0.38 : y + h * 0.5);
    if (sublabel) {
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillText(sublabel, x + w * 0.5, y + h * 0.72);
    }
    ctx.restore();
  }

  _drawTopHud(ctx, engine) {
    ctx.save();
    ctx.fillStyle = '#241108';
    ctx.fillRect(0, 0, VIEW_WIDTH, HUD_TOP_HEIGHT);
    ctx.fillStyle = '#D97706';
    ctx.fillRect(0, HUD_TOP_HEIGHT - 2, VIEW_WIDTH, 2);

    // 1. Score & Combo.
    ctx.fillStyle = '#FDE68A';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('SCORE', 20, 20);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.fillText(engine.score.toLocaleString('en-US'), 20, 48);

    if (engine.combo > 1) {
      ctx.fillStyle = '#DC2626';
      ctx.beginPath();
      ctx.roundRect(142, 22, 74, 28, 7);
      ctx.fill();
      ctx.fillStyle = '#FEF08A';
      ctx.font = '900 14px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`x${engine.combo} HOT`, 179, 41);
    }

    // 2. Stage & Distance Progress Bar.
    const stageDef = engine.stage.def;
    const progress = Math.min(1, Math.max(0, (engine.turkey.x - 110) / (stageDef.length - 200)));
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText(
      `STAGE ${stageDef.index + 1}/5: ${stageDef.name.toUpperCase()}  •  ${engine.totalDistance}m`,
      470,
      22,
    );

    const barX = 285;
    const barY = 34;
    const barW = 370;
    const barH = 16;
    ctx.fillStyle = '#451A03';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 8);
    ctx.fill();
    ctx.fillStyle = '#65A30D';
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(18, barW * progress), barH, 8);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(barX, barY, barW, barH);

    // 3. Lives (Tail Feathers).
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FDE68A';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillText('FEATHERS (LIVES)', 690, 20);
    for (let i = 0; i < engine.turkey.maxLives; i++) {
      const fx = 702 + i * 26;
      const fy = 42;
      ctx.save();
      ctx.translate(fx, fy);
      ctx.rotate(-0.35);
      ctx.fillStyle = i < engine.turkey.lives ? '#EF4444' : '#451A03';
      ctx.beginPath();
      ctx.ellipse(0, 0, 7, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }

    // 4. Dash & Decoy pills.
    ctx.fillStyle = '#FDE68A';
    ctx.font = '800 12px system-ui, sans-serif';
    ctx.fillText(`DASH (${engine.turkey.dashCharges}/${engine.turkey.maxDashes})`, 845, 20);
    for (let i = 0; i < engine.turkey.maxDashes; i++) {
      ctx.fillStyle = i < engine.turkey.dashCharges ? '#F59E0B' : '#451A03';
      ctx.beginPath();
      ctx.roundRect(845 + i * 26, 30, 21, 18, 4);
      ctx.fill();
    }

    ctx.fillStyle = '#FDE68A';
    ctx.fillText(`DECOY (${engine.turkey.decoyCharges}/${engine.turkey.maxDecoys})`, 970, 20);
    for (let i = 0; i < engine.turkey.maxDecoys; i++) {
      ctx.fillStyle = i < engine.turkey.decoyCharges ? '#FACC15' : '#451A03';
      ctx.beginPath();
      ctx.arc(980 + i * 22, 40, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. Sound & Pause buttons.
    this._drawButton(ctx, engine, {
      id: 'btn-mute',
      x: 1096,
      y: 16,
      w: 80,
      h: 34,
      label: engine.sound?.muted ? 'MUTED' : 'SFX ON',
      bg: '#451A03',
      hoverBg: '#78350F',
      textColor: '#FEF3C7',
      onClick: () => engine.sound?.toggleMute(),
    });
    this._drawButton(ctx, engine, {
      id: 'btn-pause',
      x: 1186,
      y: 16,
      w: 76,
      h: 34,
      label: 'PAUSE',
      bg: '#451A03',
      hoverBg: '#78350F',
      textColor: '#FEF3C7',
      onClick: () => {
        engine.state = engine.state === GAME_STATES.PAUSED ? GAME_STATES.PLAYING : GAME_STATES.PAUSED;
      },
    });

    ctx.restore();
  }

  _drawBottomBar(ctx, engine) {
    ctx.save();
    const y = VIEW_HEIGHT - HUD_BOTTOM_HEIGHT;
    ctx.fillStyle = '#1E0E06';
    ctx.fillRect(0, y, VIEW_WIDTH, HUD_BOTTOM_HEIGHT);
    ctx.fillStyle = '#92400E';
    ctx.fillRect(0, y, VIEW_WIDTH, 2);

    ctx.fillStyle = '#F5E1BE';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      'WASD / Arrows: Run  •  Space / Left-Click: Flap-Dash (i-frames)  •  E / Right-Click: Corn Decoy  •  C / Cover: Hide  •  P: Pause',
      20,
      y + 26,
    );

    const owned = engine.perks.getOwnedPerks();
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '700 13px system-ui, sans-serif';
    const perkLabel = owned.length > 0 ? `Perks: ${owned.map((p) => p.name).join(' • ')}` : `Close Calls: ${engine.closeCalls}`;
    ctx.fillText(perkLabel, VIEW_WIDTH - 20, y + 26);
    ctx.restore();
  }

  _drawTitleScreen(ctx, engine, timeSec) {
    ctx.save();
    // Warm Thanksgiving harvest backdrop.
    const grad = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    grad.addColorStop(0, '#451A0A');
    grad.addColorStop(0.55, '#7C2D12');
    grad.addColorStop(1, '#291208');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    // Decorative autumn harvest moon & hills.
    ctx.fillStyle = 'rgba(251, 191, 36, 0.16)';
    ctx.beginPath();
    ctx.arc(970, 175, 115, 0, Math.PI * 2);
    ctx.fill();

    // Title emblem card.
    ctx.fillStyle = 'rgba(24, 11, 5, 0.84)';
    ctx.beginPath();
    ctx.roundRect(64, 52, 1152, 616, 22);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Header text.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.fillText('THANKSGIVING STEALTH-ARCADE ESCAPE', 108, 108);

    ctx.fillStyle = '#FFF4DF';
    ctx.font = '900 62px Georgia, serif';
    ctx.fillText('FEATHER & CLEAVER', 108, 174);

    ctx.fillStyle = '#F5E1BE';
    ctx.font = '500 20px system-ui, sans-serif';
    ctx.fillText(
      'Outrun the Farmer, dodge blazing ovens & carving knives, and reach the Freedom Woods!',
      108,
      214,
    );

    // Illustrated vignette box (Turkey + Farmer + Oven + Carving Knife).
    ctx.fillStyle = '#3B1B0C';
    ctx.beginPath();
    ctx.roundRect(108, 244, 540, 278, 16);
    ctx.fill();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw lively illustrated characters inside vignette.
    this._drawTitleVignette(ctx, 108, 244, 540, 278, timeSec);

    // Controls guide panel on the right.
    ctx.fillStyle = '#2B1409';
    ctx.beginPath();
    ctx.roundRect(678, 244, 492, 278, 16);
    ctx.fill();
    ctx.strokeStyle = '#92400E';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('KEYBOARD + MOUSE CONTROLS', 706, 282);

    const rows = [
      ['WASD / Arrows', 'Sprint & weave around cover'],
      ['Space / Left-Click', 'Flap-Dash (brief invulnerability)'],
      ['E / Right-Click', 'Toss Corn Decoy toward cursor'],
      ['C / Haystacks', 'Hide inside cover to lose Farmer'],
      ['P / M', 'Pause game / Toggle Web Audio SFX'],
    ];
    rows.forEach(([key, desc], idx) => {
      const ry = 322 + idx * 38;
      ctx.fillStyle = '#78350F';
      ctx.beginPath();
      ctx.roundRect(706, ry - 18, 178, 28, 6);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(key, 795, ry);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#F5E1BE';
      ctx.font = '500 15px system-ui, sans-serif';
      ctx.fillText(desc, 898, ry);
    });

    // 5-Stage route strip.
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FBBF24';
    ctx.font = '800 13px system-ui, sans-serif';
    ctx.fillText('5-STAGE ESCAPE ROUTE:', 108, 554);
    STAGE_DEFS.forEach((st, idx) => {
      const sx = 108 + idx * 142;
      ctx.fillStyle = '#451A03';
      ctx.beginPath();
      ctx.roundRect(sx, 566, 130, 34, 8);
      ctx.fill();
      ctx.fillStyle = '#FEF3C7';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${idx + 1}. ${st.shortName}`, sx + 65, 588);
    });

    this._drawButton(ctx, engine, {
      id: 'btn-start',
      x: 860,
      y: 550,
      w: 310,
      h: 72,
      label: 'START ESCAPE',
      sublabel: 'Press Enter, Space, or Click',
      bg: '#EA580C',
      hoverBg: '#F97316',
      textColor: '#FFFBEB',
      onClick: () => engine.startNewRun(),
    });
    ctx.restore();
  }

  _drawTitleVignette(ctx, x, y, w, h, timeSec) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 16);
    ctx.clip();

    // Ground strip.
    ctx.fillStyle = '#5B6E29';
    ctx.fillRect(x, y + 165, w, h - 165);

    // Mini Oven on right with stovetop burners & roast glow.
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(x + 410, y + 116, 86, 76);
    ctx.strokeStyle = '#9CA3AF';
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 410, y + 116, 86, 76);
    ctx.fillStyle = '#F97316';
    ctx.fillRect(x + 426, y + 136, 54, 38);
    ctx.fillStyle = '#FEF08A';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROAST OVEN', x + 453, y + 104);

    // Gleaming carving knife hovering mid-air.
    ctx.save();
    ctx.translate(x + 335, y + 88 + Math.sin(timeSec * 3) * 6);
    ctx.rotate(-0.4);
    ctx.fillStyle = '#78350F';
    ctx.fillRect(-30, -5, 18, 10);
    ctx.fillStyle = '#E2E8F0';
    ctx.beginPath();
    ctx.moveTo(-12, -7);
    ctx.lineTo(34, -2);
    ctx.lineTo(28, 7);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Farmer on left with overalls, apron, fork & vision beam.
    ctx.fillStyle = 'rgba(220, 38, 38, 0.28)';
    ctx.beginPath();
    ctx.moveTo(x + 115, y + 180);
    ctx.lineTo(x + 320, y + 110);
    ctx.lineTo(x + 320, y + 250);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 120, y + 195);
    ctx.lineTo(x + 158, y + 193);
    ctx.stroke();

    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.ellipse(x + 108, y + 180, 22, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(x + 96, y + 165, 20, 30);
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.ellipse(x + 118, y + 180, 12, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(x + 108, y + 180, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(x + 108, y + 180, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FDE047';
    ctx.beginPath();
    ctx.arc(x + 108, y + 180, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFF4DF';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.fillText('FARMER', x + 108, y + 144);

    // Hero Turkey dashing center.
    const tx = x + 285;
    const ty = y + 190 + Math.sin(timeSec * 6) * 5;
    const tailColors = ['#B91C1C', '#EA580C', '#F59E0B', '#D97706'];
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-0.4 + i * 0.25);
      ctx.fillStyle = tailColors[i];
      ctx.beginPath();
      ctx.ellipse(-20, 0, 16, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = '#92400E';
    ctx.beginPath();
    ctx.arc(tx, ty, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(tx + 18, ty - 5);
    ctx.lineTo(tx + 32, ty);
    ctx.lineTo(tx + 18, ty + 5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#DC2626';
    ctx.beginPath();
    ctx.arc(tx + 16, ty + 7, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 15px system-ui, sans-serif';
    ctx.fillText('DASH • HIDE • DECOY • SURVIVE', x + w * 0.5, y + 250);
    ctx.restore();
  }

  _drawPerkSelect(ctx, engine) {
    ctx.save();
    ctx.fillStyle = 'rgba(17, 8, 4, 0.82)';
    ctx.fillRect(0, HUD_TOP_HEIGHT, VIEW_WIDTH, VIEW_HEIGHT - HUD_TOP_HEIGHT - HUD_BOTTOM_HEIGHT);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#84CC16';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText(`STAGE ${engine.stageIndex + 1} CLEARED!`, VIEW_WIDTH * 0.5, 138);

    ctx.fillStyle = '#FFF4DF';
    ctx.font = '900 38px Georgia, serif';
    ctx.fillText('CHOOSE AN ESCAPE PERK', VIEW_WIDTH * 0.5, 184);

    const choices = engine.perks.currentChoices;
    const cardW = 300;
    const cardH = 260;
    const gap = 36;
    const startX = (VIEW_WIDTH - (cardW * choices.length + gap * (choices.length - 1))) * 0.5;
    const cardY = 230;

    choices.forEach((perk, idx) => {
      const cx = startX + idx * (cardW + gap);
      const id = `perk-${idx}`;
      const hovered = engine.hoveredButtonId === id;
      engine.uiButtons.push({
        id,
        x: cx,
        y: cardY,
        w: cardW,
        h: cardH,
        onClick: () => engine.applyPerkChoice(idx),
      });

      ctx.fillStyle = hovered ? '#4A2511' : '#2D160B';
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 16);
      ctx.fill();
      ctx.strokeStyle = hovered ? '#FBBF24' : perk.color;
      ctx.lineWidth = hovered ? 3.5 : 2;
      ctx.stroke();

      ctx.fillStyle = perk.color;
      ctx.beginPath();
      ctx.roundRect(cx + 22, cardY + 22, 108, 26, 6);
      ctx.fill();
      ctx.fillStyle = '#1E1109';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText(perk.tag, cx + 76, cardY + 39);

      ctx.fillStyle = '#FFF4DF';
      ctx.font = '800 22px system-ui, sans-serif';
      ctx.fillText(perk.name, cx + cardW * 0.5, cardY + 95);

      ctx.fillStyle = '#F5E1BE';
      ctx.font = '500 15px system-ui, sans-serif';
      this._drawWrappedText(ctx, perk.desc, cx + cardW * 0.5, cardY + 135, cardW - 44, 22);

      ctx.fillStyle = '#FBBF24';
      ctx.font = '800 14px system-ui, sans-serif';
      ctx.fillText(`CLICK OR PRESS [${idx + 1}]`, cx + cardW * 0.5, cardY + cardH - 26);
    });

    ctx.restore();
  }

  _drawPauseOverlay(ctx, engine) {
    ctx.save();
    ctx.fillStyle = 'rgba(17, 8, 4, 0.78)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.fillStyle = '#2B1409';
    ctx.beginPath();
    ctx.roundRect(420, 210, 440, 280, 18);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FFF4DF';
    ctx.font = '900 36px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', 640, 274);

    this._drawButton(ctx, engine, {
      id: 'btn-resume',
      x: 490,
      y: 315,
      w: 300,
      h: 58,
      label: 'RESUME RUN (P)',
      bg: '#65A30D',
      hoverBg: '#84CC16',
      textColor: '#1E1109',
      onClick: () => {
        engine.state = GAME_STATES.PLAYING;
      },
    });
    this._drawButton(ctx, engine, {
      id: 'btn-pause-restart',
      x: 490,
      y: 392,
      w: 300,
      h: 58,
      label: 'RESTART RUN (R)',
      bg: '#B45309',
      hoverBg: '#D97706',
      textColor: '#FFFBEB',
      onClick: () => engine.startNewRun(),
    });
    ctx.restore();
  }

  _drawEndScreen(ctx, engine) {
    const escaped = engine.state === GAME_STATES.ESCAPED;
    ctx.save();
    ctx.fillStyle = 'rgba(17, 8, 4, 0.84)';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    ctx.fillStyle = '#261209';
    ctx.beginPath();
    ctx.roundRect(220, 88, 840, 540, 22);
    ctx.fill();
    ctx.strokeStyle = escaped ? '#84CC16' : '#EF4444';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = escaped ? '#A3E635' : '#F87171';
    ctx.font = '800 16px system-ui, sans-serif';
    ctx.fillText(escaped ? 'FREEDOM WOODS REACHED!' : `CAUGHT BY: ${engine.caughtReason.toUpperCase()}`, 640, 138);

    ctx.fillStyle = '#FFF4DF';
    ctx.font = '900 48px Georgia, serif';
    ctx.fillText(escaped ? 'ESCAPED THANKSGIVING!' : 'STUFFED BEFORE DINNER!', 640, 194);

    // 6-card stats grid.
    const stats = [
      ['FINAL SCORE', engine.score.toLocaleString('en-US')],
      ['DISTANCE', `${engine.totalDistance} m`],
      ['STAGE REACHED', `${engine.stageIndex + 1} / 5 (${engine.stage.def.shortName})`],
      ['CLOSE CALLS', String(engine.closeCalls)],
      ['HAZARDS DODGED', String(engine.hazardsDodged)],
      ['PERSONAL BEST', engine.bestScore.toLocaleString('en-US')],
    ];

    stats.forEach(([label, val], idx) => {
      const col = idx % 3;
      const row = Math.floor(idx / 3);
      const bx = 270 + col * 252;
      const by = 236 + row * 102;
      ctx.fillStyle = '#3B1B0C';
      ctx.beginPath();
      ctx.roundRect(bx, by, 234, 84, 12);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#FBBF24';
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText(label, bx + 117, by + 26);

      ctx.fillStyle = '#FFF4DF';
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.fillText(val, bx + 117, by + 58);
    });

    // Feats badge line.
    const feats = engine.getFeats().join('  •  ');
    ctx.fillStyle = '#FDE68A';
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`FEATS EARNED: ${feats}`, 640, 468);

    this._drawButton(ctx, engine, {
      id: 'btn-restart',
      x: 440,
      y: 506,
      w: 400,
      h: 74,
      label: 'PLAY AGAIN',
      sublabel: 'Click or Press R / Enter to Restart',
      bg: escaped ? '#65A30D' : '#EA580C',
      hoverBg: escaped ? '#84CC16' : '#F97316',
      textColor: '#FFFBEB',
      onClick: () => engine.startNewRun(),
    });
    ctx.restore();
  }

  _drawWrappedText(ctx, text, cx, startY, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let y = startY;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, cx, y);
        line = word;
        y += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, cx, y);
  }
}
