import * as THREE from 'three';
import { Bag, addMesh, cyl, merge, std } from '../kit.js';
import { clockFace, posterWall, signTexture, softDisc, uraniaAds, uraniaCases, uraniaGlobe, uraniaMoon } from '../textures.js';
import { idleFigure, makeFigure } from '../figures.js';
import { makeDroschke } from './traffic.js';
import { buildTrees } from './trees.js';

// Brunnen in der Mitte des Platzes, in der Wendeschleife der Droschke (traffic.js):
// Die Fahrspur bleibt rundum gut 6 m von seiner Mitte weg. Die beiden Laternen daneben
// stehen in index.js.
export const FOUNTAIN = { x: 0, z: -5, r: 2.5 };

// Seitenteil eines regelmäßigen Achtecks mit Umkreisradius R, Mitte in Richtung a.
function octagonSide(R, a, h, thick, y, x, z) {
  const apothem = R * Math.cos(Math.PI / 8);
  const len = 2 * R * Math.sin(Math.PI / 8) + thick * 0.85;
  const g = new THREE.BoxGeometry(len, h, thick);
  g.translate(0, y, apothem - thick / 2);
  g.rotateY(a);
  g.translate(x, 0, z);
  return g;
}

export function buildPlaza(loc, r, ironMat) {
  const { scene } = loc;
  // Bäume: kahle Linden mit Baumrost und Schutzgitter (trees.js), aus eigenem Zufall.
  // Die früheren Bäume zogen 4824 Zahlen aus r; die werden weiter verbraucht, damit sich
  // Verkehr, Wetter und Baustellen dahinter nicht verschieben.
  for (let i = 0; i < 4824; i++) r();
  buildTrees(loc, [[-22, -14], [-22, 6], [22, -14], [22, 6], [-11, 8], [11, 8]], ironMat);

  // Litfaßsäule
  const lx = -16;
  const lz = -3;
  // Plakatfläche 3 m hoch; leicht selbstleuchtend, damit man das Extrablatt auch weitab der
  // Laternen lesen kann, aber nicht so hell, dass die Säule wie eine Lampe wirkt.
  const posters = posterWall();
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.86, 3.0, 40, 1, true), std({ map: posters, roughness: 0.9, emissive: 0x2a2216, emissiveMap: posters }));
  column.position.set(lx, 1.9, lz);
  scene.add(column);
  // Gusseisen: profilierter Sockel, Ringe an den Plakatkanten, Fries mit Zahnschnitt,
  // Kranzgesims und eine flache Kuppel mit Knauf.
  const IRON = 0x1a2019;
  const capBag = new Bag();
  capBag.add(cyl(1.02, 1.08, 0.12, lx, 0.06, lz, 40), IRON);
  capBag.add(cyl(0.94, 1.0, 0.24, lx, 0.24, lz, 40), IRON);
  for (const y of [0.38, 3.42]) capBag.add(new THREE.TorusGeometry(0.88, 0.035, 6, 40).rotateX(Math.PI / 2).translate(lx, y, lz), IRON);
  capBag.add(cyl(0.9, 0.9, 0.3, lx, 3.58, lz, 40), IRON);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * Math.PI * 2;
    capBag.add(new THREE.BoxGeometry(0.07, 0.09, 0.06).translate(0, 3.78, 0.92).rotateY(a).translate(lx, 0, lz), IRON);
  }
  capBag.add(cyl(1.04, 0.92, 0.16, lx, 3.9, lz, 40), IRON);
  capBag.add(cyl(1.06, 1.06, 0.05, lx, 4.0, lz, 40), IRON);
  capBag.add(new THREE.SphereGeometry(0.98, 40, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.5, 1).translate(lx, 4.02, lz), IRON);
  capBag.add(cyl(0.06, 0.11, 0.22, lx, 4.6, lz, 12), IRON);
  capBag.add(new THREE.SphereGeometry(0.11, 12, 8).translate(lx, 4.79, lz), IRON);
  capBag.add(cyl(0.01, 0.03, 0.32, lx, 5.04, lz, 6), IRON);
  addMesh(scene, capBag.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.4 }));
  loc.collide(lx - 0.7, lx + 0.7, lz - 0.7, lz + 0.7);
  loc.anchor('litfass', lx, 1.7, lz);
  loc.addHotspot({
    id: 'litfass',
    pos: [lx, 1.7, lz],
    radius: 0.9,
    range: 3.2,
    label: 'Litfaßsäule',
    action: { say: 'Eine Erfindung des Berliner Druckers Ernst Litfaß: Die Stadt hat ihre Reklame gezähmt, indem sie ihr eine Säule gab. Wintergarten, Zirkus Renz, Lagerbier. Auch Extrablätter hängen hier.' },
  });

  buildUrania(loc, 14, -10);

  // Café Achteck: die grüne Berliner Bedürfnisanstalt.
  const cx = -24;
  const cz = 12;
  const octo = new Bag();
  octo.add(cyl(1.4, 1.4, 2.1, cx, 1.05, cz, 8), 0x1f3a2a);
  octo.add(cyl(1.55, 1.5, 0.12, cx, 2.15, cz, 8), 0x162a1e);
  octo.add(cyl(0.3, 1.5, 0.6, cx, 2.5, cz, 8), 0x162a1e);
  addMesh(scene, octo.build(), std({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
  loc.collide(cx - 1.25, cx + 1.25, cz - 1.25, cz + 1.25);
  loc.addHotspot({
    pos: [cx, 1.5, cz],
    radius: 1.4,
    range: 3.2,
    label: 'Grünes Achteck',
    action: { say: 'Gusseisern, grün, achteckig. Die Berliner nennen es „Café Achteck“ – der einzige Ort der Stadt, an dem man ohne Konsumzwang nichts bestellt.' },
  });

  // Plumpe: die Straßenpumpe.
  const px = 6.4;
  const pz = -68;
  const pump = new Bag();
  const py = 0.13;
  pump.add(cyl(0.12, 0.2, 1.8, px, py + 0.9, pz, 10), 0x25342a);
  pump.add(cyl(0.2, 0.15, 0.3, px, py + 1.9, pz, 10), 0x25342a);
  pump.add(cyl(0.03, 0.05, 0.25, px, py + 2.15, pz, 8), 0x25342a);
  pump.box(0x25342a, 0.04, 0.06, 0.8, px, py + 1.5, pz + 0.3);
  pump.box(0x25342a, 0.12, 0.1, 0.3, px, py + 0.75, pz - 0.2);
  addMesh(scene, pump.build(), std({ vertexColors: true, roughness: 0.4, metalness: 0.5 }));
  loc.collide(px - 0.2, px + 0.2, pz - 0.2, pz + 0.2);
  loc.addHotspot({
    pos: [px, 1.4, pz],
    radius: 0.6,
    range: 2.5,
    label: 'Plumpe',
    action: { say: 'Eine Straßenpumpe, „Plumpe“ im hiesigen Idiom. Das Wasser ist eisig und schmeckt nach Eisen. Das Berlinische ist eine Sprache, die sich auch beim Trinken nicht schont.' },
  });

  // Droschkenplatz mit wartender Droschke
  const cab = makeDroschke();
  cab.position.set(24, 0, -2);
  cab.rotation.y = Math.PI;
  scene.add(cab);
  loc.collide(22.8, 25.2, -8, 2.2);
  // Die zweite wartet ohne Kutscher, der steht mit dem Kollegen am Kohlebecken.
  const cab2 = makeDroschke({ driver: false });
  cab2.position.set(24, 0, -12);
  cab2.rotation.y = Math.PI;
  scene.add(cab2);
  loc.collide(22.8, 25.2, -17.2, -9.6);
  buildCabRank(loc, ironMat);
  loc.addHotspot({
    pos: [24, 1.5, -1],
    radius: 1.6,
    range: 3.4,
    label: 'Droschke',
    action: { say: '„Na, wohin, Herr Doktor? Keen Doktor? Sehn aber so aus.“ Der Kutscher mustert mich und wendet sich wieder seiner Stulle zu. Für diesen Fall bleibe ich zu Fuß – die Wege sind kurz, und zu Fuß sieht man mehr.' },
  });

  // Bänke
  const bench = new Bag();
  for (const [x, z] of [[-14, 6], [14, 6]]) {
    for (let i = 0; i < 4; i++) bench.box(0x3a2a1c, 1.8, 0.04, 0.12, x, 0.48, z - 0.2 + i * 0.14);
    bench.box(0x3a2a1c, 1.8, 0.4, 0.04, x, 0.72, z + 0.32);
    bench.box(0x0e1110, 0.08, 0.5, 0.5, x - 0.8, 0.25, z);
    bench.box(0x0e1110, 0.08, 0.5, 0.5, x + 0.8, 0.25, z);
    loc.collide(x - 0.9, x + 0.9, z - 0.3, z + 0.35);
  }
  addMesh(scene, bench.build(), std({ vertexColors: true, roughness: 0.8 }));

  buildFountain(loc);
  buildKiosk(loc);
}

// Achteckiges Granitbecken, in der Mitte ein gusseiserner Schalenbrunnen. Im November
// abgestellt: Im Becken steht still das Regenwasser.
function buildFountain(loc) {
  const { scene } = loc;
  const { x, z, r: R } = FOUNTAIN;
  const granite = 0x6a6a66;
  const iron = 0x1f2a24;
  const b = new Bag();
  b.add(cyl(R - 0.2, R - 0.2, 0.3, 0, 0.15, 0, 8).rotateY(Math.PI / 8).translate(x, 0, z), 0x3a3a38);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    b.add(octagonSide(R, a, 0.55, 0.3, 0.275, x, z), granite);
    b.add(octagonSide(R + 0.05, a, 0.08, 0.42, 0.59, x, z), 0x76766f);
  }
  // Sockel, Säule, große Schale, kleine Schale, Knauf.
  b.add(cyl(0.5, 0.62, 0.8, x, 0.7, z, 8), granite);
  b.add(cyl(0.13, 0.2, 1.5, x, 1.85, z, 12), iron);
  b.add(cyl(1.0, 0.28, 0.3, x, 2.15, z, 20), iron);
  b.add(cyl(1.04, 1.04, 0.05, x, 2.32, z, 20), iron);
  b.add(cyl(0.08, 0.12, 0.7, x, 2.65, z, 10), iron);
  b.add(cyl(0.48, 0.14, 0.2, x, 3.05, z, 16), iron);
  b.add(cyl(0.03, 0.08, 0.45, x, 3.35, z, 8), iron);
  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.6, metalness: 0.25 }));
  // Stehendes Wasser: dunkel und glatt, damit es die Laternen spiegelt.
  const water = cyl(R - 0.28, R - 0.28, 0.02, 0, 0.46, 0, 8).rotateY(Math.PI / 8).translate(x, 0, z);
  addMesh(scene, water, std({ color: 0x0a0e14, roughness: 0.06, metalness: 0.6, envMapIntensity: 1.4 }));
  const w = R * Math.cos(Math.PI / 8);
  loc.collide(x - w, x + w, z - w, z + w);
  loc.addHotspot({
    pos: [x, 1.4, z],
    radius: R,
    range: 3.6,
    label: 'Brunnen',
    action: { say: 'Granit und Gusseisen. Im November dreht die Stadt das Wasser ab, damit der Frost die Schalen nicht sprengt; im Becken steht nur, was der Regen bringt. Die Droschken wenden um ihn herum wie Planeten um eine Sonne, die ausgegangen ist.' },
  });
}

