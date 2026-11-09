// Entwicklerwerkzeug: http://localhost:5173/?messen fährt feste Standpunkte in Berlin ab und
// misst bei voller Auflösung die GPU-Zeit je Durchgang, die Bildrate, Zeichenaufrufe und Dreiecke.
// Damit jede Messung dieselbe Lage sieht, steht die Pferdebahn an der Endstelle (am Platz der
// teuerste Fall), Passanten und Droschke stehen, wo sie beim Laden standen (loc.trafficStage in
// traffic.js), und gemessen wird im Standbild (game.freeze). Der Browserbereich muss dabei
// sichtbar sein, sonst drosselt der Browser die Bilder und die Grafik taktet herunter; ein
// Durchgang, in dem die Seite verdeckt war, wird wiederholt.

import { STAGES } from '../engine/view.js';

// Name, x, z, Blickrichtung (0 = Norden, die Rosenthaler Straße hinauf).
export const POINTS = [
  ['Start', 0, 10, 0],
  ['Platz', 0, -10, 0.6],
  ['Markt', -12, -4, Math.PI / 2],
  // Rund um den Markt, wo die Auflösung zuerst nachgibt: vom selben Platz in die anderen drei
  // Richtungen, dazu aus der Nordwestecke über den Platz und von der Ostseite zurück.
  ['Markt N', -12, -4, 0],
  ['Markt O', -12, -4, -Math.PI / 2],
  ['Markt S', -12, -4, Math.PI],
  ['Markt Ecke', -18, -16, -Math.PI * 0.75],
  ['Markt Gegen', 12, -4, Math.PI / 2],
  ['Rosenthaler', 0, -60, 0],
  ['Kessler', 3.5, -70, -Math.PI / 2 + 0.55],
  ['Durchfahrt', 7.5, -79.7, -Math.PI / 2],
  ['Hof', 24.2, -79.8, -Math.PI / 2 - 0.75],
  ['Sophien', 20, -100, -Math.PI / 2],
  ['Oranienburger', -55, -8, Math.PI / 2],
  ['Viadukt', 0, 14, Math.PI],
  ['Spree', 0, 40, Math.PI],
];

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));

// War die Seite seit dem letzten reset() verdeckt?
const covered = {
  seen: false,
  reset() {
    this.seen = document.visibilityState !== 'visible';
  },
};
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') covered.seen = true;
});

async function frames(seconds) {
  const start = performance.now();
  let count = 0;
  while (performance.now() - start < seconds * 1000) {
    await frame();
    count++;
  }
  return count / ((performance.now() - start) / 1000);
}

// Stellt Holmes ohne Anzeigen und Überblendung an einen Standpunkt.
function stand(game, x, z, yaw) {
  game.mode = 'pause';
  game.ui.clear();
  game.ui.setHud(false);
  game.enter('berlin', { pos: [x, 0, z], yaw });
  game.player.pitch = 0;
  game.player.apply();
  game.view.fade = 0;
  game.view.fadeTarget = 0;
}

