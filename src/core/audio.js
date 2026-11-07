// Alle Klänge werden synthetisiert, das Projekt braucht keine Audiodateien.

// Grundpegel des Zugrollens, zwischen den Schienenstößen.
const RUMBLE_BASE = 0.5;

export class Audio {
  constructor() {
    this.ctx = null;
    this.env = 'street';
    this.nextHoof = 8;
    this.nextBell = 45;
    this.nextClack = 0;
    this.nextClank = 0;
    this.nextHop = 0;
    this.nextTram = 25;
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

    // Wind: zwischen den Häusern meist fast still, dann und wann eine Böe, die anschwillt,
    // dabei heller wird und wieder abflaut (geplant in update). windGain ist der Pegel für
    // drinnen oder draußen, windGust die Böe selbst.
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.065;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'lowpass';
    this.windFilter.frequency.value = 220;
    this.windGust = ctx.createGain();
    this.windGust.gain.value = 0.3;
    this.nextGust = 4 + Math.random() * 8;
    this.loop(this.windFilter);
    this.windFilter.connect(this.windGust).connect(this.windGain).connect(this.master);

    // Ferne Stadt: ein tiefes, langsam an- und abschwellendes Grollen hinter den Häusern,
    // Räder und Hufe vieler Straßen, zu einem Rauschen verschwommen.
    this.cityGain = ctx.createGain();
    this.cityGain.gain.value = 0.03;
    const cityFilter = ctx.createBiquadFilter();
    cityFilter.type = 'bandpass';
    cityFilter.frequency.value = 170;
    cityFilter.Q.value = 0.8;
    const citySwell = ctx.createGain();
    citySwell.gain.value = 1;
    const cityLfo = ctx.createOscillator();
    cityLfo.frequency.value = 0.031;
    const cityLfoGain = ctx.createGain();
    cityLfoGain.gain.value = 0.35;
    cityLfo.connect(cityLfoGain).connect(citySwell.gain);
    cityLfo.start();
    this.loop(cityFilter);
    cityFilter.connect(citySwell).connect(this.cityGain).connect(this.master);

    // Nieselregen: nur ein Hauch Rauschen, der Rest sind einzelne Tropfen
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = 0.0025;
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

    // Stadtbahn auf dem Viadukt, aus der Richtung der Wagen (trainPan): tiefes Grollen des
    // Mauerwerks und darüber das Rollen der Räder, das auch kleine Lautsprecher wiedergeben.
    // Pegel setzt update aus der Nähe; Dampfstöße der Lok und Schienenstöße kommen dazu.
    this.trainPan = ctx.createStereoPanner();
    this.trainPan.connect(this.master);
    this.trainGain = ctx.createGain();
    this.trainGain.gain.value = 0;
    this.trainGain.connect(this.trainPan);
    // Gefiltertes Rauschen klingt nach Wind oder Brandung, wie man es auch formt, erst recht,
    // wenn sein Pegel zufällig auf und ab geht. Rollendes Eisen dagegen sind unzählige kleine
    // Schläge von Rad auf Schiene, und jeder bringt Radreifen und Schiene kurz zum Klingen.
    // Deshalb dichte, gleichmäßige Impulse (grit), so dicht, dass sie nicht knistern, durch
    // schmale Resonanzen, unharmonisch gestimmt wie die Eigentöne eines Radreifens. Je schneller
    // die Fahrt, desto dichter die Schläge (update setzt die Abspielrate).
    const gritLen = ctx.sampleRate * 2;
    const gritBuffer = ctx.createBuffer(1, gritLen, ctx.sampleRate);
    const gritData = gritBuffer.getChannelData(0);
    const gritRate = 5000 / ctx.sampleRate;
    for (let i = 0; i < gritLen; i++) {
      if (Math.random() < gritRate) gritData[i] = (Math.random() < 0.5 ? -1 : 1) * (0.4 + 0.6 * Math.random());
    }
    this.grit = ctx.createBufferSource();
    this.grit.buffer = gritBuffer;
    this.grit.loop = true;
    this.grit.start();
    // Alles Rollen läuft über rumbling. Sein Pegel schwankt nicht zufällig, sondern im Takt der
    // Fahrt: Bei jeder Achse über einem Schienenstoß schwillt das Grollen kurz an (clack), dazu
    // sanft die Radumdrehung (gut 4 Hz bei voller Fahrt).
    const rumbling = ctx.createGain();
    rumbling.gain.value = RUMBLE_BASE;
    rumbling.connect(this.trainGain);
    this.rumbling = rumbling;
    this.wheelTurn = ctx.createOscillator();
    this.wheelTurn.frequency.value = 4.2;
    const turnDepth = ctx.createGain();
    turnDepth.gain.value = 0.08;
    this.wheelTurn.connect(turnDepth).connect(rumbling.gain);
    this.wheelTurn.start();
    // Eigentöne von Radreifen und Schiene: Frequenz, Güte, Anteil.
    const steel = ctx.createGain();
    steel.gain.value = 1.6;
    steel.connect(rumbling);
    this.steel = steel;
    for (const [freq, q, gain] of [[430, 10, 1], [1080, 18, 0.8], [1730, 24, 0.6], [2540, 28, 0.45], [3390, 30, 0.3]]) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = gain;
      this.grit.connect(f).connect(g).connect(steel);
    }
    // Das Mauerwerk dröhnt mit: tiefes Grollen und ein Dröhnen um 180 Hz, leiser als das Eisen,
    // sonst wird es wieder zum Rauschen.
    const trainFilter = ctx.createBiquadFilter();
    trainFilter.type = 'lowpass';
    trainFilter.frequency.value = 130;
    const rumble = ctx.createGain();
    rumble.gain.value = 1.0;
    this.loop(trainFilter);
    trainFilter.connect(rumble).connect(rumbling);
    const boomFilter = ctx.createBiquadFilter();
    boomFilter.type = 'bandpass';
    boomFilter.frequency.value = 180;
    boomFilter.Q.value = 1.4;
    const boom = ctx.createGain();
    boom.gain.value = 0.45;
    this.loop(boomFilter);
    boomFilter.connect(boom).connect(rumbling);
    this.locoPan = ctx.createStereoPanner();
    this.locoPan.connect(this.master);
    this.locoOut = ctx.createGain();
    this.locoOut.gain.value = 0;
    this.locoOut.connect(this.locoPan);
    this.nextChuff = 0;
    this.whistled = false;
    // Stehende Lok: leises Zischen aus Ventilen und Zylindern, dazu ab und zu die Luftpumpe.
    const steamFilter = ctx.createBiquadFilter();
    steamFilter.type = 'bandpass';
    steamFilter.frequency.value = 4200;
    steamFilter.Q.value = 0.6;
    this.steamGain = ctx.createGain();
    this.steamGain.gain.value = 0;
    this.loop(steamFilter);
    steamFilter.connect(this.steamGain).connect(this.locoOut);
    this.nextPump = 0;
    // Bremsen: Die Klötze kreischen auf den Rädern in den letzten Metern. Kein reiner Ton, der
    // klänge nach Pfeife: Jedes Rad singt in seiner eigenen Höhe, rau wie eine Geigensaite, und
    // setzt im Wechsel von Haften und Rutschen immer wieder aus (flick). Die Höhe wandert ein
    // wenig und springt dann und wann auf einen Nachbarton (update, nextHop). Darunter schaben
    // die Klötze. Steht der Zug, knarzt es noch einmal (brakeGroan).
    this.squealGain = ctx.createGain();
    this.squealGain.gain.value = 0;
    this.squealGain.connect(this.trainPan);
    this.squealVoices = [];
    for (const [base, share] of [[2380, 0.8], [3150, 1], [3610, 0.6], [4470, 0.45]]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = base;
      const shake = ctx.createBufferSource();
      shake.buffer = this.noise;
      shake.loop = true;
      const flickFilter = ctx.createBiquadFilter();
      flickFilter.type = 'lowpass';
      flickFilter.frequency.value = 14 + Math.random() * 10;
      const flickDepth = ctx.createGain();
      flickDepth.gain.value = 30;
      const flick = ctx.createGain();
      flick.gain.value = 0.15;
      shake.connect(flickFilter).connect(flickDepth).connect(flick.gain);
      const driftFilter = ctx.createBiquadFilter();
      driftFilter.type = 'lowpass';
      driftFilter.frequency.value = 1.5;
      const driftDepth = ctx.createGain();
      driftDepth.gain.value = 6000;
      shake.connect(driftFilter).connect(driftDepth).connect(osc.frequency);
      shake.start(0, Math.random() * 2.5);
      const g = ctx.createGain();
      g.gain.value = share;
      osc.connect(flick).connect(g).connect(this.squealGain);
      osc.start();
      this.squealVoices.push({ osc, base });
    }
    const scrapeFilter = ctx.createBiquadFilter();
    scrapeFilter.type = 'bandpass';
    scrapeFilter.frequency.value = 2600;
    scrapeFilter.Q.value = 1.2;
    const scrape = ctx.createGain();
    scrape.gain.value = 0.5;
    this.loop(scrapeFilter);
    scrapeFilter.connect(scrape).connect(this.squealGain);

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