// Achteckiger Zeitungskiosk an der Nordwestecke. Eine Seite zeigt zum Platz und zur
// Pension hin, dort liegt die erleuchtete Auslage.
function buildKiosk(loc) {
  const { scene } = loc;
  const x = -10;
  const z = -14;
  const R = 1.15;
  // Blickrichtung der Auslage: zur Platzmitte und zum Viadukt.
  const a = Math.atan2(0 - x, 8 - z);
  const green = 0x1c2a22;
  const b = new Bag();
  b.add(cyl(R + 0.08, R + 0.12, 0.25, 0, 0.125, 0, 8).rotateY(a - Math.PI / 8).translate(x, 0, z), 0x2a2a28);
  const body = new THREE.CylinderGeometry(R, R, 2.2, 8);
  body.rotateY(a - Math.PI / 8);
  body.translate(x, 1.35, z);
  b.add(body, green);
  const eave = new THREE.CylinderGeometry(R + 0.4, R + 0.4, 0.1, 8);
  eave.rotateY(a - Math.PI / 8);
  eave.translate(x, 2.5, z);
  b.add(eave, 0x141c18);
  const roof = new THREE.CylinderGeometry(0.12, R + 0.38, 0.8, 8);
  roof.rotateY(a - Math.PI / 8);
  roof.translate(x, 2.95, z);
  b.add(roof, 0x141c18);
  b.add(cyl(0.03, 0.07, 0.5, x, 3.55, z, 8), 0x141c18);
  // Ablage unter der Auslage.
  const ledge = new THREE.BoxGeometry(1.0, 0.06, 0.35);
  ledge.translate(0, 0.95, R * Math.cos(Math.PI / 8) + 0.12);
  ledge.rotateY(a);
  ledge.translate(x, 0, z);
  b.add(ledge, 0x3a2a1c);
  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.55, metalness: 0.3 }));

  const front = R * Math.cos(Math.PI / 8);
  // Auslage: ein Ausschnitt der Anschläge von der Litfaßsäule, ausgehängte Blätter und Plakate.
  const papers = posterWall().clone();
  // Ausschnitt im Seitenverhältnis der Scheibe (0,86 : 0,7), oben mit den Überschriften.
  papers.repeat.set(0.3, 0.42);
  papers.offset.set(0.55, 0.45);
  papers.needsUpdate = true;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.7), new THREE.MeshBasicMaterial({ map: papers, color: new THREE.Color(1.1, 0.9, 0.65) }));
  pane.position.set(x + Math.sin(a) * (front + 0.01), 1.4, z + Math.cos(a) * (front + 0.01));
  pane.rotation.y = a;
  scene.add(pane);
  const signTex = signTexture('Zeitungen', { size: 120 });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.22),
    new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.6, emissive: 0xffffff, emissiveMap: signTex, emissiveIntensity: 0.32 }),
  );
  sign.position.set(x + Math.sin(a) * (front + 0.02), 2.12, z + Math.cos(a) * (front + 0.02));
  sign.rotation.y = a;
  scene.add(sign);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(x + Math.sin(a) * (front + 0.3), 1.4, z + Math.cos(a) * (front + 0.3));
  glow.material.opacity = 0.3;
  glow.scale.setScalar(1.3);
  scene.add(glow);
  addPool(scene, x + Math.sin(a) * (front + 1.2), z + Math.cos(a) * (front + 1.2), 4.5, 0xc77b38, 0.28);

  loc.collide(x - R, x + R, z - R, z + R);
  loc.addHotspot({
    pos: [x, 1.5, z],
    radius: R + 0.2,
    range: 3.2,
    label: 'Zeitungskiosk',
    action: { say: 'Vossische, Börsen-Courier, Kladderadatsch und ein Dutzend Blätter, deren Namen ich nie gehört habe. Der Händler schläft hinter seiner Auslage im Sitzen, eine Fertigkeit, die man sonst nur bei Droschkenpferden findet. Berlin liest so gierig, wie es baut.' },
  });
}

