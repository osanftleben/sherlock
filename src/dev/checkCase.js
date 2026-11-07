import * as THREE from 'three';
import { CASE_LIST } from '../cases/index.js';

// Entwicklerwerkzeug: prüft den geladenen Fall gegen die gebauten Orte.
// Aufruf im Entwicklungsmodus mit http://localhost:5173/?pruefen
//
// Fehler    Verweise ins Leere, unerreichbare Fundstellen, Hinweise oder Schlüsse,
//           die sich im Spielablauf nie gewinnen lassen.
// Warnungen Dinge, die funktionieren, aber verdächtig sind: Fundstellen hinter
//           Geometrie, stehende Figuren in Möbeln, Hinweise ohne Schluss.
//
// Grenzen: Optik und Texte prüft das nicht. Die Ablaufsimulation behandelt Wissen als
// wachsend; Bedingungen mit „!id“ wertet sie daher eher zu großzügig.

const RADIUS = 0.34; // Spielerradius, wie in engine/player.js
const EYE = 1.72; // Augenhöhe, wie in engine/player.js

export function checkCase(c, locations) {
  const errors = [];
  const warnings = [];
  const usable = new Set();
  const areas = {};

  checkReferences(c, locations, errors);
  checkFigures(c, locations, warnings);

  for (const loc of Object.values(locations)) {
    loc.scene.updateMatrixWorld(true);
    const exits = loc.exits ? Object.entries(loc.exits) : [];
    const seeds = exits.length ? exits.map(([id, e]) => ({ name: `Ausgang ${id}`, pos: e.pos })) : [{ name: 'Startpunkt', pos: loc.spawn.pos }];
    const grid = walkable(loc, seeds, errors);
    if (!grid) continue;
    areas[loc.id] = Math.round(grid.cells.length * grid.step ** 2);
    if (loc.id !== 'berlin' && grid.open) errors.push(`${loc.id}: Die begehbare Fläche reicht bis an den Rand. Fehlt eine Wand?`);
    for (const spot of loc.hotspots) {
      if (checkSpot(loc, spot, grid, errors, warnings)) usable.add(spot);
    }
  }

  simulate(c, locations, usable, errors);

  const used = new Set(Object.values(c.deductions).flatMap((d) => d.pairs.flat()));
  for (const [id, clue] of Object.entries(c.clues)) {
    if (!used.has(id)) warnings.push(`Hinweis „${clue.title}“ (${id}) gehört zu keinem Schluss.`);
  }
  return { errors, warnings, areas };
}

