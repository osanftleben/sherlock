// Alle Klänge werden synthetisiert, das Projekt braucht keine Audiodateien.
export class Audio {
  constructor() {
    this.ctx = null;
    this.env = 'street';
    this.nextHoof = 8;
    this.nextBell = 45;
  }

  // Muss aus einer Nutzeraktion heraus aufgerufen werden (Autoplay-Regeln).
  start() {
    if (this.ctx) {
      this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(ctx.destination);

    const len = ctx.sampleRate * 3;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    // Wind
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.16;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 340;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 130;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();
    this.loop(windFilter);
    windFilter.connect(this.windGain).connect(this.master);

    // Nieselregen
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0.035;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 3500;
    this.loop(rainFilter);
    rainFilter.connect(this.rainGain).connect(this.master);

    // Grollen der Stadtbahn
    this.trainGain = ctx.createGain();
    this.trainGain.gain.value = 0;
    const trainFilter = ctx.createBiquadFilter();
    trainFilter.type = 'lowpass';
    trainFilter.frequency.value = 130;
    this.loop(trainFilter);
    trainFilter.connect(this.trainGain).connect(this.master);

    this.setEnvironment(this.env);
  }

  loop(target) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.connect(target);
    src.start();
  }

  setEnvironment(env) {
    this.env = env;
    if (!this.ctx) return;
    const outdoors = env === 'street';
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(outdoors ? 0.16 : 0.02, t, 0.4);
    this.rainGain.gain.setTargetAtTime(outdoors ? 0.035 : 0.002, t, 0.4);
  }

  burst({ freq = 800, q = 1, dur = 0.08, gain = 0.2, type = 'bandpass', when = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loopStart = Math.random();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random() * 2, dur + 0.02);
  }

  tone({ freq, dur = 1, gain = 0.1, type = 'sine', when = 0, attack = 0.005 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    return osc;
  }

  step(onWood) {
    if (onWood) {
      this.burst({ freq: 240, q: 1.5, dur: 0.09, gain: 0.32 });
    } else {
      this.burst({ freq: 900 + Math.random() * 300, q: 0.9, dur: 0.06, gain: 0.2 });
      this.burst({ freq: 180, q: 1, dur: 0.07, gain: 0.25 });
    }
  }

  hooves() {
    for (let i = 0; i < 8; i++) {
      this.burst({ freq: 1100, q: 3, dur: 0.05, gain: 0.05 + i * 0.006, when: i * 0.24 + (i % 2) * 0.05 });
    }
  }

  bell() {
    for (let i = 0; i < 3; i++) {
      const when = i * 2.6;
      this.tone({ freq: 196, dur: 3.5, gain: 0.03, when });
      this.tone({ freq: 392, dur: 2.4, gain: 0.018, when });
      this.tone({ freq: 587, dur: 1.5, gain: 0.01, when });
    }
  }

  // Die Repetieruhr selbst, nur für Krauses Aussage.
  repeater() {
    for (let i = 0; i < 3; i++) this.tone({ freq: 2093, dur: 0.5, gain: 0.05, when: i * 0.32 });
  }

  chime() {
    this.tone({ freq: 880, dur: 0.5, gain: 0.05 });
    this.tone({ freq: 1320, dur: 0.7, gain: 0.04, when: 0.1 });
  }

  deduction() {
    [523, 659, 784, 1047].forEach((freq, i) => this.tone({ freq, dur: 0.8, gain: 0.05, when: i * 0.09 }));
  }

  page() {
    this.burst({ freq: 3000, q: 0.5, dur: 0.12, gain: 0.05 });
  }

  door() {
    this.burst({ freq: 300, q: 2, dur: 0.18, gain: 0.3 });
    this.burst({ freq: 150, q: 2, dur: 0.22, gain: 0.3, when: 0.28 });
  }

  // Holmes' Geige: ein kurzes, schwermütiges Motiv.
  violin() {
    if (!this.ctx) return;
    const notes = [[440, 0.7], [523, 0.5], [494, 0.5], [440, 0.9], [392, 0.5], [349, 0.5], [330, 1.6]];
    let when = 0;
    for (const [freq, dur] of notes) {
      const ctx = this.ctx;
      const t = ctx.currentTime + when;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const vib = ctx.createOscillator();
      vib.frequency.value = 5.2;
      const vibGain = ctx.createGain();
      vibGain.gain.value = 4;
      vib.connect(vibGain).connect(osc.frequency);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
      g.gain.setValueAtTime(0.05, t + dur * 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.1);
      osc.connect(f).connect(g).connect(this.master);
      osc.start(t);
      vib.start(t);
      osc.stop(t + dur + 0.15);
      vib.stop(t + dur + 0.15);
      when += dur;
    }
  }

  // trainDistance in Metern (Infinity, wenn kein Zug in der Nähe ist).
  update(dt, trainDistance) {
    if (!this.ctx) return;
    if (this.env === 'street') {
      this.nextHoof -= dt;
      if (this.nextHoof < 0) {
        this.hooves();
        this.nextHoof = 18 + Math.random() * 30;
      }
    }
    this.nextBell -= dt;
    if (this.nextBell < 0) {
      this.bell();
      this.nextBell = 90 + Math.random() * 60;
    }
    const near = this.env === 'street' ? Math.max(0, 1 - trainDistance / 150) : 0;
    this.trainGain.gain.setTargetAtTime(near * near * 0.8, this.ctx.currentTime, 0.3);
  }
}