    // Fallrohr: ein dünner Strahl plätschert auf die Gehwegplatten. Helles, unruhiges Rauschen,
    // dessen Pegel schnell flattert, dazu einzelne Tropfen (update). gutterOut setzt die Nähe.
    this.gutterPan = ctx.createStereoPanner();
    this.gutterOut = ctx.createGain();
    this.gutterOut.gain.value = 0;
    this.gutterOut.connect(this.gutterPan).connect(this.master);
    const trickle = ctx.createBiquadFilter();
    trickle.type = 'bandpass';
    trickle.frequency.value = 2400;
    trickle.Q.value = 1.2;
    const bubble = ctx.createGain();
    bubble.gain.value = 0.015;
    const flutter = ctx.createBiquadFilter();
    flutter.type = 'lowpass';
    flutter.frequency.value = 22;
    const flutterDepth = ctx.createGain();
    flutterDepth.gain.value = 0.4;
    this.loop(flutter);
    flutter.connect(flutterDepth).connect(bubble.gain);
    this.loop(trickle);
    trickle.connect(bubble).connect(this.gutterOut);
    this.nextDrip = 0;

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

  // Eine Böe: in ein bis drei Sekunden hoch, kurz halten, in drei bis sechs Sekunden wieder
  // auf das leise Grundrauschen. Je stärker, desto heller.
  gust(dt, now) {
    this.nextGust -= dt;
    if (this.nextGust > 0) return;
    const peak = 0.5 + Math.random() * 0.6;
    const rise = 1 + Math.random() * 2;
    const hold = 0.5 + Math.random() * 2;
    const fall = 3 + Math.random() * 3;
    const g = this.windGust.gain;
    const f = this.windFilter.frequency;
    g.cancelScheduledValues(now);
    f.cancelScheduledValues(now);
    g.setTargetAtTime(peak, now, rise / 3);
    g.setTargetAtTime(0.2 + Math.random() * 0.15, now + rise + hold, fall / 3);
    f.setTargetAtTime(230 + peak * 150, now, rise / 3);
    f.setTargetAtTime(200 + Math.random() * 40, now + rise + hold, fall / 3);
    // Manchmal folgt eine zweite Böe dicht auf die erste, sonst bleibt es eine Weile ruhig.
    this.nextGust = Math.random() < 0.25 ? rise + hold + 1 : rise + hold + fall + 6 + Math.random() * 18;
  }

