import * as THREE from 'three';
import { Location } from '../../engine/location.js';
import { Bag, addMesh, box, std } from '../kit.js';
import { brick, cobble, plaster, signTexture, slate, softDisc, rng } from '../textures.js';
import { addSign, createFacades } from './facades.js';
import { buildRailway } from './railway.js';
import { buildHorizon } from './horizon.js';
import { buildRiver } from './river.js';
import { buildLamps } from './lamps.js';
import { buildPlaza } from './plaza.js';
import { buildTraffic } from './traffic.js';
import { buildWeather } from './weather.js';

// Das erste Viertel: Hackescher Markt, Rosenthaler und Oranienburger Straße, Sophienstraße,
// die Stadtbahn am Bahnhof Börse und die Spree. Norden ist -Z.
export function buildBerlin() {
  const loc = new Location('berlin', 'Hackescher Markt', { ambience: 'street', surface: 'stone' });
  const { scene } = loc;
  const r = rng(1892);

  const FOG = 0x151c28;
  scene.fog = new THREE.FogExp2(FOG, 0.0125);
  scene.background = new THREE.Color(FOG);
  loc.exposure = 1;

  // Nachtlicht: kaum Mond, dafür die Laternen.
  scene.add(new THREE.HemisphereLight(0x5a6e94, 0x1e1a15, 2.1));
  const moon = new THREE.DirectionalLight(0x8aa4cc, 1.1);
  moon.position.set(-60, 120, -40);
  scene.add(moon);

  // Himmel
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: { low: { value: new THREE.Color(FOG) }, high: { value: new THREE.Color(0x070a12) } },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 low; uniform vec3 high; varying vec3 vP;
        void main(){
          float t = smoothstep(0.0, 0.5, vP.y);
          vec3 c = mix(low, high, t);
          vec3 m = normalize(vec3(-0.45, 0.62, -0.64));
          float d = max(dot(normalize(vP), m), 0.0);
          c += vec3(0.42,0.5,0.62) * pow(d, 900.0) * 1.6 + vec3(0.1,0.13,0.2) * pow(d, 40.0);
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);
  loc.onUpdate((dt, t, { camera }) => sky.position.copy(camera.position));

  // Materialien
  const plasterTex = plaster();
  const wallMat = std({ ...plasterTex, vertexColors: true, roughness: 0.92, normalScale: new THREE.Vector2(0.5, 0.5) });
  const darkGlass = std({ color: 0x0b0f16, roughness: 0.18, metalness: 0.5 });
  const litGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.31, 0.09) });
  const roofMat = std({ ...slate(), roughness: 0.65 });
  const brickMat = std({ ...brick(), roughness: 0.88 });
  const ironMat = std({ color: 0x0f1211, roughness: 0.55, metalness: 0.5 });
  const facades = createFacades(loc, r, { plasterTex, wallMat, darkGlass, litGlass, roofMat });
  const { block, row } = facades;

  // --- Rosenthaler Straße ---------------------------------------------------
  row({ x: -9, z: -24, face: 'east', bays: 20 }); // bis z = -92
  const apotheke = block({ x: -9, z: -92, face: 'east', color: 0xa8957c, ground: ['shop', 'door', 'shop', 'ground', 'ground'] }, 5);
  row({ x: -9, z: -109, face: 'east', bays: 24 }); // bis z = -190

  row({ x: 9, z: -190, face: 'west', bays: 25 });
  row({ x: 9, z: -95, face: 'west', bays: 5 }); // z -95 bis -78
  const kessler = block({ x: 9, z: -78, face: 'west', color: 0x8a8070, ground: ['ground', 'door', 'shop', 'shop', 'ground', 'ground'] }, 6);
  row({ x: 9, z: -57.6, face: 'west', bays: 10 });

  // --- Sophienstraße ---------------------------------------------------------
  row({ x: 9, z: -105, face: 'south', bays: 10 });
  const destille = block({ x: 43, z: -105, face: 'south', color: 0x786c5c, floors: 3, ground: ['shop', 'door', 'shop', 'ground', 'ground'] }, 5);
  row({ x: 60, z: -105, face: 'south', bays: 21 });
  row({ x: 130, z: -95, face: 'north', bays: 36 });

  // --- Hackescher Markt -------------------------------------------------------
  row({ x: -32, z: -24, face: 'south', bays: 7 });
  row({ x: 9, z: -24, face: 'south', bays: 7 });
  row({ x: 32, z: -24, face: 'west', bays: 13 });
  row({ x: -32, z: -14, face: 'east', bays: 3 });
  const bank = block({ x: -32, z: 18, face: 'east', color: 0x77706a, floors: 3, lit: 0.1, ground: ['ground', 'ground', 'door', 'ground', 'ground', 'ground'] }, 6);

  // --- Oranienburger Straße ---------------------------------------------------
  row({ x: -170, z: -14, face: 'south', bays: 25 });
  const pension = block({ x: -85, z: -14, face: 'south', color: 0x9a8a74, ground: ['ground', 'ground', 'door', 'ground', 'ground', 'ground'] }, 6);
  row({ x: -64.6, z: -14, face: 'south', bays: 10 });
  row({ x: -32, z: -2, face: 'north', bays: 41 });

  facades.finish();

  // Fahrbahn: von z = -430 bis unter die Quaikante (44.6), damit sie nicht über der Spree liegt.
  const cob = cobble();
  const STREET_Z0 = -430;
  const STREET_Z1 = 44.6;
  const streetDepth = STREET_Z1 - STREET_Z0;
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(720, streetDepth),
    std({ ...cob, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.6 }),
  );
  // Pflastergröße wie bisher: 8 m pro Kachel.
  for (const t of Object.values(cob)) t.repeat.set(90, streetDepth / 8);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0, (STREET_Z0 + STREET_Z1) / 2);
  scene.add(street);

  buildRailway(loc, r, brickMat);
  buildHorizon(loc, r);
  buildRiver(loc, FOG);

  // Laternen
  const lampPositions = [];
  const lampAt = (x, z) => lampPositions.push([x, z]);
  for (let z = -40; z > -185; z -= 24) {
    lampAt(6.6, z);
    lampAt(-6.6, z - 12);
  }
  for (let x = 22; x < 128; x += 22) {
    lampAt(x, -97.4);
    lampAt(x + 11, -102.6);
  }
  for (let x = -44; x > -168; x -= 22) {
    lampAt(x, -11.6);
    lampAt(x - 11, -4.4);
  }
  // Am Platz und unter dem Viadukt
  for (const [x, z] of [[-29.4, -21.6], [29.4, -21.6], [-29.4, 14], [29.4, 14], [-14, -21.6], [14, -21.6], [-8, 15], [8, 15], [29.4, -4]]) lampAt(x, z);
  for (let x = -130; x <= 130; x += 20) lampAt(x, 43);
  buildLamps(loc, lampPositions, ironMat);

  // Straßenmöblierung und Bäume
  buildPlaza(loc, r, ironMat);

  // Baustellen an den Rändern der begehbaren Welt.
  // Wird das nächste Viertel gebaut, verschwinden diese Sperren einfach.
  const barrier = (cx, cz, along, width) => {
    const b = new Bag();
    const w = width;
    const add = (ox, oz, sx, sy, sz, y, c) => (along === 'x'
      ? b.box(c, sx, sy, sz, cx + ox, y, cz + oz)
      : b.box(c, sz, sy, sx, cx + oz, y, cz + ox));
    add(0, 0, w, 0.16, 0.08, 1.05, 0xa8362c);
    add(0, 0, w, 0.16, 0.08, 0.55, 0xd6cfba);
    for (let o = -w / 2; o <= w / 2; o += 3) add(o, 0, 0.1, 1.2, 0.1, 0.6, 0x2c2015);
    // Erdhaufen und Bretter
    for (let i = 0; i < 6; i++) add((i / 5 - 0.5) * w * 0.8, -2 - r() * 2, 2.2, 1.1 + r() * 0.7, 2.2, 0.5, 0x2b241c);
    addMesh(scene, b.build(), std({ vertexColors: true, roughness: 1 }));
    if (along === 'x') loc.collide(cx - w / 2, cx + w / 2, cz - 0.4, cz + 0.4);
    else loc.collide(cx - 0.4, cx + 0.4, cz - w / 2, cz + w / 2);
    loc.addHotspot({
      pos: [cx, 1.2, cz],
      radius: 1.4,
      range: 4,
      label: 'Kanalbau',
      action: { say: 'Hobrechts Kanalisation frisst sich durch Berlin. Hier ist die Straße aufgerissen und für heute kein Durchkommen. Weiter draußen wartet der Rest der Stadt – ein andermal.' },
    });
    const warn = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('warn'), color: 0xff5a2c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    warn.position.set(cx, 1.5, cz);
    warn.scale.setScalar(1.3);
    scene.add(warn);
  };
  barrier(0, -188, 'x', 20);
  barrier(127, -100, 'z', 12);
  barrier(-168, -8, 'z', 14);
  barrier(-145, 38, 'z', 14);
  barrier(145, 38, 'z', 14);

  // Eingänge
  const doorSpot = (id, at, label, to, height = 1.5) => {
    const out = at.clone();
    loc.addHotspot({ id: `door_${id}`, pos: [out.x, height, out.z], radius: 1.2, range: 3.4, label, action: { door: id, to } });
    loc.doorMarks = loc.doorMarks || {};
    loc.doorMarks[id] = out;
  };
  const shopSign = (bld, bay, text, width = 6.5) => {
    const p = bld.at(bay, 3.95, 0.32);
    addSign(loc, p, bld.rot, signTexture(text), width, width * 0.17);
  };
  const lanternOver = (bld, bay) => {
    const p = bld.at(bay, 3.6, 0.5);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(p);
    glow.scale.setScalar(1.8);
    scene.add(glow);
    addMesh(scene, box(0.16, 0.26, 0.16, p.x, p.y, p.z), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) }));
  };

  shopSign(kessler, 2.5, 'Uhrmacher E. Kessler');
  doorSpot('werkstatt', kessler.at(1, 1.5, 0.2), 'Werkstatt Kessler', 'werkstatt');
  lanternOver(kessler, 1);
  shopSign(apotheke, 1, 'Apotheke zum Schwarzen Adler', 7.5);
  doorSpot('apotheke', apotheke.at(1, 1.5, 0.2), 'Apotheke zum Schwarzen Adler', 'apotheke');
  lanternOver(apotheke, 1);
  shopSign(destille, 1, 'Destille Zur Goldenen Schrippe', 8);
  doorSpot('destille', destille.at(1, 1.5, 0.2), 'Destille „Zur Goldenen Schrippe“', 'destille');
  lanternOver(destille, 1);
  shopSign(bank, 2, 'Bankhaus Lindner & Sohn', 8);
  doorSpot('bank', bank.at(2, 1.5, 0.2), 'Bankhaus Lindner & Sohn', 'bank');
  lanternOver(bank, 2);
  shopSign(pension, 2, 'Pension Puhlmann', 6);
  doorSpot('pension', pension.at(2, 1.5, 0.2), 'Pension Puhlmann', 'pension');
  lanternOver(pension, 2);

  // Rückwege aus den Häusern: ein Schritt vor der Tür, mit Blick auf die Straße.
  const out = (bld, bay, yaw) => {
    const p = bld.at(bay, 0, 1.4);
    return { pos: [p.x, 0, p.z], yaw };
  };
  loc.exits = {
    werkstatt: out(kessler, 1, -Math.PI / 2 + Math.PI),
    apotheke: out(apotheke, 1, -Math.PI / 2),
    destille: out(destille, 1, Math.PI),
    bank: out(bank, 2, -Math.PI / 2),
    pension: out(pension, 2, Math.PI),
  };

  // Anker, an die Fälle ihre Figuren hängen können.
  const k = kessler.at(0, 0, 1.3);
  loc.anchor('vorWerkstatt', k.x, 0.13, k.z, -Math.PI / 2);
  loc.anchor('sophienEcke', 12.5, 0.13, -96.7, -Math.PI * 0.6);
  loc.anchor('platz', 9, 0, -7, Math.PI);

  // Stadtplan für das Notizbuch.
  loc.map = {
    bounds: { minX: -175, maxX: 135, minZ: -195, maxZ: 72 },
    streets: [
      { x0: -32, x1: 32, z0: -24, z1: 18, name: 'Hackescher Markt', tx: 4, tz: -15 },
      { x0: -9, x1: 9, z0: -190, z1: -24, name: 'Rosenthaler Straße', tx: 0, tz: -150, vertical: true },
      { x0: 9, x1: 130, z0: -105, z1: -95, name: 'Sophienstraße', tx: 74, tz: -100 },
      { x0: -170, x1: -32, z0: -14, z1: -2, name: 'Oranienburger Straße', tx: -100, tz: -8 },
      { x0: -5, x1: 5, z0: 18, z1: 32, name: '' },
      { x0: -150, x1: 150, z0: 32, z1: 44, name: 'Burgstraße', tx: -80, tz: 38 },
    ],
    water: { x0: -175, x1: 135, z0: 44, z1: 72, name: 'Spree', tx: 40, tz: 60 },
    rail: { x0: -175, x1: 135, z0: 18, z1: 32, name: 'Stadtbahn · Bhf. Börse', tx: 90, tz: 25 },
    places: [
      { name: 'Pension Puhlmann', at: pension.at(2, 0) },
      { name: 'Werkstatt Kessler', at: kessler.at(1, 0) },
      { name: 'Apotheke', at: apotheke.at(1, 0) },
      { name: 'Goldene Schrippe', at: destille.at(1, 0) },
      { name: 'Bankhaus Lindner', at: bank.at(2, 0) },
    ],
  };

  buildTraffic(loc, r);
  buildWeather(loc, r);

  return loc;
}
