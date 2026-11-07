import * as THREE from 'three';
import { addMesh, merge, std } from '../kit.js';
import { rng } from '../textures.js';
import { idleFigure, makeFigure } from '../figures.js';
import { hearing } from './traffic.js';

// Leute, die miteinander reden: abwechselnd ein paar gemurmelte Sätze, dazwischen Pausen und ab
// und zu ein längeres Schweigen. Hört man nur aus der Nähe. speakers: [{ pos, voice }];
// cough: mittlere Sekunden zwischen zwei Hustern (0 = nie); talk: false für jemanden, der nur hustet.
// Das künstlich erzeugte Murmeln klingt zu unnatürlich; geredet wird erst wieder, wenn echte
// Aufnahmen auf Berlinisch da sind (docs/aufnahmeliste-stimmen.md). Husten bleibt.
const SPEAK = false;

export function chatter(loc, speakers, { range = 12, cough = 0, talk = true } = {}) {
  let turn = 0;
  let next = 1 + Math.random() * 3;
  let nextCough = cough * (0.5 + Math.random());
  loc.onUpdate((dt, t, { camera }) => {
    next -= dt;
    if (SPEAK && talk && next < 0) {
      const sp = speakers[turn];
      const ear = hearing(camera, sp.pos.x, sp.pos.z, range);
      const words = 1 + Math.floor(Math.random() * 5);
      if (ear.vol > 0.01) (loc.sounds ??= []).push({ type: 'murmur', vol: ear.vol, pan: ear.pan, voice: sp.voice, words });
      // Wer weiterredet, setzt nach kurzem Atemholen neu an; die Antwort lässt etwas länger auf sich warten.
      const other = speakers.length > 1 && Math.random() < 0.7;
      if (other) turn = (turn + 1) % speakers.length;
      next = words * 0.55 + (Math.random() < 0.15 ? 4 + Math.random() * 8 : other ? 0.4 + Math.random() * 0.9 : 0.25 + Math.random() * 0.3);
    }
    if (!cough) return;
    nextCough -= dt;
    if (nextCough < 0) {
      const sp = speakers[Math.floor(Math.random() * speakers.length)];
      (loc.sounds ??= []).push({ type: 'cough', ...hearing(camera, sp.pos.x, sp.pos.z, range * 2.5) });
      nextCough = cough * (0.5 + Math.random());
    }
  });
}

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
  const old = place({ outfit: 'overcoat', coat: 0x2e2a24, hat: 'cap', hatColor: 0x1e1c1a, beard: 'full', hair: 0x8a847a, neck: 'scarf', tie: 0x3a2e24, pose: 'sit', build: 'stout' }, 14.4, 6.05, Math.PI, -0.39);

  loc.onUpdate((dt, t, { camera }) => {
    for (const p of people) idleFigure(p.fig, t, p.lookAt ?? camera.position);
  });
  // Das Paar unterhält sich leise; der Alte auf der Bank hustet von Zeit zu Zeit.
  chatter(loc, [{ pos: he.position, voice: 'm' }, { pos: she.position, voice: 'f' }], { range: 11 });
  chatter(loc, [{ pos: old.position, voice: 'm' }], { range: 14, cough: 40, talk: false });

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

