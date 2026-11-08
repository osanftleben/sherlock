import * as THREE from 'three';
import { idleFigure, idleHorse, trotHorse, walkFigure, walkHorse } from '../figures.js';
import { CAR_HALF, CAR_LIGHTS, CAR_NOSE, Cords, HORSE_Z, PFLOOR, SPOTS, SWINGLE, TRACE, ZP, holdReins, makeCrew, makeHorseCar, makeLink, makeTeam } from './horsecar.js';
import { addShadeCaster } from './lamps.js';
import { hearing } from './traffic.js';
import { TRAM, TRAM_HIDE_X, TramPath, tramPaths } from './tramway.js';

// Die Grüne Linie im Betrieb. Ein Wagen kommt aus der Querstraße hinter der Baustelle (der
// Bauwächter hebt ihm den Schlagbaum, index.js), fährt auf dem westlichen Gleis bis an die
// Endstelle auf dem Platz und hält. Der Kutscher hängt das Ortscheit aus, führt das Pferd um den
// Wagen herum und spannt es am anderen Ende wieder an; der Schaffner geht derweil außen herum
// auf die andere Plattform. Nach einer Weile klingelt der Schaffner zweimal, und der Wagen fährt
// über den Gleiswechsel auf dem östlichen Gleis zurück und biegt hinter der Baustelle in die
// Querstraße. Später kommt der nächste (derselbe Wagen, das sieht niemand).
//
// Wer vor dem Pferd im Gleis steht, vor dem hält der Wagen, und der Kutscher tritt die Glocke.
// Passanten warten vor dem Wagen (traffic.js liest loc.tramBlockers); vor der Sperre wartet die
// Droschke mit ihrer Wende, solange die Bahn dort durchfährt (loc.tramZone), und umgekehrt.

const CRUISE = 2.8; // Arbeitstrab, gut 10 km/h
const ACCEL = 0.4; // Ein Pferd bringt 1,3 t nur langsam in Gang.
const BRAKE = 0.9; // Kurbelbremse
const AXLE = 0.85;
const JOINT = 9; // Schienenlänge: An jedem Stoß rumpelt jede Achse einmal.
const LEAD = 1.1; // Schritt, wenn der Kutscher das Pferd am Kopf führt
const BACK = 0.45; // Rückwärtsrichten an den Wagen
const CREW = 1.25; // Gehen von Kutscher und Schaffner
const TROT_STRIDE = 2.3; // langsamer Arbeitstrab, gut fünf Viertel Schritte je Sekunde
const WALK_STRIDE = 1.65;
const GATE_Z = -188; // Sperre am Kanalbau mit Schlagbaum (index.js)
const ZONE = { north: -189.5, south: -172 }; // Hier wendet die Droschke über die Gleise (traffic.js).
const X0 = TRAM.west;
const ZC = TRAM.end - 0.4 - CAR_HALF; // Wagenmitte an der Endstelle

const SAY = {
  layover: 'Die Grüne Linie, Hackescher Markt – Pankow. Ein Einspänner der Großen Berliner Pferde-Eisenbahn: Der Kutscher hat die Leinen schon in der Hand und wartet auf das Klingelzeichen des Schaffners.',
  turn: 'Endstelle der Grünen Linie. Der Kutscher spannt um: Er führt das Pferd um den Wagen herum und hängt das Ortscheit am anderen Ende wieder ein, der Schaffner wechselt derweil nach hinten. Gleich geht es zurück nach Pankow.',
  in: 'Die Grüne Linie aus Pankow, unterwegs zu ihrer Endstelle am Hackeschen Markt. Ein einziges Pferd zieht den Wagen mit bis zu zwanzig Fahrgästen – auf Schienen rollt es sich leichter als auf dem Pflaster.',
  out: 'Die Grüne Linie zurück nach Pankow. Der Wagen schaukelt auf den Rillenschienen, an jedem Stoß rumpelt es unter dem Boden, und wer im Gleis steht, dem tritt der Kutscher die Glocke.',
};

const V = new THREE.Vector3();
const A = new THREE.Vector3();
const B = new THREE.Vector3();
const F = { x: 0, z: 0 };
const R = { x: 0, z: 0 };
const P = { x: 0, z: 0 };
const D = { x: 0, z: 0 };

const wrap = (a) => a - Math.round(a / (Math.PI * 2)) * Math.PI * 2;

