import * as THREE from 'three';
import { Bag, addMesh, cyl, glowSprites, matte, merge, std } from '../kit.js';
import { ARCH_FRONT, TIMETABLE_SIZE, archFronts, fogPuff, hallWindow, rng, signTexture, softDisc, stationTimetable, viaductBrick } from '../textures.js';
import { grimy } from './grime.js';
import { addSign } from './facades.js';
import { LANTERN_GLASS, lampWash, lightPool, wallLantern } from './lamps.js';
import { hearing } from './traffic.js';
import { buildDrips } from './drips.js';

// Stadtbahn: Viadukt mit Bögen, Bahnhof Börse, durchfahrender Zug mit Rauch.
export function buildRailway(loc, r) {
  const { scene } = loc;
  // Stadtbahnviadukt: z = 18 bis 32, mit Bögen. Bogen bei x = 0 ist der Durchgang zur Spree.
  const VZ0 = 18;
  const VZ1 = 32;
  const VH = 8.5;
  const SEG = 11;
  // Umriss mit offenem Bogen statt Rechteck mit Loch: Ein Loch, das bis zum Boden
  // reicht, bekommt beim Extrudieren eine Bodenfläche auf Höhe 0, die mit dem
  // Pflaster flackert.
  const archShape = () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.lineTo(1.1, 0);
    s.lineTo(1.1, 4.1);
    s.absarc(SEG / 2, 4.1, SEG / 2 - 1.1, Math.PI, 0, true);
    s.lineTo(SEG - 1.1, 0);
    s.lineTo(SEG, 0);
    s.lineTo(SEG, VH);
    s.lineTo(0, VH);
    s.closePath();
    return s;
  };
  const archGeo = new THREE.ExtrudeGeometry(archShape(), { depth: VZ1 - VZ0, bevelEnabled: false, curveSegments: 12 });
  const viaductParts = [];
  // Der Bogen des Durchgangs bekommt ein eigenes, glänzendes Material (nasse Wände).
  const passageParts = [];
  // Werkstein: Bogenringe aus Keilsteinen, Kämpfer und Sockel an den Pfeilern, hell abgesetzt
  // gegen die Ziegel. Die Ringe reichen oben in die Fahrbahnplatte, die über sie vorkragt.
  const stone = new Bag();
  const SANDSTONE = 0x9a8e74;
  const PLINTH = 0x6a6660;
  const RING_IN = SEG / 2 - 1.1;
  const RING_OUT = RING_IN + 0.38;
  const VOUSSOIRS = 19;
  const voussoir = (a0, a1) => {
    const s = new THREE.Shape();
    s.moveTo(Math.cos(a0) * RING_IN, Math.sin(a0) * RING_IN);
    s.lineTo(Math.cos(a0) * RING_OUT, Math.sin(a0) * RING_OUT);
    s.absarc(0, 0, RING_OUT, a0, a1, false);
    s.lineTo(Math.cos(a1) * RING_IN, Math.sin(a1) * RING_IN);
    s.absarc(0, 0, RING_IN, a1, a0, true);
    return new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false, curveSegments: 2 });
  };
  const ring = [];
  for (let k = 0; k < VOUSSOIRS; k++) {
    const a0 = (k / VOUSSOIRS) * Math.PI + 0.006;
    const a1 = ((k + 1) / VOUSSOIRS) * Math.PI - 0.006;
    // Jeder Keilstein ein wenig anders getönt.
    ring.push([voussoir(a0, a1), new THREE.Color(SANDSTONE).multiplyScalar(0.9 + ((k * 37) % 11) / 55)]);
  }
  const stoneTrim = (ax, i) => {
    const cx = ax + SEG / 2;
    for (const [z, flip] of [[VZ0 - 0.07, false], [VZ1, true]]) {
      for (const [g, col] of ring) {
        const v = g.clone();
        if (flip) v.rotateY(Math.PI);
        stone.add(v.translate(cx, 4.1, flip ? z + 0.07 : z), col);
      }
    }
    // Pfeiler links des Bogens (der rechte gehört zum nächsten Bogen); am Ende auch der rechte.
    for (const px of i === 24 ? [ax, ax + SEG] : [ax]) {
      for (const [z, d] of [[VZ0, -1], [VZ1, 1]]) {
        stone.box(SANDSTONE, 2.44, 0.28, 0.16, px, 4.1 - 0.14, z + d * 0.06);
        stone.box(PLINTH, 2.3, 0.7, 0.12, px, 0.35, z + d * 0.04);
      }
    }
    if (i === 0) {
      // Im Durchgang laufen Kämpfer und Sockel an beiden Wänden durch.
      for (const x of [ax + 1.1, ax + SEG - 1.1]) {
        const d = x < cx ? 1 : -1;
        stone.box(SANDSTONE, 0.16, 0.28, VZ1 - VZ0, x + d * 0.06, 4.1 - 0.14, (VZ0 + VZ1) / 2);
        stone.box(PLINTH, 0.12, 0.7, VZ1 - VZ0, x + d * 0.04, 0.35, (VZ0 + VZ1) / 2);
      }
    }
  };
  const infill = new Bag();
  const fronts = [];
  const lanterns = new Bag();
  const flames = [];
  const glows = [];
  const washes = [];
  const pools = [];
  const rf = rng(1892);
  const stationArches = new Set([-3, -2, 2, 3]);
  // Im Bogen neben dem Bankhaus liegt der Eingang zum Bahnhof: Tür, Schalter, Fahrplan, Treppe.
  const ENTRANCE = -2;
  // Front einer Bogenöffnung aus dem Atlas archFronts, mit der Ansichtsseite nach -z (side -1,
  // zum Platz) oder +z (side 1, zur Spree). Beim Eingang ist die Tür ausgespart.
  const front = (cell, x, z, side) => {
    const { w, h, rows } = ARCH_FRONT;
    const g = new THREE.ShapeGeometry(archOutline(cell === ARCH_FRONT.station), 16);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const cu = cell % 2;
    const cv = Math.floor(cell / 2);
    for (let k = 0; k < pos.count; k++) {
      uv.setXY(k, (cu + (pos.getX(k) + w / 2) / w) / 2, (rows - 1 - cv + Math.min(1, pos.getY(k) / h)) / rows);
    }
    if (side < 0) g.rotateY(Math.PI);
    fronts.push(g.translate(x, 0, z));
  };
  for (let i = -24; i <= 24; i++) {
    const g = archGeo.clone();
    const ax = i * SEG - SEG / 2;
    g.translate(ax, 0, VZ0);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    const nor = g.attributes.normal;
    for (let k = 0; k < pos.count; k++) {
      if (Math.abs(nor.getZ(k)) > 0.5) uv.setXY(k, pos.getX(k) * 0.33, pos.getY(k) * 0.33);
      else uv.setXY(k, pos.getZ(k) * 0.33, (pos.getX(k) + pos.getY(k)) * 0.33);
    }
    (i === 0 ? passageParts : viaductParts).push(g);
    stoneTrim(ax, i);
    if (i !== 0) {
      // Gefüllte Bögen: Lager und Kneipen unter der Bahn.
      // Destille oder Schlosserei mit Licht, sonst Kohlenhandlung oder Lager. Die Zahl aus r
      // bleibt, damit sich der Zufall des Viertels dahinter nicht verschiebt.
      const lit = r() < 0.28 || stationArches.has(i);
      const drawn = (lit ? 0 : 2) + (rf() < 0.5 ? 0 : 1);
      const entrance = i === ENTRANCE;
      const cell = entrance ? ARCH_FRONT.station : drawn;
      const x = i * SEG;
      if (!entrance) infill.box(0xa88872, SEG - 2, 8, 0.3, x, 4, VZ0 + 1.3);
      infill.box(0xa88872, SEG - 2, 8, 0.3, x, 4, VZ1 - 1.3);
      front(cell, x, VZ0 + 1.14, -1);
      front(2 + Math.floor(rf() * 2), x, VZ1 - 1.14, 1);
      // Vor den hellen Bögen am Platz eine Wandlaterne und ein Lichtfleck auf dem Pflaster.
      if (lit && Math.abs(x) < 70) {
        const lx = x + (entrance ? -1.5 : cell === 0 ? 0.9 : 3.2);
        const lz = VZ0 + 1.14;
        glows.push(wallLantern(lanterns, flames, new THREE.Vector3(lx, 3.2, lz), new THREE.Vector3(0, 0, -1), 0.52, washes));
        pools.push(new THREE.PlaneGeometry(5.5, 4.5).rotateX(-Math.PI / 2).translate(x, 0.03, VZ0 - 0.4));
      }
      if (entrance) {
        // In die Nische vor der Tür kann man hineintreten, durch die Tür nicht.
        loc.collide(ax, ax + 1.1, VZ0, VZ1);
        loc.collide(ax + SEG - 1.1, ax + SEG, VZ0, VZ1);
        loc.collide(ax + 1.1, ax + SEG - 1.1, VZ0 + 1.1, VZ1);
        (loc.dry ??= []).push({ minX: ax + 1.1, maxX: ax + SEG - 1.1, minZ: VZ0, maxZ: VZ0 + 1.14, top: ARCH_FRONT.spring });
        buildEntrance(loc, x, VZ0 + 1.14);
      } else {
        loc.collide(ax, ax + SEG, VZ0, VZ1);
      }
    } else {
      loc.collide(ax, ax + 1.1, VZ0, VZ1);
      loc.collide(ax + SEG - 1.1, ax + SEG, VZ0, VZ1);
      // Im Durchgang zur Spree regnet es nicht, bis unter den Scheitel des Bogens (weather.js).
      (loc.dry ??= []).push({ minX: ax + 1.1, maxX: ax + SEG - 1.1, minZ: VZ0, maxZ: VZ1, top: VH });
    }
  }
  // Gaslaterne im Durchgang zur Spree, am westlichen Pfeiler in halber Tiefe. Sie bekommt ein
  // echtes Licht aus der Rangliste der Straßenlaternen (lamps.js), sonst bliebe das Gewölbe
  // schwarz: Lichtscheine hellen nur auf, was schon beleuchtet ist.
  {
    const p = wallLantern(lanterns, flames, new THREE.Vector3(-SEG / 2 + 1.1, 3.5, (VZ0 + VZ1) / 2), new THREE.Vector3(1, 0, 0), 0.52, washes);
    glows.push(p);
    (loc.extraLamps ??= []).push({ x: p.x + 0.1, y: p.y, z: p.z, intensity: 16, weight: 0.3 });
    // Tropfwasser aus dem Gewölbe, mit Pfützen darunter.
    buildDrips(loc, { cx: 0, spring: 4.1, radius: RING_IN, z0: VZ0, z1: VZ1, lamp: p });
  }
  addMesh(scene, merge(viaductParts), sooty(grimy(matte(viaductBrick()), 'brick'), 'viaduct'));
  addMesh(scene, merge(passageParts), sooty(grimy(std({ ...viaductBrick(), roughness: 0.9 }), 'brick'), 'passage', true));
  addMesh(scene, stone.build(), sooty(grimy(matte({ vertexColors: true }), 'plaster'), 'viaductStone'));
  addMesh(scene, infill.build(), matte({ vertexColors: true, ...viaductBrick() }));
  const af = archFronts();
  addMesh(scene, merge(fronts), std({ map: af.map, emissive: 0xffffff, emissiveMap: af.emissiveMap, emissiveIntensity: 0.9, roughness: 0.8 }));
  addMesh(scene, lanterns.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.5 }));
  addMesh(scene, merge(flames), new THREE.MeshBasicMaterial({ color: LANTERN_GLASS }));
  addMesh(scene, merge(washes), lampWash());
  scene.add(glowSprites(glows.map(({ x, y, z }) => ({ x, y, z, size: 1.5, opacity: 0.45 })), softDisc('lampGlow'), 0xffa858));
  addMesh(scene, merge(pools), lightPool(0xc08040, 0.5));
  const deck = new Bag();
  const deckW = 49 * SEG;
  deck.box(0x2c2622, deckW, 0.5, VZ1 - VZ0 + 0.8, 0, VH + 0.25, (VZ0 + VZ1) / 2);
  addMesh(scene, deck.build(), matte({ vertexColors: true }));
  const rails = new Bag();
  for (const z of [VZ0 - 0.2, VZ1 + 0.2]) {
    rails.box(0x15181a, deckW, 0.07, 0.07, 0, VH + 1.45, z);
    for (let x = -deckW / 2; x < deckW / 2; x += 2.5) rails.box(0x15181a, 0.06, 1, 0.06, x, VH + 0.95, z);
  }
  for (const z of [22.2, 24, 26, 27.8]) rails.box(0x35363a, deckW, 0.14, 0.09, 0, VH + 0.6, z);
  addMesh(scene, rails.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.6 }));

  // Bahnhof Börse: Halle aus Eisen und Glas auf dem Viadukt. Das Dach ist ein flacher
  // Kreisbogen, der auf den Seitenwänden (Oberkante VH + 3.5) aufsitzt.
  const HALL_R = 9.5;
  const hallHalfSpan = (VZ1 - VZ0) / 2 - 0.2;
  const hallArc = Math.asin(hallHalfSpan / HALL_R); // halber Öffnungswinkel des Bogens
  const hallY = VH + 3.5 - HALL_R * Math.cos(hallArc); // Mittelpunkt des Bogens
  const hallZ = (VZ0 + VZ1) / 2;
  // Zylinder liegt nach der Drehung um Z entlang X; Winkel π/2 ist der Scheitel.
  const hall = new THREE.Mesh(
    new THREE.CylinderGeometry(HALL_R, HALL_R, 72, 24, 1, true, Math.PI / 2 - hallArc, 2 * hallArc),
    std({ color: 0x1b2430, roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide }),
  );
  hall.rotation.z = Math.PI / 2;
  hall.position.set(0, hallY, hallZ);
  scene.add(hall);
  const ribs = new Bag();
  for (let x = -36; x <= 36; x += 4) {
    const rib = new THREE.TorusGeometry(HALL_R + 0.05, 0.07, 6, 12, 2 * hallArc);
    rib.rotateZ(Math.PI / 2 - hallArc);
    rib.rotateY(Math.PI / 2);
    rib.translate(x, hallY, hallZ);
    ribs.add(rib, 0x0c0e10);
  }
  ribs.box(0x3a2c24, 72, 3.2, 0.5, 0, VH + 1.9, VZ0 + 0.2);
  ribs.box(0x3a2c24, 72, 3.2, 0.5, 0, VH + 1.9, VZ1 - 0.2);
  addMesh(scene, ribs.build(), std({ vertexColors: true, roughness: 0.6 }));
  // Hallenfenster, durch die das Licht der Bahnsteige fällt.
  const hallWindows = [];
  for (let x = -34; x <= 34; x += 4) {
    hallWindows.push(new THREE.PlaneGeometry(2.6, 1.3).rotateY(Math.PI).translate(x, VH + 2, VZ0 - 0.07));
    hallWindows.push(new THREE.PlaneGeometry(2.6, 1.3).translate(x, VH + 2, VZ1 + 0.07));
  }
  addMesh(scene, merge(hallWindows), new THREE.MeshBasicMaterial({ map: hallWindow(), alphaTest: 0.5, color: new THREE.Color(0.95, 0.72, 0.5) }));

  addSign(loc, new THREE.Vector3(0, 7.65, VZ0 - 0.1), 0, signTexture('Bahnhof Börse', { bg: '#20201c', fg: '#e0c98a' }), 9, 1.4);

  // Stadtbahnzug
  const train = buildTrain();
  scene.add(train.group);
  train.group.position.set(-400, VH + 0.65, 24);
  // Fahrplan: Der Zug kommt mit voller Fahrt (V), bremst vor dem Bahnhof gleichmäßig ab, hält
  // so, dass die Wagen in der Halle stehen, pfeift und fährt schwer wieder an. Danach wartet er
  // hinter dem Horizont auf die nächste Runde.
  const V = 13;
  const BRAKE = 0.6;
  const PULL = 0.45;
  const STOP = 37;
  let trainX = -420;
  let trainWait = 12;
  let speed = V;
  let phase = 'in';
  let dwell = 0;
  const smoke = [];
  const smokeMat = new THREE.SpriteMaterial({ map: fogPuff(), color: 0x70757d, transparent: true, opacity: 0.5, depthWrite: false });
  for (let i = 0; i < 16; i++) {
    const s = new THREE.Sprite(smokeMat.clone());
    s.visible = false;
    scene.add(s);
    smoke.push({ s, life: 0, size: 1 });
  }
  let smokeIdx = 0;
  let smokeTimer = 0;
  // Für den Klang (audio.js): roll vom nächsten Wagen, loco von der Lok, speed 0..1 der vollen
  // Fahrt, drive bei offenem Regler (Dampfstöße), phase 'in' | 'stop' | 'out'.
  loc.train = null;
  loc.onUpdate((dt, t, { camera }) => {
    if (trainWait > 0) {
      trainWait -= dt;
      loc.train = null;
    } else {
      const loco = () => hearing(camera, trainX + 5, 24, 200);
      if (phase === 'in') {
        speed = Math.min(V, Math.sqrt(2 * BRAKE * Math.max(0, STOP - trainX)));
        if (STOP - trainX < 0.02) {
          trainX = STOP;
          speed = 0;
          phase = 'stop';
          dwell = 22 + r() * 12;
          // Die Bremsen lassen los: ein langes Zischen.
          (loc.sounds ??= []).push({ type: 'brakeRelease', ...hearing(camera, trainX - 40, 24, 120) });
        }
      } else if (phase === 'stop') {
        const before = dwell;
        dwell -= dt;
        // Abfahrt: Die Aufsicht ruft „Einsteigen!“, dann „Fertich!“ und pfeift, die Lok antwortet.
        const platform = () => hearing(camera, 0, 24, 110);
        const at = (sec) => before > sec && dwell <= sec;
        if (at(9)) (loc.sounds ??= []).push({ type: 'call', text: 'einsteigen', ...platform() });
        if (at(4.6)) (loc.sounds ??= []).push({ type: 'call', text: 'fertig', ...platform() });
        if (at(3.6)) (loc.sounds ??= []).push({ type: 'guardWhistle', ...platform() });
        if (at(2.2)) (loc.sounds ??= []).push({ type: 'whistle', ...loco() });
        if (dwell <= 0) phase = 'out';
      } else {
        speed = Math.min(V, speed + PULL * dt);
      }
      trainX += speed * dt;
      if (trainX > 340) {
        trainX = -420;
        trainWait = 50 + r() * 40;
        speed = V;
        phase = 'in';
      }
      train.group.position.x = trainX;
      const carsLen = train.length;
      const nearest = Math.max(trainX - carsLen, Math.min(camera.position.x, trainX));
      const s = speed / V;
      // Vor dem Bahnhof rollt er mit geschlossenem Regler aus; beim Anfahren arbeitet die Lok.
      const drive = phase === 'out' || (phase === 'in' && STOP - trainX > V * V / (2 * BRAKE) + 20);
      loc.train = { roll: hearing(camera, nearest, 24, 120), loco: loco(), speed: s, drive, phase };
      // Rauch: beim Anfahren dicke Stöße im Takt, sonst ein dünner Faden.
      smokeTimer -= dt;
      if (smokeTimer < 0) {
        const heavy = drive && phase === 'out' && s < 0.6;
        smokeTimer = drive ? Math.min(0.9, 0.3 / Math.max(s, 0.25)) : 0.8;
        const puff = smoke[smokeIdx++ % smoke.length];
        puff.life = 1;
        puff.size = heavy ? 1.3 : drive ? 1 : 0.55;
        puff.s.visible = true;
        puff.s.position.set(trainX + 7.2, VH + 5.5, 24);
      }
    }
    for (const p of smoke) {
      if (p.life <= 0) continue;
      p.life -= dt * 0.22;
      if (p.life <= 0) p.s.visible = false;
      p.s.position.y += dt * 1.7;
      p.s.position.x -= dt * 1.5;
      const size = (3 + (1 - p.life) * 9) * p.size;
      p.s.scale.set(size, size, 1);
      p.s.material.opacity = p.life * 0.5;
    }
  });
}

