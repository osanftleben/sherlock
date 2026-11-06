// Alle Klänge werden synthetisiert, das Projekt braucht keine Audiodateien.
export class Audio {
  constructor() {
    this.ctx = null;
    this.env = 'street';
    this.nextHoof = 8;
    this.nextBell = 45;
    this.nextDrop = 0;
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
    this.windGain.gain.value = 0.09;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 260;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 80;
    lfo.connect(lfoGain).connect(windFilter.frequency);
    lfo.start();
    this.loop(windFilter);
    windFilter.connect(this.windGain).connect(this.master);

    // Nieselregen: nur ein Hauch Rauschen, der Rest sind einzelne Tropfen
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0.004;
    const rainFilter = ctx.createBiquadFilter();
    rainFilter.type = 'highpass';
    rainFilter.frequency.value = 4500;
    this.loop(rainFilter);
    rainFilter.connect(this.rainGain).connect(this.master);
    // Tropfen laufen über fünf feste Panner; drinnen dämpfen Wand und Fenster sie ab.
    this.dropGain = ctx.createGain();
    this.dropMuffle = ctx.createBiquadFilter();
    this.dropMuffle.type = 'lowpass';
    this.dropMuffle.frequency.value = 16000;
    this.dropGain.connect(this.dropMuffle).connect(this.master);
    this.dropPans = [-0.8, -0.4, 0, 0.4, 0.8].map((v) => {
      const p = ctx.createStereoPanner();
      p.pan.value = v;
      p.connect(this.dropGain);
      return p;
    });

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
    this.windGain.gain.setTargetAtTime(outdoors ? 0.09 : 0.012, t, 0.4);
    this.rainGain.gain.setTargetAtTime(outdoors ? 0.004 : 0.0007, t, 0.4);
    this.dropGain.gain.setTargetAtTime(outdoors ? 1 : 0.35, t, 0.4);
    this.dropMuffle.frequency.setTargetAtTime(outdoors ? 16000 : 1800, t, 0.4);
  }

  burst({ freq = 800, q = 1, dur = 0.08, gain = 0.2, type = 'bandpass', when = 0, attack = 0, out = this.master }) {
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
    if (attack > 0) {
      // Weicher Einsatz statt harten Schlags
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + attack);
    } else {
      g.gain.setValueAtTime(gain, t);
    }
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 2, dur + 0.02);
  }

  tone({ freq, dur = 1, gain = 0.1, type = 'sine', when = 0, attack = 0.005, out = this.master }) {
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
    osc.connect(g).connect(out);
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

  // Die Repetieruhr, wie Krause und Lemke sie hören: nur das helle Glöckchen.
  repeater() {
    for (let i = 0; i < 3; i++) this.tone({ freq: 2093, dur: 0.5, gain: 0.05, when: i * 0.32 });
  }

  // Dieselbe Uhr in der Hand, Viertelrepetition: neun Stundenschläge auf der tiefen Tonfeder,
  // dann drei Viertel als Doppelschlag hell–tief. Drei Viertel zehn.
  repetition() {
    for (let i = 0; i < 9; i++) this.tone({ freq: 1397, dur: 0.6, gain: 0.05, when: i * 0.42 });
    for (let i = 0; i < 3; i++) {
      const when = 9 * 0.42 + 0.5 + i * 0.5;
      this.tone({ freq: 2093, dur: 0.45, gain: 0.05, when });
      this.tone({ freq: 1397, dur: 0.5, gain: 0.05, when: when + 0.17 });
    }
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

  // Regen als dichte, zufällige Folge harter, kurzer Einschläge auf Pflaster,
  // Dach und Fensterblech. Manchmal treffen zwei, drei Tropfen fast gleichzeitig.
  rain(dt) {
    const rate = this.env === 'street' ? 55 : 10;
    this.nextDrop -= dt;
    while (this.nextDrop < 0) {
      this.drop();
      this.nextDrop += -Math.log(1 - Math.random()) / rate;
    }
  }

  drop() {
    const out = this.dropPans[Math.floor(Math.random() * this.dropPans.length)];
    const hits = Math.random() < 0.15 ? 2 + Math.floor(Math.random() * 2) : 1;
    let when = Math.random() * 0.03;
    for (let i = 0; i < hits; i++) {
      const loud = Math.random() ** 2.5;
      this.burst({ freq: 1200 + Math.random() * 6000, q: 1.5 + Math.random() * 4, dur: 0.004 + Math.random() * 0.01, gain: 0.03 + loud * 0.15, when, out });
      when += 0.004 + Math.random() * 0.012;
    }
  }

  // trainDistance in Metern (Infinity, wenn kein Zug in der Nähe ist).
  update(dt, trainDistance) {
    if (!this.ctx) return;
    this.rain(dt);
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
