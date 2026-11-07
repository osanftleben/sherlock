import * as THREE from 'three';
import { addMesh, merge, std } from '../kit.js';
import { rng } from '../textures.js';
import { idleFigure, makeFigure } from '../figures.js';

// Was den Platz belebt, ohne dass man es anspricht: ein Paar unter einem Schirm, das an der
// Urania-Säule die Reklame liest, ein Mann auf der Bank, Pferdeäpfel am Halteplatz und auf der
// Fahrbahn der Droschke. Eigener Zufall, damit r für alles Übrige bleibt, wie es war.
export function buildLife(loc) {
  const { scene } = loc;
  const r = rng(1896);
  const people = [];
  const place = (look, x, z, rotY, y = 0, lookAt = null) => {
    const fig = makeFigure(look);
    fig.position.set(x, y, z);
    fig.rotation.y = rotY;
    scene.add(fig);
    loc.collide(x - 0.25, x + 0.25, z - 0.25, z + 0.25);
    people.push({ fig, lookAt });
    return fig;
  };

  // Vor der Urania-Säule (14, -10), auf der Seite zum Viadukt: Er hält den Schirm über beide.
  const he = place({ outfit: 'overcoat', coat: 0x24262a, hat: 'bowler', moustache: 'kaiser', umbrella: 0x101012 }, 14.3, -12.55, -0.12);
  const she = place({ outfit: 'dress', coat: 0x3a2228, hat: 'bonnet', hatColor: 0x1e1418, shawl: 0x2a2a30, height: 1.62 }, 14.85, -12.65, -0.3);
  people[0].lookAt = she.position;
  people[1].lookAt = he.position;

  // Auf der Bank (14, 6) mit dem Rücken nach Süden: ein alter Mann, der den Brunnen ansieht.
  place({ outfit: 'overcoat', coat: 0x2e2a24, hat: 'cap', hatColor: 0x1e1c1a, beard: 'full', hair: 0x8a847a, neck: 'scarf', tie: 0x3a2e24, pose: 'sit', build: 'stout' }, 14.4, 6.05, Math.PI, -0.39);

  loc.onUpdate((dt, t, { camera }) => {
    for (const p of people) idleFigure(p.fig, t, p.lookAt ?? camera.position);
  });

  // Pferdeäpfel: je ein Häufchen aus ein paar plattgedrückten Ballen, nass glänzend.
  const lumps = [];
  const pile = (x, z) => {
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const g = new THREE.SphereGeometry(0.045 + r() * 0.02, 7, 5);
      g.scale(1, 0.6 + r() * 0.2, 0.9 + r() * 0.2);
      g.rotateY(r() * Math.PI);
      g.translate(x + (r() - 0.5) * 0.22, 0.02, z + (r() - 0.5) * 0.22);
      lumps.push(g);
    }
  };
  // Am Halteplatz, wo die Wagen warten (x 22–25), und dort, wo die Droschke wendet und fährt.
  for (let i = 0; i < 6; i++) pile(22.4 + r() * 2.6, -16 + r() * 14);
  for (let i = 0; i < 5; i++) pile((r() - 0.5) * 10, -4 + r() * 12);
  for (let i = 0; i < 9; i++) pile((r() < 0.5 ? -3.6 : 3.6) + (r() - 0.5) * 1.2, -30 - r() * 140);
  addMesh(scene, merge(lumps), std({ color: 0x3b2c18, roughness: 0.35 }));
}