// Umriss einer Bogenfront (Mitte unten im Ursprung). Mit door ist die Tür als Kerbe von unten
// ausgespart; ein Loch im Umriss gäbe beim Zerlegen in Dreiecke feine Ritzen neben der Tür.
function archOutline(door) {
  const { w, spring, door: d } = ARCH_FRONT;
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  if (door) {
    s.lineTo(-d.w / 2, 0);
    s.lineTo(-d.w / 2, d.h);
    s.lineTo(d.w / 2, d.h);
    s.lineTo(d.w / 2, 0);
  }
  s.lineTo(w / 2, 0);
  s.lineTo(w / 2, spring);
  s.absarc(0, spring, w / 2, 0, Math.PI, false);
  s.closePath();
  return s;
}

// Hinter der Tür des Bahnhofseingangs (Front bei z = z0): ein Flur mit Treppe zum Bahnsteig, von
// einer Gaslampe oben am Treppenabsatz beleuchtet. Das Licht ist in die Farben eingerechnet.
// Dazu Anker für die Fälle und die Fundstellen, die ohne Fall da sind.
function buildEntrance(loc, x, z0) {
  const { scene } = loc;
  const { w: dw, h: dh } = ARCH_FRONT.door;
  const half = dw / 2;
  const STEPS = 14;
  const RISE = 0.18;
  const TREAD = 0.32;
  const zStair = z0 + 0.7;
  const zTop = zStair + STEPS * TREAD;
  const zBack = zTop + 0.9;
  const top = STEPS * RISE;
  const lampY = top + 2.3;
  const lampZ = zBack - 0.5;
  const bag = new Bag();
  // Helligkeit nach dem Abstand zur Lampe: am Absatz hell, an der Tür nur noch ein Rest.
  const lit = (base, z, y) => new THREE.Color(base).multiplyScalar(0.16 + 0.6 * Math.max(0, 1 - Math.hypot(lampZ - z, lampY - y) / 6.5));
  // Dunkle Rückseite hinter der Front, damit vom Flur nichts an der Front vorbei scheint.
  const back = new THREE.ShapeGeometry(archOutline(true), 16).rotateY(Math.PI).translate(x, 0, z0 + 0.03);
  addMesh(scene, back, new THREE.MeshBasicMaterial({ color: 0x0a0806, side: THREE.DoubleSide }));
  // Wände in drei Abschnitten, damit der Lichtverlauf sichtbar wird; unten ein dunkler Sockel.
  // Sie beginnen knapp hinter Front und Rückseite: Läge ihre Stirnseite in der Ebene der Front,
  // flackerte sie an den Türkanten und über der Tür als heller Streifen hindurch.
  const zWall = z0 + 0.05;
  for (let k = 0; k < 3; k++) {
    const za = zWall + ((zBack - zWall) * k) / 3;
    const zb = zWall + ((zBack - zWall) * (k + 1)) / 3;
    const zm = (za + zb) / 2;
    for (const sx of [-1, 1]) {
      bag.box(lit(0xb8a27c, zm, 3.5), 0.08, 5.3, zb - za, x + sx * (half + 0.04), 3.75, zm);
      bag.box(lit(0x4a3a2c, zm, 0.6), 0.1, 1.1, zb - za, x + sx * (half + 0.03), 0.55, zm);
    }
  }
  bag.box(lit(0xb8a27c, zBack, lampY), dw + 0.2, 6.4, 0.08, x, 3.2, zBack + 0.04);
  bag.box(lit(0x5a544c, z0 + 0.35, 0), dw, 0.04, zStair - z0, x, 0.02, (z0 + zStair) / 2);
  for (let k = 0; k < STEPS; k++) {
    const zc = zStair + (k + 0.5) * TREAD;
    const y = (k + 1) * RISE;
    bag.box(lit(0x6a625a, zc, y), dw, y, TREAD, x, y / 2, zc);
    // Abgetretene, hellere Stufenkante.
    bag.box(lit(0x8a8276, zc, y), dw, 0.03, 0.05, x, y + 0.005, zc - TREAD / 2 + 0.025);
  }
  bag.box(lit(0x6a625a, lampZ, top), dw, top, zBack - zTop, x, top / 2, (zTop + zBack) / 2);
  // Decke: von der Türoberkante mit der Treppe ansteigend bis über den Absatz.
  const rise = lampY + 0.6 - dh;
  const ceil = new THREE.PlaneGeometry(dw, Math.hypot(zBack - zWall, rise));
  ceil.rotateX(Math.PI / 2 - Math.atan2(rise, zBack - zWall));
  ceil.translate(x, dh + rise / 2, (zWall + zBack) / 2);
  bag.add(ceil, lit(0x8a7658, zBack - 1, lampY));
  // Handlauf aus Eisen an der einen Wand.
  const rail = new THREE.BoxGeometry(0.05, 0.05, Math.hypot(zTop - zStair, top));
  rail.rotateX(-Math.atan2(top, zTop - zStair));
  rail.translate(x - half + 0.06, 0.95 + top / 2, (zStair + zTop) / 2);
  bag.add(rail, 0x141414);
  // Türflügel aus Holz, ganz nach innen an die Wände geklappt.
  for (const sx of [-1, 1]) {
    bag.box(lit(0x3a2a1a, z0 + 0.6, 1.5), 0.06, dh - 0.05, half - 0.05, x + sx * (half - 0.03), dh / 2, z0 + (half - 0.05) / 2 + 0.02);
  }
  addMesh(scene, bag.build(), new THREE.MeshBasicMaterial({ vertexColors: true }));
  // Die Gaslampe über dem Absatz.
  addMesh(scene, new THREE.BoxGeometry(0.16, 0.24, 0.16).translate(x, lampY, lampZ), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(x, lampY, lampZ);
  glow.scale.setScalar(1.6);
  scene.add(glow);
  // Durch die offene Tür fällt warmes Licht auf das Pflaster vor der Nische.
  addMesh(scene, new THREE.PlaneGeometry(3.2, 3.4).rotateX(-Math.PI / 2).translate(x, 0.031, z0 - 2.2), lightPool(0xd09050, 0.35));

  // Von außen gesehen (Blick nach +z) liegt der Schalter links der Tür (x größer), der Fahrplan rechts.
  // Unter der Durchreiche ein Zahlbrett aus Holz auf zwei Konsolen, abgegriffen an der Kante.
  const counter = new Bag();
  counter.box(0x3e2c1c, 0.95, 0.05, 0.24, x + 2.95, 0.975, z0 - 0.12);
  counter.box(0x5a422a, 0.95, 0.012, 0.03, x + 2.95, 1.0, z0 - 0.225);
  for (const dx of [-0.36, 0.36]) counter.box(0x2a1e14, 0.04, 0.16, 0.16, x + 2.95 + dx, 0.87, z0 - 0.08);
  addMesh(scene, counter.build(), std({ vertexColors: true, roughness: 0.7 }));
  loc.anchor('knipser', x + 1.5, 0, z0 - 0.42, Math.PI - 0.45);
  timetableBoard(scene, x - 2.95, 1.75, z0);
  loc.anchor('fahrplan', x - 2.95, 1.75, z0 - 0.06);
  loc.addHotspot({
    id: 'fahrplan',
    pos: [x - 2.95, 1.75, z0 - 0.06],
    radius: 0.8,
    label: 'Fahrplan',
    action: { say: 'Stadtbahn, Winterfahrplan. Nach Westen wie nach Osten fährt alle zwanzig Minuten ein Zug, in kleiner, gedrängter Schrift. Berlin lebt nach der Uhr, und das hier ist sein Gesangbuch.' },
  });
  loc.addHotspot({
    pos: [x + 2.95, 1.7, z0 - 0.06],
    radius: 0.8,
    label: 'Fahrkartenschalter',
    action: { say: 'Hinter der Mattscheibe der Schatten eines Beamten mit Ärmelschonern. Ein Gestell voller Pappkarten und eine Datumspresse, die bei jedem Billet hart zuschlägt. Wer hier eine Fahrkarte kauft, bekommt den Tag gleich mit eingeprägt.' },
  });
  loc.addHotspot({
    pos: [x, 1.4, z0 + 0.6],
    radius: 0.8,
    label: 'Treppe zum Bahnsteig',
    action: { say: 'Granitstufen, in der Mitte ausgetreten, als wäre die halbe Stadt sie schon hinaufgehastet. Von oben dringen das Zischen der Lokomotiven und die Rufe der Aufsicht herab.' },
  });
}

// Fahrplan unter Glas in einem Holzrahmen vor der Bogenfront (Wand bei z = z0, Ansicht von -z).
// Auf der Front selbst stünde er mit knapp 90 Pixeln je Meter nur als Striche; die eigene Textur
// hat 640. Das Papier leuchtet ein wenig selbst: Die Wandlaterne daneben hängt nur als Schein auf
// der Mauer, und der Rahmen stünde sonst dunkler da als die Wand um ihn herum.
function timetableBoard(scene, cx, cy, z0) {
  const { w, h } = TIMETABLE_SIZE;
  const frame = new Bag();
  frame.box(0x2a2016, w + 0.04, h + 0.04, 0.04, cx, cy, z0 - 0.02);
  const bar = 0.06;
  for (const s of [-1, 1]) {
    frame.box(0x3a2a1a, w + 0.04, bar, 0.02, cx, cy + s * (h / 2 - bar / 2 + 0.02), z0 - 0.05);
    frame.box(0x3a2a1a, bar, h + 0.04, 0.02, cx + s * (w / 2 - bar / 2 + 0.02), cy, z0 - 0.05);
  }
  addMesh(scene, frame.build(), std({ vertexColors: true, roughness: 0.6 }));
  const map = stationTimetable();
  const paper = new THREE.PlaneGeometry(w - 0.08, h - 0.08).rotateY(Math.PI).translate(cx, cy, z0 - 0.041);
  addMesh(scene, paper, std({ map, roughness: 0.85, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.2 }));
  const glass = new THREE.PlaneGeometry(w - 0.08, h - 0.08).rotateY(Math.PI).translate(cx, cy, z0 - 0.05);
  const pane = addMesh(scene, glass, std({ color: 0x10141a, roughness: 0.05, transparent: true, opacity: 0.14, depthWrite: false }));
  pane.renderOrder = 1;
}

function buildTrain() {
  const group = new THREE.Group();
  const bag = new Bag();
  const lit = new Bag();
  // Lokomotive voran in +X.
  bag.box(0x14181c, 8, 0.5, 2.6, 2, 1.1, 0);
  bag.add(cylX(0.95, 5, 2.8, 2.2, 0), 0x171b1f);
  bag.box(0x171b1f, 2.6, 2.3, 2.6, -1, 2.6, 0);
  bag.box(0x0c0e10, 2.9, 0.12, 2.9, -1, 3.8, 0);
  bag.add(cyl(0.3, 0.26, 1.3, 4.9, 3.5, 0, 10), 0x0c0e10);
  bag.add(cyl(0.45, 0.45, 0.6, 3, 3.1, 0, 10), 0x24201a);
  for (const x of [0.5, 2.3, 4.1]) {
    for (const z of [-1.2, 1.2]) bag.add(cylX2(0.7, x, 0.7, z), 0x0e1012);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.3), new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 4, 1.8) }));
  lamp.position.set(6.1, 1.9, 0);
  group.add(lamp);
  // Wagen
  const CAR = 12.5;
  const COUNT = 6;
  for (let c = 0; c < COUNT; c++) {
    const x = -8.5 - c * (CAR + 0.6);
    bag.box(0x2a2a22, CAR, 2.5, 2.7, x, 2.2, 0);
    bag.box(0x12100e, CAR + 0.2, 0.15, 2.9, x, 3.55, 0);
    bag.box(0x0e0e0e, CAR, 0.4, 2.4, x, 0.85, 0);
    for (const wx of [-4, 4]) {
      for (const wz of [-1.1, 1.1]) bag.add(cylX2(0.42, x + wx, 0.42, wz), 0x0e1012);
    }
    for (let w = 0; w < 7; w++) {
      const wx = x - CAR / 2 + 1 + w * 1.77;
      lit.box(0xffffff, 0.9, 0.9, 2.74, wx, 2.5, 0);
    }
  }
  group.add(new THREE.Mesh(bag.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.3 })));
  group.add(new THREE.Mesh(lit.build(), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.8, 1.25, 0.6), vertexColors: true })));
  return { group, length: COUNT * (CAR + 0.6) + 8 };
}