// Zerlegt die GPU-Zeit eines Bildes nach Teilen der Szene, im Standbild an einem Standpunkt.
// Jeder Zeichenaufruf zählt zu der Stelle im Code, an der sein Teil in die Szene kam
// (userData.source, engine/location.js); Leuchten und Schlussbild zählen je Schritt.
// split: Teile (oder true für alle), die zusätzlich nach Material aufgeteilt werden; welches
// Material hinter einer Zeile steckt, steht in materials.
// Zuerst wird wie gewohnt je Durchgang gemessen (Bezug), dann je Teil. Die vielen Zeitabfragen
// kosten selbst etwas: Summe minus Bezug zeigt, wie viel.
export async function breakdown(game, { point = 'Platz', seconds = 3, warmup = 3, tram = 'end', traffic = 'start', split = [] } = {}) {
  const { view } = game;
  const { clock, renderer } = view;
  const gl = renderer.getContext();
  const { ext } = clock;
  if (!ext) throw new Error('Der Browser erlaubt keine Zeitabfragen.');
  await game.roomsReady;
  const loc = game.locations.berlin;
  const [, x, z, yaw] = POINTS.find(([name]) => name === point);
  if (tram) loc.tramStage?.(tram);
  if (traffic) loc.trafficStage?.(traffic);
  view.lockScale(1);
  stand(game, x, z, yaw);
  await frames(warmup);

  const direct = renderer.renderBufferDirect;
  const render = renderer.render;
  const { glow } = view;
  const steps = new Map([
    [glow.materialHighPassFilter, 'Helligkeitsfilter'],
    ...glow.separableBlurMaterials.map((m, i) => [m, `Weichzeichnen ${i + 1}`]),
    [glow.compositeMaterial, 'Zusammensetzen'],
  ]);
  const materials = new Map();
  const results = [];
  const pending = [];
  const parts = new Map();
  const bad = new Set();
  let active = null;
  let frameNo = 0;
  let queries = 0;
  let stage = null;
  let depth = 0;
  const stop = () => {
    if (!active) return;
    gl.endQuery(ext.TIME_ELAPSED_EXT);
    pending.push(active);
    active = null;
  };
  const start = (label) => {
    if (active?.label === label) return;
    stop();
    active = { label, frame: frameNo, query: gl.createQuery() };
    gl.beginQuery(ext.TIME_ELAPSED_EXT, active.query);
    queries++;
  };
  const poll = () => {
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    while (pending.length && gl.getQueryParameter(pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
      const { label, frame: f, query } = pending.shift();
      if (disjoint) bad.add(f);
      else results.push({ label, frame: f, ms: gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 });
      gl.deleteQuery(query);
    }
  };
  const part = (label) => {
    if (!parts.has(label)) parts.set(label, { draws: 0, tris: 0 });
    return parts.get(label);
  };

  let ref = null;
  try {
    game.freeze = true;
    // Bezug: die drei Durchgänge wie in measure().
    const sum = {};
    const n = {};
    view.onTiming = ({ label, ms }) => {
      sum[label] = (sum[label] || 0) + ms;
      n[label] = (n[label] || 0) + 1;
    };
    covered.reset();
    await frames(seconds);
    view.onTiming = null;
    ref = Object.fromEntries(STAGES.map((stage) => [stage, +(sum[stage] / n[stage]).toFixed(2)]));
    ref.Summe = +STAGES.reduce((s, stage) => s + ref[stage], 0).toFixed(2);

    // Je Teil: Spiegelbilder (waterMirror) rendern mitten in der Szene und zählen für sich.
    renderer.render = function (...args) {
      depth++;
      try {
        return render.apply(this, args);
      } finally {
        depth--;
      }
    };
    renderer.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
      if (!stage) return direct.call(this, camera, scene, geometry, material, object, group);
      let label;
      if (stage !== 'Szene') label = `${stage} · ${steps.get(material) ?? material.type}`;
      else if (depth > 1) label = 'Spiegelbild';
      else {
        let top = object;
        while (top.parent && !top.parent.isScene) top = top.parent;
        label = top.userData.source ?? 'ohne Quelle';
        if (split === true || split.includes(label)) label += ` · ${material.type.replace('Material', '')}#${material.id}`;
      }
      if (!materials.has(label)) materials.set(label, material);
      start(label);
      const tris = this.info.render.triangles;
      direct.call(this, camera, scene, geometry, material, object, group);
      const p = part(label);
      p.draws++;
      p.tris += this.info.render.triangles - tris;
    };
    clock.begin = (label) => {
      stage = label;
      if (label === 'Szene') {
        poll();
        frameNo++;
        start('Löschen');
      } else start(label);
    };
    clock.end = () => {
      stop();
      stage = null;
    };
    await frames(seconds);
  } finally {
    renderer.renderBufferDirect = direct;
    renderer.render = render;
    // begin und end stammen aus der Klasse: Löschen legt sie wieder frei.
    delete clock.begin;
    delete clock.end;
    view.onTiming = null;
    game.freeze = false;
    if (tram) loc.tramStage?.('free');
    if (traffic) loc.trafficStage?.('free');
    view.lockScale(null);
  }
  for (let i = 0; i < 60 && pending.length; i++) {
    await frame();
    poll();
  }

  // Nur vollständige Bilder: das erste und das letzte können angeschnitten sein.
  const good = new Set();
  for (let f = 2; f < frameNo; f++) if (!bad.has(f)) good.add(f);
  const ms = new Map();
  for (const r of results) if (good.has(r.frame)) ms.set(r.label, (ms.get(r.label) || 0) + r.ms);
  const rows = [...ms].map(([label, total]) => {
    const p = parts.get(label);
    return {
      Teil: label,
      ms: +(total / good.size).toFixed(3),
      Aufrufe: p ? +(p.draws / frameNo).toFixed(1) : null,
      'Dreiecke Tsd.': p ? +(p.tris / frameNo / 1000).toFixed(1) : null,
    };
  });
  rows.sort((a, b) => b.ms - a.ms);
  const total = +rows.reduce((s, row) => s + row.ms, 0).toFixed(2);
  return { point, ref, total, frames: good.size, queries: +(queries / frameNo).toFixed(1), covered: covered.seen, rows, materials };
}

