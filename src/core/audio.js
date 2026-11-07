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

    // Wasser an der Quaimauer: gedämpftes Rauschen, dessen Pegel langsam schwillt, dazu einzelne
    // Schwapper (update). Alles läuft über waterOut, dessen Pegel die Nähe zum Quai setzt.
    this.waterPan = ctx.createStereoPanner();
    this.waterOut = ctx.createGain();
    this.waterOut.gain.value = 0;
    this.waterOut.connect(this.waterPan).connect(this.master);
    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'bandpass';
    waterFilter.frequency.value = 420;
    waterFilter.Q.value = 0.8;
    const swell = ctx.createGain();
    swell.gain.value = 0.05;
    const swellLfo = ctx.createOscillator();
    swellLfo.frequency.value = 0.23;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.03;
    swellLfo.connect(swellDepth).connect(swell.gain);
    swellLfo.start();
    this.loop(waterFilter);
    waterFilter.connect(swell).connect(this.waterOut);
    // Kahn: Knarren der Leinen und dumpfes Anstoßen des Rumpfs.
    this.bargePan = ctx.createStereoPanner();
    this.bargeOut = ctx.createGain();
    this.bargeOut.gain.value = 0;
    this.bargeOut.connect(this.bargePan).connect(this.master);
    this.nextSlap = 0;
    this.nextCreak = 4;

    // Fahrende Droschke: leises, dumpfes Rollen der Eisenreifen, darüber einzelne unregelmäßige
    // Stöße, wenn ein Rad über eine Steinkante holpert (update). Die Hufe sollen führen.
    this.cabPan = ctx.createStereoPanner();
    this.cabOut = ctx.createGain();
    this.cabOut.gain.value = 0;
    this.cabOut.connect(this.cabPan).connect(this.master);
    const roll = ctx.createBiquadFilter();
    roll.type = 'lowpass';
    roll.frequency.value = 170;
    const rollGain = ctx.createGain();
    rollGain.gain.value = 0.12;
    this.loop(roll);
    roll.connect(rollGain).connect(this.cabOut);
    this.nextBump = 0;

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

  // Eigener Panner für ein einzelnes Ereignis; er wird abgehängt, wenn der Klang vorbei ist.
  panned(pan, life = 1) {
    const out = this.ctx.createStereoPanner();
    out.pan.value = pan;
    out.connect(this.master);
    setTimeout(() => out.disconnect(), life * 1000);
    return out;
  }

  // Ein Hufpaar im Trab: Hufeisen auf Pflasterstein, ein heller Klick, ein hohles „Klopp“ und ein
  // kurzer Stoß darunter; die beiden diagonalen Hufe fast gleichzeitig, der zweite etwas leiser.
  hoof(vol, pan) {
    const out = this.panned(pan * 0.85);
    for (const [when, k] of [[0, 1], [0.018 + Math.random() * 0.02, 0.75]]) {
      const v = vol * k * (0.85 + Math.random() * 0.3);
      this.burst({ freq: 3200 + Math.random() * 800, q: 3, dur: 0.022, gain: 0.7 * v, when, out });
      this.burst({ freq: 1000 + Math.random() * 250, q: 2.5, dur: 0.06, gain: 1.6 * v, when, out });
      this.burst({ freq: 380 + Math.random() * 60, q: 1.5, dur: 0.08, gain: 1.0 * v, when, out });
    }
  }

  // Ein stehendes Pferd setzt den Huf hart auf.
  stamp(vol, pan) {
    const out = this.panned(pan * 0.85);
    this.burst({ freq: 1800, q: 2, dur: 0.04, gain: 0.35 * vol, out });
    this.burst({ freq: 480, q: 1.4, dur: 0.09, gain: 1.0 * vol, out });
    this.burst({ freq: 150, q: 1, dur: 0.12, gain: 0.8 * vol, out });
  }

  // Schnauben: ein Atemstoß durch die Nüstern, die Lippen flattern dabei.
  snort(vol, pan) {
    const out = this.panned(pan * 0.85, 1.5);
    this.burst({ freq: 520, q: 0.6, dur: 0.6, gain: 0.7 * vol, attack: 0.05, out });
    this.burst({ freq: 1500, q: 0.8, dur: 0.45, gain: 0.2 * vol, attack: 0.04, out });
    for (let i = 0; i < 9; i++) this.burst({ freq: 260 + Math.random() * 80, q: 1.2, dur: 0.035, gain: 0.4 * vol * (1 - i / 10), when: 0.08 + i * 0.032, out });
  }

  // Wiehern: ein heller Ruf, der hoch einsetzt und mit immer stärkerem Tremolo abfällt
  // („i-hi-hi-hi“), durch zwei Formantfilter geformt; darunter Atem, am Ende ein Brummeln.
  neigh(vol, pan) {
    const ctx = this.ctx;
    const out = this.panned(pan * 0.85, 2.6);
    const t = ctx.currentTime;
    const f = 0.9 + Math.random() * 0.25;
    const dur = 1.25 + Math.random() * 0.35;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(620 * f, t);
    osc.frequency.exponentialRampToValueAtTime(1150 * f, t + 0.14);
    osc.frequency.exponentialRampToValueAtTime(980 * f, t + dur * 0.5);
    osc.frequency.exponentialRampToValueAtTime(430 * f, t + dur);
    const trill = ctx.createOscillator();
    trill.frequency.setValueAtTime(19 + Math.random() * 5, t);
    const pitchDepth = ctx.createGain();
    pitchDepth.gain.setValueAtTime(15, t);
    pitchDepth.gain.linearRampToValueAtTime(110 * f, t + dur);
    trill.connect(pitchDepth).connect(osc.frequency);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.32 * vol, t + 0.08);
    env.gain.setValueAtTime(0.32 * vol, t + dur * 0.45);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    // Lautstärke pulst in der zweiten Hälfte mit dem Tremolo.
    const pulse = ctx.createGain();
    pulse.gain.value = 1;
    const pulseDepth = ctx.createGain();
    pulseDepth.gain.setValueAtTime(0, t);
    pulseDepth.gain.linearRampToValueAtTime(0, t + dur * 0.35);
    pulseDepth.gain.linearRampToValueAtTime(0.6, t + dur);
    trill.connect(pulseDepth).connect(pulse.gain);
    const mix = ctx.createGain();
    for (const [freq, q, g] of [[1100, 3, 1], [2600, 4, 0.5], [600, 2, 0.35]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq * f;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g;
      osc.connect(bp).connect(gg).connect(mix);
    }
    mix.connect(env).connect(pulse).connect(out);
    osc.start(t);
    trill.start(t);
    osc.stop(t + dur + 0.05);
    trill.stop(t + dur + 0.05);
    this.burst({ freq: 1600, q: 0.7, dur: dur * 0.9, gain: 0.12 * vol, attack: 0.1, out });
    for (let i = 0; i < 6; i++) this.burst({ freq: 180 + Math.random() * 60, q: 1.4, dur: 0.05, gain: 0.5 * vol * (1 - i / 7), when: dur + 0.05 + i * 0.07, out });
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

  // Eine Welle schwappt gegen die Mauer.
  slap() {
    const loud = Math.random();
    this.burst({ freq: 260 + Math.random() * 380, q: 1.1, dur: 0.3 + Math.random() * 0.35, gain: 0.06 + loud * 0.08, attack: 0.05 + Math.random() * 0.05, out: this.waterOut });
    if (loud > 0.6) this.burst({ freq: 1400 + Math.random() * 900, q: 2, dur: 0.12, gain: 0.015, when: 0.08, attack: 0.02, out: this.waterOut });
  }

  // Eine Leine knarrt, wenn der Kahn sich hebt; manchmal stößt der Rumpf dumpf an die Treppe.
  creak() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const dur = 0.5 + Math.random() * 0.5;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    const f0 = 70 + Math.random() * 40;
    osc.frequency.setValueAtTime(f0, t);
    osc.frequency.linearRampToValueAtTime(f0 * (0.75 + Math.random() * 0.15), t + dur);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 700 + Math.random() * 500;
    f.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(f).connect(g).connect(this.bargeOut);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    if (Math.random() < 0.35) this.burst({ freq: 110, q: 2, dur: 0.3, gain: 0.25, when: dur * 0.6, attack: 0.02, out: this.bargeOut });
  }

  // trainDistance in Metern (Infinity, wenn kein Zug in der Nähe ist); river aus river.js
  // (Abstand und Seite von Quaimauer und Kahn), fehlt in Innenräumen. sounds: Ereignisse des
  // Orts ({ type: 'hoof' | 'stamp' | 'snort', vol, pan }), werden hier abgespielt und geleert.
  // cab: Pegel und Seite der fahrenden Droschke (traffic.js).
  update(dt, trainDistance, river, sounds, cab) {
    if (!this.ctx) {
      if (sounds) sounds.length = 0;
      return;
    }
    this.rain(dt);
    const outdoors = this.env === 'street';
    const now = this.ctx.currentTime;
    if (sounds?.length) {
      if (outdoors) {
        for (const s of sounds) if (s.vol > 0.005) this[s.type]?.(s.vol, s.pan);
      }
      sounds.length = 0;
    }
    this.cabOut.gain.setTargetAtTime(outdoors && cab?.moving ? cab.vol : 0, now, 0.25);
    if (cab) this.cabPan.pan.setTargetAtTime(cab.pan * 0.8, now, 0.1);
    this.nextBump -= dt;
    if (this.nextBump < 0) {
      if (outdoors && cab?.moving && cab.vol > 0.02) this.burst({ freq: 120 + Math.random() * 110, q: 1.3, dur: 0.05 + Math.random() * 0.04, gain: 0.25 + Math.random() * 0.25, out: this.cabOut });
      this.nextBump = 0.06 + Math.random() * 0.16;
    }
    const nearWater = outdoors && river ? Math.max(0, 1 - river.distance / 18) ** 2 : 0;
    const nearBarge = outdoors && river ? Math.max(0, 1 - river.barge / 30) ** 2 : 0;
    this.waterOut.gain.setTargetAtTime(nearWater, now, 0.3);
    this.bargeOut.gain.setTargetAtTime(nearBarge, now, 0.3);
    if (river) {
      this.waterPan.pan.setTargetAtTime(river.pan * 0.7, now, 0.1);
      this.bargePan.pan.setTargetAtTime(river.bargePan * 0.8, now, 0.1);
    }
    this.nextSlap -= dt;
    if (this.nextSlap < 0) {
      if (nearWater > 0.01) this.slap();
      this.nextSlap = 0.5 + Math.random() * 1.4;
    }
    this.nextCreak -= dt;
    if (this.nextCreak < 0) {
      if (nearBarge > 0.01) this.creak();
      this.nextCreak = 5 + Math.random() * 10;
    }
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
