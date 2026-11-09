// Prüft einen Fall (reine Daten) auf kaputte Verweise und spielt ihn gierig durch.
//
// Aufruf: node tools/validate-case.mjs <fall.js> <audio.js> <welt-dateien …>
// Für Fall 1 gibt es dafür `npm run check`. figures.js gehört zu den Welt-Dateien, sonst
// bleiben die Gesten ungeprüft. Bei Fall 1 meldet es piefke.nein und wendt.zigarre als
// unerreichbar. Das ist harmlos: Ihre Optionen gelten nur, solange man f_schluessel bzw.
// c_havanna noch nicht hat, und das gierige Durchspielen kennt beides schon, bevor es die
// Gespräche führt. Im Spiel erreicht man sie, wenn man früh genug fragt.
import { pathToFileURL } from 'node:url';
import { readFileSync } from 'node:fs';

const [, , caseFile, audioFile, ...worldFiles] = process.argv;
const mod = await import(pathToFileURL(caseFile).href);
const c = Object.values(mod)[0];
const problems = [];
const warn = (m) => problems.push(m);

// --- 1. Verweise --------------------------------------------------------------
const clueIds = new Set(Object.keys(c.clues));
const dedIds = new Set(Object.keys(c.deductions));
const givers = new Map(); // id -> wo es herkommt
const addGiver = (id, where) => { if (!givers.has(id)) givers.set(id, []); givers.get(id).push(where); };

for (const h of c.hotspots) {
  const ins = h.action.inspect;
  if (ins) {
    for (const g of ins.give || []) addGiver(g, `hotspot ${h.location}/${h.anchor}`);
    if (ins.seen) addGiver(ins.seen, `hotspot ${h.location}/${h.anchor} (seen)`);
  }
}
for (const [did, d] of Object.entries(c.dialogues)) {
  for (const [nid, n] of Object.entries(d.nodes)) {
    for (const g of n.give || []) addGiver(g, `dialog ${did}.${nid}`);
    for (const o of n.opts) {
      if (o.go && !d.nodes[o.go]) warn(`dialog ${did}.${nid}: Option "${o.t}" zeigt auf fehlenden Knoten "${o.go}"`);
      if (!o.go && !o.end && !o.accuse && !o.hint) warn(`dialog ${did}.${nid}: Option "${o.t}" führt nirgendwohin`);
    }
  }
  const starts = Array.isArray(d.start) ? d.start.map((s) => s.node) : [d.start];
  for (const s of starts) if (!d.nodes[s]) warn(`dialog ${did}: Startknoten "${s}" fehlt`);
  if (Array.isArray(d.start) && d.start[d.start.length - 1].req) warn(`dialog ${did}: letzter Start hat eine Bedingung (kein Rückfall)`);
}
for (const id of dedIds) addGiver(id, 'Notizbuch (verknüpfen)');
addGiver('f_geloest', 'finishCase');

const referenced = [];
const collect = (list, where) => (list || []).forEach((x) => referenced.push([x.replace(/^!/, ''), where]));
for (const [did, d] of Object.entries(c.dialogues)) {
  if (Array.isArray(d.start)) d.start.forEach((s) => collect(s.req, `dialog ${did} start`));
  for (const [nid, n] of Object.entries(d.nodes)) n.opts.forEach((o) => collect(o.req, `dialog ${did}.${nid} "${o.t}"`));
}
c.objectives.forEach((o, i) => collect(o.until, `objective ${i}`));
Object.entries(c.doors).forEach(([k, r]) => collect(r.requires, `door ${k}`));
c.people.forEach((p) => collect(p.when, `people ${p.name}`));
c.hotspots.forEach((h) => collect(h.when, `hotspot ${h.anchor}`));
for (const [id, where] of referenced) if (!givers.has(id)) warn(`${where}: verlangt "${id}", das nirgends vergeben wird`);

for (const [did, d] of Object.entries(c.deductions)) {
  for (const pair of d.pairs) for (const x of pair) if (!clueIds.has(x)) warn(`deduction ${did}: Hinweis "${x}" existiert nicht`);
}
for (const id of givers.keys()) {
  if (id.startsWith('c_') && !clueIds.has(id)) warn(`"${id}" wird vergeben, ist aber kein definierter Hinweis`);
  if (id.startsWith('d_') && !dedIds.has(id)) warn(`"${id}" wird vergeben, ist aber keine definierte Schlussfolgerung`);
}
for (const id of clueIds) if (!givers.has(id)) warn(`Hinweis ${id} ist nirgends zu bekommen`);
const usedInPairs = new Set(Object.values(c.deductions).flatMap((d) => d.pairs.flat()));
for (const id of clueIds) if (!usedInPairs.has(id)) warn(`Hinweis ${id} kommt in keinem Schluss vor (Sackgasse im Notizbuch)`);

for (const n of c.npcs) if (n.dialog && !c.dialogues[n.dialog]) warn(`npc ${n.id}: Dialog "${n.dialog}" fehlt`);
const usedDialogs = new Set([c.start.dialog, ...c.npcs.map((n) => n.dialog).filter(Boolean)]);
for (const did of Object.keys(c.dialogues)) if (!usedDialogs.has(did)) warn(`Dialog ${did} gehört zu keiner Figur`);

c.accusation.questions.forEach((q, i) => {
  const n = q.options.filter((o) => o.correct).length;
  if (n !== 1) warn(`Anklage Frage ${i + 1}: ${n} richtige Antworten`);
  q.options.filter((o) => !o.correct && !o.wrong).forEach((o) => warn(`Anklage Frage ${i + 1}: "${o.t}" ohne Widerlegung`));
});