function checkReferences(c, locations, errors) {
  const given = new Set(['f_geloest', ...Object.keys(c.deductions)]);
  const required = new Map();
  const need = (list, where) => {
    for (const raw of list || []) {
      const id = raw.replace(/^!/, '');
      if (!required.has(id)) required.set(id, where);
    }
  };

  for (const def of c.hotspots) {
    const loc = locations[def.location];
    if (!loc) errors.push(`Fundstelle „${def.label}“: Ort ${def.location} gibt es nicht.`);
    else if (!loc.anchors[def.anchor]) errors.push(`Fundstelle „${def.label}“: Anker ${def.location}/${def.anchor} gibt es nicht.`);
    const inspect = def.action?.inspect;
    for (const id of inspect?.give || []) given.add(id);
    if (inspect?.seen) given.add(inspect.seen);
    need(def.when, `Fundstelle „${def.label}“`);
  }
  for (const npc of c.npcs) {
    if (!locations[npc.location]?.anchors[npc.anchor]) errors.push(`Figur ${npc.name}: Anker ${npc.location}/${npc.anchor} gibt es nicht.`);
    if (npc.dialog && !c.dialogues[npc.dialog]) errors.push(`Figur ${npc.name}: Dialog ${npc.dialog} gibt es nicht.`);
  }
  for (const [did, dlg] of Object.entries(c.dialogues)) {
    const starts = Array.isArray(dlg.start) ? dlg.start : [{ node: dlg.start }];
    for (const s of starts) {
      if (!dlg.nodes[s.node]) errors.push(`Dialog ${did}: Startknoten ${s.node} gibt es nicht.`);
      need(s.req, `Dialog ${did}`);
    }
    for (const [nid, node] of Object.entries(dlg.nodes)) {
      for (const id of node.give || []) given.add(id);
      if (node.sound && typeof node.sound !== 'string') errors.push(`Dialog ${did}/${nid}: Klang ist kein Name.`);
      for (const o of node.opts || []) {
        if (o.go && !dlg.nodes[o.go]) errors.push(`Dialog ${did}/${nid}: Ziel „${o.go}“ gibt es nicht.`);
        need(o.req, `Dialog ${did}/${nid}`);
      }
    }
  }
  for (const o of c.objectives) need(o.until, `Ziel „${o.text}“`);
  for (const p of c.people) need(p.when, `Person ${p.name}`);
  for (const [door, rule] of Object.entries(c.doors)) need(rule.requires, `Tür ${door}`);

  for (const [id, where] of required) {
    if (!given.has(id)) errors.push(`${where} wartet auf „${id}“, das nirgends vergeben wird.`);
  }
  for (const id of given) {
    if (id.startsWith('c_') && !c.clues[id]) errors.push(`Hinweis ${id} wird vergeben, ist aber nicht definiert.`);
  }
  for (const d of Object.values(c.deductions)) {
    for (const id of d.pairs.flat()) if (!c.clues[id]) errors.push(`Schluss „${d.title}“ nutzt unbekannten Hinweis ${id}.`);
  }
  // Ein Beinahe-Paar darf kein echtes Paar verdecken und nur bekannte Hinweise nennen.
  const real = new Set(Object.values(c.deductions).flatMap((d) => d.pairs.map((p) => [...p].sort().join('+'))));
  for (const n of c.near || []) {
    for (const p of n.pairs) {
      for (const id of p) if (!c.clues[id]) errors.push(`Beinahe-Paar nutzt unbekannten Hinweis ${id}.`);
      if (real.has([...p].sort().join('+'))) errors.push(`Beinahe-Paar ${p.join('+')} ist schon ein echter Schluss.`);
    }
  }
  for (const q of c.accusation.questions) {
    const n = q.options.filter((o) => o.correct).length;
    if (n !== 1) errors.push(`Anklagefrage „${q.text}“ hat ${n} richtige Antworten.`);
  }
}

// Stehende Figuren dürfen nicht in Möbeln stecken; sitzende sitzen auf ihnen.
function checkFigures(c, locations, warnings) {
  for (const npc of c.npcs) {
    if (npc.look?.pose === 'sit') continue;
    const loc = locations[npc.location];
    const a = loc?.anchors[npc.anchor];
    if (!a) continue;
    const { x, z } = a.pos;
    const own = (k) => Math.abs(k.minX - (x - 0.28)) < 1e-6 && Math.abs(k.maxZ - (z + 0.28)) < 1e-6;
    const inside = loc.colliders.find((k) => !own(k) && x > k.minX + 0.05 && x < k.maxX - 0.05 && z > k.minZ + 0.05 && z < k.maxZ - 0.05);
    if (inside) warnings.push(`${npc.name} (${npc.location}) steht in einer Kollisionsfläche.`);
  }
}