// Achsenparalleles Rechteck um ein gedrehtes (halbe Breite hw, halbe Länge hl).
function boxAround(rect, cx, cz, yaw, hw, hl) {
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const ex = hw * c + hl * s;
  const ez = hw * s + hl * c;
  rect.minX = cx - ex;
  rect.maxX = cx + ex;
  rect.minZ = cz - ez;
  rect.maxZ = cz + ez;
}
function hideRect(rect) {
  rect.minX = rect.maxX = rect.minZ = rect.maxZ = 1e5;
}

// Weg, auf dem der Kutscher das Pferd an der Endstelle herumführt: Wende nach links (Osten), neben
// dem Wagen nach Norden, im Bogen vor das Nordende; zuletzt richtet er es rückwärts an den Wagen.
function leadPath() {
  const pts = [[X0, ZC + HORSE_Z]];
  for (let i = 1; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    pts.push([X0 + 1.2 - 1.2 * Math.cos(a), ZC + HORSE_Z + 1.2 * Math.sin(a)]);
  }
  const zA = ZC - 4.5;
  const zB = ZC - 9;
  for (let i = 1; i <= 10; i++) pts.push([X0 + 2.4, ZC + HORSE_Z + ((zA - ZC - HORSE_Z) * i) / 10]);
  for (let i = 1; i <= 20; i++) {
    const q = i / 20;
    pts.push([X0 + 2.4 - 2.4 * q * q * (3 - 2 * q), zA - (zA - zB) * q]);
  }
  return new TramPath(pts);
}