  setEnvironment(env) {
    this.env = env;
    if (!this.ctx) return;
    const outdoors = env === 'street';
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(outdoors ? 0.065 : 0.025, t, 0.4);
    this.cityGain.gain.setTargetAtTime(outdoors ? 0.03 : 0.006, t, 0.4);
    this.rainGain.gain.setTargetAtTime(outdoors ? 0.0025 : 0.0005, t, 0.4);
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

  // Wiehern nach Briefer u. a. (Sci. Rep. 2015) und Lefèvre u. a. (Curr. Biol. 2026): zwei
  // unabhängige Grundtöne. G0 (um 1500 Hz) ist ein Pfeifen im Kehlkopf und klingt von Anfang an,
  // F0 (um 400 Hz) kommt aus den Stimmlippen, setzt mit dem Höhepunkt ein und trägt Obertöne.
  // Drei Teile: Einleitung hoch und tonal, Höhepunkt lang und in Tonhöhe und Lautstärke
  // moduliert, Ende tief und leise als unruhige Pulsfolge. Dazu Atemrauschen bis in die Höhen.
  neigh(vol, pan) {
    const ctx = this.ctx;
    const out = this.panned(pan * 0.85, 3);
    const t = ctx.currentTime;
    const k = 0.9 + Math.random() * 0.2;
    const intro = 0.18 + Math.random() * 0.06;
    const climax = intro + 0.75 + Math.random() * 0.3;
    const end = climax + 0.35;
    // Gemeinsames Beben beider Töne, zum Ende hin stärker und etwas langsamer.
    const mod = ctx.createOscillator();
    mod.frequency.setValueAtTime(12 + Math.random() * 2, t);
    mod.frequency.linearRampToValueAtTime(9, t + climax);
    // Unruhe in der Stimme: tiefpassgefiltertes Rauschen auf der Tonhöhe.
    const jitterSrc = ctx.createBufferSource();
    jitterSrc.buffer = this.noise;
    jitterSrc.loop = true;
    const jitterLp = ctx.createBiquadFilter();
    jitterLp.type = 'lowpass';
    jitterLp.frequency.value = 60;

    // G0: Pfeifton, fast sinusförmig.
    const g0 = ctx.createOscillator();
    g0.frequency.setValueAtTime(1500 * k, t);
    g0.frequency.exponentialRampToValueAtTime(1750 * k, t + intro * 0.7);
    g0.frequency.exponentialRampToValueAtTime(1600 * k, t + intro + (climax - intro) * 0.4);
    g0.frequency.exponentialRampToValueAtTime(1150 * k, t + climax);
    const g0Fm = ctx.createGain();
    g0Fm.gain.setValueAtTime(10, t);
    g0Fm.gain.linearRampToValueAtTime(110 * k, t + climax);
    mod.connect(g0Fm).connect(g0.frequency);
    const g0Env = ctx.createGain();
    g0Env.gain.setValueAtTime(0.0001, t);
    g0Env.gain.exponentialRampToValueAtTime(0.09 * vol, t + 0.04);
    g0Env.gain.setValueAtTime(0.09 * vol, t + intro);
    g0Env.gain.exponentialRampToValueAtTime(0.05 * vol, t + climax * 0.8);
    g0Env.gain.exponentialRampToValueAtTime(0.0001, t + climax + 0.05);

    // F0: Stimme mit Obertönen, durch einen langen Vokaltrakt geformt.
    const f0 = ctx.createOscillator();
    f0.type = 'sawtooth';
    f0.frequency.setValueAtTime(470 * k, t + intro);
    f0.frequency.exponentialRampToValueAtTime(540 * k, t + intro + 0.12);
    f0.frequency.exponentialRampToValueAtTime(330 * k, t + climax);
    const f0Fm = ctx.createGain();
    f0Fm.gain.setValueAtTime(8, t);
    f0Fm.gain.linearRampToValueAtTime(40 * k, t + climax);
    mod.connect(f0Fm).connect(f0.frequency);
    const jitterDepth = ctx.createGain();
    jitterDepth.gain.value = 600;
    jitterSrc.connect(jitterLp).connect(jitterDepth).connect(f0.frequency);
    const voice = ctx.createGain();
    for (const [freq, q, g] of [[550, 3, 1], [1250, 4, 0.55], [2300, 5, 0.3], [3300, 6, 0.15]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g;
      f0.connect(bp).connect(gg).connect(voice);
    }
    const f0Env = ctx.createGain();
    f0Env.gain.setValueAtTime(0.0001, t);
    f0Env.gain.setValueAtTime(0.0001, t + intro * 0.8);
    f0Env.gain.exponentialRampToValueAtTime(0.5 * vol, t + intro + 0.06);
    f0Env.gain.setValueAtTime(0.5 * vol, t + intro + (climax - intro) * 0.5);
    f0Env.gain.exponentialRampToValueAtTime(0.0001, t + climax + 0.08);

    // Lautstärkebeben im Höhepunkt, für beide Töne gemeinsam.
    const am = ctx.createGain();
    am.gain.value = 1;
    const amDepth = ctx.createGain();
    amDepth.gain.setValueAtTime(0, t);
    amDepth.gain.linearRampToValueAtTime(0.15, t + intro);
    amDepth.gain.linearRampToValueAtTime(0.65, t + climax);
    mod.connect(amDepth).connect(am.gain);
    g0.connect(g0Env).connect(am);
    voice.connect(f0Env).connect(am);
    am.connect(out);

    for (const o of [mod, jitterSrc, g0, f0]) {
      o.start(t);
      o.stop(t + end + 0.1);
    }
    // Atem: Rauschen über die ganze Länge, hell, im Höhepunkt am stärksten.
    this.burst({ freq: 4000, q: 0.5, dur: climax, gain: 0.08 * vol, attack: 0.15, out });
    this.burst({ freq: 900, q: 0.8, dur: climax * 0.9, gain: 0.1 * vol, attack: 0.25, out });
    // Ende: unruhige Pulsfolge, immer langsamer und tiefer.
    let when = climax - 0.02;
    for (let i = 0; i < 9; i++) {
      when += 0.03 + i * 0.006 + Math.random() * 0.012;
      this.burst({ freq: 380 - i * 22 + Math.random() * 60, q: 1.8, dur: 0.035, gain: 0.45 * vol * (1 - i / 11), when, out });
    }
  }

  // Schritt eines Passanten auf nassem Pflaster. kind: 'heel' (Damenabsatz, hell und spitz),
  // 'boot' (Arbeiterstiefel, schwer), sonst Herrenschuh. Dazu ein feines Schmatzen von Wasser.
  footstep(vol, pan, { kind = 'shoe', cane = false } = {}) {
    const out = this.panned(pan * 0.85, 0.5);
    const v = vol * (0.8 + Math.random() * 0.4);
    if (kind === 'heel') {
      this.burst({ freq: 2600 + Math.random() * 500, q: 2.2, dur: 0.025, gain: 0.32 * v, out });
      this.burst({ freq: 950, q: 1.6, dur: 0.04, gain: 0.26 * v, out });
    } else if (kind === 'boot') {
      this.burst({ freq: 850 + Math.random() * 150, q: 1, dur: 0.05, gain: 0.28 * v, out });
      this.burst({ freq: 170, q: 1, dur: 0.09, gain: 0.5 * v, out });
    } else {
      this.burst({ freq: 1400 + Math.random() * 300, q: 1.2, dur: 0.04, gain: 0.28 * v, out });
      this.burst({ freq: 300, q: 1, dur: 0.06, gain: 0.34 * v, out });
    }
    this.burst({ freq: 4200, q: 0.7, dur: 0.06, gain: 0.07 * v, when: 0.015, out });
    // Spazierstock: die Zwinge tickt kurz nach dem Schritt.
    if (cane) this.burst({ freq: 3400, q: 3, dur: 0.018, gain: 0.22 * v, when: 0.18 + Math.random() * 0.05, out });
  }

  // Husten: zwei, drei raue Stöße; ab und zu nur ein Räuspern mit etwas Stimme darin.
  cough(vol, pan) {
    const out = this.panned(pan * 0.85, 1.5);
    if (Math.random() < 0.4) {
      this.burst({ freq: 450, q: 1.2, dur: 0.22, gain: 0.9 * vol, attack: 0.03, out });
      this.tone({ freq: 125 + Math.random() * 20, dur: 0.18, gain: 0.12 * vol, type: 'sawtooth', when: 0.12, attack: 0.03, out });
      this.burst({ freq: 380, q: 1.4, dur: 0.16, gain: 0.6 * vol, attack: 0.02, when: 0.3, out });
      return;
    }
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const when = i * (0.32 + Math.random() * 0.1);
      const k = 1 - i * 0.2;
      this.burst({ freq: 700 + Math.random() * 200, q: 0.8, dur: 0.16, gain: 1.2 * vol * k, attack: 0.008, when, out });
      this.burst({ freq: 260, q: 1, dur: 0.12, gain: 0.9 * vol * k, attack: 0.008, when, out });
    }
  }

  // Geschirr hinter einem Fenster: Porzellan klingt mit wenigen unharmonischen Teiltönen kurz
  // nach, Besteck höher und dünner. Durch Scheibe und Zimmer hört man es gedämpft (Tiefpass).
  // Drei Arten: Teller werden gestapelt, Tassen auf Untertassen gestellt, ein Löffel rührt.
  dishes(volume, pan) {
    if (!this.ctx) return;
    const vol = volume * 1.5;
    const muffle = this.ctx.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 3800;
    muffle.connect(this.panned(pan * 0.7, 6));
    const out = muffle;
    setTimeout(() => muffle.disconnect(), 6000);
    const clink = (when, f0, gain, decay, ratios) => {
      this.burst({ freq: f0 * 1.8, q: 1.5, dur: 0.018, gain: gain * 1.4, when, out });
      ratios.forEach((r, i) => this.tone({ freq: f0 * r * (1 + (Math.random() - 0.5) * 0.02), dur: decay / (1 + i * 0.6), gain: gain / (1 + i * 0.8), when, attack: 0.002, out }));
    };
    const plate = [1, 2.32, 4.1];
    const cup = [1, 1.59, 2.76];
    const spoon = [1, 1.47, 2.9];
    const kind = Math.random();
    let when = 0;
    if (kind < 0.45) {
      // Teller auf Teller, mal zwei, mal fünf, mit einem dumpfen Absetzen darunter.
      const n = 2 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) {
        const f0 = 1500 + Math.random() * 700;
        clink(when, f0, 0.035 * vol, 0.22, plate);
        this.burst({ freq: 420, q: 1, dur: 0.05, gain: 0.25 * vol, when, out });
        if (Math.random() < 0.4) clink(when + 0.025 + Math.random() * 0.03, f0 * 1.12, 0.02 * vol, 0.15, plate);
        when += 0.25 + Math.random() * 0.5;
      }
    } else if (kind < 0.75) {
      // Tasse auf die Untertasse, dann noch eine.
      const n = 1 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const f0 = 2300 + Math.random() * 600;
        clink(when, f0, 0.03 * vol, 0.16, cup);
        clink(when + 0.06 + Math.random() * 0.03, f0 * 0.94, 0.018 * vol, 0.12, cup);
        when += 0.7 + Math.random() * 1.2;
      }
    } else {
      // Ein Löffel rührt in der Tasse und wird zum Schluss auf die Untertasse gelegt.
      const f0 = 3600 + Math.random() * 900;
      const n = 4 + Math.floor(Math.random() * 5);
      for (let i = 0; i < n; i++) {
        clink(when, f0 * (1 + (Math.random() - 0.5) * 0.04), 0.012 * vol * (0.6 + Math.random() * 0.4), 0.1, spoon);
        when += 0.14 + Math.random() * 0.05;
      }
      when += 0.35;
      clink(when, f0 * 0.82, 0.02 * vol, 0.14, spoon);
      clink(when + 0.05, 2400, 0.015 * vol, 0.14, cup);
    }
  }

  // Ein Tropfen aus dem Fallrohr: kurzes Plinken, dessen Ton nach oben gleitet, und ein Klatschen.
  drip() {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const f = 700 + Math.random() * 900;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(f, t);
    osc.frequency.exponentialRampToValueAtTime(f * 1.8, t + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.03 + Math.random() * 0.04, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g).connect(this.gutterOut);
    osc.start(t);
    osc.stop(t + 0.08);
    this.burst({ freq: 3200 + Math.random() * 1500, q: 1, dur: 0.03, gain: 0.05 + Math.random() * 0.05, out: this.gutterOut });
  }

  // Ferner Wagen: Hufe im Trab, gedämpft und von einer Seite, schwillt an und wieder ab.
  hooves() {
    const ctx = this.ctx;
    const out = this.panned((Math.random() - 0.5) * 1.6, 8);
    const far = ctx.createBiquadFilter();
    far.type = 'lowpass';
    far.frequency.value = 1400;
    far.connect(out);
    const beats = 14 + Math.floor(Math.random() * 8);
    const step = 0.26 + Math.random() * 0.06;
    for (let i = 0; i < beats; i++) {
      const env = Math.sin((i / (beats - 1)) * Math.PI);
      const when = i * step + (i % 2) * 0.04;
      this.burst({ freq: 900 + Math.random() * 200, q: 2, dur: 0.05, gain: 0.27 * env, when, out: far });
      this.burst({ freq: 300, q: 1.2, dur: 0.06, gain: 0.2 * env, when, out: far });
    }
  }

  // Pferdebahn in einer Nachbarstraße: das Glöckchen am Wagen, zweimal angeschlagen.
  trambell() {
    const out = this.panned((Math.random() - 0.5) * 1.4, 3);
    for (const when of [0, 0.32 + Math.random() * 0.1]) {
      this.tone({ freq: 1760, dur: 0.9, gain: 0.014, when, out });
      this.tone({ freq: 2790, dur: 0.5, gain: 0.007, when, out });
      this.tone({ freq: 4330, dur: 0.25, gain: 0.003, when, out });
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

  // Nieselregen als lockere, zufällige Folge harter, kurzer Einschläge auf Pflaster,
  // Dach und Fensterblech. Manchmal treffen zwei, drei Tropfen fast gleichzeitig.
  rain(dt) {
    const rate = this.env === 'street' ? 22 : 5;
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

  // train: Stadtbahn aus railway.js ({ roll, loco }, null, wenn kein Zug fährt); river aus river.js
  // (Abstand und Seite von Quaimauer und Kahn), fehlt in Innenräumen. sounds: Ereignisse des
  // Orts ({ type: 'hoof' | 'stamp' | 'snort', vol, pan }), werden hier abgespielt und geleert.
  // cab: Pegel und Seite der fahrenden Droschke (traffic.js).
  update(dt, train, river, sounds, cab, gutter) {
    if (!this.ctx) {
      if (sounds) sounds.length = 0;
      return;
    }
    this.rain(dt);
    const outdoors = this.env === 'street';
    const now = this.ctx.currentTime;
    this.gust(dt, now);
    if (sounds?.length) {
      if (outdoors) {
        for (const s of sounds) if (s.vol > 0.005) this[s.type]?.(s.vol, s.pan, s);
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
    const nearGutter = outdoors && gutter ? gutter.vol : 0;
    this.gutterOut.gain.setTargetAtTime(nearGutter, now, 0.2);
    if (gutter) this.gutterPan.pan.setTargetAtTime(gutter.pan * 0.85, now, 0.1);
    this.nextDrip -= dt;
    if (this.nextDrip < 0) {
      if (nearGutter > 0.01) this.drip();
      this.nextDrip = 0.05 + Math.random() * 0.25;
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
      this.nextTram -= dt;
      if (this.nextTram < 0) {
        this.trambell();
        this.nextTram = 50 + Math.random() * 80;
      }
    }
    this.nextBell -= dt;
    if (this.nextBell < 0) {
      this.bell();
      this.nextBell = 90 + Math.random() * 60;
    }
    // Stadtbahn (railway.js): roll ist der nächste Wagen, loco die Lok, je { vol, pan }; speed
    // 0..1, drive bei offenem Regler, phase 'in' | 'stop' | 'out'.
    const roll = outdoors && train ? train.roll.vol : 0;
    const loco = outdoors && train ? train.loco.vol : 0;
    const speed = train ? train.speed : 0;
    this.trainGain.gain.setTargetAtTime(roll * 0.66 * Math.min(1, speed * 1.3), now, 0.3);
    this.locoOut.gain.setTargetAtTime(loco * 1.5, now, 0.2);
    this.wheelTurn.frequency.setTargetAtTime(0.5 + 3.7 * speed, now, 0.5);
    this.grit.playbackRate.setTargetAtTime(0.3 + 0.7 * speed, now, 0.5);
    const standing = train && train.phase === 'stop';
    this.steamGain.gain.setTargetAtTime(standing ? 0.025 : train && !train.drive ? 0.01 : 0, now, 0.8);
    const braking = train && train.phase === 'in' && speed > 0 && speed < 0.4;
    this.squealGain.gain.setTargetAtTime(braking ? roll * 0.016 * (1 - speed / 0.4) : 0, now, 0.15);
    // Ein Rad springt auf einen Nachbarton und gleitet nach einer Weile zurück.
    this.nextHop -= dt;
    if (braking && this.nextHop < 0) {
      const voice = this.squealVoices[Math.floor(Math.random() * this.squealVoices.length)];
      const step = [1, 1.07, 0.93, 1.13, 0.88][Math.floor(Math.random() * 5)];
      voice.osc.frequency.setTargetAtTime(voice.base * step, now, 0.012);
      this.nextHop = 0.15 + Math.random() * 0.7;
    }
    // Kommt der Zug zum Stehen, knarzen die Klötze ein letztes Mal.
    const phase = train ? train.phase : null;
    if (phase === 'stop' && this.trainPhase === 'in' && roll > 0.02) this.brakeGroan(roll);
    this.trainPhase = phase;
    if (train) {
      this.trainPan.pan.setTargetAtTime(train.roll.pan * 0.6, now, 0.2);
      this.locoPan.pan.setTargetAtTime(train.loco.pan * 0.8, now, 0.1);
    }
    // Schienenstöße im Takt der Fahrt: je langsamer, desto seltener. Zwölf Meter Schiene bei
    // 13 m/s, also knapp eine Sekunde von Stoß zu Stoß.
    this.nextClack -= dt;
    if (this.nextClack < 0) {
      if (roll > 0.02 && speed > 0.08) this.clack(roll * 5.0 * Math.min(1, speed * 1.5), speed);
      this.nextClack = (0.9 + Math.random() * 0.08) / Math.max(speed, 0.08);
    }
    // Dazwischen klirrt und rasselt es: Kupplungen, Puffer, lose Bleche der Wagen.
    this.nextClank -= dt;
    if (this.nextClank < 0) {
      if (roll > 0.02 && speed > 0.1) this.clank(roll * Math.min(1, speed * 1.5));
      this.nextClank = (0.2 + Math.random() * 1.1) / Math.max(speed, 0.2);
    }
    // Vier Dampfstöße je Radumdrehung, nicht ganz gleichmäßig: der Dampf strömt mal etwas
    // länger, mal kürzer aus den Zylindern. Beim Anfahren langsam und schwer.
    this.nextChuff -= dt;
    if (this.nextChuff < 0) {
      this.chuffN = ((this.chuffN ?? 0) + 1) % 4;
      const heavy = 1 + 0.7 * (1 - speed);
      if (loco > 0.01 && train.drive) this.chuff([1, 0.55, 0.8, 0.6][this.chuffN] * heavy);
      this.nextChuff = ([0.27, 0.22, 0.26, 0.23][this.chuffN] * (0.97 + Math.random() * 0.06)) / Math.max(speed, 0.12);
    }
    // Luftpumpe der stehenden Lok: ein dumpfes Klopfen mit Zischen, etwa jede Sekunde.
    this.nextPump -= dt;
    if (this.nextPump < 0) {
      if (standing && loco > 0.01) this.pump();
      this.nextPump = 0.9 + Math.random() * 0.3;
    }
    // Einmal je Ankunft pfeift die Lok, wenn sie herankommt, aber nicht immer.
    if (!train) this.whistled = false;
    else if (!this.whistled && train.phase === 'in' && loco > 0.3) {
      this.whistled = true;
      if (Math.random() < 0.6) this.whistle(train.loco.vol, train.loco.pan);
    }
  }

  // Hall der Bahnhofshalle: ein Faltungshall aus abklingendem Rauschen, einmal je Audiokontext.
  // Rufe und Pfiffe vom Bahnsteig gehen zum Teil hindurch; pan setzt die Richtung der Halle.
  hallVerb(pan) {
    const ctx = this.ctx;
    if (this.hallCtx !== ctx) {
      const len = Math.floor(ctx.sampleRate * 2);
      const ir = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const d = ir.getChannelData(c);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          const t = i / ctx.sampleRate;
          // Späte Anteile dunkler: das Rauschen wird mit der Zeit stärker geglättet.
          const k = 0.5 + 0.45 * Math.min(1, t / 1.2);
          lp = lp * k + (Math.random() * 2 - 1) * (1 - k);
          d[i] = lp * Math.exp(-t / 0.42) * (t < 0.012 ? t / 0.012 : 1) * 2.2;
        }
      }
      this.hall = ctx.createConvolver();
      this.hall.buffer = ir;
      this.hallPan = ctx.createStereoPanner();
      this.hall.connect(this.hallPan).connect(this.master);
      this.hallCtx = ctx;
    }
    this.hallPan.pan.setTargetAtTime(pan * 0.5, ctx.currentTime, 0.05);
    return this.hall;
  }

  // Ziel für Laute vom Bahnsteig: etwas trocken aus der Richtung, viel Hall, dumpfer mit Abstand.
  platformOut(vol, pan, life) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = vol;
    const dry = ctx.createBiquadFilter();
    dry.type = 'lowpass';
    dry.frequency.value = 1800 + 2400 * vol;
    const dryGain = ctx.createGain();
    dryGain.gain.value = 0.45;
    out.connect(dry).connect(dryGain).connect(this.panned(pan * 0.7, life));
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    out.connect(wet).connect(this.hallVerb(pan));
    setTimeout(() => {
      out.disconnect();
      wet.disconnect();
    }, life * 1000);
    return out;
  }

  // Ruf der Bahnsteigaufsicht, aus festen Lautfolgen zusammengesetzt. Kommandoton wie bei
  // Bahn und Militär der Kaiserzeit: kurze Silben mit hartem Einsatz, eine gepresste Bruststimme,
  // die betonte Silbe obenauf, danach fällt der Ton und wird knapp abgeschnitten. Je Laut: Art ('v' Vokal,
  // 'n' Nasal, 'f' Reibelaut, 's' Verschluss mit Knall), Dauer, dann für Vokale die Formanten,
  // Stärke und Tonhöhe, für Reibelaute Mittenfrequenz, Güte und Stärke, für Verschlüsse die
  // Frequenz des Knalls. Berlinisch heißt es „Fertich!“.
  call(vol, pan, { text = 'einsteigen' } = {}) {
    const ctx = this.ctx;
    const CALLS = {
      einsteigen: [
        ['v', 0.09, [700, 1150, 2500], 0.75, 168],
        ['v', 0.05, [400, 1950, 2600], 0.65, 166],
        ['n', 0.035],
        ['f', 0.07, 2600, 1.6, 0.45],
        ['s', 0.035, 3800],
        ['v', 0.17, [780, 1220, 2500], 1, 208],
        ['v', 0.07, [410, 2050, 2700], 0.85, 182],
        ['s', 0.03, 1700],
        ['v', 0.05, [500, 1500, 2500], 0.4, 138],
        ['n', 0.07],
      ],
      fertig: [
        ['f', 0.06, 5000, 0.7, 0.3],
        ['v', 0.16, [620, 1750, 2550], 1, 210],
        ['v', 0.05, [600, 1300, 2400], 0.7, 188],
        ['s', 0.04, 3600],
        ['v', 0.09, [380, 2050, 2700], 0.7, 148],
        ['f', 0.12, 3400, 2.2, 0.5],
      ],
    };
    const phones = CALLS[text];
    if (!phones) return;
    if (this.shoutCtx !== ctx) {
      // Gepresste Stimme: Obertöne fallen kaum ab, das macht sie hart und durchdringend.
      const N = 40;
      const imag = new Float32Array(N);
      for (let k = 1; k < N; k++) imag[k] = 1 / k ** 0.95;
      this.shout = ctx.createPeriodicWave(new Float32Array(N), imag);
      this.shoutCtx = ctx;
    }
    const total = phones.reduce((sum, ph) => sum + ph[1], 0);
    const out = this.platformOut(vol, pan, total + 3);
    const t0 = ctx.currentTime + 0.03;
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(this.shout);
    const breath = ctx.createBufferSource();
    breath.buffer = this.noise;
    const breathGain = ctx.createGain();
    breathGain.gain.value = 0.05;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    osc.connect(env);
    breath.connect(breathGain).connect(env);
    const formants = [[600, 5, 1], [1500, 8, 0.55], [2500, 10, 0.3]].map(([freq, q, g]) => {
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = freq;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g * q * 0.4;
      env.connect(bp).connect(gg).connect(out);
      return bp.frequency;
    });
    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.value = 400;
    const bodyGain = ctx.createGain();
    bodyGain.gain.value = 0.2;
    env.connect(body).connect(bodyGain).connect(out);
    // Unruhe der Tonhöhe, wie bei jeder echten Stimme.
    const jitter = ctx.createOscillator();
    jitter.frequency.value = 5.3;
    const jitterDepth = ctx.createGain();
    jitterDepth.gain.value = 3;
    jitter.connect(jitterDepth).connect(osc.frequency);
    // Etwas Rauheit im Ton: das Knarren einer kräftig gebrauchten Stimme.
    const rasp = ctx.createOscillator();
    rasp.frequency.value = 31;
    const raspDepth = ctx.createGain();
    raspDepth.gain.value = 0.25;
    const rough = ctx.createGain();
    rough.gain.value = 1;
    rasp.connect(raspDepth).connect(rough.gain);
    osc.disconnect();
    osc.connect(rough).connect(env);
    const level = 0.24;
    let t = t0;
    osc.frequency.setValueAtTime(165, t0);
    for (const [kind, dur, a, b, c] of phones) {
      const g = env.gain;
      if (kind === 'v') {
        osc.frequency.setTargetAtTime(c, t, 0.018);
        a.forEach((f, i) => formants[i].setTargetAtTime(f, t, i === 0 ? 0.015 : 0.02));
        g.setTargetAtTime(level * b, t, 0.007);
      } else if (kind === 'n') {
        formants[0].setTargetAtTime(260, t, 0.015);
        formants[1].setTargetAtTime(1600, t, 0.02);
        g.setTargetAtTime(level * 0.28, t, 0.01);
        g.setTargetAtTime(0, t + dur * 0.6, 0.015);
      } else if (kind === 'f') {
        g.setTargetAtTime(0, t, 0.015);
        this.burst({ freq: a, q: b, dur, gain: c * 2, attack: 0.02, when: t - ctx.currentTime, out });
      } else {
        g.setTargetAtTime(0, t, 0.006);
        this.burst({ freq: a, q: 1.2, dur: 0.025, gain: 0.7, when: t + dur * 0.8 - ctx.currentTime, out });
      }
      t += dur;
    }
    env.gain.setTargetAtTime(0, t, 0.015);
    for (const o of [osc, breath, jitter, rasp]) {
      o.start(t0);
      o.stop(t + 0.3);
    }
  }

  // Trillerpfeife der Aufsicht: ein heller Ton, den die Kugel in der Pfeife schnell flattern lässt.
  guardWhistle(vol, pan) {
    const ctx = this.ctx;
    const out = this.platformOut(vol, pan, 4);
    const t = ctx.currentTime + 0.02;
    for (const [start, dur] of [[0, 0.22], [0.32, 1.0]]) {
      const a = t + start;
      const osc = ctx.createOscillator();
      osc.frequency.value = 2950 + Math.random() * 100;
      const trill = ctx.createOscillator();
      trill.frequency.value = 26 + Math.random() * 6;
      const fm = ctx.createGain();
      fm.gain.value = 140;
      trill.connect(fm).connect(osc.frequency);
      const am = ctx.createGain();
      am.gain.value = 0.35;
      trill.connect(am);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, a);
      g.gain.exponentialRampToValueAtTime(0.1, a + 0.03);
      g.gain.setValueAtTime(0.1, a + dur - 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, a + dur);
      const flutter = ctx.createGain();
      flutter.gain.value = 0.65;
      am.connect(flutter.gain);
      osc.connect(flutter).connect(g).connect(out);
      for (const o of [osc, trill]) {
        o.start(a);
        o.stop(a + dur + 0.05);
      }
      this.burst({ freq: 3000, q: 1, dur, gain: 0.012, attack: 0.02, when: start, out });
    }
  }

  // Luftpumpe: „tock – pschh“.
  pump() {
    this.burst({ freq: 240, q: 1.5, dur: 0.09, gain: 0.25, out: this.locoOut });
    this.burst({ freq: 2600, q: 0.8, dur: 0.3, gain: 0.04, attack: 0.04, when: 0.08, out: this.locoOut });
  }

  // Die Bremsen lassen los: ein langes, abschwellendes Zischen.
  // Die letzten Zentimeter vor dem Halt: Die Klötze haften und rutschen nur noch ein paarmal,
  // ein tiefes, stockendes Knarzen, das langsamer und tiefer wird, dann ein dumpfer Ruck.
  brakeGroan(vol) {
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(140, t + 0.6);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900;
    f.Q.value = 1.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    let at = t;
    for (let i = 0; i < 6; i++) {
      const k = 0.05 * vol * (1 - i * 0.12) * (0.7 + Math.random() * 0.3);
      g.gain.setTargetAtTime(k, at, 0.006);
      g.gain.setTargetAtTime(0, at + 0.035 + i * 0.008, 0.012);
      at += 0.07 + i * 0.022;
    }
    osc.connect(f).connect(g).connect(this.trainPan);
    osc.start(t);
    osc.stop(at + 0.2);
    this.burst({ freq: 80, q: 1, dur: 0.3, gain: 0.9 * vol, when: at - t, out: this.trainPan });
  }

  brakeRelease(vol, pan) {
    const out = this.panned(pan * 0.7, 3);
    this.burst({ freq: 3400, q: 0.5, dur: 1.8, gain: 0.12 * vol, attack: 0.04, out });
    this.burst({ freq: 900, q: 0.7, dur: 1.2, gain: 0.06 * vol, attack: 0.03, out });
  }

  // Zwei Achsen rollen über einen Schienenstoß, die letzte eines Wagens und die erste des
  // nächsten, gut zweieinhalb Meter auseinander: „da-damm“ im Takt der Fahrt (speed 0..1, voll
  // sind 13 m/s). Von der Straße unter dem Viadukt hört man vor allem den schweren, dumpfen
  // Stoß ins Mauerwerk, darüber den kurzen Schlag des Rades und kaum etwas Helles. Jeder Stoß
  // ist etwas anders laut, damit es nicht nach Metronom klingt.
  clack(vol, speed = 1) {
    const axle = 2.6 / (13 * Math.max(speed, 0.08));
    [0, axle].forEach((offset, i) => {
      const when = offset * (0.94 + Math.random() * 0.12);
      const share = (i === 1 ? 1 : 0.75) * (0.65 + Math.random() * 0.35);
      const k = vol * share;
      // Das ganze Rollen schwillt mit dem Schlag an und klingt wieder ab.
      const t = this.ctx.currentTime + when;
      this.rumbling.gain.setTargetAtTime(RUMBLE_BASE * (1 + 1.4 * share), t, 0.01);
      this.rumbling.gain.setTargetAtTime(RUMBLE_BASE, t + 0.05, 0.14);
      this.burst({ freq: 85 + Math.random() * 25, q: 1, dur: 0.22, gain: 1.1 * k, when, out: this.trainPan });
      this.burst({ freq: 380 + Math.random() * 120, q: 1.3, dur: 0.07, gain: 0.45 * k, when, out: this.trainPan });
      this.burst({ freq: 900 + Math.random() * 150, q: 1.5, dur: 0.03, gain: 0.2 * k, when, out: this.trainPan });
      this.burst({ freq: 1500, q: 0.8, dur: 0.015, gain: 0.06 * k, when, out: this.trainPan });
      // Rad und Schiene klingen nach dem Schlag kurz nach wie angeschlagenes Eisen.
      this.burst({ freq: 640 + Math.random() * 60, q: 30, dur: 0.18, gain: 1.6 * k, when, out: this.trainPan });
      this.burst({ freq: 1720 + Math.random() * 120, q: 35, dur: 0.12, gain: 0.9 * k, when, out: this.trainPan });
    });
  }

  // Klirren einer Kupplung oder eines losen Blechs: schmale Eigentöne in unharmonischem
  // Verhältnis, wie bei angeschlagenem Stahl, kurz und ungleich laut.
  clank(vol) {
    const base = 500 + Math.random() * 1300;
    const hits = Math.random() < 0.4 ? 2 : 1;
    for (let h = 0; h < hits; h++) {
      const when = h * (0.04 + Math.random() * 0.08);
      const k = vol * (0.4 + Math.random() * 0.6) * (h ? 0.6 : 1);
      [[1, 1], [2.76, 0.6], [5.4, 0.35]].forEach(([ratio, share]) => {
        this.burst({ freq: base * ratio, q: 40, dur: 0.2 + Math.random() * 0.15, gain: 1.8 * k * share, when, out: this.trainPan });
      });
    }
  }

  // Dampfstoß aus dem Schornstein: ein breites, weiches „tschuff“, das hart einsetzt und
  // langsam verweht, darunter ein dumpfer Stoß, darüber das Zischen des Dampfes.
  chuff(k) {
    const out = this.locoOut;
    this.burst({ freq: 620 + Math.random() * 120, q: 0.5, dur: 0.3, gain: 0.32 * k, attack: 0.006, out });
    this.burst({ freq: 2200 + Math.random() * 400, q: 0.7, dur: 0.2, gain: 0.09 * k, attack: 0.004, out });
    this.burst({ freq: 140, q: 0.8, dur: 0.12, gain: 0.35 * k, attack: 0.005, out });
  }

  // Dampfpfeife: kein reiner Ton, sondern Luft, die in einer Glocke schwingt. Ein schmales
  // Rauschband auf dem Grundton, dazu der Ton selbst mit leisen Obertönen. Der Ton zieht beim
  // Öffnen des Ventils von unten an und sinkt beim Schließen etwas ab. Einmal kurz, einmal lang.
  whistle(vol, pan) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    out.gain.value = vol * 1.5;
    out.connect(this.panned(pan * 0.8, 4));
    setTimeout(() => out.disconnect(), 4000);
    const f0 = 740 + Math.random() * 60;
    for (const [start, dur] of [[0, 0.45], [0.65, 1.6]]) {
      const t = ctx.currentTime + start;
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, t);
      env.gain.setTargetAtTime(1, t, 0.04);
      env.gain.setTargetAtTime(0.0001, t + dur - 0.2, 0.07);
      env.connect(out);
      setTimeout(() => env.disconnect(), (start + dur + 0.5) * 1000);
      const glide = (param, base) => {
        param.setValueAtTime(base * 0.9, t);
        param.exponentialRampToValueAtTime(base, t + 0.12);
        param.setValueAtTime(base, t + dur - 0.2);
        param.exponentialRampToValueAtTime(base * 0.96, t + dur);
      };
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 18;
      glide(band.frequency, f0);
      const breath = ctx.createGain();
      breath.gain.value = 1.6;
      src.connect(band).connect(breath).connect(env);
      src.start(t, Math.random() * 2, dur + 0.05);
      for (const [h, gain] of [[1, 0.03], [2, 0.009], [3, 0.004]]) {
        const osc = ctx.createOscillator();
        glide(osc.frequency, f0 * h);
        const g = ctx.createGain();
        g.gain.value = gain;
        osc.connect(g).connect(env);
        osc.start(t);
        osc.stop(t + dur + 0.05);
      }
      this.burst({ freq: 3200, q: 0.6, dur, gain: 0.015, attack: 0.05, when: start, out });
    }
  }
}