// Flutet die begehbare Fläche von den Startpunkten aus. Alle Startpunkte müssen
// in derselben zusammenhängenden Fläche liegen.
function walkable(loc, seeds, errors) {
  const step = loc.id === 'berlin' ? 0.25 : 0.08;
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const k of loc.colliders) {
    minX = Math.min(minX, k.minX - 1);
    maxX = Math.max(maxX, k.maxX + 1);
    minZ = Math.min(minZ, k.minZ - 1);
    maxZ = Math.max(maxZ, k.maxZ + 1);
  }
  const nx = Math.ceil((maxX - minX) / step);
  const nz = Math.ceil((maxZ - minZ) / step);
  const B = 4;
  const buckets = new Map();
  for (const k of loc.colliders) {
    for (let bx = Math.floor((k.minX - RADIUS) / B); bx <= Math.floor((k.maxX + RADIUS) / B); bx++) {
      for (let bz = Math.floor((k.minZ - RADIUS) / B); bz <= Math.floor((k.maxZ + RADIUS) / B); bz++) {
        const key = `${bx},${bz}`;
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(k);
      }
    }
  }
  const free = (x, z) => {
    for (const k of buckets.get(`${Math.floor(x / B)},${Math.floor(z / B)}`) || []) {
      const qx = Math.max(k.minX, Math.min(x, k.maxX));
      const qz = Math.max(k.minZ, Math.min(z, k.maxZ));
      if ((x - qx) ** 2 + (z - qz) ** 2 < RADIUS * RADIUS * 0.98) return false;
    }
    return true;
  };
  const index = ([x, , z]) => Math.round((x - minX) / step) * nz + Math.round((z - minZ) / step);

  const [first, ...rest] = seeds;
  if (!free(first.pos[0], first.pos[2])) {
    errors.push(`${loc.id}: ${first.name} liegt in einer Kollisionsfläche.`);
    return null;
  }
  const seen = new Uint8Array(nx * nz);
  const queue = [index(first.pos)];
  seen[queue[0]] = 1;
  const cells = [];
  let open = false;
  while (queue.length) {
    const i = queue.pop();
    const ix = Math.floor(i / nz);
    const iz = i % nz;
    cells.push([minX + ix * step, minZ + iz * step]);
    if (ix <= 1 || iz <= 1 || ix >= nx - 2 || iz >= nz - 2) open = true;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const jx = ix + dx;
      const jz = iz + dz;
      if (jx < 0 || jz < 0 || jx >= nx || jz >= nz) continue;
      const j = jx * nz + jz;
      if (seen[j]) continue;
      seen[j] = 1;
      if (free(minX + jx * step, minZ + jz * step)) queue.push(j);
    }
  }
  const reached = new Set(cells.map(([x, z]) => index([x, 0, z])));
  for (const s of rest) {
    if (!reached.has(index(s.pos))) errors.push(`${loc.id}: ${s.name} ist von ${first.name} aus nicht zu Fuß erreichbar.`);
  }
  return { cells, step, open };
}

const ray = new THREE.Raycaster();
ray.camera = new THREE.PerspectiveCamera();

// Liegt zwischen Auge und Fundstelle etwas Undurchsichtiges? Treffer innerhalb des
// Zielradius zählen nicht: Dort sieht man das Objekt selbst.
function occluder(loc, eye, spot) {
  const dir = spot.pos.clone().sub(eye);
  const dist = dir.length();
  ray.set(eye, dir.normalize());
  ray.far = dist;
  const hits = ray.intersectObjects(loc.scene.children.filter((o) => !o.isSprite), true);
  for (const h of hits) {
    if (!h.object.isMesh || !h.object.visible) continue;
    const m = Array.isArray(h.object.material) ? h.object.material[0] : h.object.material;
    if (!m || !m.visible || (m.transparent && (m.opacity ?? 1) < 0.95) || m.transmission > 0) continue;
    if (h.point.distanceTo(spot.pos) < spot.radius + 0.15) continue;
    return h.point;
  }
  return null;
}