// Halteplatz: Schild am Pfahl, zwei Kutscher wärmen sich an einem Kohlebecken.
function buildCabRank(loc, ironMat) {
  const { scene } = loc;
  const sx = 21.4;
  const sz = -7.4;
  addMesh(scene, merge([cyl(0.04, 0.05, 2.08, sx, 1.04, sz, 8), new THREE.SphereGeometry(0.05, 8, 6).translate(sx, 2.58, sz)]), ironMat);
  loc.collide(sx - 0.08, sx + 0.08, sz - 0.08, sz + 0.08);
  // Emailleschild 1,1 × 0,44 m im Eisenrahmen, auf beiden Seiten lesbar: zum Platz und zu den
  // wartenden Wagen.
  const tex = signTexture(['Droschken', 'HALTEPLATZ'], { width: 1024, height: 410, size: 170, sub: 0.62 });
  const signMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.35, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.3 });
  for (const a of [-Math.PI / 2, Math.PI / 2]) {
    addMesh(scene, new THREE.PlaneGeometry(1.1, 0.44).translate(0, 0, 0.022).rotateY(a).translate(sx, 2.3, sz), signMat);
  }
  addMesh(scene, new THREE.BoxGeometry(0.03, 0.5, 1.16).translate(sx, 2.3, sz), ironMat);

  // Kohlebecken: Eisenkorb auf drei Beinen, die Glut leuchtet.
  const bx = 19.4;
  const bz = -3.4;
  const b = new Bag();
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.BoxGeometry(0.035, 0.75, 0.035);
    leg.rotateX(0.18);
    leg.translate(0, 0.37, 0.24);
    leg.rotateY(a);
    leg.translate(bx, 0, bz);
    b.add(leg, 0x141614);
  }
  b.add(new THREE.CylinderGeometry(0.34, 0.24, 0.32, 12, 1, true).translate(bx, 0.86, bz), 0x1a1c1a);
  b.add(cyl(0.24, 0.24, 0.03, bx, 0.71, bz, 12), 0x1a1c1a);
  addMesh(scene, b.build(), std({ vertexColors: true, roughness: 0.7, metalness: 0.4, side: THREE.DoubleSide }));
  const coalMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 1.0, 0.22) });
  addMesh(scene, cyl(0.31, 0.31, 0.05, bx, 0.96, bz, 12), coalMat);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xff7a30, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(bx, 1.15, bz);
  glow.scale.setScalar(2.2);
  scene.add(glow);
  const pool = addPool(scene, bx, bz, 5, 0xd0602a, 0.32);
  loc.collide(bx - 0.36, bx + 0.36, bz - 0.36, bz + 0.36);

  // Zwei Kutscher in Pelerinen und lackierten Hüten, wie der auf dem Bock.
  const looks = [
    { outfit: 'overcoat', cape: true, coat: 0x2a241c, hat: 'top', hatColor: 0x15120e, beard: 'full', hair: 0x6a6258, build: 'stout' },
    { outfit: 'overcoat', cape: true, coat: 0x1e2226, hat: 'top', hatColor: 0x121418, moustache: 'walrus', neck: 'scarf', tie: 0x5a2a20, height: 1.74 },
  ];
  // Auf der Seite zu den Häusern hin, damit man vom Platz aus die Glut und die Gesichter sieht.
  const men = [[bx + 0.8, bz - 0.35], [bx + 0.15, bz - 0.85]].map(([fx, fz], i) => {
    const fig = makeFigure(looks[i]);
    fig.position.set(fx, 0, fz);
    fig.rotation.y = Math.atan2(bx - fx, bz - fz);
    scene.add(fig);
    loc.collide(fx - 0.25, fx + 0.25, fz - 0.25, fz + 0.25);
    return fig;
  });
  loc.addHotspot({
    pos: [bx, 1.3, bz],
    radius: 1.3,
    range: 3.2,
    label: 'Kutscher am Kohlebecken',
    action: { say: '„N’Abend, Herr. Wärmen Se sich ruhig mit, kost’ nischt.“ Die beiden reden über Hafer und den Kaiser, in dieser Reihenfolge, und finden beides zu teuer.' },
  });

  loc.onUpdate((dt, t, { camera }) => {
    const f = 0.85 + 0.1 * Math.sin(t * 7.3) * Math.sin(t * 2.9 + 1.3) + 0.05 * Math.sin(t * 17);
    glow.material.opacity = 0.6 * f;
    pool.material.opacity = 0.32 * f;
    for (const m of men) idleFigure(m, t, camera.position);
  });
}