// tram: Lage der Pferdebahn (loc.tramStage in tramline.js): 'end' an der Endstelle, 'away' fort,
// null nach Fahrplan. traffic: 'start' hält Passanten und Droschke dort, wo sie beim Laden standen,
// null lässt sie laufen. freeze: im Standbild messen; vor jedem Punkt läuft die Zeit noch kurz weiter,
// damit sich Rangliste der Lichter und Augenanpassung auf den neuen Standpunkt einstellen.
export async function measure(game, { seconds = 2, warmup = 0.8, points = POINTS, tram = 'end', traffic = 'start', freeze = true } = {}) {
  const { view } = game;
  // Gleich nach dem Laden übersetzt der Treiber noch die Shader der Räume (main.js); das kostet
  // jedes Bild 0,5–1 ms und verfälschte die ersten Punkte.
  await game.roomsReady;
  const loc = game.locations.berlin;
  if (tram) loc.tramStage?.(tram);
  if (traffic) loc.trafficStage?.(traffic);
  view.lockScale(1);
  let record = null;
  view.onTiming = ({ label, ms }) => {
    if (!record) return;
    record.sum[label] = (record.sum[label] || 0) + ms;
    record.n[label] = (record.n[label] || 0) + 1;
  };
  const rows = [];
  // Der erste Punkt lag sonst 1–2 ms zu hoch: Gleich nach dem Betreten läuft der Ort noch an.
  let first = true;
  try {
    for (const [name, x, z, yaw] of points) {
      stand(game, x, z, yaw);
      await frames(first ? warmup + 3 : warmup);
      first = false;
      let fps = 0;
      let r = null;
      for (let tries = 0; tries < 3; tries++) {
        game.freeze = freeze;
        covered.reset();
        record = { sum: {}, n: {} };
        fps = await frames(seconds);
        r = record;
        record = null;
        game.freeze = false;
        if (!covered.seen) break;
        // Nach dem Aufdecken braucht die Grafik einen Moment, bis sie wieder hochtaktet.
        r = null;
        while (document.visibilityState !== 'visible') await new Promise((res) => setTimeout(res, 250));
        await frames(1.5);
      }
      // Blieb die Seite dreimal verdeckt, bleiben die Werte leer (null).
      const row = { Ort: name, 'GPU ms': null, ...Object.fromEntries(STAGES.map((stage) => [stage, null])), FPS: null, Aufrufe: null, 'Dreiecke Tsd.': null };
      if (r) {
        let sum = 0;
        for (const stage of STAGES) {
          const avg = r.n[stage] ? r.sum[stage] / r.n[stage] : 0;
          row[stage] = +avg.toFixed(2);
          sum += avg;
        }
        row['GPU ms'] = +sum.toFixed(2);
        row.FPS = Math.round(fps);
        row.Aufrufe = view.sceneInfo.calls;
        row['Dreiecke Tsd.'] = Math.round(view.sceneInfo.triangles / 1000);
      }
      rows.push(row);
    }
  } finally {
    game.freeze = false;
    if (tram) loc.tramStage?.('free');
    if (traffic) loc.trafficStage?.('free');
    view.onTiming = null;
    view.lockScale(null);
  }
  const done = rows.filter((row) => row['GPU ms'] !== null);
  const mean = (key) => +(done.reduce((sum, row) => sum + row[key], 0) / Math.max(1, done.length)).toFixed(2);
  const max = (key) => Math.max(...done.map((row) => row[key]));
  const summary = { 'GPU ms Mittel': mean('GPU ms'), 'GPU ms Höchst': max('GPU ms'), 'Aufrufe Höchst': max('Aufrufe'), 'Dreiecke Tsd. Höchst': max('Dreiecke Tsd.') };
  if (done.length < rows.length) summary.verdeckt = rows.length - done.length;
  return { rows, summary };
}

export async function showMeasure(game) {
  const panel = document.createElement('div');
  panel.id = 'messung';
  panel.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;max-width:calc(100vw - 24px);max-height:80vh;overflow:auto;padding:12px 14px;background:rgba(18,16,14,.94);color:#e8e0cc;font:13px/1.45 system-ui,sans-serif;border:1px solid #6a5a3a;border-radius:6px';
  panel.textContent = 'Messung läuft …';
  document.body.append(panel);
  // ?messen=1080 rechnet in 1920 Pixel Breite, gleich wie groß das Fenster ist (Vollbild am Zielgerät).
  if (new URLSearchParams(location.search).get('messen') === '1080') {
    game.view.pixelRatio = 1920 / innerWidth;
    game.view.resize();
  }
  const { width, height } = game.view.renderer.domElement;
  const result = await measure(game);
  window.__messung = result;
  console.table(result.rows);
  console.info('Messung', { Auflösung: `${width}×${height}`, ...result.summary });

  const cols = Object.keys(result.rows[0]);
  const table = document.createElement('table');
  table.style.cssText = 'border-collapse:collapse;font-variant-numeric:tabular-nums';
  const cell = (tag, text) => {
    const c = document.createElement(tag);
    c.textContent = text;
    c.style.cssText = 'padding:2px 8px;text-align:right;border-bottom:1px solid #3a3226';
    return c;
  };
  const head = document.createElement('tr');
  for (const c of cols) head.append(cell('th', c));
  table.append(head);
  for (const row of result.rows) {
    const tr = document.createElement('tr');
    for (const c of cols) tr.append(cell('td', row[c] ?? 'verdeckt'));
    table.append(tr);
  }
  const summary = Object.entries(result.summary).map(([k, v]) => `${k}: ${v}`).join(' · ');
  panel.replaceChildren(`Messung bei ${width}×${height}, volle Auflösung, Pferdebahn an der Endstelle, Verkehr angehalten, im Standbild · ${summary}`, table);
  const close = document.createElement('button');
  close.textContent = 'Schließen';
  close.style.cssText = 'margin-top:8px;padding:2px 10px;cursor:pointer';
  close.onclick = () => {
    panel.remove();
    game.showTitle();
  };
  panel.append(close);
}