function checkSpot(loc, spot, grid, errors, warnings) {
  const name = `${loc.id}: „${spot.label}“`;
  const near = [];
  let closest = Infinity;
  for (const [x, z] of grid.cells) {
    const eye = new THREE.Vector3(x, loc.heightAt(x, z) + EYE, z);
    const d = eye.distanceTo(spot.pos);
    closest = Math.min(closest, d);
    if (d >= 0.1 && d <= spot.range - 0.02) near.push([d, eye]);
  }
  if (!near.length) {
    errors.push(`${name}: Kein begehbarer Standpunkt in Reichweite ${spot.range} m, der nächste ist ${closest.toFixed(2)} m entfernt.`);
    return false;
  }
  near.sort((a, b) => a[0] - b[0]);
  const every = Math.max(1, Math.floor(near.length / 40));
  let point = null;
  for (let i = 0; i < near.length; i += every) {
    const p = occluder(loc, near[i][1], spot);
    if (!p) return true;
    point = point || p;
  }
  const at = point.toArray().map((v) => v.toFixed(2)).join(' / ');
  warnings.push(`${name}: Von keinem Standpunkt aus frei sichtbar, verdeckt etwa bei ${at}.`);
  return true;
}

// Spielt den Fall durch, bis nichts Neues mehr dazukommt.
function simulate(c, locations, usable, errors) {
  const known = new Set();
  const check = (list) => !list || list.every((id) => (id[0] === '!' ? !known.has(id.slice(1)) : known.has(id)));
  let changed = true;
  let accuse = false;
  const add = (id) => {
    if (known.has(id)) return;
    known.add(id);
    changed = true;
  };
  for (let round = 0; changed && round < 100; round++) {
    changed = false;
    const open = new Set(['berlin']);
    for (const s of locations.berlin.hotspots) {
      if (!usable.has(s) || !s.action.door) continue;
      const rule = c.doors[s.action.door];
      if (!rule || check(rule.requires)) open.add(s.action.to);
    }
    for (const id of open) {
      for (const s of locations[id]?.hotspots || []) {
        if (!usable.has(s) || !check(s.when)) continue;
        const inspect = s.action.inspect;
        if (inspect) {
          if (inspect.seen) add(inspect.seen);
          (inspect.give || []).forEach(add);
        }
        const dlg = s.action.dialog && c.dialogues[s.action.dialog];
        if (!dlg) continue;
        const starts = Array.isArray(dlg.start) ? dlg.start.filter((x) => check(x.req)).map((x) => x.node) : [dlg.start];
        const visited = new Set();
        const stack = [...starts];
        while (stack.length) {
          const nid = stack.pop();
          if (visited.has(nid) || !dlg.nodes[nid]) continue;
          visited.add(nid);
          const node = dlg.nodes[nid];
          (node.give || []).forEach(add);
          for (const o of node.opts || []) {
            if (!check(o.req)) continue;
            if (o.accuse) accuse = true;
            if (o.go) stack.push(o.go);
          }
        }
      }
    }
    for (const [id, d] of Object.entries(c.deductions)) {
      if (d.pairs.some(([a, b]) => known.has(a) && known.has(b))) add(id);
    }
  }
  for (const [id, clue] of Object.entries(c.clues)) {
    if (!known.has(id)) errors.push(`Hinweis „${clue.title}“ (${id}) lässt sich im Spiel nicht gewinnen.`);
  }
  for (const [id, d] of Object.entries(c.deductions)) {
    if (!known.has(id)) errors.push(`Schluss „${d.title}“ (${id}) lässt sich im Spiel nicht ziehen.`);
  }
  if (!accuse) errors.push('Die Anklage wird nie angeboten.');
  known.add('f_geloest');
  for (const o of c.objectives) {
    if (!check(o.until)) errors.push(`Ziel „${o.text}“ lässt sich nicht erfüllen.`);
  }
}

// Quelltext aller Module, damit die Klangprüfung sieht, welche Klänge aufgerufen werden.
const SOURCES = import.meta.glob('../**/*.js', { query: '?raw', import: 'default', eager: true });

