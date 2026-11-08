import * as THREE from 'three';
import { Location } from '../../engine/location.js';
import { Bag, addMesh, box, matte, merge, std } from '../kit.js';
import { idleFigure, makeFigure } from '../figures.js';
import { cobble, plaster, signTexture, slate, softDisc, rng, streetWet, viaductBrick } from '../textures.js';
import { BAY_W, addSign, createFacades } from './facades.js';
import { buildRailway } from './railway.js';
import { buildHorizon } from './horizon.js';
import { buildRiver } from './river.js';
import { DISPLAY_RECESS, buildShopWindows } from './shopwindows.js';
import { buildCourt } from './court.js';
import { buildClutter } from './clutter.js';
import { grimy } from './grime.js';
import { LANTERN_GLASS, SHADE_GLSL, buildLamps, lampWash, shadeUniforms, shadedLightsChunk, wallLantern } from './lamps.js';
import { buildLife } from './life.js';
import { FOUNTAIN, buildPlaza } from './plaza.js';
import { buildTraffic } from './traffic.js';
import { buildTramLine } from './tramline.js';
import { DRY, buildWeather, dryRects } from './weather.js';
import { DRIP_GLSL, dripUniforms } from './drips.js';
import { TRAM_GLSL } from './tramway.js';
import { buildSmoke } from './smoke.js';
import { buildGroundShades } from './groundshade.js';
import { MIRROR_LAYER, RIPPLES, RIPPLE_GLINT, rainTime } from './ripples.js';

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
  sky.layers.enable(MIRROR_LAYER);
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
  const brickMat = grimy(matte(viaductBrick()), 'brick');
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
  // Die hellen Auslagen von Apotheke und Destille werfen ihr Licht auf den Gehweg.
  for (const bld of [apotheke, destille]) for (const bay of [0, 2]) bld.spill(bay);
  facades.finish();

  // Fahrbahn: von z = -430 bis unter die Quaikante (44.6), damit sie nicht über der Spree liegt.
  const cob = cobble();
  const STREET_Z0 = -430;
  const STREET_Z1 = 44.6;
  const streetDepth = STREET_Z1 - STREET_Z0;
  const street = new THREE.Mesh(
    new THREE.PlaneGeometry(720, streetDepth),
    wetStreet(std({ ...cob, roughness: 1, metalness: 0.05, normalScale: new THREE.Vector2(0.9, 0.9), envMapIntensity: 1.6 }), loc),
  );
  // Pflastergröße wie bisher: 8 m pro Kachel.
  for (const t of Object.values(cob)) t.repeat.set(90, streetDepth / 8);
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0, (STREET_Z0 + STREET_Z1) / 2);
  scene.add(street);

  buildRailway(loc, r);
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
  // Zwei an der Einmündung der Rosenthaler Straße, wo die Pferdebahn endet und umspannt
  // (tramline.js); von Brunnen und Platzrand träfe den Wagen dort nur schwaches, streifendes Licht.
  // Weit genug außen, dass die Droschke auf dem Weg in ihre Wende (dort bei x ±6) vorbeikommt.
  lampAt(-8, -17.5);
  lampAt(8, -17.5);
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
  // gap: halbe Breite einer Durchfahrt in der Mitte, die ein Schlagbaum schließt (nur along 'x',
  // away 1). Holmes kommt trotzdem nicht durch, der Bauwächter lässt nur die Pferdebahn passieren.
  const barrier = (cx, cz, along, width, away = 1, { gap = 0, say } = {}) => {
    const b = new Bag();
    const w = width;
    const add = (ox, oz, sx, sy, sz, y, c) => (along === 'x'
      ? b.box(c, sx, sy, sz, cx + ox, y, cz + oz)
      : b.box(c, sz, sy, sx, cx + oz, y, cz + ox));
    for (const [o0, o1] of gap ? [[-w / 2, -gap], [gap, w / 2]] : [[-w / 2, w / 2]]) {
      add((o0 + o1) / 2, 0, o1 - o0, 0.16, 0.08, 1.05, 0xa8362c);
      add((o0 + o1) / 2, 0, o1 - o0, 0.16, 0.08, 0.55, 0xd6cfba);
    }
    for (let o = -w / 2; o <= w / 2; o += 3) if (!gap || Math.abs(o) > gap + 0.4) add(o, 0, 0.1, 1.2, 0.1, 0.6, 0x2c2015);
    // Mit Durchfahrt rückt alles, was zwischen den Torpfosten läge, seitlich hinaus (reach: wie
    // weit es sonst höchstens von der Mitte läge, margin: wie weit es über seinen Platz hinausragt).
    const aside = (ox, reach, margin) => (gap ? (ox < 0 ? -1 : 1) * (gap + margin + (Math.abs(ox) * (w / 2 - gap - margin - 0.4)) / reach) : ox);
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
      const ox = aside((i / 5 - 0.5) * w * 0.8, w * 0.4, 2.9);
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
      b.add(place(plank, aside((rs() - 0.5) * w * 0.9, w * 0.45, 0.5), -0.45), 0x4a3522);
    }
    for (let i = 0; i < 3; i++) {
      // Tonrohre
      const pipe = new THREE.CylinderGeometry(0.32, 0.32, 1.1, 12, 1, true);
      pipe.rotateZ(Math.PI / 2);
      pipe.rotateY(rs() * Math.PI);
      pipe.translate(0, 0.32, 0);
      b.add(place(pipe, aside((rs() - 0.5) * w * 0.7, w * 0.35, 1.0), -1.2 - rs() * 2.6), 0x7a4a30);
    }
    const mat = std({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
    addMesh(scene, b.build(), mat);
    if (along === 'x') loc.collide(cx - w / 2, cx + w / 2, cz - 0.4, cz + 0.4);
    else loc.collide(cx - 0.4, cx + 0.4, cz - w / 2, cz + w / 2);
    loc.addHotspot({
      pos: [cx, 1.2, cz],
      radius: 1.4,
      range: 4,
      label: 'Kanalbau',
      action: { say: say ?? 'Hobrechts Kanalisation frisst sich durch Berlin. Hier ist die Straße aufgerissen und für heute kein Durchkommen. Weiter draußen wartet der Rest der Stadt – ein andermal.' },
    });
    const warn = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('warn'), color: 0xff5a2c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    warn.position.set(cx, 1.5, cz);
    warn.scale.setScalar(1.3);
    scene.add(warn);
    if (gap) tramGate(cx, cz, gap, mat, warn);
  };

  // Schlagbaum über der Durchfahrt für die Pferdebahn: Drehpunkt am westlichen Torpfosten, das
  // freie Ende liegt in der Gabel am östlichen, am kurzen Ende ein Kasten mit Steinen als
  // Gegengewicht. Daneben der Bauwächter mit seiner Laterne; er hebt den Baum, sobald ein Wagen
  // kommt (loc.tramGate.want, tramline.js), und senkt ihn, wenn der durch ist.
  const tramGate = (cx, cz, gap, mat, warn) => {
    const POLE_Y = 1.0;
    const PZ = cz + 0.17; // auf der Platzseite neben den Holmen, damit das Gegengewicht frei schwingt
    const WOODC = 0x2c2015;
    const IRONC = 0x1a1a1a;
    const b = new Bag();
    for (const s of [-1, 1]) b.box(WOODC, 0.18, 1.32, 0.18, cx + s * gap, 0.66, cz);
    // Gabel am östlichen Pfosten, Bolzen durch den westlichen.
    b.box(WOODC, 0.2, 0.06, 0.2, cx + gap - 0.02, POLE_Y - 0.08, PZ);
    for (const dz of [-0.075, 0.075]) b.box(IRONC, 0.04, 0.2, 0.025, cx + gap - 0.02, POLE_Y, PZ + dz);
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 8).rotateX(Math.PI / 2).translate(cx - gap, POLE_Y, cz + 0.12), IRONC);
    // Rote Warnlaterne obenauf am Gabelpfosten.
    b.box(IRONC, 0.16, 0.2, 0.16, cx + gap, 1.42, cz);
    b.add(new THREE.ConeGeometry(0.13, 0.1, 4).rotateY(Math.PI / 4).translate(cx + gap, 1.57, cz), IRONC);
    addMesh(scene, b.build(), mat);
    const lampGlass = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.17), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.35, 0.12) }));
    lampGlass.position.set(cx + gap, 1.42, cz);
    scene.add(lampGlass);
    warn.position.set(cx + gap, 1.42, cz);
    warn.scale.setScalar(0.9);

    // Der Baum selbst, rot und weiß gestrichen, zum freien Ende dünner.
    const arm = new THREE.Group();
    arm.position.set(cx - gap, POLE_Y, PZ);
    const pole = new Bag();
    const len = 2 * gap + 0.12;
    const n = 9;
    for (let k = 0; k < n; k++) {
      const d = 0.12 - (0.045 * (k + 0.5)) / n;
      pole.box(k % 2 ? 0xd6cfba : 0xa8362c, len / n, d, d, (k + 0.5) * (len / n), 0, 0);
    }
    pole.box(WOODC, 1.0, 0.11, 0.11, -0.5, 0, 0);
    pole.box(0x4a4640, 0.36, 0.3, 0.24, -0.82, -0.08, 0);
    pole.box(IRONC, 0.38, 0.03, 0.26, -0.82, 0.075, 0);
    arm.add(new THREE.Mesh(pole.build(), mat));
    scene.add(arm);

    // Bauwächter: Joppe, Schal, Mütze, die Laterne in der Linken.
    const guard = makeFigure({ coat: 0x2e2a24, trousers: 0x24201a, neck: 'scarf', tie: 0x4a3426, hat: 'cap', hatColor: 0x1e1c18, moustache: 'walrus', beard: 'stubble', hair: 0x6a6258, lantern: true, build: 'stout', height: 1.7 });
    const gx = cx - gap - 1.05;
    const gz = cz + 0.95;
    guard.position.set(gx, 0, gz);
    guard.rotation.y = Math.PI / 2;
    scene.add(guard);
    loc.collide(gx - 0.3, gx + 0.3, gz - 0.3, gz + 0.3);
    loc.addHotspot({
      pos: [gx, 1.45, gz],
      radius: 0.6,
      range: 3.2,
      label: 'Bauwächter',
      action: { say: '„Hier is zu, der Herr. Bloß die Pferdebahn lass ick durch, die hat ihre Gleise mitten durch die Baustelle. Morjen früh is det Rohr drin, denn können Se wieder.“ Die Laterne in der Linken, behält er mich im Blick.' },
    });

    const gate = (loc.tramGate = { want: false, k: 0, angle: 0, open: false, watch: null });
    loc.onUpdate((dt, t, { camera }) => {
      // Gut drei Sekunden zum Heben, etwas länger zum Senken; offen erst, wenn er ganz oben steht.
      gate.k = THREE.MathUtils.clamp(gate.k + (gate.want ? dt / 3.2 : -dt / 4.5), 0, 1);
      gate.angle = 1.45 * THREE.MathUtils.smoothstep(gate.k, 0, 1);
      gate.open = gate.k >= 1;
      arm.rotation.z = gate.angle;
      // Solange er den Baum bedient, sieht er dem Wagen nach, sonst dem, der vor ihm steht.
      const busy = gate.want || gate.k > 0;
      idleFigure(guard, t, busy && gate.watch ? gate.watch : camera.position);
    });
  };
  barrier(0, -188, 'x', 20, 1, {
    gap: 3.3,
    say: 'Hobrechts Kanalisation frisst sich durch Berlin. Hier ist die Straße aufgerissen und für heute kein Durchkommen; nur die Pferdebahn lässt der Bauwächter auf ihren Gleisen durch. Weiter draußen wartet der Rest der Stadt – ein andermal.',
  });
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
  // Dieselbe Wandlaterne wie an den Viaduktbögen (wallLantern), die Mitte des Glases in 2,75 m.
  const doorIron = new Bag();
  const doorGlass = [];
  const doorWash = [];
  const doorGlow = new THREE.SpriteMaterial({ map: softDisc('lampGlow'), color: 0xffa858, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending });
  const lanternOver = (bld, bay) => {
    const side = bay + 1.15 / BAY_W;
    const wall = bld.at(side, 3.07, 0);
    const out = bld.at(side, 3.07, 1).sub(wall);
    const glow = new THREE.Sprite(doorGlow);
    glow.position.copy(wallLantern(doorIron, doorGlass, wall, out, 0.45, doorWash));
    glow.scale.setScalar(1.5);
    scene.add(glow);
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
  addMesh(scene, doorIron.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.5 }));
  addMesh(scene, merge(doorGlass), new THREE.MeshBasicMaterial({ color: LANTERN_GLASS }));
  addMesh(scene, merge(doorWash), lampWash());
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

  // Kram vor den Läden, erst jetzt: Er hält Abstand zu allen Ankern, Türen und Fundstellen.
  buildClutter(loc, facades.shopFronts);

  buildTraffic(loc, r);
  buildTramLine(loc);
  buildWeather(loc, r);
  buildLife(loc);
  buildSmoke(loc, { chimneys: facades.chimneys });
  // Zuletzt: sammelt Leute, Pferde und Wagen aus der Szene, auch die Figuren des Falls, und gibt
  // ihnen Bodenschatten und die übrigen Plätze der Laternenschatten.
  buildGroundShades(loc);
  loc.onUpdate((dt, t) => {
    rainTime.value = t % 1000;
  });

  return loc;
}