function cylX(r, len, y, x, z) {
  const g = new THREE.CylinderGeometry(r, r, len, 14);
  g.rotateZ(Math.PI / 2);
  g.translate(x + 2.1, y, z);
  return g;
}

function cylX2(r, x, y, z) {
  const g = new THREE.CylinderGeometry(r, r, 0.08, 14);
  g.rotateX(Math.PI / 2);
  g.translate(x, y, z);
  return g;
}

// Ruß, Kalk und Nässe am Viadukt, über grimy() gelegt (braucht dessen vGrimePos und grimeMap).
// Ruß der Dampfloks: oben dicht, in senkrechten Fahnen nach unten auslaufend. Kalkausblühungen
// am Fuß der Pfeiler, wo die Feuchte aus dem Boden steigt. wet: Im Durchgang sind die Wände
// unten nass, dunkler und glänzend (nur bei MeshStandardMaterial).
function sooty(material, key, wet = false) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    prev(shader, renderer);
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        float sootHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float sootNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(sootHash(i), sootHash(i + vec2(1.0, 0.0)), f.x), mix(sootHash(i + vec2(0.0, 1.0)), sootHash(i + vec2(1.0, 1.0)), f.x), f.y);
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float along = vGrimePos.x + vGrimePos.z;
        float streak = texture2D(grimeMap, vec2(along / 2.3, vGrimePos.y / 40.0)).r;
        float soot = smoothstep(3.5, 8.5, vGrimePos.y + (0.63 - streak) * 9.0);
        diffuseColor.rgb *= mix(1.0, 0.45, soot);
        float saltN = sootNoise(vec2(along * 1.4, vGrimePos.y * 2.2)) * 0.65 + sootNoise(vec2(along * 4.1, vGrimePos.y * 6.0)) * 0.35;
        float salt = smoothstep(0.5, 0.75, saltN) * (1.0 - smoothstep(0.25, 1.4, vGrimePos.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.4, 0.38, 0.35), salt * 0.55);
        ${wet ? 'float wetWall = 1.0 - smoothstep(0.2, 1.9, vGrimePos.y + (sootNoise(vec2(along * 2.0, 0.5)) - 0.5) * 0.8);\n        diffuseColor.rgb *= mix(1.0, 0.68, wetWall);' : ''}`,
      );
    if (wet) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.28, wetWall);`,
      );
    }
  };
  material.customProgramCacheKey = () => `sooty-${key}`;
  return material;
}