export function buildTramLine(loc) {
  const { scene } = loc;
  const car = makeHorseCar();
  const team = makeTeam();
  const horse = team.userData.horse;
  const { driver, conductor } = makeCrew();
  const link = makeLink();
  const reins = new Cords(2, 8, 0.007, 0x15110e);
  scene.add(car, team, driver, conductor, link, reins.mesh);

  // Strecken mit den Stellen, an denen etwas geschieht (alles als Lage s der Wagenmitte bzw. der
  // Pferdenase auf dem Weg).
  const { inbound, outbound } = tramPaths();
  const leg = (path, dir) => ({
    path,
    dir,
    gate: path.cross('z', GATE_Z),
    zoneIn: path.cross('z', dir > 0 ? ZONE.north : ZONE.south),
    zoneOut: path.cross('z', dir > 0 ? ZONE.south : ZONE.north),
    end: path.cross('z', ZC),
    limits: [],
    turnouts: [],
  });
  const IN = leg(inbound, 1);
  const OUT = leg(outbound, -1);
  OUT.hide = outbound.cross('x', TRAM_HIDE_X);
  // Weichen des Gleiswechsels: Dort schlägt es härter.
  IN.turnouts.push(inbound.cross('z', TRAM.cross.south));
  OUT.turnouts.push(outbound.cross('z', TRAM.cross.south), outbound.cross('z', TRAM.cross.north));
  // Langsamer durch Bögen, Gleiswechsel und den Schlagbaum: [von, bis, Höchstgeschwindigkeit].
  IN.limits.push([inbound.cross('x', TRAM.turn.x) - 2, inbound.cross('z', TRAM.turn.z) + 2, 1.8]);
  OUT.limits.push([OUT.turnouts[0] - 3, OUT.turnouts[1] + 3, 1.9]);
  OUT.limits.push([outbound.cross('z', TRAM.turn.z) - 2, outbound.cross('x', TRAM.turn.x) + 2, 1.7]);
  for (const L of [IN, OUT]) L.limits.push([L.gate - CAR_NOSE - 3, L.gate + CAR_HALF + 2, 1.5]);
  // Wo der Kasten ausschwenkt: in den Bögen und im Gleiswechsel.
  IN.curves = [[inbound.cross('x', TRAM.turn.x), inbound.cross('z', TRAM.turn.z)]];
  OUT.curves = [[OUT.turnouts[0], OUT.turnouts[1]], [outbound.cross('z', TRAM.turn.z), outbound.cross('x', TRAM.turn.x)]];
  const lead = leadPath();

  const st = {
    mode: 'layover',
    leg: OUT,
    s: OUT.end,
    v: 0,
    timer: 12 + Math.random() * 20,
    hitched: true,
    reinsOn: true,
    visible: true,
    gait: 'walk',
    phase: 0,
    beat: 0,
    lifted: false,
    snort: 5 + Math.random() * 12,
    bell: 0,
    zone: false,
    gateUse: false,
    joints: [0, 0],
    prevS: 0,
    walk: null,
    sway: 0,
    kick: 0,
  };
  const resetJoints = () => {
    st.joints = [Math.floor((st.s + AXLE) / JOINT), Math.floor((st.s - AXLE) / JOINT)];
    st.prevS = st.s;
  };
  resetJoints();
  loc.tramZone = false;

  // --- Kutscher und Schaffner -------------------------------------------------------------
  // ride: auf der Plattform am Ende end; walk: über Wegpunkte (Welt); lead: am Kopf des Pferdes;
  // stand: auf der Stelle. Jeder hat eine Liste von Aufgaben (script), die nacheinander laufen.
  const actor = (fig, end) => ({ fig, mode: 'ride', end, pos: new THREE.Vector3(), yaw: 0, route: [], phase: 0, script: [] });
  const crew = { driver: actor(driver, -1), conductor: actor(conductor, 1) };
  const LEAD_SPOT = new THREE.Vector3(-0.62, 0, 0.55); // rechts neben dem Pferdekopf

  const wait = (sec) => ({ update: (dt) => (sec -= dt) <= 0 });
  const act = (fn) => ({ update: () => (fn(), true) });
  // Wegpunkte in Wagenkoordinaten; an der Endstelle steht der Wagen gerade, das genügt.
  const walkTo = (a, pts) => ({
    start() {
      a.mode = 'walk';
      a.route = pts.map((p) => car.localToWorld(new THREE.Vector3(...p)));
    },
    update: () => a.route.length === 0,
  });
  const face = (a, yaw) => act(() => {
    a.mode = 'stand';
    a.yaw = yaw;
  });
  const run = (a, dt) => {
    while (a.script.length) {
      const task = a.script[0];
      if (!task.started) {
        task.started = true;
        task.start?.();
      }
      if (!task.update(dt)) return;
      a.script.shift();
      dt = 0;
    }
  };

  // Umspannen an der Endstelle (Wagenkoordinaten: Das Pferd steht noch am Südende, +z).
  const startTurn = () => {
    st.mode = 'turn';
    const d = crew.driver;
    const c = crew.conductor;
    d.script = [
      wait(2.5),
      act(() => {
        st.reinsOn = false;
      }),
      walkTo(d, [[-0.85, PFLOOR, 2.35], [-1.45, 0, 2.35], [-1.55, 0, 3.3], [-0.8, 0, SWINGLE]]),
      face(d, Math.PI / 2),
      wait(2),
      act(() => {
        st.hitched = false;
      }),
      walkTo(d, [[-0.62, 0, HORSE_Z + 0.55]]),
      face(d, 0),
      {
        start() {
          d.mode = 'lead';
          st.walk = { s: 0, v: 0, back: false, z: 0, done: false };
        },
        update: () => st.walk.done,
      },
      walkTo(d, [[0.8, 0, -SWINGLE]]),
      face(d, -Math.PI / 2),
      wait(2.5),
      act(() => {
        // Eingehängt: Von nun an zieht das Pferd am Nordende.
        st.walk = null;
        st.hitched = true;
        st.leg = OUT;
        st.s = OUT.end;
        st.v = 0;
        resetJoints();
      }),
      walkTo(d, [[1.35, 0, -3.35], [1.45, 0, -2.35], [0.85, PFLOOR, -2.35], [0, PFLOOR, -(ZP - 0.5)]]),
      act(() => {
        d.mode = 'ride';
        d.end = -1;
        st.reinsOn = true;
        st.mode = 'layover';
        st.timer = 20 + Math.random() * 25;
      }),
    ];
    c.script = [
      wait(4),
      walkTo(c, [[-0.85, PFLOOR, -2.35], [-1.45, 0, -2.35], [-1.45, 0, 2.35], [-0.85, PFLOOR, 2.35], [-0.45, PFLOOR, ZP - 0.5]]),
      act(() => {
        c.mode = 'ride';
        c.end = 1;
      }),
    ];
  };

  // Figur in ihre Lage bringen und bewegen. Holmes geht man nicht über den Haufen.
  const stepActor = (a, dt, t, cam) => {
    const f = a.fig;
    if (a.mode === 'ride') {
      const isDriver = a === crew.driver;
      car.localToWorld((isDriver ? SPOTS.driver : SPOTS.conductor)(a.end, a.pos));
      a.yaw = car.rotation.y + (isDriver ? (a.end > 0 ? 0 : Math.PI) : Math.atan2(-0.951, 0.309 * a.end));
    } else if (a.mode === 'lead') {
      team.localToWorld(a.pos.copy(LEAD_SPOT));
      a.yaw = team.rotation.y;
    } else if (a.mode === 'walk' && a.route.length) {
      const target = a.route[0];
      const dx = target.x - a.pos.x;
      const dz = target.z - a.pos.z;
      const flat = Math.hypot(dx, dz);
      // Einen halben Schritt voraus, aber nicht über die nächste Ecke des Wegs hinaus.
      const ahead = flat > 1e-3 ? Math.min(0.5, flat) / flat : 0;
      const blocked = (a.pos.x + dx * ahead - cam.x) ** 2 + (a.pos.z + dz * ahead - cam.z) ** 2 < 0.7 * 0.7;
      if (!blocked) {
        const step = Math.min(flat, CREW * dt);
        if (flat > 1e-3) {
          a.pos.x += (dx / flat) * step;
          a.pos.z += (dz / flat) * step;
          a.pos.y += (target.y - a.pos.y) * (step / flat);
          a.yaw += wrap(Math.atan2(dx, dz) - a.yaw) * Math.min(1, dt * 8);
        }
        if (flat - step < 0.02) {
          a.pos.copy(target);
          a.route.shift();
        }
        a.phase += dt * CREW * 5.2;
      }
    }
    f.position.copy(a.pos);
    f.rotation.y = a.yaw;
    const moving = (a.mode === 'walk' && a.route.length) || (a.mode === 'lead' && st.walk && st.walk.v !== 0);
    if (moving) {
      if (a.mode === 'lead') a.phase += dt * st.walk.v * 5.2;
      walkFigure(f, a.phase);
    } else {
      f.userData.figure.body.position.y = 0;
      idleFigure(f, t, cam);
      if (a === crew.driver && a.mode === 'ride' && st.reinsOn) holdReins(f);
    }
  };

  // --- Wagen, Pferd und Geschirr in ihre Lage -----------------------------------------------
  // In Fahrt wiegt sich der Kasten auf den Blattfedern, an jedem Schienenstoß nickt er kurz.
  car.rotation.order = 'YXZ';
  const placeCar = (dt, t) => {
    const { path, dir } = st.leg;
    path.at(st.s + AXLE, F);
    path.at(st.s - AXLE, R);
    car.position.set((F.x + R.x) / 2, 0, (F.z + R.z) / 2);
    const hx = F.x - R.x;
    const hz = F.z - R.z;
    car.rotation.y = dir > 0 ? Math.atan2(hx, hz) : Math.atan2(-hx, -hz);
    const k = st.mode === 'run' ? Math.min(1, st.v / CRUISE) : 0;
    st.sway += (k - st.sway) * Math.min(1, dt * 1.5);
    st.kick *= Math.exp(-dt * 7);
    car.rotation.z = (Math.sin(t * 1.7 + 0.3) * 0.007 + Math.sin(t * 3.3) * 0.0025) * st.sway;
    car.rotation.x = st.kick * 0.006 + Math.sin(t * 2.3 + 1.1) * 0.0025 * st.sway;
    car.updateMatrixWorld();
  };
  const placeTeam = () => {
    const { path } = st.leg;
    path.at(st.s + HORSE_Z, P);
    path.dir(st.s + HORSE_Z, D);
    team.position.set(P.x, 0, P.z);
    team.rotation.y = Math.atan2(D.x, D.z);
  };
  // Pferd beim Umspannen: erst vorwärts den Weg entlang, dann rückwärts an den Wagen.
  const moveLead = (dt, cam) => {
    const w = st.walk;
    let target;
    if (!w.back) {
      // Vor dem Pferd und vor dem Kutscher an seinem Kopf muss frei sein; daneben darf man stehen.
      lead.at(w.s + 1.7, P);
      team.localToWorld(V.set(LEAD_SPOT.x, 0, LEAD_SPOT.z + 0.6));
      const blocked = (P.x - cam.x) ** 2 + (P.z - cam.z) ** 2 < 0.95 * 0.95 || (V.x - cam.x) ** 2 + (V.z - cam.z) ** 2 < 0.7 * 0.7;
      target = blocked ? 0 : LEAD;
      w.v += THREE.MathUtils.clamp(target - w.v, -dt * 1.5, dt * 0.8);
      w.s = Math.min(lead.length, w.s + w.v * dt);
      lead.at(w.s, P);
      lead.dir(w.s, D);
      team.position.set(P.x, 0, P.z);
      team.rotation.y = Math.atan2(D.x, D.z);
      if (w.s >= lead.length) {
        w.back = true;
        w.z = P.z;
        w.v = 0;
      }
    } else {
      // Hinter dem Ortscheit muss frei sein.
      const zEnd = ZC - HORSE_Z;
      const blocked = (X0 - cam.x) ** 2 + (w.z + TRACE + 0.5 - cam.z) ** 2 < 0.95 * 0.95;
      target = blocked ? 0 : -BACK;
      w.v += THREE.MathUtils.clamp(target - w.v, -dt * 1.2, dt * 1.2);
      w.z = Math.min(zEnd, w.z - w.v * dt);
      team.position.set(X0, 0, w.z);
      team.rotation.y = Math.PI;
      if (w.z >= zEnd - 1e-3) {
        w.v = 0;
        w.done = true;
      }
    }
  };

  // --- Fahren ----------------------------------------------------------------------------
  // Wer steht im Weg (Holmes oder ein Passant)? Gesucht wird auf der Strecke vor dem Wagen in
  // Scheiben quer zum Gleis. Im Weg ist, wer der Gleismitte näher steht als die halbe Breite dessen,
  // was dort noch vorbeikommt, und eine Schulter dazu: neben dem Pferd wenig, neben dem Kasten mehr,
  // in Bögen und im Gleiswechsel, wo die Wagenenden ausschwenken, noch etwas mehr. An der Endstelle
  // sucht man nur, so weit Pferd und Kasten vorziehen; wer dahinter oder daneben steht, ist nicht im
  // Weg, sonst stünde der Wagen dort ewig.
  const HORSE_CLEAR = 0.9;
  const CAR_CLEAR = 1.6;
  const CURVE_CLEAR = 1.75;
  const carClear = (L, q) => {
    for (const [a, b] of L.curves) if (q > a - CAR_HALF - 0.5 && q < b + CAR_HALF + 0.5) return CURVE_CLEAR;
    return CAR_CLEAR;
  };
  // Ergebnis: bis wohin die Wagenmitte vorfahren darf (die Pferdenase bleibt gut einen Meter vor
  // dem, der im Weg steht, der Kasten einen halben) und wie weit vor der Nase das ist.
  const way = { stop: Infinity, ahead: Infinity };
  const probe = (q, nose, clear, reach, x, z) => {
    const dx = x - P.x;
    const dz = z - P.z;
    const along = dx * D.x + dz * D.z;
    if (along < -0.3 || along > reach) return;
    const side = Math.abs(dx * D.z - dz * D.x);
    let s;
    if (q > nose - 0.5 && side < HORSE_CLEAR) s = q + along - CAR_NOSE - 1.2;
    else if (side < clear) s = q + along - CAR_HALF - 0.6;
    else return;
    if (s < way.stop) {
      way.stop = s;
      way.ahead = q + along - nose;
    }
  };
  const scan = (L, cam) => {
    way.stop = way.ahead = Infinity;
    const nose = st.s + CAR_NOSE;
    const endNose = L === IN ? IN.end + CAR_NOSE : Infinity;
    const horseTo = Math.min(nose + 14, endNose);
    const carTo = Math.min(horseTo, L === IN ? IN.end + CAR_HALF : Infinity);
    const from = st.s + CAR_HALF - 0.2;
    const n = Math.ceil((horseTo - from) / 0.5);
    for (let i = 0; i <= n; i++) {
      const q = Math.min(from + i * 0.5, horseTo);
      L.path.at(q, P);
      L.path.dir(q, D);
      const clear = q <= carTo ? carClear(L, q) : 0;
      // Vor der Nase, wo das Pferd an der Endstelle stehen bleibt, braucht es noch etwas Luft.
      const reach = i === n && horseTo === endNose ? 0.6 : 0.3;
      probe(q, nose, clear, reach, cam.x, cam.z);
      for (const w of loc.walkers ?? []) if (w.fig.visible) probe(q, nose, clear, reach, w.fig.position.x, w.fig.position.z);
    }
  };
  // Glocke: Steht der Wagen schon, tritt der Kutscher sie seltener.
  const ring = (rings = 2) => {
    if (st.bell > 0) return;
    st.bell = st.v > 0.3 ? 2.8 : 5.5;
    car.localToWorld(V.set(0, 2.5, st.leg.dir * ZP));
    (loc.sounds ??= []).push({ type: 'tramBell', ...hearing(view, V.x, V.z, 70), rings });
  };
  const drive = (dt, cam) => {
    const L = st.leg;
    let vmax = CRUISE;
    for (const [a, b, lim] of L.limits) {
      if (st.s <= b) vmax = Math.min(vmax, st.s >= a ? lim : Math.sqrt(lim * lim + 2 * BRAKE * (a - st.s)));
    }
    let stop = L === IN ? L.end : Infinity;
    scan(L, cam);
    if (way.stop < Infinity) {
      stop = Math.min(stop, way.stop);
      if (way.ahead < 10) ring();
    }
    const nose = st.s + CAR_NOSE;
    const tail = st.s - CAR_HALF;
    // Wendeschleife der Droschke vor der Sperre: erst hinein, wenn sie dort nicht wendet.
    if (!st.zone && nose > L.zoneIn - 16 && tail < L.zoneOut) {
      if (loc.cab?.turning) stop = Math.min(stop, L.zoneIn - CAR_NOSE - 1);
      else st.zone = loc.tramZone = true;
    }
    if (st.zone && tail > L.zoneOut + 1) st.zone = loc.tramZone = false;
    // Schlagbaum: rechtzeitig öffnen lassen, erst durch, wenn er oben ist.
    const gate = loc.tramGate;
    if (gate) {
      if (nose > L.gate - 14 && tail < L.gate + 2.5) {
        gate.want = st.gateUse = true;
        gate.watch = car.position;
        if (!gate.open && nose < L.gate - 0.8) stop = Math.min(stop, L.gate - CAR_NOSE - 1.2);
      } else if (st.gateUse) {
        gate.want = st.gateUse = false;
      }
    }
    if (stop < Infinity) vmax = Math.min(vmax, stop - st.s > 0.01 ? Math.sqrt(2 * BRAKE * (stop - st.s)) : 0);
    st.v = st.v < vmax ? Math.min(vmax, st.v + ACCEL * dt) : Math.max(vmax, st.v - 2.5 * BRAKE * dt);
    // Nie über den Haltepunkt hinaus; wer plötzlich ins Gleis tritt, vor dem steht der Wagen sofort.
    // Den letzten Zentimeter rollt er aus, sonst bliebe er womöglich knapp vor der Endstelle stehen.
    const next = st.s + st.v * dt;
    if (next > stop - 0.01) {
      st.s = Math.max(st.s, stop);
      st.v = 0;
    } else {
      st.s = next;
    }
  };

  const setVisible = (on) => {
    st.visible = on;
    for (const o of [car, team, driver, conductor]) o.visible = on;
  };
  const enterIn = () => {
    st.mode = 'run';
    st.leg = IN;
    st.s = 0;
    st.v = CRUISE * 0.9;
    st.hitched = true;
    st.reinsOn = true;
    Object.assign(crew.driver, { mode: 'ride', end: 1, script: [] });
    Object.assign(crew.conductor, { mode: 'ride', end: -1, script: [] });
    resetJoints();
    setVisible(true);
  };
  const goAway = () => {
    st.mode = 'away';
    st.timer = 40 + Math.random() * 60;
    st.v = 0;
    if (st.zone) st.zone = loc.tramZone = false;
    if (st.gateUse && loc.tramGate) loc.tramGate.want = st.gateUse = false;
    setVisible(false);
  };

  // --- Hindernis, Fundstelle, Passanten ---------------------------------------------------------
  const carRect = loc.collide(1e5, 1e5, 1e5, 1e5);
  const horseRect = loc.collide(1e5, 1e5, 1e5, 1e5);
  const spot = loc.addHotspot({ pos: [X0, 1.7, ZC], radius: 2.2, range: 3.6, label: 'Pferdebahn', action: { say: SAY.layover } });
  const pool = Array.from({ length: 6 }, () => ({ x: 0, z: 0, r: 0 }));
  const blockers = (loc.tramBlockers = []);
  // Der Wagenkasten hält das Licht der Laternen ab (lamps.js): drei Zylinder hintereinander.
  const shade = [-1.3, 0, 1.3].map((o) => ({ o, c: addShadeCaster(loc) }));
  // Innenlampe und Signallaternen fahren als bewegliche Zusatzlampen mit (lamps.js). Den mittleren
  // Zylinder, in dem die Innenlampe steht, lässt lamps.js für ihr Licht aus; die beiden äußeren
  // halten es nach vorn und hinten ab, sodass es vor allem seitlich wie durch die Fenster fällt.
  const carLamps = CAR_LIGHTS.map((l) => ({ ...l, x: 1e6, z: 1e6, moving: true }));
  (loc.extraLamps ??= []).push(...carLamps);
  const block = (x, z, r) => {
    const b = pool[blockers.length];
    b.x = x;
    b.z = z;
    b.r = r;
    blockers.push(b);
  };

  // --- Klang -------------------------------------------------------------------------------
  const joint = (sa, heavy) => {
    st.leg.path.at(sa, P);
    const ear = hearing(view, P.x, P.z, 40);
    (loc.sounds ??= []).push({ type: 'railJoint', vol: ear.vol * (0.45 + (0.55 * st.v) / CRUISE), pan: ear.pan, heavy });
  };
  const animateHorse = (dt, v, t, cam) => {
    if (Math.abs(v) < 0.03) {
      idleHorse(horse, t + 3.1);
      if (!st.visible) return;
      // Stehend stampft es ab und zu und schnaubt (wie die Droschkenpferde in plaza.js).
      const ear = hearing(view, team.position.x, team.position.z, 30);
      const lifted = Math.sin((t + 3.1) * 0.5) > 0.97;
      if (st.lifted && !lifted) (loc.sounds ??= []).push({ type: 'stamp', ...ear });
      st.lifted = lifted;
      st.snort -= dt;
      if (st.snort < 0) {
        st.snort = 12 + Math.random() * 25;
        (loc.sounds ??= []).push({ type: 'snort', ...ear });
      }
      return;
    }
    if (v < 0 || (st.gait === 'trot' && v < 1.5)) st.gait = 'walk';
    else if (st.gait === 'walk' && v > 1.9) st.gait = 'trot';
    const trot = st.gait === 'trot';
    st.phase += (dt * v * Math.PI * 2) / (trot ? TROT_STRIDE : WALK_STRIDE);
    (trot ? trotHorse : walkHorse)(horse, st.phase);
    const beat = Math.floor(st.phase / (trot ? Math.PI : Math.PI / 2));
    if (beat !== st.beat) {
      st.beat = beat;
      const ear = hearing(view, team.position.x, team.position.z, 45);
      (loc.sounds ??= []).push({ type: 'hoof', vol: ear.vol * (trot ? 1 : 0.7), pan: ear.pan, single: !trot });
    }
  };

  // Geschirr, Hindernisse, Raum für die Passanten und die Fundstelle folgen Wagen und Pferd.
  const layout = () => {
    // Zugeisen vom Wagen zum Ortscheit, Leinen vom Sattel in die Hände des Kutschers.
    link.visible = st.hitched;
    if (link.visible) link.userData.set(car.localToWorld(SPOTS.hook(st.leg.dir, A)), team.localToWorld(B.set(0, 0.8, -TRACE)));
    reins.mesh.visible = st.reinsOn && crew.driver.mode === 'ride';
    if (reins.mesh.visible) {
      for (const k of [1, -1]) {
        team.localToWorld(A.set(k * 0.1, 1.64, 0.12));
        car.localToWorld(SPOTS.hand(st.leg.dir, k * st.leg.dir, B));
        reins.set(k > 0 ? 0 : 1, A, B, 0.16);
      }
    }

    // Hindernisse für Holmes, Raum für die Passanten, Fundstelle.
    boxAround(carRect, car.position.x, car.position.z, car.rotation.y, 1.2, CAR_HALF);
    const hx = Math.sin(team.rotation.y);
    const hz = Math.cos(team.rotation.y);
    boxAround(horseRect, team.position.x - hx * 0.36, team.position.z - hz * 0.36, team.rotation.y, 0.45, 1.61);
    blockers.length = 0;
    const ax = Math.sin(car.rotation.y);
    const az = Math.cos(car.rotation.y);
    for (const o of [-2.1, 0, 2.1]) block(car.position.x + ax * o, car.position.z + az * o, 1.5);
    for (const o of [-1.2, 0.4]) block(team.position.x + hx * o, team.position.z + hz * o, 0.95);
    if (st.mode === 'run' && st.v > 0.3) {
      const ahead = 1.25 + 1.2 + st.v * 1.6;
      block(team.position.x + hx * ahead, team.position.z + hz * ahead, 1.1 + st.v * 0.4);
    }
    for (const { o, c } of shade) c.set(car.position.x + ax * o, car.position.z + az * o, 1.05, 2.9);
    for (const l of carLamps) {
      l.x = car.position.x + ax * l.o;
      l.z = car.position.z + az * l.o;
    }
    spot.pos.set(car.position.x, 1.7, car.position.z);
    spot.action.say = st.mode === 'turn' ? SAY.turn : st.mode === 'run' ? (st.leg === IN ? SAY.in : SAY.out) : SAY.layover;
  };

  let view = null;
  loc.onUpdate((rawDt, t, { camera }) => {
    const dt = Math.min(rawDt, 0.1);
    view = camera;
    const cam = camera.position;
    st.bell -= dt;

    if (st.mode === 'away') {
      st.timer -= dt;
      if (st.timer <= 0) enterIn();
    } else if (st.mode === 'layover') {
      if (crew.driver.mode === 'ride' && crew.conductor.mode === 'ride') st.timer -= dt;
      if (st.timer <= 0) {
        // Abfahrt: Der Schaffner zieht zweimal an der Klingelschnur.
        st.bell = 0;
        ring(2);
        st.mode = 'depart';
        st.timer = 1.4;
      }
    } else if (st.mode === 'depart') {
      st.timer -= dt;
      if (st.timer <= 0) st.mode = 'run';
    } else if (st.mode === 'run') {
      drive(dt, cam);
      if (st.leg === IN && st.s >= IN.end - 0.005 && st.v < 0.01) {
        st.s = IN.end;
        st.v = 0;
        startTurn();
      } else if (st.leg === OUT && st.s >= OUT.hide) {
        goAway();
      }
    }
    if (!st.visible) {
      hideRect(carRect);
      hideRect(horseRect);
      spot.pos.set(0, -1000, 0);
      blockers.length = 0;
      for (const { c } of shade) c.z = 0;
      for (const l of carLamps) l.x = l.z = 1e6;
      loc.tram = { vol: 0, pan: 0, speed: 0, moving: false };
      return;
    }

    placeCar(dt, t);
    if (st.walk) moveLead(dt, cam);
    else placeTeam();
    team.updateMatrixWorld();
    const moving = st.mode === 'run' ? st.v : 0;
    for (const w of car.userData.wheels) w.pivot.rotation.x += (st.leg.dir * moving * dt) / w.r;
    animateHorse(dt, st.walk ? st.walk.v : moving, t, cam);

    run(crew.driver, dt);
    run(crew.conductor, dt);
    stepActor(crew.driver, dt, t, cam);
    stepActor(crew.conductor, dt, t, cam);

    layout();

    // Rollen, Schienenstöße, Weichen.
    const ear = hearing(camera, car.position.x, car.position.z, 50);
    loc.tram = { vol: ear.vol, pan: ear.pan, speed: st.v, moving: st.mode === 'run' && st.v > 0.05 };
    if (st.mode === 'run') {
      for (let k = 0; k < 2; k++) {
        const off = k ? -AXLE : AXLE;
        const sa = st.s + off;
        const j = Math.floor(sa / JOINT);
        if (j !== st.joints[k]) {
          st.joints[k] = j;
          if (st.v > 0.1) {
            joint(sa, false);
            st.kick = (k ? -1 : 1) * st.leg.dir * Math.min(1, st.v / CRUISE);
          }
        }
        for (const to of st.leg.turnouts) if (st.prevS + off < to && sa >= to) joint(sa, true);
      }
    }
    st.prevS = st.s;
  });

  // Gleich beim Bau an die Endstelle stellen: Die Fallprüfung sieht den Ort vor dem ersten Bild.
  placeCar(0, 0);
  placeTeam();
  team.updateMatrixWorld();
  stepActor(crew.driver, 0, 0, null);
  stepActor(crew.conductor, 0, 0, null);
  layout();
}
