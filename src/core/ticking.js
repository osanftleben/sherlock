import * as THREE from 'three';

// Tickende Uhren. Jede Uhr im Raum ist eine eigene Schallquelle mit Richtung und
// Abstand. Uhren melden sich über `userData.ticks` an ihrem 3D-Objekt an:
//   { kind: 'pendulum', seed }  Regulator, tickt bei jeder Umkehr des sichtbaren Pendels
//                               und schlägt alle paar Minuten die Gongfeder an
//   { kind: 'wall', size }      runde Wanduhr, schneller und leiser, je kleiner desto heller
// Der Direktschall fällt mit dem Abstand ab, der Raumhall bleibt überall etwa gleich.
const PENDULUM_SPEED = 3.14; // muss zur Pendelanimation in interiors.js passen
const AHEAD = 0.12; // so weit im Voraus werden Schläge eingeplant (Sekunden)
const AUDIBLE = 14; // weiter entfernte Uhren werden gar nicht erst gespielt (Meter)
const SEND = 0.12; // Anteil, der in den Raumhall geht

const pos = new THREE.Vector3();
const dir = new THREE.Vector3();

function hash(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

export class Ticking {
  constructor(audio) {
    this.audio = audio;
    this.clocks = [];
    this.out = null;
  }

  // Sammelt alle Uhren einer Szene ein; vorherige Quellen werden abgebaut.
  setScene(scene) {
    for (const c of this.clocks) c.in?.disconnect();
    this.clocks = [];
    this.nextStrike = null;
    scene.updateMatrixWorld(true);
    scene.traverse((o) => {
      const spec = o.userData.ticks;
      if (!spec) return;
      const p = o.getWorldPosition(new THREE.Vector3());
      const r = hash(p.x * 13.1 + p.y * 7.7 + p.z * 3.3);
      const pendulum = spec.kind === 'pendulum';
      const size = spec.size ?? 0.2;
      this.clocks.push({
        pos: p,
        pendulum,
        seed: spec.seed ?? 0,
        // Kleine Uhren haben kürzere Unruhen und schlagen schneller.
        period: 0.36 + Math.min(size, 0.26) * 0.7 + r * 0.06,
        offset: r * 7,
        pitch: (pendulum ? 0.9 : 1.15 - size) + hash(r * 91) * 0.25,
        loud: pendulum ? 1 : 0.35 + size * 1.6,
        last: null,
        in: null,
      });
    });
  }

  // Schlagzähler: ganzzahlige Werte sind Schläge.
  phase(c, t) {
    return c.pendulum ? (t * PENDULUM_SPEED + c.seed) / Math.PI - 0.5 : t / c.period + c.offset;
  }

  beatTime(c, k) {
    return c.pendulum ? ((k + 0.5) * Math.PI - c.seed) / PENDULUM_SPEED : (k - c.offset) * c.period;
  }

  ensureOutput() {
    const { ctx } = this.audio;
    if (this.out) return;
    this.out = ctx.createGain();
    this.out.gain.value = 1.6; // Gesamtlautstärke aller Uhren
    this.out.connect(this.audio.master);
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.reverb = this.makeReverb(0.9, 0.22);
    this.reverb.connect(this.out);
  }

  // Künstliche Impulsantwort einer möblierten Stube: kurzer, dunkler Nachhall,
  // abklingendes, tiefpassgefiltertes Rauschen, je Kanal anders.
  makeReverb(seconds, decay) {
    const { ctx } = this.audio;
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const ir = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / rate;
        lp += (Math.random() * 2 - 1 - lp) * 0.55;
        d[i] = lp * Math.exp(-t / decay) * Math.min(1, t / 0.006);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  // Eingang einer Uhr: verzweigt in den gerichteten Direktschall und den Raumhall.
  input(c) {
    if (c.in) return c.in;
    const { ctx } = this.audio;
    c.in = ctx.createGain();
    const p = ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 0.7;
    p.rolloffFactor = 1.3;
    p.maxDistance = 40;
    p.positionX.value = c.pos.x;
    p.positionY.value = c.pos.y;
    p.positionZ.value = c.pos.z;
    c.in.connect(p).connect(this.out);
    const send = ctx.createGain();
    send.gain.value = SEND;
    c.in.connect(send).connect(this.reverb);
    return c.in;
  }

  setListener(camera) {
    const { ctx } = this.audio;
    const L = ctx.listener;
    camera.getWorldPosition(pos);
    camera.getWorldDirection(dir);
    if (L.positionX) {
      const t = ctx.currentTime;
      L.positionX.setValueAtTime(pos.x, t);
      L.positionY.setValueAtTime(pos.y, t);
      L.positionZ.setValueAtTime(pos.z, t);
      L.forwardX.setValueAtTime(dir.x, t);
      L.forwardY.setValueAtTime(dir.y, t);
      L.forwardZ.setValueAtTime(dir.z, t);
      L.upX.setValueAtTime(0, t);
      L.upY.setValueAtTime(1, t);
      L.upZ.setValueAtTime(0, t);
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(dir.x, dir.y, dir.z, 0, 1, 0);
    }
  }

  // t ist die Spielzeit, mit der auch die Pendel animiert werden.
  update(t, camera) {
    const { ctx } = this.audio;
    if (!ctx || ctx.state !== 'running' || !this.clocks.length) return;
    this.ensureOutput();
    this.setListener(camera);
    const now = ctx.currentTime;
    for (const c of this.clocks) {
      const due = Math.floor(this.phase(c, t + AHEAD));
      // Nach Raumwechsel oder Pause nicht alle versäumten Schläge nachholen.
      if (c.last === null || due - c.last > 3) c.last = Math.floor(this.phase(c, t));
      if (c.last >= due) continue;
      const far = pos.distanceTo(c.pos) > AUDIBLE;
      while (c.last < due) {
        c.last++;
        if (!far) this.tick(c, now + Math.max(0, this.beatTime(c, c.last) - t), c.last % 2 === 0);
      }
    }
    this.strikes(t, now);
  }

  // Von Zeit zu Zeit schlagen die Regulatoren die halbe Stunde, kurz nacheinander.
  strikes(t, now) {
    const pendulums = this.clocks.filter((c) => c.pendulum);
    if (!pendulums.length) return;
    if (this.nextStrike === null) this.nextStrike = t + 20 + Math.random() * 25;
    if (t < this.nextStrike) return;
    pendulums.forEach((c, i) => this.gong(c, now + i * (0.15 + Math.random() * 0.25)));
    this.nextStrike = t + 180 + Math.random() * 120;
  }

  // Gongfeder eines Regulators: tiefer Grundton mit unharmonischen Obertönen.
  gong(c, t) {
    const out = this.input(c);
    this.hit(out, t, 1800, 2, 0.03, 0.12);
    this.ring(out, t, 196, 5, 0.14);
    this.ring(out, t, 541, 3, 0.06);
    this.ring(out, t, 1061, 1.4, 0.022);
  }

  ring(out, t, freq, dur, gain) {
    const ctx = this.audio.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  hit(out, t, freq, q, dur, gain) {
    const ctx = this.audio.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.9, dur + 0.02);
  }

  // Tick und Tack klingen leicht verschieden: Anker fällt mal links, mal rechts ein.
  tick(c, t, tock) {
    const out = this.input(c);
    const p = c.pitch * (tock ? 0.86 : 1);
    const g = c.loud * (0.85 + Math.random() * 0.3);
    // harter Anschlag der Ankerpalette
    this.hit(out, t, 5200 * p, 1.2, 0.008, 0.5 * g);
    // kurzes Nachsingen von Steigrad und Feder
    this.hit(out, t + 0.002, 2900 * p, 14, 0.045, 1.4 * g);
    // Holzgehäuse; beim Regulator tiefer und voller
    this.hit(out, t, (c.pendulum ? 420 : 900) * p, 5, c.pendulum ? 0.06 : 0.03, (c.pendulum ? 0.9 : 0.5) * g);
  }
}