// Urania-Säule, nach der Beschreibung in „Daheim“ vom 9. Juli 1892: ein schlanker Gussbau von gut
// 6 m. Unten ein schräg abfallender, achteckiger Unterbau mit Schaukästen unter Glas, zur Straße
// hin in Augenhöhe der Meteorograph. Darüber hinter Spiegelglas zwei Reihen Reklamebilder, die
// sich alle paar Sekunden um ein Feld weiterdrehen. Unter der Kuppel Reflektoren mit Gaslicht;
// die Kuppel ist ein Himmelsglobus mit drei Zifferblättern und der Mondphase, oben ein Stern.
function buildUrania(loc, ux, uz) {
  const { scene } = loc;
  const IRON = 0x34463a;
  const BRASS = 0x8a7440;
  const iron = new Bag();
  const gold = new Bag();
  const at = (geo, a = 0) => geo.rotateY(a).translate(ux, 0, uz);
  const oct = (rt, rb, h, y) => new THREE.CylinderGeometry(rt, rb, h, 8).rotateY(Math.PI / 8).translate(ux, y, uz);

  addMesh(scene, oct(0.86, 0.9, 0.16, 0.08), std({ color: 0x5c5c58, roughness: 0.8 }));

  // Unterbau: schräg abfallendes Achteck. Die Schaukästen liegen auf den vier Hauptseiten
  // und neigen sich mit der Schräge.
  const Y0 = 0.16;
  const Y1 = 2.1;
  const R0 = 0.72;
  const R1 = 0.5;
  iron.add(oct(0.76, 0.78, 0.12, Y0 + 0.06), IRON);
  iron.add(oct(R1, R0, Y1 - Y0, (Y0 + Y1) / 2), IRON);
  iron.add(oct(R1 + 0.07, R1 + 0.02, 0.12, Y1 + 0.02), IRON);
  const radius = (y) => R0 - ((y - Y0) * (R0 - R1)) / (Y1 - Y0);
  const tilt = Math.atan(((R0 - R1) * Math.cos(Math.PI / 8)) / (Y1 - Y0));
  const panes = [];
  // Tafel i der Textur uraniaCases (fünf nebeneinander), v0..v1: senkrechter Ausschnitt.
  const showcase = (i, yc, w, h, a, v0 = 0, v1 = 1) => {
    const out = radius(yc) * Math.cos(Math.PI / 8);
    const p = new THREE.PlaneGeometry(w, h);
    const uv = p.attributes.uv;
    for (let k = 0; k < uv.count; k++) uv.setXY(k, (i + uv.getX(k)) / 5, v0 + uv.getY(k) * (v1 - v0));
    panes.push(at(p.rotateX(-tilt).translate(0, yc, out + 0.015), a));
    for (const [bw, bh, bx, by] of [[w + 0.05, 0.035, 0, h / 2], [w + 0.05, 0.035, 0, -h / 2], [0.035, h + 0.05, w / 2, 0], [0.035, h + 0.05, -w / 2, 0]]) {
      gold.add(at(new THREE.BoxGeometry(bw, bh, 0.03).translate(bx, by, 0).rotateX(-tilt).translate(0, yc, out + 0.02), a), BRASS);
    }
  };
  const W = -Math.PI / 2;
  showcase(0, 1.46, 0.38, 0.6, W);
  showcase(1, 1.42, 0.38, 0.56, 0);
  showcase(2, 1.42, 0.38, 0.56, Math.PI / 2);
  showcase(3, 1.42, 0.38, 0.56, Math.PI);
  for (const a of [W, 0, Math.PI / 2, Math.PI]) showcase(4, 0.7, 0.42, 0.42, a, 0.13, 0.87);
  addMesh(scene, merge(panes), new THREE.MeshBasicMaterial({ map: uraniaCases(), color: new THREE.Color(0.86, 0.8, 0.68) }));

  // Hauptteil: zwei Reihen Reklamebilder hinter Glas zwischen acht Sprossen.
  iron.add(cyl(0.44, 0.52, 0.12, ux, 2.22, uz, 32), IRON);
  iron.add(cyl(0.4, 0.4, 1.9, ux, 3.22, uz, 24), IRON);
  const ads = uraniaAds();
  addMesh(scene, new THREE.CylinderGeometry(0.42, 0.42, 1.76, 48, 1, true).translate(ux, 3.2, uz), new THREE.MeshBasicMaterial({ map: ads, color: new THREE.Color(0.95, 0.88, 0.74) }));
  for (let k = 0; k < 8; k++) iron.add(at(new THREE.BoxGeometry(0.035, 1.8, 0.035).translate(0, 3.2, 0.425), (k * Math.PI) / 4), IRON);
  for (const y of [2.31, 3.2, 4.09]) gold.add(new THREE.TorusGeometry(0.43, 0.018, 6, 40).rotateX(Math.PI / 2).translate(ux, y, uz), BRASS);
  iron.add(cyl(0.5, 0.44, 0.12, ux, 4.15, uz, 32), IRON);
  iron.add(cyl(0.58, 0.46, 0.16, ux, 4.29, uz, 32), IRON);
  iron.add(cyl(0.62, 0.62, 0.05, ux, 4.39, uz, 32), IRON);

  // Vier Reflektoren unter der Kuppel, schräg zwischen den Zifferblättern.
  const flames = [];
  const lampGlow = [];
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    iron.add(at(new THREE.BoxGeometry(0.04, 0.04, 0.42).translate(0, 4.34, 0.6), a), IRON);
    iron.add(at(new THREE.CylinderGeometry(0.05, 0.15, 0.16, 10).translate(0, 4.3, 0.8), a), IRON);
    flames.push(at(new THREE.SphereGeometry(0.06, 8, 6).translate(0, 4.19, 0.8), a));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffb060, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(ux + Math.sin(a) * 0.8, 4.18, uz + Math.cos(a) * 0.8);
    s.scale.setScalar(0.9);
    scene.add(s);
    lampGlow.push(s);
  }
  addMesh(scene, merge(flames), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2.6, 1.1) }));
  iron.add(cyl(0.24, 0.36, 0.26, ux, 4.53, uz, 24), IRON);

  // Kuppel als Himmelsglobus, mit Gradringen. Drei Uhren (Süd, West, Nord) und der Mond (Ost)
  // sitzen in kurzen Gehäusen vor der Kugel.
  const GY = 5.2;
  const globe = uraniaGlobe();
  addMesh(scene, new THREE.SphereGeometry(0.62, 40, 24).translate(ux, GY, uz), std({ map: globe, roughness: 0.45, metalness: 0.25, emissive: 0xffffff, emissiveMap: globe, emissiveIntensity: 0.35 }));
  for (const a of [Math.PI / 4, -Math.PI / 4]) gold.add(at(new THREE.TorusGeometry(0.632, 0.016, 6, 48).translate(0, GY, 0), a), BRASS);
  gold.add(new THREE.TorusGeometry(0.525, 0.018, 6, 40).rotateX(Math.PI / 2).translate(ux, GY - 0.34, uz), BRASS);
  const clock = new THREE.MeshBasicMaterial({ map: clockFace(9, 40, 128), color: new THREE.Color(1.15, 1.05, 0.82) });
  const moon = new THREE.MeshBasicMaterial({ map: uraniaMoon(), color: new THREE.Color(1.05, 1, 0.9) });
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2;
    iron.add(at(new THREE.CylinderGeometry(0.29, 0.29, 0.16, 28).rotateX(Math.PI / 2).translate(0, GY, 0.55), a), IRON);
    gold.add(at(new THREE.TorusGeometry(0.285, 0.028, 6, 28).translate(0, GY, 0.635), a), BRASS);
    addMesh(scene, at(new THREE.CircleGeometry(0.26, 28).translate(0, GY, 0.64), a), k === 1 ? moon : clock);
  }

  // Vielzackiger Stern auf einem Dorn: zwei gekreuzte Scheiben, damit er von allen Seiten wirkt.
  const star = new THREE.Shape();
  for (let k = 0; k < 24; k++) {
    const rad = k % 2 ? 0.15 : 0.4;
    const a = (k / 24) * Math.PI * 2;
    if (k === 0) star.moveTo(Math.sin(a) * rad, Math.cos(a) * rad);
    else star.lineTo(Math.sin(a) * rad, Math.cos(a) * rad);
  }
  star.closePath();
  const SY = GY + 0.62 + 0.5;
  const starBag = new Bag();
  for (const a of [0, Math.PI / 2]) {
    starBag.add(new THREE.ExtrudeGeometry(star, { depth: 0.05, bevelEnabled: false }).translate(0, 0, -0.025).rotateY(a).translate(ux, SY, uz), 0xffffff);
  }
  starBag.add(cyl(0.025, 0.05, 0.4, ux, GY + 0.78, uz, 8), 0xffffff);
  const goldMat = std({ vertexColors: true, roughness: 0.35, metalness: 0.8, emissive: 0x2a1e08 });
  addMesh(scene, starBag.build(), std({ color: 0xd8b460, roughness: 0.3, metalness: 0.7, emissive: 0x8a6420 }));
  addMesh(scene, iron.build(), std({ vertexColors: true, roughness: 0.45, metalness: 0.3 }));
  addMesh(scene, gold.build(), goldMat);

  // Die Reflektoren machen die Säule nachts hell: Schein um den Reklameteil und auf dem Pflaster.
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDisc('glow'), color: 0xffc880, transparent: true, opacity: 0.26, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.position.set(ux, 3.4, uz);
  glow.scale.setScalar(3.2);
  scene.add(glow);
  addPool(scene, ux, uz, 6, 0xc89a60, 0.34);

  loc.collide(ux - 0.8, ux + 0.8, uz - 0.8, uz + 0.8);
  loc.addHotspot({
    pos: [ux, 1.7, uz],
    radius: 0.9,
    range: 3.6,
    label: 'Urania-Säule',
    action: { say: 'Eine der neuen Urania-Säulen. Oben ein Himmelsglobus mit drei Normaluhren und dem Mond, kurz nach dem letzten Viertel. In Augenhöhe schreiben drei Federn Wärme, Luftdruck und Feuchte auf einen Papierstreifen: 4 Grad, das Barometer fällt. Darüber drehen sich die Reklamebilder. Zwanzig Minuten vor zehn. Berlin liebt es, wenn man ihm die genaue Zeit sagt, und verkauft ihm gleich etwas dazu.' },
  });

  // Alle sieben Sekunden rücken die Bilder um ein Feld weiter, in einer knappen Drehung.
  loc.onUpdate((dt, t) => {
    const k = Math.floor(t / 7);
    const f = THREE.MathUtils.smoothstep(t % 7, 0, 0.9);
    ads.offset.x = ((k % 8) + f) / 8;
    for (const s of lampGlow) s.material.opacity = 0.45 + 0.05 * Math.sin(t * 7 + s.position.x);
  });
}

// Weicher Lichtfleck auf dem Pflaster, wie unter den Laternen (lamps.js).
function addPool(scene, x, z, size, color, opacity) {
  const geo = new THREE.PlaneGeometry(size, size);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ map: softDisc('lampPool', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,0.33)'), color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending });
  return addMesh(scene, geo, mat, x, 0.03, z);
}