// Jeder Klang, den Code oder Fälle beim Namen aufrufen, muss es in core/audio.js geben. Ein
// fehlender wirft erst, wenn er erklingt, also oft nur an einer Stelle der Stadt und nur mit Ton;
// Klangereignisse der Orte (loc.sounds) bleiben sogar stumm, ohne Fehler.
export function checkSounds(audio, cases) {
  const errors = [];
  const need = new Map();
  const add = (name, where) => {
    if (!need.has(name)) need.set(name, new Set());
    need.get(name).add(where);
  };
  for (const [path, text] of Object.entries(SOURCES)) {
    const file = path.replace(/^\.\.\//, '');
    if (file.startsWith('dev/')) continue;
    const scan = (re) => {
      for (const m of text.matchAll(re)) add(m[1], `${file}:${text.slice(0, m.index).split('\n').length}`);
    };
    if (file === 'core/audio.js') scan(/\bthis\.(\w+)\(/g);
    else scan(/\baudio\.(\w+)\(/g);
    scan(/sounds\b[^\n]*?\btype:\s*'(\w+)'/g);
  }
  for (const c of cases) {
    for (const [id, d] of Object.entries(c.dialogues)) {
      for (const [nodeId, node] of Object.entries(d.nodes)) if (node.sound) add(node.sound, `${c.id}: Dialog ${id}.${nodeId}`);
    }
    for (const spot of c.hotspots) if (spot.action?.play) add(spot.action.play, `${c.id}: Fundstelle ${spot.anchor}`);
  }
  for (const [name, where] of need) {
    if (typeof audio[name] !== 'function') errors.push(`Klang „${name}“ fehlt in core/audio.js (aufgerufen in ${[...where].join(', ')}).`);
  }
  return errors;
}

// Prüft alle Fälle nacheinander, jeden in der Welt aufgebaut, und stellt danach den
// vorher aufgebauten Fall wieder her. Ergebnis in der Konsole und als Tafel über dem Spiel.
export function showCheck(game) {
  const t0 = performance.now();
  const before = game.case.id;
  const errors = checkSounds(game.audio, CASE_LIST);
  const warnings = [];
  let areas = {};
  for (const c of CASE_LIST) {
    game.useCase(c.id);
    const prefix = CASE_LIST.length > 1 ? `[${c.title}] ` : '';
    const r = checkCase(c, game.locations);
    errors.push(...r.errors.map((e) => prefix + e));
    warnings.push(...r.warnings.map((w) => prefix + w));
    areas = r.areas;
  }
  game.useCase(before);
  const ms = Math.round(performance.now() - t0);
  const which = CASE_LIST.length > 1 ? `${CASE_LIST.length} Fälle` : `„${CASE_LIST[0].title}“`;
  const title = `Fallprüfung ${which}: ${errors.length} Fehler, ${warnings.length} Warnungen (${ms} ms)`;
  console.group(title);
  errors.forEach((e) => console.error(e));
  warnings.forEach((w) => console.warn(w));
  console.info('Begehbare Fläche je Ort (m²):', areas);
  console.groupEnd();

  const panel = document.createElement('div');
  panel.id = 'fallpruefung';
  panel.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;max-width:min(520px,calc(100vw - 24px));max-height:70vh;overflow:auto;padding:12px 14px;background:rgba(18,16,14,.94);color:#e8e0cc;font:13px/1.45 system-ui,sans-serif;border:1px solid #6a5a3a;border-radius:6px';
  const line = (text, color) => {
    const p = document.createElement('div');
    p.textContent = text;
    p.style.cssText = `color:${color};margin:4px 0`;
    panel.append(p);
  };
  line(title, errors.length ? '#ff8a7a' : '#a8d890');
  errors.forEach((e) => line(`Fehler: ${e}`, '#ff8a7a'));
  warnings.forEach((w) => line(`Warnung: ${w}`, '#e8c070'));
  const close = document.createElement('button');
  close.textContent = 'Schließen';
  close.style.cssText = 'margin-top:8px;cursor:pointer';
  close.onclick = () => panel.remove();
  panel.append(close);
  document.body.append(panel);
  return { errors, warnings, areas };
}
