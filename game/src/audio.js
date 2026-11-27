/** Procedural Web Audio API sound effects and subtle ambient pulse (zero network requests). */
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.masterGain = null;
    this.stepTimer = 0;
    this.musicTimer = 0;
    this.musicStep = 0;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    try {
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : 0.28;
      this.masterGain.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 0.28, this.ctx.currentTime, 0.02);
    }
    return this.muted;
  }

  playTone({ freq = 440, endFreq = freq, type = 'triangle', duration = 0.14, gain = 0.25, attack = 0.008 }) {
    if (this.muted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const env = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), now + duration);
    }
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(gain, now + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(env);
    env.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playNoise({ duration = 0.16, gain = 0.2, filterFreq = 1200 }) {
    if (this.muted || !this.ctx || !this.masterGain) return;
    if (this.ctx.state === 'suspended') return;
    const now = this.ctx.currentTime;
    const sampleCount = Math.max(1, Math.floor(this.ctx.sampleRate * duration));
    const buffer = this.ctx.createBuffer(1, sampleCount, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / sampleCount);
    }
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(filterFreq, now);
    const env = this.ctx.createGain();
    env.gain.setValueAtTime(gain, now);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter);
    filter.connect(env);
    env.connect(this.masterGain);
    source.start(now);
  }

  playGobble() {
    this.playTone({ freq: 520, endFreq: 340, type: 'sawtooth', duration: 0.08, gain: 0.14 });
    setTimeout(() => {
      this.playTone({ freq: 610, endFreq: 390, type: 'triangle', duration: 0.1, gain: 0.16 });
    }, 65);
  }

  playDash() {
    this.playNoise({ duration: 0.18, gain: 0.24, filterFreq: 1800 });
    this.playTone({ freq: 280, endFreq: 660, type: 'sine', duration: 0.14, gain: 0.15 });
  }

  playDecoy() {
    this.playTone({ freq: 440, endFreq: 720, type: 'triangle', duration: 0.09, gain: 0.16 });
    setTimeout(() => {
      this.playTone({ freq: 580, endFreq: 420, type: 'sine', duration: 0.11, gain: 0.12 });
    }, 95);
  }

  playAlert(suspiciousOnly = false) {
    if (suspiciousOnly) {
      this.playTone({ freq: 340, endFreq: 470, type: 'sine', duration: 0.12, gain: 0.14 });
      return;
    }
    this.playTone({ freq: 520, endFreq: 880, type: 'square', duration: 0.12, gain: 0.14 });
    setTimeout(() => {
      this.playTone({ freq: 880, endFreq: 1040, type: 'square', duration: 0.14, gain: 0.12 });
    }, 95);
  }

  playKnifeWhoosh() {
    this.playNoise({ duration: 0.14, gain: 0.18, filterFreq: 2600 });
    this.playTone({ freq: 920, endFreq: 260, type: 'sine', duration: 0.12, gain: 0.08 });
  }

  playOvenBlast() {
    this.playNoise({ duration: 0.28, gain: 0.26, filterFreq: 650 });
    this.playTone({ freq: 170, endFreq: 72, type: 'sawtooth', duration: 0.24, gain: 0.18 });
  }

  playCloseCall() {
    this.playTone({ freq: 660, endFreq: 990, type: 'triangle', duration: 0.1, gain: 0.18 });
    setTimeout(() => {
      this.playTone({ freq: 990, endFreq: 1320, type: 'sine', duration: 0.14, gain: 0.16 });
    }, 75);
  }

  playPickup(isRare = false) {
    const base = isRare ? 740 : 580;
    this.playTone({ freq: base, endFreq: base * 1.45, type: 'sine', duration: 0.11, gain: 0.16 });
  }

  playHit() {
    this.playNoise({ duration: 0.22, gain: 0.28, filterFreq: 900 });
    this.playTone({ freq: 240, endFreq: 90, type: 'sawtooth', duration: 0.22, gain: 0.22 });
  }

  playStageClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playTone({ freq: n, type: 'triangle', duration: 0.16, gain: 0.18 });
      }, idx * 80);
    });
  }

  playCaught() {
    const notes = [330, 277.18, 220, 146.83];
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playTone({ freq: n, type: 'sawtooth', duration: 0.2, gain: 0.18 });
      }, idx * 120);
    });
  }

  playVictory() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    notes.forEach((n, idx) => {
      setTimeout(() => {
        this.playTone({ freq: n, type: 'triangle', duration: 0.22, gain: 0.2 });
      }, idx * 95);
    });
  }

  tickFootstep(dt, moving, dangerRatio) {
    if (!moving) {
      this.stepTimer = 0.08;
    } else {
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = dangerRatio > 0.6 ? 0.17 : 0.23;
        this.playTone({ freq: 145 + Math.random() * 35, endFreq: 95, type: 'sine', duration: 0.045, gain: 0.05 });
      }
    }

    // Subtle procedural autumn groove that quickens when the farmer is chasing.
    this.musicTimer -= dt;
    if (this.musicTimer <= 0) {
      const tempo = dangerRatio > 0.7 ? 0.22 : 0.34;
      this.musicTimer = tempo;
      const scale = dangerRatio > 0.7 ? [196, 233.08, 261.63, 293.66] : [196, 220, 261.63, 329.63];
      const freq = scale[this.musicStep % scale.length];
      this.musicStep += 1;
      this.playTone({ freq, endFreq: freq * 0.98, type: 'triangle', duration: 0.14, gain: 0.032 });
    }
  }
}
