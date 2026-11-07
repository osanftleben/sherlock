import * as THREE from 'three';
import { Location } from '../../engine/location.js';
import { Bag, addMesh, box, matte, std } from '../kit.js';
import { brick, cobble, plaster, signTexture, slate, softDisc, rng, streetWet } from '../textures.js';
import { BAY_W, addSign, createFacades } from './facades.js';
import { buildRailway } from './railway.js';
import { buildHorizon } from './horizon.js';
import { buildRiver } from './river.js';
import { DISPLAY_RECESS, buildShopWindows } from './shopwindows.js';
import { buildCourt } from './court.js';
import { grimy } from './grime.js';
import { buildLamps } from './lamps.js';
import { FOUNTAIN, buildPlaza } from './plaza.js';
import { buildTraffic } from './traffic.js';
import { buildWeather } from './weather.js';

// Das erste Viertel: Hackescher Markt, Rosenthaler und Oranienburger Straße, Sophienstraße,
// die Stadtbahn am Bahnhof Börse und die Spree. Norden ist -Z.
export function buildBerlin() {
  const loc = new Location('berlin', 'Hackescher Markt', { ambience: 'street', surface: 'stone' });
  const { scene } = loc;
  const r = rng(1892);

  // Dunst aus Regen und Kohlenrauch, vom Gaslicht warm grau aufgehellt.
  const FOG = 0x1e1c20;
  scene.fog = new THREE.FogExp2(FOG, 0.016);
  scene.background = new THREE.Color(FOG);
  loc.exposure = 1;

  // Nachtlicht: Kein Mond, nur der schwache Widerschein der Wolkendecke; hell machen die Laternen.
  // Ein schwaches Licht von oben aus Nordwesten, damit nicht jede Fläche gleich hell ist.
  scene.add(new THREE.HemisphereLight(0x646670, 0x1e1a15, 1.6));
  const skyLight = new THREE.DirectionalLight(0x8c8c98, 0.45);
  skyLight.position.set(-60, 120, -40);
  scene.add(skyLight);

  // Himmel: eine geschlossene Wolkendecke, Regenwetter. Der Mond steht nach dem letzten Viertel
  // um zwanzig vor zehn noch unter dem Horizont. Die Wolken fängt das Gaslicht der Stadt von
  // unten auf, zum Horizont hin am stärksten (Lichtglocke); senkrecht darüber sind sie fast schwarz.
  // Am Horizont geht der Himmel in die Nebelfarbe über.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(600, 24, 12),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
      uniforms: {
        low: { value: new THREE.Color(FOG) },
        high: { value: new THREE.Color(0.004, 0.004, 0.006) },
        glow: { value: new THREE.Color(0.035, 0.024, 0.015) },
        cloud: { value: new THREE.Color(0.1, 0.07, 0.05) },
        time: { value: 0 },
      },
      vertexShader: `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform vec3 low; uniform vec3 high; uniform vec3 glow; uniform vec3 cloud; uniform float time; varying vec3 vP;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        float fbm(vec2 p){
          float v = 0.0; float a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
          return v;
        }
        void main(){
          vec3 d = normalize(vP);
          float h = max(d.y, 0.0);
          vec3 c = mix(low, high, smoothstep(0.0, 0.5, h));
          // Lichtglocke knapp über dem Horizont, genau am Horizont null wie der Nebel.
          float bell = smoothstep(0.0, 0.05, h) * (1.0 - smoothstep(0.05, 0.4, h));
          c += glow * bell;
          // Wolkendecke als Ebene über der Stadt, langsam mit dem Wind nach Osten.
          vec2 uv = d.xz / (h + 0.12) * 0.9 + vec2(time * 0.006, time * 0.002);
          float n = fbm(uv);
          float lit = mix(1.0, 0.18, smoothstep(0.04, 0.55, h)) * smoothstep(0.015, 0.12, h);
          c += cloud * smoothstep(0.32, 0.78, n) * lit;
          c *= mix(1.0, 0.8 + 0.4 * n, smoothstep(0.015, 0.12, h));
          gl_FragColor = vec4(c, 1.0);
        }`,
    }),
  );
  sky.renderOrder = -10;
  scene.add(sky);
  loc.onUpdate((dt, t, { camera }) => {
    sky.position.copy(camera.position);
    sky.material.uniforms.time.value = t;
  });

  // Materialien
  const plasterTex = plaster();
  const wallMat = grimy(matte({ ...plasterTex, vertexColors: true, normalScale: new THREE.Vector2(0.5, 0.5) }));
  const darkGlass = std({ color: 0x0b0f16, roughness: 0.18, metalness: 0.5 });
  const litGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.6, 0.31, 0.09) });
  const roofMat = matte(slate());
  const brickMat = grimy(matte(brick()));
  const ironMat = std({ color: 0x0f1211, roughness: 0.55, metalness: 0.5 });
  // Ladensorten je Straße, damit man die Straßen an ihren Läden unterscheidet:
  // Rosenthaler Straße Alltagsbedarf, Sophienstraße Handwerk und Bücher,
  // Oranienburger Straße feinere Waren, am Markt gemischt.
  const shopMix = (x, z) => {
    if (Math.abs(x) <= 12 && z < -24) return ['kolonial', 'kolonial', 'kolonial', 'baecker', 'baecker', 'fleischer', 'fleischer', 'zigarren', 'tuche'];
    if (x > 9 && z > -112 && z < -88) return ['buch', 'buch', 'hut', 'zigarren', 'baecker', 'kolonial', 'tuche'];
    if (x < -32 && z > -22 && z < 6) return ['tuche', 'tuche', 'tuche', 'buch', 'buch', 'hut', 'hut', 'zigarren', 'kolonial'];
    return ['baecker', 'baecker', 'zigarren', 'zigarren', 'kolonial', 'kolonial', 'fleischer', 'hut', 'buch'];
  };
  const facades = createFacades(loc, r, { plasterTex, wallMat, darkGlass, litGlass, roofMat, shopMix });
  const { block, row } = facades;

  // --- Rosenthaler Straße ---------------------------------------------------
  row({ x: -9, z: -24, face: 'east', bays: 20 }); // bis z = -92
  const apotheke = block({ x: -9, z: -92, face: 'east', color: 0xa8957c, ground: ['display', 'door', 'display', 'ground', 'ground'], ownGlass: [0, 2], recess: DISPLAY_RECESS }, 5);
  row({ x: -9, z: -109, face: 'east', bays: 24 }); // bis z = -190

  row({ x: 9, z: -190, face: 'west', bays: 25 });
  // Das Haus neben Kessler hat in seiner letzten Achse die Durchfahrt zum Hof (court.js).
  row({ x: 9, z: -95, face: 'west', bays: 5, gate: 4 }); // z -95 bis -78
  const kessler = block({ x: 9, z: -78, face: 'west', color: 0x8a8070, ground: ['ground', 'door', 'display', 'display', 'ground', 'ground'], ownGlass: [2, 3], recess: DISPLAY_RECESS }, 6);
  row({ x: 9, z: -57.6, face: 'west', bays: 10 });

  // --- Sophienstraße ---------------------------------------------------------
  row({ x: 9, z: -105, face: 'south', bays: 10 });
  const destille = block({ x: 43, z: -105, face: 'south', color: 0x786c5c, floors: 3, ground: ['display', 'door', 'display', 'ground', 'ground'], ownGlass: [0, 2], recess: DISPLAY_RECESS }, 5);
  row({ x: 60, z: -105, face: 'south', bays: 21 });
  row({ x: 130, z: -95, face: 'north', bays: 36 });

  // --- Hackescher Markt -------------------------------------------------------
  row({ x: -32, z: -24, face: 'south', bays: 7 });
  row({ x: 9, z: -24, face: 'south', bays: 7 });
  // Das zweite Haus der Ostfront hat acht Achsen: Schmuckgiebel über den beiden mittleren.
  row({ x: 32, z: -24, face: 'west', bays: 13, gable: (i, n) => (i === 1 && n === 8 ? { start: 3, n: 2 } : null) });
  row({ x: -32, z: -14, face: 'east', bays: 3 });
  const bank = block({ x: -32, z: 18, face: 'east', color: 0x77706a, floors: 3, lit: 0.1, ground: ['ground', 'ground', 'door', 'ground', 'ground', 'ground'], ownGlass: [0, 1, 3, 4, 5], gable: { start: 1, n: 4, style: 'pediment' } }, 6);
  // Ecktürme an den beiden Häusern, die vom Platz aus die Rosenthaler Straße einrahmen.
  facades.cornerTower({ corner: [9, -24], out: [-1, 1], color: 0x9a8a72 });
  facades.cornerTower({ corner: [-8.2, -24], out: [1, 1], color: 0xa29680 });

  // --- Oranienburger Straße ---------------------------------------------------
  row({ x: -170, z: -14, face: 'south', bays: 25 });
  const pension = block({ x: -85, z: -14, face: 'south', color: 0x9a8a74, ground: ['ground', 'ground', 'door', 'ground', 'ground', 'ground'], ownGlass: [0, 1, 3, 4, 5] }, 6);
  row({ x: -64.6, z: -14, face: 'south', bays: 10 });
  row({ x: -32, z: -2, face: 'north', bays: 41 });

  // --- Kulissen hinter den Baustellen ------------------------------------------
  // Die Straßen laufen hinter den Sperren weiter und enden an einer Querstraße, damit die
  // Stadt dort nicht sichtbar aufhört. Begehbar ist das nicht, die Sperren halten den
  // Spieler auf. Eigener Zufall, damit die übrigen Häuser so bleiben, wie sie sind.
  // Wird das nächste Viertel gebaut, weichen diese Kulissen den echten Straßen.
  const rb = rng(1893);
  // Rosenthaler Straße nach Norden, Querstraße bei z = -243 bis -231
  row({ x: -9, z: -190.6, face: 'east', bays: 12, rand: rb });
  row({ x: 9, z: -230.8, face: 'west', bays: 12, rand: rb });
  // Querzeilen nur so breit, wie man sie durch die Straßenschlucht sieht.
  row({ x: -23.8, z: -243, face: 'south', bays: 14, rand: rb });
  // Sophienstraße nach Osten, Querstraße bei x = 172 bis 184
  row({ x: 131.4, z: -105, face: 'south', bays: 12, rand: rb });
  row({ x: 170.8, z: -95, face: 'north', bays: 12, rand: rb });
  row({ x: 184.2, z: -115.3, face: 'west', bays: 9, rand: rb });
  // Oranienburger Straße nach Westen bis an die Synagoge
  row({ x: -187, z: -14, face: 'south', bays: 5, rand: rb });
  row({ x: -171.4, z: -2, face: 'north', bays: 5, rand: rb });

  buildCourt(loc, facades, { brickMat, ironMat });
  facades.finish();

  // Fahrbahn: von z = -430 bis unter die Quaikante (44.6), damit sie nicht über der Spree liegt.
  const cob = cobble();
  const STREET_Z0 = -430;
  const STREET_Z1 = 44.6;
  const streetDepth = STREET_Z1 - STREET_Z0;
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(720, streetDepth),
    wetStreet(std({ ...cob, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.6 })),
  );
  // Pflastergröße wie bisher: 8 m pro Kachel.
  for (const t of Object.values(cob)) t.repeat.set(90, streetDepth / 8);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0, (STREET_Z0 + STREET_Z1) / 2);
  scene.add(street);

  buildRailway(loc, r, brickMat);
  const farBank = buildHorizon(loc, r);
  buildRiver(loc, FOG, farBank);

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
  // Zwei Laternen links und rechts vom Brunnen, damit die Mitte des Platzes nicht im Dunkeln liegt.
  lampAt(FOUNTAIN.x - FOUNTAIN.r - 0.9, FOUNTAIN.z);
  lampAt(FOUNTAIN.x + FOUNTAIN.r + 0.9, FOUNTAIN.z);
  for (let x = -130; x <= 130; x += 20) lampAt(x, 43);
  // Hinter den Sperren: Die Laternen gehen weiter, bis der Nebel sie schluckt.
  for (const [x, z] of [[6.6, -208], [-6.6, -220], [-18, -240.6], [18, -240.6]]) lampAt(x, z);
  for (const [x, z] of [[132, -97.4], [143, -102.6], [154, -97.4], [165, -102.6], [181.8, -88], [181.8, -112]]) lampAt(x, z);
  lampAt(-176, -11.6);
  // Die Laterne vor der Durchfahrt neben Kessler ist kaputt („hab’s jemeldet, passiert aber nüscht“).
  // Sie steht ein Stück weiter nördlich als die Reihe, dicht beim Tor.
  const broken = lampPositions.findIndex(([x, z]) => x === 6.6 && z === -88);
  lampPositions[broken] = [6.6, -82.2, true];
  for (let x = 150; x <= 210; x += 20) {
    lampAt(x, 43);
    lampAt(-x, 43);
  }
  buildLamps(loc, lampPositions, ironMat);

  // Straßenmöblierung und Bäume
  buildPlaza(loc, r, ironMat);

  // Baustellen an den Rändern der begehbaren Welt.
  // Wird das nächste Viertel gebaut, verschwinden diese Sperren einfach.
  // away: Seite, auf der der Aushub liegt (-1 spiegelt ihn), immer abseits des Spielers.
  const barrier = (cx, cz, along, width, away = 1) => {
    const b = new Bag();
    const w = width;
    const add = (ox, oz, sx, sy, sz, y, c) => (along === 'x'
      ? b.box(c, sx, sy, sz, cx + ox, y, cz + oz)
      : b.box(c, sz, sy, sx, cx + oz, y, cz + ox));
    add(0, 0, w, 0.16, 0.08, 1.05, 0xa8362c);
    add(0, 0, w, 0.16, 0.08, 0.55, 0xd6cfba);
    for (let o = -w / 2; o <= w / 2; o += 3) add(o, 0, 0.1, 1.2, 0.1, 0.6, 0x2c2015);
    // Aushub hinter der Absperrung: Erdhaufen, Bretter, Tonrohre für den Kanal.
    // Je Haufen genau zwei Zahlen aus r wie früher, damit sich der Zufall des Viertels
    // dahinter (Verkehr, Wetter) nicht verschiebt. Alles Weitere aus eigenem Zufall.
    const rs = rng(Math.round(cx * 31 + cz * 7) >>> 0);
    const place = (geo, ox, oz) => {
      if (away < 0) {
        geo.rotateY(Math.PI);
        ox = -ox;
        oz = -oz;
      }
      if (along !== 'x') geo.rotateY(Math.PI / 2);
      geo.translate(along === 'x' ? cx + ox : cx + oz, 0, along === 'x' ? cz + oz : cz + ox);
      return geo;
    };
    for (let i = 0; i < 6; i++) {
      const ox = (i / 5 - 0.5) * w * 0.8;
      const oz = -2 - r() * 2;
      const h = 0.9 + r() * 0.7;
      // Halbkugel, zum Kegel hin abgeflacht und unregelmäßig verbeult: Berliner Sand.
      const mound = new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      const p = mound.attributes.position;
      const seed = rs() * 100;
      // Beule aus der Lage des Punkts, damit doppelte Punkte an Naht und Spitze gleich bleiben.
      const noise = (x, y, z) => {
        const v = Math.sin(x * 12.99 + y * 37.72 + z * 78.23 + seed) * 43758.55;
        return v - Math.floor(v);
      };
      for (let k = 0; k < p.count; k++) {
        const y = p.getY(k);
        const bump = y > 0.02 ? 1 + (noise(p.getX(k), y, p.getZ(k)) - 0.5) * 0.35 : 1;
        p.setXYZ(k, p.getX(k) * bump, Math.pow(y, 1.6) * bump, p.getZ(k) * bump);
      }
      mound.computeVertexNormals();
      mound.scale(1.7 + rs() * 0.8, h * 1.1, 1.4 + rs() * 0.6);
      mound.rotateY(rs() * Math.PI);
      b.add(place(mound, ox, oz), new THREE.Color(0x6e5a40).multiplyScalar(0.8 + rs() * 0.3));
    }
    for (let i = 0; i < 3; i++) {
      // Bretter, schräg an den Zaun gelehnt
      const plank = box(0.28, 2.2, 0.04, 0, 1.0, 0);
      plank.rotateX(-0.35 - rs() * 0.2);
      plank.rotateY((rs() - 0.5) * 0.4);
      b.add(place(plank, (rs() - 0.5) * w * 0.9, -0.45), 0x4a3522);
    }
    for (let i = 0; i < 3; i++) {
      // Tonrohre
      const pipe = new THREE.CylinderGeometry(0.32, 0.32, 1.1, 12, 1, true);
      pipe.rotateZ(Math.PI / 2);
      pipe.rotateY(rs() * Math.PI);
      pipe.translate(0, 0.32, 0);
      b.add(place(pipe, (rs() - 0.5) * w * 0.7, -1.2 - rs() * 2.6), 0x7a4a30);
    }
    addMesh(scene, b.build(), std({ vertexColors: true, roughness: 1, side: THREE.DoubleSide }));
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
  barrier(127, -100, 'z', 12, -1);
  barrier(-168, -8, 'z', 14);
  barrier(-145, 38, 'z', 14);
  barrier(145, 38, 'z', 14, -1);

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
  // Türlaterne an einem Eisenausleger rechts neben der Tür, unter dem Ladenschild: Das Schild hängt
  // über derselben Achse (3,3 bis 4,6 m hoch), die Laterne darf es nicht verdecken.
  const lampGlass = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 1.9, 0.8) });
  const lanternOver = (bld, bay) => {
    const side = bay + 1.15 / BAY_W;
    const p = bld.at(side, 2.75, 0.45);
    const arm = bld.at(side, 3.0, 0.24);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(p);
    glow.scale.setScalar(1.5);
    scene.add(glow);
    addMesh(scene, box(0.16, 0.26, 0.16, p.x, p.y, p.z), lampGlass);
    addMesh(scene, box(0.24, 0.06, 0.24, p.x, p.y + 0.16, p.z), ironMat);
    addMesh(scene, new THREE.BoxGeometry(0.04, 0.04, 0.44).rotateY(bld.rot).translate(arm.x, arm.y, arm.z), ironMat);
    addMesh(scene, box(0.03, 0.06, 0.03, p.x, p.y + 0.22, p.z), ironMat);
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
  buildShopWindows(loc, { kessler, apotheke, destille, bank, pension });

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
  loc.anchor('durchgang', 10.4, 1.6, -79.7);
  loc.anchor('kaputteLaterne', 6.6, 3.3, -82.2);
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

// Legt streetWet() in Weltkoordinaten über das Pflaster: Pfützen sind dunkel, glatt und ohne
// Steinrelief, dazu großflächig hellere und dunklere Stellen, damit sich die 8-m-Kachel
// nicht wiederholt.
function wetStreet(material) {
  const wet = streetWet();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wetMap = { value: wet };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D wetMap;\nvarying vec2 vGroundXZ;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec4 wet = texture2D(wetMap, vGroundXZ / 37.0);
        // Das Wasser füllt zuerst die Fugen; am Rand ragen die Steine heraus.
        float puddle = smoothstep(0.35, 0.6, wet.r + 0.1 - 3.0 * sampledDiffuseColor.g);
        diffuseColor.rgb *= (0.7 + 0.6 * wet.g) * mix(1.0, 0.35, puddle);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor *= 1.25 - 0.5 * wet.g;
        roughnessFactor = mix(roughnessFactor, 0.06, puddle);`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        // Die Pfütze spiegelt den dunklen Himmel und die Laternen, nicht den Lichtschein der Umgebungskarte.
        reflectedLight.indirectSpecular *= mix(1.0, 0.4, puddle);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        normal = normalize(mix(normal, nonPerturbedNormal, puddle));`,
      );
  };
  material.customProgramCacheKey = () => 'wetStreet';
  return material;
}
