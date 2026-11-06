// Entwicklerwerkzeug: http://localhost:5173/?messen fährt feste Standpunkte in Berlin ab und
// misst bei voller Auflösung die GPU-Zeit je Durchgang, die Bildrate, Zeichenaufrufe und Dreiecke.
// Der Browserbereich muss dabei sichtbar sein, sonst drosselt der Browser die Bilder.

import { STAGES } from '../engine/view.js';

// Name, x, z, Blickrichtung (0 = Norden, die Rosenthaler Straße hinauf).
export const POINTS = [
  ['Start', 0, 10, 0],
  ['Platz', 0, -10, 0.6],
  ['Markt', -12, -4, Math.PI / 2],
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

async function frames(seconds) {
  const start = performance.now();
  let count = 0;
  while (performance.now() - start < seconds * 1000) {
    await frame();
    count++;
  }
  return count / ((performance.now() - start) / 1000);
}

export async function measure(game, { seconds = 2, warmup = 0.8, points = POINTS } = {}) {
  const { view } = game;
  view.lockScale(1);
  let record = null;
  view.onTiming = ({ label, ms }) => {
    if (!record) return;
    record.sum[label] = (record.sum[label] || 0) + ms;
    record.n[label] = (record.n[label] || 0) + 1;
  };
  const rows = [];
  try {
    for (const [name, x, z, yaw] of points) {
      game.mode = 'pause';
      game.ui.clear();
      game.ui.setHud(false);
      game.enter('berlin', { pos: [x, 0, z], yaw });
      game.player.pitch = 0;
      game.player.apply();
      view.fade = 0;
      view.fadeTarget = 0;
      await frames(warmup);
      record = { sum: {}, n: {} };
      const fps = await frames(seconds);
      const r = record;
      record = null;
      const row = { Ort: name, 'GPU ms': 0 };
      for (const stage of STAGES) {
        const avg = r.n[stage] ? r.sum[stage] / r.n[stage] : 0;
        row[stage] = +avg.toFixed(2);
        row['GPU ms'] += avg;
      }
      row['GPU ms'] = +row['GPU ms'].toFixed(2);
      row.FPS = Math.round(fps);
      row.Aufrufe = view.sceneInfo.calls;
      row['Dreiecke Tsd.'] = Math.round(view.sceneInfo.triangles / 1000);
      rows.push(row);
    }
  } finally {
    view.onTiming = null;
    view.lockScale(null);
  }
  const mean = (key) => +(rows.reduce((sum, row) => sum + row[key], 0) / rows.length).toFixed(2);
  const max = (key) => Math.max(...rows.map((row) => row[key]));
  return { rows, summary: { 'GPU ms Mittel': mean('GPU ms'), 'GPU ms Höchst': max('GPU ms'), 'Aufrufe Höchst': max('Aufrufe'), 'Dreiecke Tsd. Höchst': max('Dreiecke Tsd.') } };
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
    for (const c of cols) tr.append(cell('td', row[c]));
    table.append(tr);
  }
  const summary = Object.entries(result.summary).map(([k, v]) => `${k}: ${v}`).join(' · ');
  panel.replaceChildren(`Messung bei ${width}×${height}, volle Auflösung · ${summary}`, table);
  const close = document.createElement('button');
  close.textContent = 'Schließen';
  close.style.cssText = 'margin-top:8px;padding:2px 10px;cursor:pointer';
  close.onclick = () => {
    panel.remove();
    game.showTitle();
  };
  panel.append(close);
}
