import * as THREE from 'three';
import { Bag, std } from '../kit.js';
import { makeFigure, makeHorse, trotHorse, walkFigure } from '../figures.js';

export function makeDroschke() {
  const g = new THREE.Group();
  const mat = std({ vertexColors: true, roughness: 0.4, metalness: 0.2 });
  const body = new Bag();
  body.box(0x101418, 1.4, 1.15, 1.7, 0, 1.15, -1.0);
  body.box(0x0b0d10, 1.5, 0.08, 1.9, 0, 1.76, -1.0);
  body.box(0x1a1208, 1.4, 0.5, 0.9, 0, 0.82, 0.3);
  body.box(0x101418, 1.0, 0.1, 0.5, 0, 1.45, 0.25);
  body.box(0x1a1208, 0.06, 0.06, 2.6, -0.45, 0.72, 1.7);
  body.box(0x1a1208, 0.06, 0.06, 2.6, 0.45, 0.72, 1.7);
  const wheel = (x, z, r) => {
    const w = new THREE.TorusGeometry(r, 0.03, 6, 22);
    w.rotateY(Math.PI / 2);
    w.translate(x, r, z);
    body.add(w, 0x1a1208);
    for (let i = 0; i < 5; i++) {
      const s = new THREE.BoxGeometry(0.02, r * 2, 0.03);
      s.rotateX((i / 5) * Math.PI);
      s.translate(x, r, z);
      body.add(s, 0x1a1208);
    }
  };
  wheel(-0.78, -1.3, 0.62);
  wheel(0.78, -1.3, 0.62);
  wheel(-0.78, 0.5, 0.42);
  wheel(0.78, 0.5, 0.42);
  g.add(new THREE.Mesh(body.build(), mat));
  const win = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.45, 0.8), new THREE.MeshStandardMaterial({ color: 0x0e1520, roughness: 0.1, metalness: 0.7 }));
  win.position.set(0, 1.4, -1.0);
  g.add(win);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.12), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.5, 1) }));
  lantern.position.set(0.82, 1.5, 0.15);
  g.add(lantern);
  // Kutscher sitzt auf dem Bock (Oberkante 1.07).
  const driver = makeFigure({ outfit: 'overcoat', cape: true, coat: 0x24201a, hat: 'top', hatColor: 0x18140f, moustache: 'walrus', pose: 'sit' });
  driver.position.set(0, 0.2, 0.15);
  g.add(driver);
  const horse = makeHorse(0x30221a);
  horse.position.set(0, 0, 3.0);
  g.add(horse);
  g.userData.horse = horse;
  return g;
}

export function buildTraffic(loc, r) {
  const { scene } = loc;
  // Droschke fährt die Rosenthaler rauf und runter, Wende im Platz.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(3.6, 0, -180),
    new THREE.Vector3(3.6, 0, -90),
    new THREE.Vector3(3.6, 0, -30),
    new THREE.Vector3(6, 0, -4),
    new THREE.Vector3(0, 0, 8),
    new THREE.Vector3(-6, 0, -4),
    new THREE.Vector3(-3.6, 0, -30),
    new THREE.Vector3(-3.6, 0, -90),
    new THREE.Vector3(-3.6, 0, -180),
    new THREE.Vector3(0, 0, -184),
  ], true);
  const cab = makeDroschke();
  scene.add(cab);
  const light = new THREE.Vector3();
  const pathLen = curve.getLength();
  let u = 0.1;
  let phase = 0;
  const ahead = new THREE.Vector3();
  loc.onUpdate((dt, t, { camera }) => {
    const p = curve.getPointAt(u);
    curve.getPointAt((u + 0.002) % 1, ahead);
    const dist = Math.hypot(p.x - camera.position.x, p.z - camera.position.z);
    const blocked = dist < 7 && (camera.position.x - p.x) * (ahead.x - p.x) + (camera.position.z - p.z) * (ahead.z - p.z) > 0;
    const speed = blocked ? 0 : 4.2;
    u = (u + (speed * dt) / pathLen) % 1;
    cab.position.set(p.x, 0, p.z);
    cab.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    if (speed > 0) {
      phase += dt * 9;
      trotHorse(cab.userData.horse, phase);
    }
    light.copy(p);
  });

  // Passanten auf den Gehwegen
  const looks = [
    { outfit: 'overcoat', coat: 0x1f2228, hat: 'top', moustache: 'kaiser', cane: true, height: 1.8 },
    { outfit: 'frock', coat: 0x2a2620, vest: 0x3a3226, hat: 'bowler', beard: 'full', hair: 0x4a4038, chain: true, build: 'stout' },
    { coat: 0x30261e, neck: 'scarf', tie: 0x5a3020, hat: 'cap', trousers: 0x24201a, beard: 'stubble' },
    { outfit: 'overcoat', coat: 0x262a2e, hat: 'cap', moustache: 'walrus', hair: 0x6a6258 },
    { outfit: 'dress', coat: 0x38242a, hat: 'bonnet', hatColor: 0x22161a, shawl: 0x4a3a30, height: 1.62 },
    { outfit: 'dress', coat: 0x2a2c38, hat: 'bonnet', hatColor: 0x1c1c26, collar: 0xe0dacb, build: 'slim', height: 1.6 },
    { outfit: 'frock', coat: 0x1c1f24, hat: 'bowler', cane: true, beard: 'mutton', eyewear: 'spectacles' },
    { coat: 0x322a22, neck: 'none', hat: 'cap', apron: 0x8a8272, moustache: 'brush', build: 'stout' },
  ];
  const routes = [
    [[-7.5, -28], [-7.5, -180]],
    [[7.5, -176], [7.5, -30]],
    [[-7.5, -130], [-7.5, -40]],
    [[7.5, -80], [7.5, -170]],
    [[14, -96.4], [120, -96.4]],
    [[118, -103.5], [14, -103.5]],
    [[-42, -12.6], [-160, -12.6]],
    [[-150, -3.4], [-38, -3.4]],
    [[-24, -18], [24, -18]],
    [[20, 12], [-20, 12]],
    [[-90, 40], [80, 40]],
    [[-3, 35], [-3, -20]],
  ];
  const walkers = routes.map((route, i) => {
    const fig = makeFigure(looks[i % looks.length]);
    const from = new THREE.Vector2(route[0][0], route[0][1]);
    const to = new THREE.Vector2(route[1][0], route[1][1]);
    const len = from.distanceTo(to);
    const w = { fig, from, to, len, s: r() * len, dir: 1, phase: r() * 6, speed: 1.05 + r() * 0.4 };
    scene.add(fig);
    return w;
  });
  loc.onUpdate((dt, t, { camera }) => {
    for (const w of walkers) {
      const a = w.from;
      const b = w.to;
      const k = w.s / w.len;
      const x = a.x + (b.x - a.x) * k;
      const z = a.y + (b.y - a.y) * k;
      const dx = camera.position.x - x;
      const dz = camera.position.z - z;
      const near = dx * dx + dz * dz < 1.3;
      if (!near) {
        w.s += w.dir * w.speed * dt;
        w.phase += dt * w.speed * 5.2;
        if (w.s > w.len) w.dir = -1;
        if (w.s < 0) w.dir = 1;
        walkFigure(w.fig, w.phase);
      }
      w.fig.position.set(x, loc.heightAt(x, z), z);
      w.fig.rotation.y = Math.atan2((b.x - a.x) * w.dir, (b.y - a.y) * w.dir);
    }
  });
}