// Klänge, die der Fall abspielt, müssen in audio.js existieren.
const audioSrc = readFileSync(audioFile, 'utf8');
const sounds = [
  ...Object.values(c.dialogues).flatMap((d) => Object.values(d.nodes).map((n) => n.sound).filter(Boolean)),
  ...c.hotspots.map((h) => h.action.play).filter(Boolean),
];
for (const s of sounds) if (!new RegExp(`^\\s+${s}\\(`, 'm').test(audioSrc)) warn(`Klang "${s}" fehlt in audio.js`);

// Gesten, die der Fall auslöst, müssen in figures.js stehen (figures.js unter den Welt-Dateien übergeben).
const gestures = Object.entries(c.dialogues).flatMap(([did, d]) =>
  Object.entries(d.nodes).filter(([, n]) => n.gesture).map(([nid, n]) => [n.gesture, `${did}.${nid}`]));
const figuresFile = worldFiles.find((f) => /figures\.js$/.test(f));
if (figuresFile) {
  const { GESTURES } = await import(pathToFileURL(figuresFile).href);
  for (const [g, where] of gestures) if (!GESTURES?.[g]) warn(`dialog ${where}: Geste "${g}" fehlt in figures.js`);
} else if (gestures.length) warn('figures.js nicht übergeben, Gesten ungeprüft');

// Anker: grob statisch aus den Welt-Dateien.
const worldSrc = worldFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const anchorNames = new Set([...worldSrc.matchAll(/anchor\('([^']+)'/g)].map((m) => m[1]));
for (const x of [...c.hotspots, ...c.npcs]) if (!anchorNames.has(x.anchor)) warn(`Anker "${x.anchor}" (${x.location}) fehlt in der Welt`);

// --- 2. Gieriges Durchspielen -----------------------------------------------------
const known = new Set();
const check = (list) => !list || list.every((id) => (id[0] === '!' ? !known.has(id.slice(1)) : known.has(id)));
const visited = new Set();
const order = [];
const learn = (id, how) => { if (!known.has(id)) { known.add(id); order.push(`${id}  ← ${how}`); } };
const doors = (loc) => { const r = Object.entries(c.doors).find(([k]) => k === loc); return !r || check(r[1].requires); };

let changed = true;
let rounds = 0;
while (changed && rounds < 50) {
  changed = false;
  rounds++;
  const before = known.size;
  // Hotspots in zugänglichen Orten untersuchen
  for (const h of c.hotspots) {
    if (!doors(h.location) || !check(h.when)) continue;
    const ins = h.action.inspect;
    if (!ins) continue;
    if (ins.seen) learn(ins.seen, `untersuchen ${h.location}/${h.anchor}`);
    for (const g of ins.give || []) learn(g, `untersuchen ${h.location}/${h.anchor}`);
  }
  // Dialoge in zugänglichen Orten
  for (const n of c.npcs) {
    if (!n.dialog || !doors(n.location)) continue;
    const d = c.dialogues[n.dialog];
    const start = Array.isArray(d.start) ? d.start.find((s) => check(s.req)).node : d.start;
    const queue = [start];
    const seenHere = new Set();
    while (queue.length) {
      const nid = queue.shift();
      if (seenHere.has(nid)) continue;
      seenHere.add(nid);
      visited.add(`${n.dialog}.${nid}`);
      const node = d.nodes[nid];
      for (const g of node.give || []) learn(g, `Dialog ${n.dialog}.${nid}`);
      for (const o of node.opts) if (o.go && check(o.req)) queue.push(o.go);
    }
  }
  // Startdialog zählt auch
  // Notizbuch: alle Paare probieren
  for (const [did, d] of Object.entries(c.deductions)) {
    if (d.pairs.some(([a, b]) => known.has(a) && known.has(b))) learn(did, 'Notizbuch');
  }
  if (known.size !== before) changed = true;
}

const allNodes = Object.entries(c.dialogues).flatMap(([did, d]) => Object.keys(d.nodes).map((nid) => `${did}.${nid}`));
for (const k of allNodes) if (!visited.has(k)) warn(`Dialogknoten ${k} wird beim Durchspielen nie erreicht`);
for (const id of clueIds) if (!known.has(id)) warn(`Durchspielen: Hinweis ${id} nicht erreicht`);
for (const id of dedIds) if (!known.has(id)) warn(`Durchspielen: Schluss ${id} nicht erreicht`);
const accuseReq = Object.values(c.dialogues).flatMap((d) => Object.values(d.nodes).flatMap((n) => n.opts)).find((o) => o.accuse)?.req;
if (!check(accuseReq)) warn('Durchspielen: Anklage nie freigeschaltet');
c.objectives.forEach((o, i) => { if (!o.until.every((u) => u === 'f_geloest' || known.has(u))) warn(`Ziel ${i} "${o.text}" nicht erfüllbar`); });

console.log(`Fall: ${c.title}`);
console.log(`${clueIds.size} Hinweise, ${dedIds.size} Schlüsse, ${Object.keys(c.dialogues).length} Dialoge, ${allNodes.length} Dialogknoten, ${c.hotspots.length} Hotspots, ${c.npcs.length} Figuren`);
console.log(`Gieriges Durchspielen: ${rounds} Runden, ${known.size} Fakten`);
console.log(problems.length ? `\n${problems.length} Auffälligkeiten:\n- ${problems.join('\n- ')}` : '\nKeine Auffälligkeiten.');