// Legt streetWet() in Weltkoordinaten über das Pflaster: Pfützen sind dunkel, glatt und ohne
// Steinrelief, dazu großflächig hellere und dunklere Stellen, damit sich die 8-m-Kachel
// nicht wiederholt. In den Pfützen schlagen Tropfen ein: kleine Ringe, die sich ausbreiten und
// das Spiegelbild der Laternen kräuseln (ripples.js). Unter Dach (loc.dry) regnet es nicht in die
// Pfützen; im Viaduktdurchgang tropft es dafür aus dem Gewölbe in eigene Pfützen (drips.js).
function wetStreet(material, loc) {
  const wet = streetWet();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.wetMap = { value: wet };
    shader.uniforms.rainTime = rainTime;
    shader.uniforms.roofs = { value: dryRects(loc) };
    Object.assign(shader.uniforms, dripUniforms, shadeUniforms(loc));
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vGroundXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      // Was sich als Schattenwerfer angemeldet hat, hält das Licht der Laternen ab (lamps.js).
      .replace('#include <lights_fragment_begin>', shadedLightsChunk('vec3( vGroundXZ.x, 0.0, vGroundXZ.y )'))
      .replace('#include <common>', `#include <common>\nuniform sampler2D wetMap;\nvarying vec2 vGroundXZ;\n${RIPPLES}\n${DRIP_GLSL}\n${TRAM_GLSL}\n${SHADE_GLSL}
        uniform vec4 roofs[${DRY}];
        float underRoof(vec2 xz) {
          for (int i = 0; i < ${DRY}; i++) {
            vec4 q = roofs[i];
            if (xz.x > q.x && xz.x < q.y && xz.y > q.z && xz.y < q.w) return 1.0;
          }
          return 0.0;
        }`)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec4 wet = texture2D(wetMap, vGroundXZ / 37.0);
        if (nearDrips(vGroundXZ)) wet.r += 0.9 * dripWet(vGroundXZ);
        // Das Wasser füllt zuerst die Fugen; am Rand ragen die Steine heraus.
        float puddle = smoothstep(0.35, 0.6, wet.r + 0.1 - 3.0 * sampledDiffuseColor.g);
        diffuseColor.rgb *= (0.7 + 0.6 * wet.g) * mix(1.0, 0.35, puddle);
        // Pferdebahngleise (tramway.js): x Fahrkopf, y Rille, z Leitlippe, w Schmutz daneben.
        // Auf dem glatten Stahl steht das Wasser nicht in Fugen, sondern nur in den tiefsten Pfützen.
        vec4 tram = tramRails(vGroundXZ, dFdx(vGroundXZ), dFdy(vGroundXZ));
        float tramAll = min(1.0, tram.x + tram.y + tram.z);
        puddle = mix(puddle, smoothstep(0.35, 0.6, wet.r - 0.2), tramAll);
        diffuseColor.rgb *= 1.0 - 0.3 * tram.w;
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.012, 0.011, 0.01), tram.y);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.16, 0.09, 0.06) * (0.7 + 0.6 * wet.g), tram.z);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.52, 0.52, 0.54), tram.x);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor *= 1.25 - 0.5 * wet.g;
        roughnessFactor = mix(roughnessFactor, 0.06, puddle);
        roughnessFactor = mix(roughnessFactor, mix(0.22, 0.08, puddle), tram.x);
        roughnessFactor = mix(roughnessFactor, 0.5, tram.z);
        roughnessFactor = mix(roughnessFactor, 0.05, tram.y);`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = mix(metalnessFactor, 0.9, tram.x);
        metalnessFactor = mix(metalnessFactor, 0.35, tram.z);`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
        // Die Pfütze spiegelt den dunklen Himmel und die Laternen, nicht den Lichtschein der Umgebungskarte.
        reflectedLight.indirectSpecular *= mix(1.0, 0.15, puddle);
        // Die Kämme der Tropfenringe stehen schräg und fangen das Licht der Laternen von allen Seiten:
        // feine helle Kreise, wo Licht hinfällt, im Dunkeln nichts.${RIPPLE_GLINT}`
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        normal = normalize(mix(normal, nonPerturbedNormal, max(puddle, tramAll)));
        // Tropfenringe; in der Ferne, wo ein Pixel mehr als ein paar Zentimeter deckt, flimmerten sie nur.
        float rippleNear = 1.0 - smoothstep(0.025, 0.07, length(fwidth(vGroundXZ)));
        rippleGlint = 0.0;
        if (puddle * rippleNear > 0.01) {
          vec2 rip = (ripple(vGroundXZ, 0.45, 0.0) + ripple(vGroundXZ, 0.37, 17.3)) * (1.0 - underRoof(vGroundXZ));
          // Die Ringe der Tropfen sind größer als die des Regens: Sie glänzen nur schwach von selbst
          // und zeigen sich vor allem, wo sie das Spiegelbild der Laterne kräuseln.
          vec2 drip = nearDrips(vGroundXZ) ? dripRings(vGroundXZ) : vec2(0.0);
          rippleGlint = (length(rip) + 0.3 * length(drip)) * puddle * rippleNear;
          rip += drip;
          normal = normalize(normal + mat3(viewMatrix) * vec3(rip.x, 0.0, rip.y) * (0.45 * puddle * rippleNear));
        }`,
      );
  };
  material.customProgramCacheKey = () => 'wetStreet';
  return material;
}
