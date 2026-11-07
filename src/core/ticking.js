import * as THREE from 'three';

// Tickende Uhren. Jede Uhr im Raum ist eine eigene Schallquelle mit Richtung und
// Abstand. Uhren melden sich über `userData.ticks` an ihrem 3D-Objekt an:
//   { kind: 'pendulum', seed, speed }  Regulator, tickt kurz nach jedem Durchgang des sichtbaren
//                               Pendels durch die Mitte (dort fällt bei der Ankerhemmung der Zahn)
//                               und schlägt alle paar Minuten die Gongfeder an
//   { kind: 'wall', size }      runde Wanduhr, schneller und leiser, je kleiner desto heller
// Beide spielen vorab berechnete, weiche Schläge (pendulumBeat); harte Klicks wirkten aufdringlich.
// Der Direktschall fällt mit dem Abstand ab, der Raumhall bleibt überall etwa gleich.
const PENDULUM_SPEED = 3.14; // Ersatz, falls eine Uhr kein eigenes Tempo meldet (interiors/room.js)
// Der Zahn fällt nicht genau in der Mitte, sondern kurz danach auf die Palette (Sekunden).
const DROP_LAG = 0.04;
const AHEAD = 0.12; // so weit im Voraus werden Schläge eingeplant (Sekunden)
const AUDIBLE = 14; // weiter entfernte Uhren werden gar nicht erst gespielt (Meter)
const SEND = 0.12; // Anteil, der in den Raumhall geht
// Lautstärke eines Regulatorschlags vor Abstand und Raumhall; so gewählt, dass er 12 dB leiser ist
// als der frühere, aufdringliche Schlag (gemessen als Effektivwert über 50 ms).
const PENDULUM_LEVEL = 0.27;
// Runde Wanduhren: mit ihrem Faktor `loud` je nach Größe 4–6 dB leiser als ein Regulator (RMS 50 ms).
const WALL_LEVEL = 0.35;

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
        speed: spec.speed ?? PENDULUM_SPEED,
        // Kleine Uhren haben kürzere Unruhen und schlagen schneller.
        period: 0.36 + Math.min(size, 0.26) * 0.7 + r * 0.06,
        offset: r * 7,
        // Beim Regulator verschiebt die Tonhöhe nur das Gehäuse ein wenig, sonst klänge er nach Spielzeug.
        pitch: pendulum ? 0.94 + hash(r * 91) * 0.12 : 1.15 - size + hash(r * 91) * 0.25,
        loud: pendulum ? 1 : 0.35 + size * 1.6,
        last: null,
        in: null,
      });
    });
  }

  // Schlagzähler: ganzzahlige Werte sind Schläge.
  phase(c, t) {
    return c.pendulum ? ((t - DROP_LAG) * c.speed + c.seed) / Math.PI : t / c.period + c.offset;
  }

  beatTime(c, k) {
    return c.pendulum ? (k * Math.PI - c.seed) / c.speed + DROP_LAG : (k - c.offset) * c.period;
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
    // Je drei leicht verschiedene Fassungen von Tick und Tack, damit kein Schlag dem anderen gleicht.
    const rate = ctx.sampleRate;
    this.pendulumBeats = [false, true].map((tock) => [0, 1, 2].map((v) => this.pendulumBeat(rate, tock, v)));
    this.wallBeats = [false, true].map((tock) => [0, 1, 2].map((v) => this.pendulumBeat(rate, tock, v, true)));
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
    // Weite Reichweite: Aus der Nähe so laut wie zuvor, in 2–8 m Abstand rund 4 dB lauter als früher (0.7/1.3).
    p.refDistance = 0.8;
    p.rolloffFactor = 0.85;
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
    const g = c.loud * (0.85 + Math.random() * 0.3);
    const set = (c.pendulum ? this.pendulumBeats : this.wallBeats)[tock ? 1 : 0];
    const src = this.audio.ctx.createBufferSource();
    src.buffer = set[Math.floor(Math.random() * set.length)];
    src.playbackRate.value = c.pitch;
    const gain = this.audio.ctx.createGain();
    gain.gain.value = g;
    src.connect(gain).connect(out);
    src.start(t);
  }

  // Ein Schlag eines Regulators, vorab als kurzer Klang berechnet: ein leises, gedämpftes „tk“.
  // Der Zahn fällt auf die Palette, und das Holzgehäuse antwortet mit wenigen kurzen Eigentönen;
  // darüber nur ein Hauch Stahl, damit man die Uhr noch als Uhr erkennt. Der Anschlag ist bewusst
  // geglättet: Ein harter Klick und lang nachklingender Stahl wirkten aufdringlich (Hörprobe F,
  // vom Nutzer gewählt). Beim Tack fällt der Zahn auf die andere Palette: etwas tiefer, etwas
  // leiser, mit einem kleinen Nachschlag.
  // small: runde Wanduhr ohne Pendel. Kleineres Gehäuse, also höhere und kürzere Eigentöne, und
  // leiser als ein Regulator; je kleiner die Uhr, desto höher spielt tick() sie ab.
  pendulumBeat(rate, tock, variant, small = false) {
    const len = Math.floor(rate * (small ? 0.05 : 0.08));
    const buf = this.audio.ctx.createBuffer(1, len, rate);
    const d = buf.getChannelData(0);
    let seed = 1 + variant * 7 + (tock ? 31 : 0) + (small ? 101 : 0);
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const jitter = (x, amount) => x * (1 + (rnd() * 2 - 1) * amount);
    // [Frequenz Hz, Stärke, Abklingzeit s]
    const steel = (small ? [[3600, 0.025, 0.004], [5200, 0.015, 0.003]] : [[2900, 0.03, 0.006], [4400, 0.02, 0.004]])
      .map(([f, a, tau]) => [jitter(f * (tock ? 0.93 : 1), 0.02), jitter(a, 0.1), tau, rnd() * 6.28]);
    const wood = (small ? [[1100, 0.1, 0.006], [1800, 0.08, 0.004], [2600, 0.05, 0.003]] : [[650, 0.12, 0.01], [1100, 0.1, 0.007], [1700, 0.06, 0.005]])
      .map(([f, a, tau]) => [jitter(f * (tock ? 0.96 : 1), 0.015), jitter(a, 0.1), tau]);
    const echo = tock ? 0.004 + rnd() * 0.003 : -1; // Nachschlag beim Tack
    const level = (small ? WALL_LEVEL : PENDULUM_LEVEL) * (tock ? 0.9 : 1);
    let prev = 0;
    let soft = 0;
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const noise = rnd() * 2 - 1;
      // Anschlag: differenziertes Rauschen, stark geglättet, in gut einer Millisekunde verklungen.
      soft += ((noise - prev) * 0.9 * Math.exp(-t / 0.0015) - soft) * 0.15;
      prev = noise;
      let v = soft;
      for (const [f, a, tau, ph] of steel) {
        v += a * Math.exp(-t / tau) * Math.sin(6.2832 * f * t + ph);
        if (echo > 0 && t > echo) v += 0.35 * a * Math.exp(-(t - echo) / tau) * Math.sin(6.2832 * f * (t - echo) + ph);
      }
      // Das Gehäuse schwingt in einer Millisekunde weich an.
      const swell = 1 - Math.exp(-t / 0.001);
      for (const [f, a, tau] of wood) v += swell * a * Math.exp(-t / tau) * Math.sin(6.2832 * f * t);
      // Die letzten 10 ms sanft ausblenden.
      d[i] = v * level * Math.min(1, (len - i) / (rate * 0.01));
    }
    return buf;
  }
}
