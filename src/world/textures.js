import * as THREE from 'three';

// Alle Texturen entstehen im Canvas. Keine Bilddateien, keine Lizenzfragen.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function tex(c, { repeat = 1, srgb = true } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

function grain(ctx, size, amount, seed) {
  const r = rng(seed);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amount;
    d[i] += n;
    d[i + 1] += n;
    d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function blotches(ctx, size, count, minR, maxR, color, seed) {
  const r = rng(seed);
  for (let i = 0; i < count; i++) {
    const x = r() * size;
    const y = r() * size;
    const rad = minR + r() * (maxR - minR);
    for (const ox of [-size, 0, size]) {
      for (const oy of [-size, 0, size]) {
        const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
      }
    }
  }
}

function normalFromHeight(source, strength = 2) {
  const w = source.width;
  const h = source.height;
  const src = source.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h);
  const octx = out.getContext('2d');
  const img = octx.createImageData(w, h);
  const d = img.data;
  const at = (x, y) => src[(((y + h) % h) * w + ((x + w) % w)) * 4];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = ((at(x + 1, y) - at(x - 1, y)) / 255) * strength;
      const dy = ((at(x, y + 1) - at(x, y - 1)) / 255) * strength;
      const l = 1 / Math.hypot(dx, dy, 1);
      const i = (y * w + x) * 4;
      d[i] = (-dx * l * 0.5 + 0.5) * 255;
      d[i + 1] = (dy * l * 0.5 + 0.5) * 255;
      d[i + 2] = (l * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  octx.putImageData(img, 0, 0);
  return out;
}

const cache = new Map();
function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// Nasses Granitpflaster in Reihen, 8 m pro Kachel (128 px/m): map, normalMap und roughnessMap
// aus einem Guss. Die Steine sind etwa 17 cm breit und 16 bis 27 cm lang, jede Reihe beginnt
// versetzt. Jeder Stein liegt ein wenig schief, damit sich Laternenlicht darauf in einzelne
// Glanzpunkte bricht; in den Fugen steht Wasser. Pfützen und großflächige Unterschiede kommen
// über streetWet() dazu, das in einem anderen Maß wiederholt.
export function cobble() {
  return cached('cobble', () => {
    const size = 1024;
    const color = canvas(size);
    const height = canvas(size);
    const rough = canvas(size);
    const c = color.getContext('2d');
    const h = height.getContext('2d');
    const rc = rough.getContext('2d');
    const r = rng(7);
    const gray = (v) => `rgb(${v | 0},${v | 0},${v | 0})`;
    c.fillStyle = '#100f0e';
    c.fillRect(0, 0, size, size);
    h.fillStyle = '#000';
    h.fillRect(0, 0, size, size);
    rc.fillStyle = gray(70);
    rc.fillRect(0, 0, size, size);
    const rows = 48;
    const rowH = size / rows;
    for (let row = 0; row < rows; row++) {
      const lens = [];
      let sum = 0;
      while (sum < size - 20) {
        const l = 20 + r() * 14;
        lens.push(l);
        sum += l;
      }
      const k = size / sum;
      let x = r() * size;
      const y0 = row * rowH;
      for (const len of lens) {
        const w = len * k;
        const j = () => (r() - 0.5) * 3;
        const top = y0 + 1.6 + r() * 1.2;
        const bottom = y0 + rowH - 1.6 - r() * 1.2;
        const pts = [
          [x + 1.6 + j(), top + j() * 0.5],
          [x + w - 1.6 + j(), top + j() * 0.5],
          [x + w - 1.6 + j(), bottom + j() * 0.5],
          [x + 1.6 + j(), bottom + j() * 0.5],
        ];
        // Granit: meist grau, einzelne Steine rötlich oder bläulich.
        const v = 46 + r() * 34;
        const kind = r();
        const [cr, cg, cb] = kind < 0.15 ? [v + 10, v + 2, v - 2] : kind < 0.3 ? [v - 3, v, v + 7] : [v + 2, v + 1, v];
        const cx = x + w / 2;
        const cy = (top + bottom) / 2;
        const a = r() * Math.PI * 2;
        const hv = 140 + r() * 80;
        const tilt = 20 + r() * 40;
        const grad = h.createLinearGradient(cx - Math.cos(a) * 12, cy - Math.sin(a) * 12, cx + Math.cos(a) * 12, cy + Math.sin(a) * 12);
        grad.addColorStop(0, gray(hv - tilt));
        grad.addColorStop(1, gray(hv + tilt));
        // Glatt gefahrene Steine glänzen mehr als raue.
        const fills = [[c, `rgb(${cr | 0},${cg | 0},${cb | 0})`], [h, grad], [rc, gray(85 + r() * 70)]];
        for (const ox of [0, -size]) {
          if (x + w + ox < 0 || x + ox > size) continue;
          for (const [ctx, fill] of fills) {
            ctx.save();
            ctx.translate(ox, 0);
            ctx.fillStyle = fill;
            ctx.beginPath();
            pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }
        }
        x += w;
      }
    }
    grain(c, size, 18, 3);
    blotches(c, size, 26, 30, 120, 'rgba(28,22,14,0.3)', 13);
    // Kanten der Steine leicht runden: die Höhe weichzeichnen, über den Kachelrand hinweg.
    const pad = 8;
    const wrap = canvas(size + pad * 2);
    const wc = wrap.getContext('2d');
    for (const ox of [-1, 0, 1]) for (const oy of [-1, 0, 1]) wc.drawImage(height, pad + ox * size, pad + oy * size);
    const soft = canvas(size);
    const sc = soft.getContext('2d');
    sc.filter = 'blur(1.6px)';
    sc.drawImage(wrap, -pad, -pad);
    return {
      map: tex(color),
      normalMap: tex(normalFromHeight(soft, 3), { srgb: false }),
      roughnessMap: tex(rough, { srgb: false }),
    };
  });
}

// Großflächige Unterschiede auf der Fahrbahn, 37 m pro Kachel und damit gegen das Muster der
// Steine versetzt: Rot ist Pfütze, Grün Schmutz und Nässe (128 = neutral).
export function streetWet() {
  return cached('streetWet', () => {
    const size = 512;
    const cv = canvas(size);
    const c = cv.getContext('2d');
    c.fillStyle = 'rgb(0,128,0)';
    c.fillRect(0, 0, size, size);
    blotches(c, size, 40, 30, 110, 'rgba(0,210,0,0.25)', 41);
    blotches(c, size, 40, 30, 110, 'rgba(0,40,0,0.3)', 43);
    // Pfützen: jeweils ein paar sich überlagernde Flecken, im Shader scharf abgeschnitten.
    c.globalCompositeOperation = 'lighter';
    const r = rng(47);
    for (let i = 0; i < 14; i++) {
      const x = r() * size;
      const y = r() * size;
      const n = 3 + Math.floor(r() * 5);
      for (let k = 0; k < n; k++) {
        const px = x + (r() - 0.5) * 40;
        const py = y + (r() - 0.5) * 25;
        const rad = 6 + r() * 16;
        for (const ox of [-size, 0, size]) {
          for (const oy of [-size, 0, size]) {
            const g = c.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, rad);
            g.addColorStop(0, 'rgba(255,0,0,0.9)');
            g.addColorStop(1, 'rgba(255,0,0,0)');
            c.fillStyle = g;
            c.fillRect(px + ox - rad, py + oy - rad, rad * 2, rad * 2);
          }
        }
      }
    }
    c.globalCompositeOperation = 'source-over';
    return tex(cv, { srgb: false });
  });
}

// Gehweg: Granitplatten, dazwischen das Berliner Mosaikpflaster.
export function pavement() {
  return cached('pavement', () => {
    const size = 512;
    const color = canvas(size);
    const height = canvas(size);
    const c = color.getContext('2d');
    const h = height.getContext('2d');
    const r = rng(23);
    c.fillStyle = '#3a3a3c';
    c.fillRect(0, 0, size, size);
    h.fillStyle = '#909090';
    h.fillRect(0, 0, size, size);
    for (let i = 0; i < 2600; i++) {
      const x = r() * size;
      const y = r() * size;
      const v = 40 + r() * 42;
      c.fillStyle = `rgb(${v},${v},${v + 2})`;
      c.fillRect(x, y, 6, 6);
      h.fillStyle = `rgb(${110 + r() * 80},0,0)`;
      h.fillRect(x, y, 6, 6);
    }
    for (let i = 0; i < 2; i++) {
      const y = 40 + i * 256;
      c.fillStyle = '#505054';
      c.fillRect(0, y, size, 170);
      h.fillStyle = '#b0b0b0';
      h.fillRect(0, y, size, 170);
      c.fillStyle = '#17171a';
      h.fillStyle = '#000';
      c.fillRect(0, y, size, 3);
      c.fillRect(0, y + 168, size, 3);
      h.fillRect(0, y, size, 3);
      h.fillRect(0, y + 168, size, 3);
      for (let x = (i * 90) % 170; x < size; x += 170) {
        c.fillRect(x, y, 3, 170);
        h.fillRect(x, y, 3, 170);
      }
    }
    grain(c, size, 18, 5);
    blotches(c, size, 10, 30, 110, 'rgba(8,10,14,0.5)', 9);
    return { map: tex(color), normalMap: tex(normalFromHeight(height, 1.4), { srgb: false }) };
  });
}

// Putz, hell gehalten: die Farbe kommt pro Haus über instanceColor dazu.
export function plaster() {
  return cached('plaster', () => {
    const size = 512;
    const color = canvas(size);
    const height = canvas(size);
    const c = color.getContext('2d');
    const h = height.getContext('2d');
    c.fillStyle = '#d8d8d8';
    c.fillRect(0, 0, size, size);
    h.fillStyle = '#808080';
    h.fillRect(0, 0, size, size);
    blotches(c, size, 26, 30, 120, 'rgba(60,60,60,0.18)', 31);
    blotches(c, size, 16, 15, 70, 'rgba(255,255,255,0.1)', 32);
    blotches(h, size, 70, 4, 26, 'rgba(255,255,255,0.14)', 33);
    grain(c, size, 16, 34);
    grain(h, size, 46, 35);
    return { map: tex(color), normalMap: tex(normalFromHeight(height, 1.2), { srgb: false }) };
  });
}

export function brick() {
  return cached('brick', () => {
    const size = 512;
    const color = canvas(size);
    const height = canvas(size);
    const c = color.getContext('2d');
    const h = height.getContext('2d');
    const r = rng(41);
    c.fillStyle = '#2c2522';
    c.fillRect(0, 0, size, size);
    h.fillStyle = '#000';
    h.fillRect(0, 0, size, size);
    const bh = 16;
    const bw = 64;
    for (let row = 0; row * bh < size; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let i = -1; i * bw < size; i++) {
        const v = r();
        c.fillStyle = `rgb(${96 + v * 50},${46 + v * 22},${34 + v * 16})`;
        c.fillRect(i * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
        h.fillStyle = `rgb(${160 + r() * 90},0,0)`;
        h.fillRect(i * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
    grain(c, size, 20, 42);
    blotches(c, size, 16, 30, 100, 'rgba(10,8,8,0.45)', 43);
    return { map: tex(color), normalMap: tex(normalFromHeight(height, 1.8), { srgb: false }) };
  });
}

// Quaimauer aus Granitquadern. Eine Kachel ist 4 × 4 m groß, ihre Oberkante ist die Quaikante. Der
// Streifen um die Wasserlinie (`water` Meter unter der Kante) ist nass und dunkel, darunter grünlich.
export function quayStone(water = 2.7) {
  return cached(`quay${water}`, () => {
    const size = 512;
    const px = size / 4;
    const color = canvas(size);
    const height = canvas(size);
    const c = color.getContext('2d');
    const h = height.getContext('2d');
    const r = rng(47);
    c.fillStyle = '#1c1c1e';
    c.fillRect(0, 0, size, size);
    h.fillStyle = '#000';
    h.fillRect(0, 0, size, size);
    // Schichten zu 0,5 m, Quader 0,9 bis 1,6 m lang; was rechts überragt, erscheint links wieder.
    const row = px / 2;
    for (let y = 0; y < size; y += row) {
      let x = r() * px;
      const end = x + size;
      while (x < end) {
        const w = Math.min(px * (0.9 + r() * 0.7), end - x);
        const v = 70 + r() * 34;
        c.fillStyle = `rgb(${v + 4},${v + 2},${v})`;
        h.fillStyle = `rgb(${170 + r() * 70},0,0)`;
        for (const ox of [0, -size]) {
          c.fillRect(x + ox + 2, y + 2, w - 4, row - 4);
          h.fillRect(x + ox + 2, y + 2, w - 4, row - 4);
        }
        x += w;
      }
    }
    grain(c, size, 22, 48);
    blotches(c, size, 14, 30, 90, 'rgba(10,10,12,0.4)', 49);
    // Nasser Streifen und Algen um die Wasserlinie. Die Kachel wiederholt sich nur waagerecht.
    const line = water * px;
    const wet = c.createLinearGradient(0, line - px * 0.6, 0, size);
    wet.addColorStop(0, 'rgba(6,8,8,0)');
    wet.addColorStop(0.35, 'rgba(6,8,8,0.55)');
    wet.addColorStop(0.5, 'rgba(10,16,10,0.75)');
    wet.addColorStop(1, 'rgba(8,12,8,0.85)');
    c.fillStyle = wet;
    c.fillRect(0, line - px * 0.6, size, size);
    // Rinnspuren unter den Fugen.
    for (let i = 0; i < 40; i++) {
      const x = r() * size;
      const top = r() * line * 0.8;
      const g = c.createLinearGradient(0, top, 0, line);
      g.addColorStop(0, 'rgba(8,8,10,0)');
      g.addColorStop(1, 'rgba(8,8,10,0.35)');
      c.fillStyle = g;
      c.fillRect(x, top, 2 + r() * 5, line - top);
    }
    return { map: tex(color), normalMap: tex(normalFromHeight(height, 1.6), { srgb: false }) };
  });
}

export function slate() {
  return cached('slate', () => {
    const size = 256;
    const color = canvas(size);
    const c = color.getContext('2d');
    const r = rng(51);
    c.fillStyle = '#16181c';
    c.fillRect(0, 0, size, size);
    for (let row = 0; row < 16; row++) {
      for (let i = -1; i < 16; i++) {
        const v = 34 + r() * 22;
        c.fillStyle = `rgb(${v},${v + 3},${v + 8})`;
        c.fillRect(i * 16 + (row % 2) * 8 + 1, row * 16 + 1, 14, 14);
      }
    }
    return { map: tex(color) };
  });
}

export function wood(tone = [92, 58, 34], seed = 61) {
  return cached(`wood${tone}${seed}`, () => {
    const size = 512;
    const color = canvas(size);
    const c = color.getContext('2d');
    const r = rng(seed);
    const [a, b, d] = tone;
    const plank = 64;
    // Fugenfarbe als Grund: sonst bleibt die Fuge durchsichtig und das Korn
    // darüber erscheint nach dem Upload als helle Sprenkel.
    c.fillStyle = `rgb(${a * 0.18},${b * 0.18},${d * 0.18})`;
    c.fillRect(0, 0, size, size);
    for (let i = 0; i * plank < size; i++) {
      const v = 0.75 + r() * 0.35;
      c.fillStyle = `rgb(${a * v},${b * v},${d * v})`;
      c.fillRect(i * plank, 0, plank - 2, size);
      for (let k = 0; k < 26; k++) {
        c.strokeStyle = `rgba(20,10,4,${0.05 + r() * 0.16})`;
        c.lineWidth = 0.5 + r() * 1.4;
        const x = i * plank + r() * plank;
        c.beginPath();
        c.moveTo(x, 0);
        c.bezierCurveTo(x + r() * 8 - 4, size * 0.3, x + r() * 8 - 4, size * 0.6, x, size);
        c.stroke();
      }
    }
    grain(c, size, 10, seed + 1);
    return { map: tex(color) };
  });
}

// Tapete mit Rankenmuster, typisch für die Berliner Stube.
export function wallpaper(base = '#4b2f2c', motif = 'rgba(190,150,90,0.2)', seed = 71) {
  return cached(`paper${base}${motif}`, () => {
    const size = 512;
    const color = canvas(size);
    const c = color.getContext('2d');
    c.fillStyle = base;
    c.fillRect(0, 0, size, size);
    c.strokeStyle = motif;
    c.fillStyle = motif;
    c.lineWidth = 2.5;
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 128 + (row % 2) * 64;
        const y = row * 128 + 64;
        c.beginPath();
        c.moveTo(x, y - 46);
        c.bezierCurveTo(x + 40, y - 30, x + 32, y + 18, x, y + 46);
        c.bezierCurveTo(x - 32, y + 18, x - 40, y - 30, x, y - 46);
        c.stroke();
        c.beginPath();
        c.arc(x, y, 8, 0, 7);
        c.fill();
      }
    }
    grain(c, size, 12, seed);
    blotches(c, size, 8, 40, 120, 'rgba(0,0,0,0.16)', seed + 1);
    return { map: tex(color) };
  });
}

// Weicher Lichtfleck für Laternen, Nebel und Lichtkegel auf dem Pflaster.
export function softDisc(key = 'disc', inner = 'rgba(255,255,255,1)', mid = 'rgba(255,255,255,0.28)') {
  return cached(key, () => {
    const size = 128;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, inner);
    g.addColorStop(0.35, mid);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

export function fogPuff() {
  return cached('fog', () => {
    const size = 256;
    const c = canvas(size);
    const ctx = c.getContext('2d');
    const r = rng(81);
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28;
      const d = r() * 70;
      const x = 128 + Math.cos(a) * d;
      const y = 128 + Math.sin(a) * d;
      const rad = 28 + r() * 50;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      g.addColorStop(0, 'rgba(255,255,255,0.09)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Beschriftung für Ladenschilder und Plakate.
export function signTexture(lines, {
  width = 1024,
  height = 192,
  bg = '#1a2a22',
  fg = '#d8b56a',
  border = true,
  font = '"UnifrakturMaguntia", serif',
  size = 104,
  sub = 0.5,
} = {}) {
  const c = canvas(width, height);
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  if (border) {
    ctx.strokeStyle = fg;
    ctx.lineWidth = 5;
    ctx.strokeRect(12, 12, width - 24, height - 24);
  }
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const list = Array.isArray(lines) ? lines : [lines];
  list.forEach((line, i) => {
    const s = i === 0 ? size : size * sub;
    ctx.font = `${s}px ${i === 0 ? font : '"EB Garamond", serif'}`;
    const y = height / 2 + (i - (list.length - 1) / 2) * (list.length > 1 ? height * 0.42 : 0);
    ctx.fillText(line, width / 2, y, width - 60);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Litfaßsäule: abgewickelte Plakatwand mit Anschlägen der Zeit.
// Seitenverhältnis wie die Plakatfläche der Säule (Umfang 5,34 m zu 3,1 m Höhe), sonst wird
// alles in die Höhe gezogen. Große Anschläge kleben über alten, halb abgerissenen; oben und unten
// kleine Zettel. Das Extrablatt (Hinweis in Fall 1) liegt bei u ≈ 0,19 und zeigt so zum Platz.
export function posterWall() {
  return cached('posters', () => {
    const w = 2048;
    const h = 1190;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(91);
    const GROUND = '#57503f';
    const FRAKTUR = '"UnifrakturMaguntia", serif';
    const SERIF = '"EB Garamond", serif';
    ctx.fillStyle = GROUND;
    ctx.fillRect(0, 0, w, h);
    // Reste älterer Anschläge, verblichen und überklebt.
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `hsla(${25 + r() * 25}, ${12 + r() * 22}%, ${38 + r() * 22}%, ${0.35 + r() * 0.3})`;
      ctx.fillRect(r() * w, r() * h, 60 + r() * 260, 60 + r() * 420);
    }

    // Ein Anschlag in Hauskoordinaten des Blatts: Grund, Rahmen, Zeilen, mitunter eine abgerissene Ecke.
    const sheet = (x, y, pw, ph, bg, fg, lines, { frame = true, torn = 0 } = {}) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 0.025);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, pw, ph);
      // Kleisterfalten: blasse Streifen quer übers Papier.
      for (let k = 0; k < 3; k++) {
        ctx.fillStyle = `rgba(255,250,235,${0.04 + r() * 0.05})`;
        ctx.fillRect(0, r() * ph, pw, 2 + r() * 5);
      }
      ctx.fillStyle = fg;
      ctx.strokeStyle = fg;
      if (frame) {
        ctx.lineWidth = Math.max(2, pw * 0.012);
        ctx.strokeRect(pw * 0.05, pw * 0.05, pw * 0.9, ph - pw * 0.1);
      }
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [text, font, size, at] of lines) {
        if (text === '—') {
          ctx.fillRect(pw * 0.2, ph * at, pw * 0.6, Math.max(2, size * 0.08));
          continue;
        }
        ctx.font = `${size}px ${font === 'f' ? FRAKTUR : SERIF}`;
        ctx.fillText(text, pw / 2, ph * at, pw * 0.86);
      }
      if (torn) {
        // Abgerissene Ecke unten rechts oder oben links, mit gezacktem Rand.
        const down = r() < 0.6;
        const tw = pw * (0.25 + r() * 0.35) * torn;
        const th = ph * (0.15 + r() * 0.25) * torn;
        ctx.fillStyle = GROUND;
        ctx.beginPath();
        if (down) {
          ctx.moveTo(pw + 2, ph - th);
          for (let s = 0; s <= 8; s++) ctx.lineTo(pw - (tw * s) / 8 + (r() - 0.5) * 8, ph - th + (th * s) / 8 + (r() - 0.5) * 10);
          ctx.lineTo(pw + 2, ph + 2);
        } else {
          ctx.moveTo(-2, th);
          for (let s = 0; s <= 8; s++) ctx.lineTo((tw * s) / 8 + (r() - 0.5) * 8, th - (th * s) / 8 + (r() - 0.5) * 10);
          ctx.lineTo(-2, -2);
        }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    // Große Anschläge, von links nach rechts. [Breite, Grund, Schrift, Zeilen, abgerissen]
    const posters = [
      [226, '#d9c9a0', '#222', [['Wintergarten', 'f', 50, 0.16], ['Varieté', 's', 34, 0.3], ['—', 0, 30, 0.38], ['Täglich 8 Uhr abends', 's', 22, 0.48], ['Kunstreiter · Gymnastiker', 's', 19, 0.6], ['Kunstradfahrer · Jongleure', 's', 19, 0.68]], 0],
      [306, '#b23a2c', '#f2e4c0', [['Extrablatt', 'f', 76, 0.14], ['—', 0, 40, 0.24], ['Bankhaus', 's', 34, 0.33], ['Lindner & Sohn', 'f', 52, 0.42], ['Außerordentliche Revision', 's', 28, 0.55], ['angeordnet durch den Aufsichtsrat', 's', 21, 0.63], ['Beginn: Montag, 14. November', 's', 25, 0.74], ['—', 0, 40, 0.84]], 0],
      [214, '#e5d8b0', '#1e2c3a', [['Urania', 'f', 58, 0.15], ['Sternwarte', 's', 30, 0.28], ['Invalidenstraße 57', 's', 20, 0.36], ['—', 0, 30, 0.44], ['Wissenschaftliches', 's', 22, 0.54], ['Theater', 's', 22, 0.6], ['Eine Reise zum Mond', 's', 21, 0.72]], 0.6],
      [236, '#26384a', '#e9d9a8', [['Schultheiss', 'f', 54, 0.22], ['—', 0, 30, 0.33], ['Lagerbier', 's', 36, 0.45], ['hell und dunkel', 's', 22, 0.56], ['Brauerei am Kreuzberg', 's', 19, 0.8]], 0],
      [222, '#e0cfa0', '#402010', [['Kaufhaus', 'f', 52, 0.14], ['N. Israel', 's', 32, 0.26], ['—', 0, 30, 0.34], ['Mäntel', 's', 30, 0.45], ['für den Winter', 's', 24, 0.53], ['Spandauer Straße', 's', 19, 0.8]], 0.8],
      [258, '#9a2f2a', '#f2e4c0', [['Königl. Oper', 'f', 50, 0.15], ['—', 0, 30, 0.25], ['Der fliegende', 's', 30, 0.36], ['Holländer', 'f', 48, 0.45], ['Romantische Oper von', 's', 20, 0.58], ['Richard Wagner', 's', 24, 0.65], ['Sonntag 7 Uhr', 's', 22, 0.8]], 0],
      [246, '#d9c9a0', '#222', [['Zirkus Renz', 'f', 48, 0.14], ['Karlstraße', 's', 26, 0.25], ['—', 0, 30, 0.32], ['Große Pferdedressur', 's', 24, 0.43], ['Clowns · Akrobaten', 's', 22, 0.52], ['Pantomime', 's', 30, 0.66]], 0.5],
      [228, '#3c4a30', '#e9d9a8', [['Bekanntmachung', 'f', 38, 0.12], ['—', 0, 30, 0.2], ['Kanalbau in der', 's', 22, 0.3], ['Rosenthaler Straße', 's', 24, 0.37], ['Die Straße bleibt', 's', 20, 0.5], ['bis auf Weiteres', 's', 20, 0.56], ['gesperrt.', 's', 20, 0.62], ['Der Magistrat', 's', 20, 0.82]], 0],
    ];
    let x = 6;
    const spans = [];
    for (const [pw, bg, fg, lines, torn] of posters) {
      const y = 170 + r() * 90;
      const ph = 640 + r() * 160;
      sheet(x, y, pw, ph, bg, fg, lines, { torn });
      spans.push({ x, pw, top: y, bottom: y + ph });
      x += pw + 4 + r() * 8;
    }

    // Kleine Zettel über und unter den großen Anschlägen.
    const bills = [
      ['Zimmer', 'zu vermieten'], ['Verloren', 'Dackel, braun'], ['Tanzstunde', 'Mittwochs'], ['Klavier-', 'unterricht'],
      ['Gesucht', 'Laufbursche'], ['Kohlen', 'frei Haus'], ['Schlafstelle', 'für Herren'], ['Näherin', 'empfiehlt sich'],
      ['Vortrag', 'Elektricität'], ['Gefunden', 'Regenschirm'], ['Bierhalle', 'Concert'], ['Wäscherei', 'Gebr. Stahl'],
    ];
    const tones = ['#e2d6b6', '#d6c9a6', '#e8dcc0', '#c9b98e', '#d9cfb8'];
    spans.forEach((s, i) => {
      const [a, b] = bills[i % bills.length];
      const bw = 96 + r() * 50;
      sheet(s.x + r() * (s.pw - bw), 18 + r() * 60, bw, 70 + r() * 40, tones[Math.floor(r() * tones.length)], '#2a2218', [[a, 'f', 22, 0.36], [b, 's', 15, 0.7]], { frame: false });
      const [c2, d2] = bills[(i + 5) % bills.length];
      const bw2 = 90 + r() * 60;
      sheet(s.x + r() * (s.pw - bw2), s.bottom + 14 + r() * 30, bw2, 80 + r() * 40, tones[Math.floor(r() * tones.length)], '#2a2218', [[c2, 'f', 22, 0.36], [d2, 's', 15, 0.7]], { frame: false, torn: r() < 0.4 ? 0.7 : 0 });
    });

    // Unten Spritzwasser und Straßenschmutz.
    const dirt = ctx.createLinearGradient(0, h - 170, 0, h);
    dirt.addColorStop(0, 'rgba(30,26,20,0)');
    dirt.addColorStop(1, 'rgba(30,26,20,0.7)');
    ctx.fillStyle = dirt;
    ctx.fillRect(0, h - 170, w, 170);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Urania-Säule, nach der Beschreibung in „Daheim“ vom 9. Juli 1892: unten Schaukästen unter Glas
// (Schmuck, Fahrplan, astronomische Angaben, geologische Karte) und in Augenhöhe der Meteorograph
// nach Aßmann, darüber Reklamebilder, die sich drehen, oben ein Himmelsglobus mit drei Uhren und
// der Mondphase.

const U_SERIF = '"EB Garamond", serif';
const U_FRAKTUR = '"UnifrakturMaguntia", serif';

// Reklamebilder: zwei Reihen zu je acht, jedes 256 × 680. Um die Säule läuft eine Reihe
// einmal herum, also genau acht Bilder zwischen den acht Sprossen.
export function uraniaAds() {
  return cached('uraniaAds', () => {
    const AW = 256;
    const AH = 680;
    const c = canvas(AW * 8, AH * 2);
    const ctx = c.getContext('2d');
    const ads = [
      ['#b8322a', '#f4e6c0', 'Kakao', ['entölt, leicht löslich', 'das Pfund 2 Mark 40'], 'cup'],
      ['#e8d48a', '#3a2412', 'Malzkaffee', ['gesund und billig', 'in allen Colonialwaren-', 'handlungen'], 'bean'],
      ['#22344e', '#f0dca0', 'Nähmaschinen', ['für Haus und Gewerbe', 'Theilzahlung gestattet'], 'wheel'],
      ['#f0e6cc', '#7a1a14', 'Lagerbier', ['Brauerei', 'Friedrichshöhe'], 'glass'],
      ['#2e5a3a', '#f2e8c8', 'Seife', ['Kernseife', 'Mandelseife', 'Veilchenseife'], 'bar'],
      ['#e7c35a', '#2a1a10', 'Sekt', ['trocken', 'Hoflieferant'], 'bottle'],
      ['#6a2a1e', '#f0d8a0', 'Cigarren', ['Havanna-Import', 'Spandauer Straße'], 'cigar'],
      ['#d8dde0', '#1c2a3a', 'Fahrräder', ['Hoch- und Niederräder', 'Unterricht gratis'], 'wheel'],
      ['#1c1c22', '#e8c870', 'Hut-Lager', ['Cylinder · Melonen', 'neueste Façons'], 'hat'],
      ['#f2e8d0', '#5a1a40', 'Pianos', ['kreuzsaitig', 'auch zur Miethe'], 'keys'],
      ['#3a4a6a', '#f0e0b0', 'Versicherung', ['Leben · Feuer', 'Aussteuer'], 'shield'],
      ['#c87a2a', '#20140c', 'Teppiche', ['Smyrna · Velours', 'Läufer'], 'rug'],
      ['#2a2a2a', '#e8e0c8', 'Photographie', ['Atelier im 4. Stock', 'Visitbilder 6 Stück 3 Mark'], 'camera'],
      ['#e6d8b8', '#202020', 'Kohlen', ['Briketts · Anthracit', 'frei Haus'], 'bar'],
      ['#3c6a7a', '#f2ead0', 'Mineralwasser', ['Selters', 'natürlich'], 'bottle'],
      ['#a83a5a', '#f6e8d0', 'Corsets', ['nach Maß', 'Leipziger Straße'], 'shield'],
    ];
    ads.forEach(([bg, fg, title, lines, icon], i) => {
      const x = (i % 8) * AW;
      const y = Math.floor(i / 8) * AH;
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, AW, AH);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 6;
      ctx.strokeRect(x + 14, y + 14, AW - 28, AH - 28);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 24, y + 24, AW - 48, AH - 48);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${title.length > 9 ? 40 : 54}px ${U_FRAKTUR}`;
      ctx.fillText(title, x + AW / 2, y + 110, AW - 50);
      ctx.fillRect(x + 50, y + 160, AW - 100, 3);
      // Bildchen in der Mitte, einfach und kräftig, damit es aus der Ferne noch zu erkennen ist.
      const cx = x + AW / 2;
      const cy = y + 320;
      ctx.lineWidth = 7;
      ctx.beginPath();
      if (icon === 'cup') {
        ctx.fillRect(cx - 55, cy - 40, 110, 90);
        ctx.arc(cx + 70, cy, 26, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
      } else if (icon === 'bean') {
        ctx.ellipse(cx, cy, 50, 75, 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (icon === 'wheel') {
        ctx.arc(cx, cy, 80, 0, Math.PI * 2);
        for (let k = 0; k < 8; k++) {
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos((k * Math.PI) / 4) * 80, cy + Math.sin((k * Math.PI) / 4) * 80);
        }
        ctx.stroke();
      } else if (icon === 'glass') {
        ctx.moveTo(cx - 50, cy - 80);
        ctx.lineTo(cx + 50, cy - 80);
        ctx.lineTo(cx + 38, cy + 80);
        ctx.lineTo(cx - 38, cy + 80);
        ctx.fill();
      } else if (icon === 'bottle') {
        ctx.fillRect(cx - 32, cy - 20, 64, 110);
        ctx.fillRect(cx - 12, cy - 90, 24, 72);
      } else if (icon === 'cigar') {
        ctx.ellipse(cx, cy, 95, 22, -0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (icon === 'hat') {
        ctx.fillRect(cx - 45, cy - 80, 90, 120);
        ctx.fillRect(cx - 80, cy + 34, 160, 16);
      } else if (icon === 'keys') {
        for (let k = 0; k < 7; k++) ctx.strokeRect(cx - 84 + k * 24, cy - 60, 24, 120);
        for (const k of [0, 1, 3, 4, 5]) ctx.fillRect(cx - 70 + k * 24, cy - 60, 14, 70);
      } else if (icon === 'shield') {
        ctx.moveTo(cx - 70, cy - 80);
        ctx.lineTo(cx + 70, cy - 80);
        ctx.lineTo(cx + 70, cy);
        ctx.quadraticCurveTo(cx + 60, cy + 70, cx, cy + 95);
        ctx.quadraticCurveTo(cx - 60, cy + 70, cx - 70, cy);
        ctx.closePath();
        ctx.stroke();
      } else if (icon === 'rug') {
        ctx.strokeRect(cx - 80, cy - 70, 160, 140);
        ctx.strokeRect(cx - 55, cy - 45, 110, 90);
        ctx.moveTo(cx, cy - 30);
        ctx.lineTo(cx + 30, cy);
        ctx.lineTo(cx, cy + 30);
        ctx.lineTo(cx - 30, cy);
        ctx.closePath();
        ctx.fill();
      } else if (icon === 'camera') {
        ctx.fillRect(cx - 70, cy - 50, 140, 100);
        ctx.fillStyle = bg;
        ctx.arc(cx, cy, 34, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = fg;
      } else {
        ctx.fillRect(cx - 80, cy - 40, 160, 80);
      }
      ctx.font = `26px ${U_SERIF}`;
      lines.forEach((line, k) => ctx.fillText(line, x + AW / 2, y + 470 + k * 40, AW - 50));
      ctx.font = `20px ${U_SERIF}`;
      ctx.fillText('Berlin', x + AW / 2, y + AH - 60);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  });
}

// Schaukästen im Unterbau, fünf Tafeln zu 256 × 384: Meteorograph, Fahrplan, Sonne und Mond,
// geologische Karte, Schmuck.
export function uraniaCases() {
  return cached('uraniaCases', () => {
    const PW = 256;
    const PH = 384;
    const c = canvas(PW * 5, PH);
    const ctx = c.getContext('2d');
    const r = rng(1892);
    const INK = '#2a2218';
    const paper = (i, bg = '#ece3cb') => {
      ctx.fillStyle = bg;
      ctx.fillRect(i * PW, 0, PW, PH);
    };
    const title = (i, text, sub) => {
      ctx.fillStyle = INK;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `26px ${U_SERIF}`;
      ctx.fillText(text, i * PW + PW / 2, 30, PW - 20);
      if (sub) {
        ctx.font = `15px ${U_SERIF}`;
        ctx.fillText(sub, i * PW + PW / 2, 54, PW - 20);
      }
      ctx.fillRect(i * PW + 30, 68, PW - 60, 2);
    };

    // 0: Meteorograph. Papierstreifen auf der Trommel, drei Federn: Wärme sinkt auf 4 Grad,
    // der Luftdruck fällt, die Feuchte steigt.
    paper(0, '#d8d2c2');
    title(0, 'Meteorograph', 'nach Dr. Aßmann');
    ctx.fillStyle = '#f4efe0';
    ctx.fillRect(18, 84, PW - 60, 270);
    ctx.strokeStyle = 'rgba(60,80,120,0.35)';
    ctx.lineWidth = 1;
    for (let y = 96; y < 350; y += 14) {
      ctx.beginPath();
      ctx.moveTo(18, y);
      ctx.lineTo(PW - 42, y);
      ctx.stroke();
    }
    ctx.font = `12px ${U_SERIF}`;
    ctx.fillStyle = INK;
    ['6', '7', '8', '9', '10'].forEach((h, k) => {
      const x = 30 + k * 44;
      ctx.fillRect(x, 84, 1, 270);
      ctx.fillText(h, x, 364);
    });
    const trace = (color, y0, y1, wobble) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let x = 20; x <= 200; x += 4) {
        const k = (x - 20) / 180;
        const y = y0 + (y1 - y0) * k + Math.sin(x * 0.17) * wobble + (r() - 0.5) * wobble;
        if (x === 20) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(200, y1 - 4, 34, 8);
    };
    trace('#b0261e', 140, 172, 2);
    trace('#24447a', 220, 262, 1.5);
    trace('#222', 320, 290, 3);
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(PW - 40, 84, 22, 270);

    // 1: Fahrplan der Stadtbahn ab Börse.
    paper(1);
    title(1, 'Stadtbahn', 'Abfahrt Bahnhof Börse');
    ctx.font = `17px ${U_SERIF}`;
    ctx.textAlign = 'left';
    const rows = [['9.44', 'Charlottenburg'], ['9.47', 'Schles. Bahnhof'], ['9.52', 'Westend'], ['9.58', 'Stralau-Rummelsb.'], ['10.04', 'Grunewald'], ['10.09', 'Schles. Bahnhof'], ['10.14', 'Charlottenburg'], ['10.21', 'Potsdam']];
    rows.forEach(([time, to], k) => {
      ctx.fillText(time, PW + 22, 96 + k * 32);
      ctx.fillText(to, PW + 82, 96 + k * 32, PW - 96);
      ctx.fillRect(PW + 20, 112 + k * 32, PW - 40, 1);
    });

    // 2: Sonne und Mond am 12. November.
    paper(2);
    title(2, 'Sonne und Mond', '12. November 1892');
    ctx.font = `18px ${U_SERIF}`;
    ctx.textAlign = 'center';
    const astro = ['Sonnenaufgang 7 Uhr 25', 'Sonnenuntergang 4 Uhr 13', 'Tageslänge 8 St. 48 Min.', '', 'Letztes Viertel heute', 'Neumond am 19.', '', 'Venus am Morgenhimmel'];
    astro.forEach((line, k) => ctx.fillText(line, PW * 2 + PW / 2, 100 + k * 30, PW - 30));
    ctx.beginPath();
    ctx.arc(PW * 2 + PW / 2, 350, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#c8a040';
    ctx.fill();

    // 3: Geologische Übersichtskarte, Flecken in Farben der Formationen, darunter die Legende.
    paper(3);
    title(3, 'Geologische Karte', 'Umgegend von Berlin');
    const soils = [['#e4c98a', 'Diluvialsand'], ['#b9c27a', 'Geschiebemergel'], ['#8fb6c8', 'Alluvium'], ['#c88a6a', 'Tertiär']];
    for (let k = 0; k < 26; k++) {
      ctx.fillStyle = soils[Math.floor(r() * soils.length)][0];
      ctx.beginPath();
      ctx.ellipse(PW * 3 + 30 + r() * 196, 90 + r() * 170, 14 + r() * 30, 10 + r() * 22, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = '#3a5a7a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(PW * 3 + 20, 200);
    ctx.bezierCurveTo(PW * 3 + 90, 170, PW * 3 + 150, 230, PW * 3 + 236, 190);
    ctx.stroke();
    ctx.font = `14px ${U_SERIF}`;
    ctx.textAlign = 'left';
    soils.forEach(([col, name], k) => {
      ctx.fillStyle = col;
      ctx.fillRect(PW * 3 + 26, 290 + k * 22, 18, 14);
      ctx.fillStyle = INK;
      ctx.fillText(name, PW * 3 + 52, 298 + k * 22);
    });

    // 4: Schmuck auf Samt, Ringe, Broschen, eine Taschenuhr.
    ctx.fillStyle = '#3a1420';
    ctx.fillRect(PW * 4, 0, PW, PH);
    const gold = (x, y, rad, w = 5) => {
      ctx.strokeStyle = '#e0bc60';
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.arc(PW * 4 + x, y, rad, 0, Math.PI * 2);
      ctx.stroke();
    };
    gold(70, 90, 22);
    gold(130, 80, 20);
    gold(190, 95, 22);
    ctx.fillStyle = '#e0bc60';
    ctx.beginPath();
    ctx.arc(PW * 4 + 128, 190, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2ead6';
    ctx.beginPath();
    ctx.arc(PW * 4 + 128, 190, 36, 0, Math.PI * 2);
    ctx.fill();
    for (const [x, y, col] of [[60, 270, '#c02a3a'], [128, 290, '#2a6ac0'], [196, 270, '#2a9a5a']]) {
      gold(x, y, 20, 4);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(PW * 4 + x, y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#e0bc60';
    ctx.font = `16px ${U_SERIF}`;
    ctx.textAlign = 'center';
    ctx.fillText('Juwelier Friedländer', PW * 4 + PW / 2, 350);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Himmelsglobus der Kuppel: Nachtblau mit goldenen Sternen, Gradnetz, Ekliptik und ein paar
// Sternbildern. Abwicklung 2 : 1 für die Kugel.
export function uraniaGlobe() {
  return cached('uraniaGlobe', () => {
    const W = 1024;
    const H = 512;
    const c = canvas(W, H);
    const ctx = c.getContext('2d');
    const r = rng(1609);
    ctx.fillStyle = '#16244a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(214,180,100,0.55)';
    ctx.lineWidth = 2;
    for (let k = 0; k <= 12; k++) {
      ctx.beginPath();
      ctx.moveTo((k * W) / 12, 0);
      ctx.lineTo((k * W) / 12, H);
      ctx.stroke();
    }
    for (let k = 1; k < 6; k++) {
      ctx.beginPath();
      ctx.moveTo(0, (k * H) / 6);
      ctx.lineTo(W, (k * H) / 6);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(230,200,120,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 8) {
      const y = H / 2 - Math.sin((x / W) * Math.PI * 2) * H * 0.13;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let k = 0; k < 420; k++) {
      const size = r() < 0.08 ? 4 + r() * 3 : 1.5 + r() * 2;
      ctx.fillStyle = `rgba(250,226,150,${0.5 + r() * 0.5})`;
      ctx.beginPath();
      ctx.arc(r() * W, r() * H, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const figure = (pts) => {
      ctx.strokeStyle = 'rgba(240,210,130,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      pts.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
      ctx.fillStyle = '#ffe6a0';
      for (const [x, y] of pts) {
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    figure([[120, 120], [160, 110], [200, 118], [236, 130], [244, 170], [296, 172], [300, 132], [236, 130]]);
    figure([[420, 90], [450, 120], [480, 96], [512, 124], [544, 100]]);
    figure([[650, 260], [680, 220], [700, 300], [730, 250], [760, 290]]);
    figure([[860, 330], [890, 300], [930, 320], [900, 360], [860, 330]]);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Mondphase auf der vierten Seite der Kuppel. Am 12. November 1892 ist der Mond 22 Tage alt,
// kurz nach dem letzten Viertel: abnehmend, gut zwei Fünftel beleuchtet, hell auf der linken Seite.
export function uraniaMoon() {
  return cached('uraniaMoon', () => {
    const S = 256;
    const c = canvas(S);
    const ctx = c.getContext('2d');
    const m = S / 2;
    ctx.fillStyle = '#2a2015';
    ctx.fillRect(0, 0, S, S);
    ctx.fillStyle = '#16244a';
    ctx.beginPath();
    ctx.arc(m, m, m - 2, 0, Math.PI * 2);
    ctx.fill();
    const r = rng(29);
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(250,226,150,${0.5 + r() * 0.5})`;
      ctx.fillRect(10 + r() * (S - 20), 10 + r() * (S - 20), 2, 2);
    }
    const R = m * 0.55;
    ctx.fillStyle = '#3a3a40';
    ctx.beginPath();
    ctx.arc(m, m, R, 0, Math.PI * 2);
    ctx.fill();
    // Beleuchtet: linke Hälfte, davon abgezogen eine Ellipse bis zur Lichtgrenze.
    const lit = 0.44;
    ctx.fillStyle = '#f2e2a8';
    ctx.beginPath();
    ctx.arc(m, m, R, Math.PI / 2, (Math.PI * 3) / 2);
    ctx.fill();
    ctx.fillStyle = '#3a3a40';
    ctx.beginPath();
    ctx.ellipse(m, m, R * (1 - 2 * lit), R, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c8a040';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(m, m, m - 4, 0, Math.PI * 2);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Kreide auf Schiefer: leicht verwischt, jeder Strich zweimal gezogen.
function chalkText(ctx, r, text, x, y, size, align = 'left') {
  ctx.font = `italic ${size}px "EB Garamond", serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  for (let k = 0; k < 3; k++) {
    ctx.fillStyle = `rgba(236,232,218,${k ? 0.22 : 0.72})`;
    ctx.fillText(text, x + (r() - 0.5) * 1.8, y + (r() - 0.5) * 1.8);
  }
}

function chalkGround(ctx, r, w, h) {
  ctx.fillStyle = '#1b201c';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 30; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 20 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, 'rgba(220,225,215,0.05)');
    g.addColorStop(1, 'rgba(220,225,215,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

// Preistafel einer Destille; darunter, was angeschrieben ist.
export function chalkboard(title, rows, debts = []) {
  return cached(`chalk:${title}`, () => {
    const w = 512;
    const h = 400;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(907);
    chalkGround(ctx, r, w, h);
    chalkText(ctx, r, title, w / 2, 38, 44, 'center');
    let y = 86;
    for (const [label, price] of rows) {
      chalkText(ctx, r, label, 44, y, 28);
      chalkText(ctx, r, price, w - 44, y, 28, 'right');
      ctx.font = 'italic 28px "EB Garamond", serif';
      const from = 44 + ctx.measureText(label).width + 10;
      const to = w - 44 - ctx.measureText(price).width - 10;
      ctx.fillStyle = 'rgba(236,232,218,0.4)';
      for (let x = from; x < to; x += 11) ctx.fillRect(x, y + 8, 2.4, 2.4);
      y += 31;
    }
    if (debts.length) {
      ctx.fillStyle = 'rgba(236,232,218,0.5)';
      ctx.fillRect(40, y - 6, w - 80, 2);
      chalkText(ctx, r, 'Angeschrieben:', 44, y + 22, 26);
      y += 56;
      for (const [who, sum] of debts) {
        chalkText(ctx, r, who, 64, y, 30);
        chalkText(ctx, r, sum, w - 44, y, 30, 'right');
        ctx.font = 'italic 30px "EB Garamond", serif';
        const sw = ctx.measureText(sum).width;
        ctx.fillStyle = 'rgba(236,232,218,0.6)';
        ctx.fillRect(w - 44 - sw - 4, y + 15, sw + 8, 2.5);
        ctx.fillRect(w - 44 - sw - 2, y + 21, sw + 6, 2.5);
        y += 34;
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Kreideschild am Fassboden.
export function chalkLabel(text) {
  return cached(`chalklabel:${text}`, () => {
    const c = canvas(128, 64);
    const ctx = c.getContext('2d');
    const r = rng(text.length * 31 + 7);
    chalkGround(ctx, r, 128, 64);
    chalkText(ctx, r, text, 64, 34, 26, 'center');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Ölbild in Goldrahmen: Abendlandschaft mit See und Bäumen, dunkel nachgedunkelt.
export function landscape(seed = 1) {
  return cached(`landscape:${seed}`, () => {
    const w = 384;
    const h = 256;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(seed * 53 + 11);
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#2a3038');
    sky.addColorStop(0.7, '#8a6a42');
    sky.addColorStop(1, '#c09050');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    // Ferne Hügel
    ctx.fillStyle = '#3a3a30';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.58);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * 0.55 - Math.sin(x * 0.02 + seed) * 10 - r() * 4);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.fill();
    // See mit Abglanz
    const lake = ctx.createLinearGradient(0, h * 0.6, 0, h * 0.78);
    lake.addColorStop(0, '#a07a48');
    lake.addColorStop(1, '#2a2a24');
    ctx.fillStyle = lake;
    ctx.fillRect(0, h * 0.6, w, h * 0.18);
    ctx.fillStyle = '#1e2016';
    ctx.fillRect(0, h * 0.78, w, h * 0.22);
    // Baumgruppen
    for (let i = 0; i < 70; i++) {
      const x = (i < 40 ? r() * w * 0.35 : w * 0.7 + r() * w * 0.3);
      const y = h * 0.35 + r() * h * 0.45;
      ctx.fillStyle = `rgba(${20 + r() * 20},${26 + r() * 20},${16 + r() * 10},0.8)`;
      ctx.beginPath();
      ctx.arc(x, y, 8 + r() * 18, 0, 7);
      ctx.fill();
    }
    // Firnis: alles etwas gelblich und dunkler zum Rand
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
    v.addColorStop(0, 'rgba(60,40,10,0)');
    v.addColorStop(1, 'rgba(20,12,4,0.7)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Notenblatt: fünf Systeme mit Notenköpfen, etwas vergilbt.
export function sheetMusic() {
  return cached('sheet', () => {
    const w = 256;
    const h = 340;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(271);
    ctx.fillStyle = '#e4dcc4';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#2a2420';
    ctx.font = 'italic 18px "EB Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Adagio', w / 2, 30);
    for (let s = 0; s < 6; s++) {
      const y0 = 56 + s * 48;
      for (let l = 0; l < 5; l++) ctx.fillRect(16, y0 + l * 5, w - 32, 1);
      for (let x = 34; x < w - 24; x += 12 + r() * 10) {
        const y = y0 - 4 + Math.floor(r() * 9) * 2.5;
        ctx.beginPath();
        ctx.ellipse(x, y, 3.2, 2.3, -0.4, 0, 7);
        ctx.fill();
        ctx.fillRect(x + 2.6, y - 16, 1, 16);
      }
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Angedeutete Spiegelung: dunkle Stube, Lichtschein der Lampe, Goldrahmen gegenüber, Glanzstreifen.
export function mirrorGlass() {
  return cached('mirror', () => {
    const w = 256;
    const h = 180;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2e221c');
    g.addColorStop(0.6, '#3a2620');
    g.addColorStop(0.62, '#1e1410');
    g.addColorStop(1, '#160e0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(176,138,58,0.35)';
    ctx.lineWidth = 4;
    ctx.strokeRect(150, 40, 70, 48);
    const glow = ctx.createRadialGradient(86, 30, 0, 86, 30, 70);
    glow.addColorStop(0, 'rgba(255,214,150,0.9)');
    glow.addColorStop(0.25, 'rgba(255,180,100,0.35)');
    glow.addColorStop(1, 'rgba(255,180,100,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(30,20,16,0.8)';
    ctx.fillRect(20, 70, 50, 110);
    ctx.save();
    ctx.rotate(-0.5);
    ctx.fillStyle = 'rgba(220,230,235,0.07)';
    ctx.fillRect(40, 120, 260, 16);
    ctx.fillRect(40, 150, 260, 6);
    ctx.restore();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Promotionsurkunde: Pergament mit Doppelrand, zentrierter Satz, rotes Siegel.
export function diploma() {
  return cached('diploma', () => {
    const w = 512;
    const h = 400;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(1888);
    ctx.fillStyle = '#e2d6b4';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) {
      const x = r() * w;
      const y = r() * h;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 + r() * 80);
      g.addColorStop(0, 'rgba(150,120,70,0.08)');
      g.addColorStop(1, 'rgba(150,120,70,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.strokeStyle = '#5a4428';
    ctx.lineWidth = 4;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(26, 26, w - 52, h - 52);
    ctx.fillStyle = '#3a2a18';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const line = (text, y, font) => {
      ctx.font = font;
      ctx.fillText(text, w / 2, y, w - 90);
    };
    line('Diploma', 82, '62px "UnifrakturMaguntia", serif');
    line('Universitas Turicensis', 140, '28px "EB Garamond", serif');
    line('Doctorem medicinae', 182, 'italic 26px "EB Garamond", serif');
    line('Henriette Voss', 236, '40px "UnifrakturMaguntia", serif');
    line('summa cum laude · MDCCCLXXXVIII', 288, 'italic 22px "EB Garamond", serif');
    // Unterschrift und Siegel
    ctx.strokeStyle = '#2a2018';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(90, 340);
    for (let x = 90; x < 200; x += 6) ctx.lineTo(x, 340 - Math.sin(x * 0.2) * 6 - (x % 18 === 0 ? 5 : 0));
    ctx.stroke();
    ctx.fillRect(84, 350, 130, 1);
    ctx.fillStyle = '#8a2018';
    ctx.beginPath();
    ctx.arc(w - 120, 338, 26, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#5a140e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w - 120, 338, 19, 0, 7);
    ctx.stroke();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Ölportrait des Firmengründers: dunkler Grund, schwarzer Rock, weißer Kragen, graue Koteletten.
export function portrait() {
  return cached('portrait', () => {
    const w = 256;
    const h = 320;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const bg = ctx.createRadialGradient(w * 0.45, h * 0.35, 10, w / 2, h / 2, h * 0.7);
    bg.addColorStop(0, '#4a3a26');
    bg.addColorStop(1, '#140e08');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    // Rock und Schultern
    ctx.fillStyle = '#0e0c0a';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 1.02, w * 0.48, h * 0.42, 0, 0, 7);
    ctx.fill();
    // Hemdbrust und Halsbinde
    ctx.fillStyle = '#d8d0bc';
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.62);
    ctx.lineTo(w * 0.58, h * 0.62);
    ctx.lineTo(w * 0.53, h * 0.85);
    ctx.lineTo(w * 0.47, h * 0.85);
    ctx.fill();
    ctx.fillStyle = '#1a1612';
    ctx.fillRect(w * 0.44, h * 0.61, w * 0.12, h * 0.03);
    // Gesicht mit Licht von links
    const face = ctx.createRadialGradient(w * 0.45, h * 0.38, 4, w / 2, h * 0.42, w * 0.2);
    face.addColorStop(0, '#d8a888');
    face.addColorStop(1, '#6a4430');
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.42, w * 0.15, h * 0.16, 0, 0, 7);
    ctx.fill();
    // Graue Koteletten, Haarkranz, Augen
    ctx.fillStyle = '#8a8478';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(w / 2 + s * w * 0.13, h * 0.5, w * 0.06, h * 0.09, s * 0.2, 0, 7);
      ctx.fill();
    }
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.28, w * 0.15, h * 0.05, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#2a1a12';
    for (const s of [-1, 1]) ctx.fillRect(w / 2 + s * w * 0.06 - 4, h * 0.4, 8, 3);
    ctx.fillRect(w / 2 - 10, h * 0.5, 20, 2);
    // Firnis
    const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.7);
    v.addColorStop(0, 'rgba(60,40,10,0)');
    v.addColorStop(1, 'rgba(10,6,2,0.75)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(200,170,110,0.8)';
    ctx.font = 'italic 14px "EB Garamond", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Joh. Fr. Lindner 1801–1879', w / 2, h - 14);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Kurszettel der Berliner Börse, mit Bleistift bearbeitet: Kreise, Pfeile, Unterstreichungen.
export function stockList() {
  return cached('stocks', () => {
    const w = 320;
    const h = 420;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(1892);
    ctx.fillStyle = '#e0d8c2';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1e1a16';
    ctx.textAlign = 'center';
    ctx.font = '26px "UnifrakturMaguntia", serif';
    ctx.fillText('Berliner Börse', w / 2, 34);
    ctx.font = '13px "EB Garamond", serif';
    ctx.fillText('Amtlicher Kurszettel · 11. November 1892', w / 2, 54);
    ctx.fillRect(16, 62, w - 32, 1.5);
    const rows = [
      ['Disconto-Ges.', '178,25'], ['Deutsche Bank', '156,40'], ['Darmstädter Bank', '133,10'],
      ['Berl. Handels-Ges.', '139,75'], ['Laurahütte', '97,60'], ['Dortmunder Union', '58,30'],
      ['Bochumer Gussstahl', '112,50'], ['Harpener Bergbau', '128,90'], ['Gelsenkirchener', '141,20'],
      ['Argentinier 5%', '36,80'], ['Portugiesen 3%', '22,40'], ['Russ. Noten', '201,15'],
      ['Ital. Rente', '88,60'], ['Mexikaner 6%', '79,25'],
    ];
    ctx.font = '15px "EB Garamond", serif';
    rows.forEach(([name, val], i) => {
      const y = 84 + i * 23;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#1e1a16';
      ctx.fillText(name, 22, y);
      ctx.textAlign = 'right';
      ctx.fillText(val, w - 60, y);
      // Bleistift: fallende Papiere eingekreist und mit Pfeil
      if ([4, 5, 9, 10, 13].includes(i)) {
        ctx.strokeStyle = 'rgba(60,60,64,0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(w - 82, y - 5, 34, 11, (r() - 0.5) * 0.2, 0, 7);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(w - 36, y - 14);
        ctx.lineTo(w - 36, y + 2);
        ctx.lineTo(w - 41, y - 4);
        ctx.moveTo(w - 36, y + 2);
        ctx.lineTo(w - 31, y - 4);
        ctx.stroke();
      }
    });
    // Rechnung am Rand, mehrfach durchgestrichen
    ctx.strokeStyle = 'rgba(60,60,64,0.7)';
    ctx.fillStyle = 'rgba(60,60,64,0.8)';
    ctx.font = 'italic 16px "EB Garamond", serif';
    ctx.textAlign = 'left';
    ctx.fillText('Deckung bis Montag?', 30, h - 46);
    ctx.lineWidth = 1.4;
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(26, h - 50 + k * 3);
      ctx.lineTo(170, h - 54 + k * 4);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Fliesenboden der Offizin: Schachbrett aus Cremeweiß und Schiefergrau, abgetreten.
export function tileFloor() {
  return cached('tiles', () => {
    const size = 512;
    const color = canvas(size);
    const c = color.getContext('2d');
    const r = rng(311);
    const n = 12;
    const t = size / n;
    c.fillStyle = '#2a2622';
    c.fillRect(0, 0, size, size);
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const light = (row + col) % 2 === 0;
        const v = (r() - 0.5) * 14;
        c.fillStyle = light ? `rgb(${172 + v},${164 + v},${144 + v})` : `rgb(${64 + v},${64 + v},${62 + v})`;
        c.fillRect(col * t + 1.5, row * t + 1.5, t - 3, t - 3);
      }
    }
    grain(c, size, 14, 312);
    blotches(c, size, 10, 30, 90, 'rgba(60,40,20,0.08)', 313);
    return { map: tex(color) };
  });
}

// Etiketten der Standgefäße als Atlas: 4 Spalten, 8 Zeilen.
// Gewöhnliche Mittel schwarz auf weiß, Separanda rot auf weiß, Venena weiß auf schwarz.
export const JAR_LABELS = [
  ['Tinct. Opii', 's'], ['Sal mirabile', 'n'], ['Chinin. sulf.', 'n'], ['Rad. Valerian.', 'n'],
  ['Fol. Digital.', 's'], ['Flor. Chamom.', 'n'], ['Sem. Lini', 'n'], ['Pulv. Ipecac.', 'n'],
  ['Kal. bromat.', 'n'], ['Natr. bicarb.', 'n'], ['Magnes. ust.', 'n'], ['Rad. Rhei', 'n'],
  ['Ol. Ricini', 'n'], ['Extr. Bellad.', 's'], ['Camphora', 'n'], ['Acid. boric.', 'n'],
  ['Zinc. oxyd.', 'n'], ['Sulf. depur.', 'n'], ['Fol. Sennae', 'n'], ['Hb. Menth. pip.', 'n'],
  ['Rad. Liquirit.', 'n'], ['Spir. aether.', 'n'], ['Bals. peruv.', 'n'], ['Ferr. reduct.', 'n'],
  ['Chloral. hydrat.', 's'], ['Codein. phosph.', 's'], ['Bism. subnitr.', 'n'], ['Lith. carbon.', 'n'],
  ['Morph. hydrochl.', 'v'], ['Strychn. nitr.', 'v'], ['Acid. arsenic.', 'v'], ['Hydrarg. bichl.', 'v'],
];

export function jarLabels() {
  return cached('jarlabels', () => {
    const cw = 256;
    const ch = 96;
    const c = canvas(cw * 4, ch * 8);
    const ctx = c.getContext('2d');
    JAR_LABELS.forEach(([name, kind], i) => {
      const x = (i % 4) * cw;
      const y = Math.floor(i / 4) * ch;
      const ink = kind === 's' ? '#8a1a14' : kind === 'v' ? '#ece6d6' : '#1a1612';
      ctx.fillStyle = kind === 'v' ? '#141210' : '#d6caa8';
      ctx.fillRect(x, y, cw, ch);
      // Kartusche mit Doppelrand und eingezogenen Ecken
      ctx.strokeStyle = kind === 'v' ? '#c8a860' : ink;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(x + 22, y + 10);
      ctx.lineTo(x + cw - 22, y + 10);
      ctx.quadraticCurveTo(x + cw - 22, y + ch / 2 - 10, x + cw - 8, y + ch / 2);
      ctx.quadraticCurveTo(x + cw - 22, y + ch / 2 + 10, x + cw - 22, y + ch - 10);
      ctx.lineTo(x + 22, y + ch - 10);
      ctx.quadraticCurveTo(x + 22, y + ch / 2 + 10, x + 8, y + ch / 2);
      ctx.quadraticCurveTo(x + 22, y + ch / 2 - 10, x + 22, y + 10);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 32, y + 19, cw - 64, ch - 38);
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let size = 40;
      ctx.font = `bold ${size}px "EB Garamond", serif`;
      while (ctx.measureText(name).width > cw - 76 && size > 18) {
        size -= 2;
        ctx.font = `bold ${size}px "EB Garamond", serif`;
      }
      ctx.fillText(name, x + cw / 2, y + ch / 2 + 2);
    });
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Schild über dem Repositorium: schwarzer Adler im Goldmedaillon, Schrift zu beiden Seiten.
export function eagleSign() {
  return cached('eaglesign', () => {
    const w = 1280;
    const h = 192;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#16120e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c8a860';
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#c8a860';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Jede Schrift bekommt das Feld zwischen Rand und Medaillon und wird notfalls kleiner gesetzt.
    const field = (w / 2 - 80 - 20 - 30) - 40;
    const fit = (text, size) => {
      ctx.font = `${size}px "UnifrakturMaguntia", serif`;
      while (ctx.measureText(text).width > field && size > 24) {
        size -= 2;
        ctx.font = `${size}px "UnifrakturMaguntia", serif`;
      }
    };
    fit('Apotheke', 80);
    ctx.fillText('Apotheke', (30 + w / 2 - 100) / 2, h / 2 + 4);
    fit('zum Schwarzen Adler', 64);
    ctx.fillText('zum Schwarzen Adler', (w / 2 + 100 + w - 30) / 2, h / 2 + 4);
    // Medaillon
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 80, 0, 7);
    ctx.fillStyle = '#c8a860';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 72, 0, 7);
    ctx.fillStyle = '#e2c880';
    ctx.fill();
    eagle(ctx, cx, cy + 4, 1);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Heraldischer Adler, schwarz, Kopf nach links gewendet.
function eagle(ctx, cx, cy, s) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.fillStyle = '#14100c';
  // Schwingen: gespreizte Federn
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.32;
      ctx.save();
      ctx.translate(side * 10, -14);
      ctx.rotate(side * (Math.PI / 2 + a));
      ctx.beginPath();
      ctx.ellipse(0, -26 - i * 1.5, 6, 28 - i * 2, 0, 0, 7);
      ctx.fill();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(side * 6, -26);
    ctx.quadraticCurveTo(side * 34, -46, side * 58, -40);
    ctx.lineTo(side * 54, -26);
    ctx.quadraticCurveTo(side * 30, -30, side * 8, -8);
    ctx.fill();
  }
  // Leib und Schwanz
  ctx.beginPath();
  ctx.ellipse(0, -2, 13, 26, 0, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-12, 18);
  ctx.lineTo(-20, 44);
  ctx.lineTo(-7, 38);
  ctx.lineTo(0, 48);
  ctx.lineTo(7, 38);
  ctx.lineTo(20, 44);
  ctx.lineTo(12, 18);
  ctx.fill();
  // Fänge
  ctx.strokeStyle = '#14100c';
  ctx.lineWidth = 3;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * 8, 16);
    ctx.lineTo(side * 18, 28);
    ctx.lineTo(side * 24, 26);
    ctx.moveTo(side * 18, 28);
    ctx.lineTo(side * 22, 34);
    ctx.stroke();
  }
  // Kopf mit Schnabel und Zunge
  ctx.beginPath();
  ctx.arc(-4, -32, 9, 0, 7);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-11, -36);
  ctx.quadraticCurveTo(-22, -36, -20, -28);
  ctx.lineTo(-12, -30);
  ctx.fill();
  ctx.strokeStyle = '#8a1a14';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-14, -30);
  ctx.lineTo(-20, -24);
  ctx.stroke();
  ctx.fillStyle = '#e2c880';
  ctx.beginPath();
  ctx.arc(-6, -34, 1.8, 0, 7);
  ctx.fill();
  ctx.restore();
}

export function clockFace(hour = 9, minute = 40, size = 256) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const m = size / 2;
  // Deckender Grund in Randfarbe, damit am Scheibenrand kein heller Saum entsteht.
  ctx.fillStyle = '#2a2015';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#e8dfc6';
  ctx.beginPath();
  ctx.arc(m, m, m - 2, 0, 7);
  ctx.fill();
  ctx.strokeStyle = '#2a2015';
  ctx.lineWidth = size * 0.02;
  ctx.stroke();
  ctx.fillStyle = '#2a2015';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${size * 0.1}px "EB Garamond", serif`;
  const numerals = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  numerals.forEach((n, i) => {
    const a = (i / 12) * Math.PI * 2;
    ctx.fillText(n, m + Math.sin(a) * m * 0.76, m - Math.cos(a) * m * 0.76);
  });
  const hand = (angle, len, width) => {
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(m, m);
    ctx.lineTo(m + Math.sin(angle) * len, m - Math.cos(angle) * len);
    ctx.stroke();
  };
  hand(((hour % 12) + minute / 60) * (Math.PI / 6), m * 0.45, size * 0.028);
  hand(minute * (Math.PI / 30), m * 0.66, size * 0.016);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Erleuchtetes Fenster von außen: warmer Schein hinter Spitzengardinen, seitlich
// gebundene Übergardinen. Füllt die ganze Scheibe (Seitenverhältnis 2 : 3).
export function laceCurtain() {
  return cached('lace', () => {
    const w = 256;
    const h = 384;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const glow = ctx.createRadialGradient(w * 0.5, h * 0.42, 10, w * 0.5, h * 0.45, h * 0.62);
    glow.addColorStop(0, '#f2c27a');
    glow.addColorStop(0.55, '#b4783c');
    glow.addColorStop(1, '#4a2c16');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    // Spitze: Rauten aus Fäden, darin Rosetten, unten ein Bogenrand.
    const r = rng(17);
    ctx.strokeStyle = 'rgba(255,246,228,0.5)';
    ctx.lineWidth = 1.2;
    for (let k = -h; k < w + h; k += 14) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k + h, h);
      ctx.moveTo(k, 0);
      ctx.lineTo(k - h, h);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,248,232,0.45)';
    for (let y = 24; y < h - 40; y += 42) {
      for (let x = 20 + ((y / 42) % 2) * 21; x < w; x += 42) {
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 2.4, a, 0, 7);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = 'rgba(255,248,232,0.55)';
    for (let x = 0; x < w; x += 16) {
      ctx.beginPath();
      ctx.arc(x + 8, h - 34, 8, 0, Math.PI);
      ctx.fill();
    }
    // Falten der Spitze: senkrechte Schatten
    for (let x = 0; x < w; x += 9 + r() * 10) {
      ctx.fillStyle = `rgba(60,30,10,${0.05 + r() * 0.1})`;
      ctx.fillRect(x, 0, 3 + r() * 5, h - 26);
    }
    // Übergardinen, mit Kordel gerafft
    for (const side of [0, 1]) {
      const x0 = side ? w - 46 : 0;
      for (let i = 0; i < 46; i += 2) {
        const v = 0.5 + 0.5 * Math.sin(i * 0.55);
        ctx.fillStyle = `rgb(${70 + v * 40},${22 + v * 12},${18 + v * 8})`;
        const waist = Math.abs(i - (side ? 46 : 0)) * 0.35;
        ctx.fillRect(x0 + i, 0, 2, h * 0.55);
        ctx.fillRect(x0 + i + (side ? waist * 0.4 : -waist * 0.4), h * 0.55, 2, h * 0.45);
      }
      ctx.fillStyle = '#c8a050';
      ctx.fillRect(x0 + (side ? 0 : 34), h * 0.54, 12, 6);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Gemalte Auslagen gewöhnlicher Läden, wie man sie abends durch die Scheibe sieht:
// Rückwand mit Borden im Lampenlicht, Waren, unten die Auslage, oben Goldschrift.
export const SHOP_KINDS = ['baecker', 'fleischer', 'kolonial', 'tuche', 'buch', 'zigarren', 'hut'];
const SHOP_NAMES = {
  baecker: 'Bäckerei',
  fleischer: 'Fleischerei',
  kolonial: 'Colonialwaaren',
  tuche: 'Manufacturwaaren',
  buch: 'Buchhandlung',
  zigarren: 'Cigarren',
  hut: 'Hüte & Mützen',
};

export function shopDisplay(kind) {
  return cached(`shop-${kind}`, () => {
    const S = 512;
    const c = canvas(S);
    const ctx = c.getContext('2d');
    const r = rng(SHOP_KINDS.indexOf(kind) * 97 + 5);
    const pick = (list) => list[Math.floor(r() * list.length)];
    const wall = { baecker: '#b88a52', fleischer: '#a8a296', kolonial: '#7a5a34', tuche: '#6a4a3a', buch: '#5a3a26', zigarren: '#4a2e1c', hut: '#7a6a58' }[kind];
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, S, S);
    if (kind === 'fleischer') {
      // weiße Kacheln
      ctx.strokeStyle = 'rgba(120,110,100,0.5)';
      ctx.lineWidth = 2;
      for (let y = 0; y < S; y += 32) for (let x = 0; x < S; x += 32) ctx.strokeRect(x, y, 32, 32);
    }
    const shelves = [170, 285];
    const shelf = (y) => {
      ctx.fillStyle = '#3a2414';
      ctx.fillRect(0, y, S, 12);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(0, y + 12, S, 10);
    };
    const box = (x, y, w, h, fill, label) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(x, y - h, w * 0.18, h);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(x + w * 0.85, y - h, w * 0.15, h);
      if (label) {
        ctx.fillStyle = label;
        ctx.fillRect(x + w * 0.15, y - h * 0.65, w * 0.7, h * 0.3);
      }
    };
    const blob = (x, y, rx, ry, fill, rot = 0) => {
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, rot, 0, 7);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,240,210,0.18)';
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.3, y - ry * 0.35, rx * 0.45, ry * 0.3, rot, 0, 7);
      ctx.fill();
    };
    // Unten die Auslage, ein Stoff- oder Holzbrett
    const bed = { baecker: '#e8dcc0', fleischer: '#9a968e', kolonial: '#4a3018', tuche: '#5a1a1a', buch: '#2a3a2a', zigarren: '#3a2414', hut: '#2a2a3a' }[kind];

    if (kind === 'baecker') {
      for (const y of shelves) {
        shelf(y);
        for (let x = 20; x < S - 40; x += 58 + r() * 10) blob(x + 25, y - 22, 26, 18, pick(['#a0602a', '#b8783a', '#8a4e22']));
      }
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      for (let x = 18; x < S; x += 36) blob(x, 432 + (x % 72 ? 0 : 6), 15, 11, '#c88a48');
      for (let x = 30; x < S; x += 70) {
        ctx.strokeStyle = '#9a5a26';
        ctx.lineWidth = 9;
        ctx.beginPath();
        ctx.arc(x, 478, 18, 0.3, Math.PI * 2 - 0.3);
        ctx.stroke();
      }
    } else if (kind === 'fleischer') {
      ctx.fillStyle = '#5a5a5a';
      ctx.fillRect(0, 96, S, 8);
      for (let x = 18; x < S; x += 30 + r() * 12) {
        const len = 60 + r() * 120;
        ctx.fillStyle = pick(['#7a2a1a', '#8a3a22', '#5a2414', '#a85a3a']);
        ctx.fillRect(x, 104, 13 + r() * 8, len);
        ctx.beginPath();
        ctx.arc(x + 9, 104 + len, 9, 0, Math.PI);
        ctx.fill();
      }
      shelf(330);
      for (let x = 30; x < S; x += 90) blob(x + 20, 300, 40, 26, pick(['#b8645a', '#c87a6a', '#a04a3a']));
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      for (let x = 20; x < S; x += 80) {
        ctx.fillStyle = '#eae6dc';
        ctx.beginPath();
        ctx.ellipse(x + 30, 445, 38, 12, 0, 0, 7);
        ctx.fill();
        blob(x + 30, 438, 26, 12, pick(['#b8443a', '#c86a5a', '#d8a090']));
      }
    } else if (kind === 'kolonial') {
      for (const y of shelves) {
        shelf(y);
        for (let x = 10; x < S - 30; x += 40) box(x, y, 34, 50 + r() * 26, pick(['#2a4a6a', '#6a2a1a', '#2a5a3a', '#a07a2a', '#1a1a1a']), '#e8dcb8');
      }
      // Zuckerhüte in blauem Papier
      for (const x of [60, 450]) {
        ctx.fillStyle = '#e8e8e0';
        ctx.beginPath();
        ctx.moveTo(x - 22, 400);
        ctx.lineTo(x, 330);
        ctx.lineTo(x + 22, 400);
        ctx.fill();
        ctx.fillStyle = '#2a4a8a';
        ctx.fillRect(x - 24, 372, 48, 28);
      }
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      // Säcke mit aufgerolltem Rand
      for (let x = 30; x < S; x += 96) {
        ctx.fillStyle = '#b8a070';
        ctx.fillRect(x, 420, 70, 92);
        ctx.fillStyle = '#d8c090';
        ctx.fillRect(x - 4, 412, 78, 16);
        blob(x + 35, 424, 30, 9, pick(['#4a2a14', '#e8e0c8', '#c8a040', '#6a4a20']));
      }
    } else if (kind === 'tuche') {
      for (const y of shelves) {
        shelf(y);
        for (let x = 8; x < S - 20; x += 30) {
          const h = 70 + r() * 20;
          box(x, y, 26, h, pick(['#2a2a4a', '#5a2a2a', '#3a4a3a', '#8a7a5a', '#d8d0c0', '#4a3a5a', '#7a5a3a']));
        }
      }
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      // drapierte Stoffbahn
      const g = ctx.createLinearGradient(0, 0, S, 0);
      for (let i = 0; i <= 10; i++) g.addColorStop(i / 10, i % 2 ? '#4a6a8a' : '#2a4a6a');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(180, 300);
      ctx.quadraticCurveTo(256, 420, 340, 300);
      ctx.lineTo(380, 512);
      ctx.lineTo(140, 512);
      ctx.fill();
    } else if (kind === 'buch') {
      for (const y of shelves) {
        shelf(y);
        for (let x = 4; x < S - 8; x += 9 + r() * 6) {
          const w = 8 + r() * 6;
          box(x, y, w, 60 + r() * 34, pick(['#5a1a1a', '#1a2a4a', '#2a3a1a', '#6a4a1a', '#3a2a2a', '#8a7a5a']));
        }
      }
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      // aufgestellte Bücher mit hellem Titelfeld
      for (let x = 30; x < S; x += 95) {
        ctx.save();
        ctx.translate(x + 30, 470);
        ctx.rotate(-0.12);
        ctx.fillStyle = pick(['#6a1a1a', '#1a3a5a', '#3a4a1a']);
        ctx.fillRect(-30, -80, 60, 80);
        ctx.fillStyle = '#e0d4b0';
        ctx.fillRect(-20, -66, 40, 22);
        ctx.restore();
      }
    } else if (kind === 'zigarren') {
      for (const y of shelves) {
        shelf(y);
        for (let x = 12; x < S - 40; x += 52) {
          box(x, y, 46, 22, '#8a5a2a', pick(['#c83a2a', '#e8c860', '#2a6a4a']));
          box(x + 2, y - 22, 42, 20, '#7a4a22', '#e8dcb0');
        }
      }
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      for (let x = 40; x < S; x += 110) {
        // Pfeife
        ctx.strokeStyle = '#2a1a10';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x, 450);
        ctx.lineTo(x + 50, 440);
        ctx.stroke();
        ctx.fillStyle = '#5a3018';
        ctx.fillRect(x + 46, 420, 18, 26);
        // Tabaktopf
        box(x + 70, 490, 28, 40, '#c8b890', '#3a2a1a');
      }
    } else if (kind === 'hut') {
      shelf(200);
      ctx.fillStyle = bed;
      ctx.fillRect(0, 400, S, S - 400);
      const hat = (x, y, type) => {
        ctx.fillStyle = '#3a2a1a';
        ctx.fillRect(x - 2, y, 4, 400 - y);
        if (type === 0) {
          ctx.fillStyle = '#141414';
          ctx.fillRect(x - 22, y - 50, 44, 50);
          ctx.fillRect(x - 34, y - 4, 68, 8);
        } else if (type === 1) {
          ctx.fillStyle = '#2a2018';
          ctx.beginPath();
          ctx.arc(x, y, 26, Math.PI, 0);
          ctx.fill();
          ctx.fillRect(x - 34, y - 3, 68, 7);
        } else {
          ctx.fillStyle = pick(['#6a2a4a', '#2a4a6a', '#8a6a3a']);
          ctx.beginPath();
          ctx.ellipse(x, y, 42, 10, 0, 0, 7);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y - 4, 20, Math.PI, 0);
          ctx.fill();
          ctx.strokeStyle = '#e8e0d0';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(x + 10, y - 18);
          ctx.quadraticCurveTo(x + 40, y - 50, x + 50, y - 20);
          ctx.stroke();
        }
      };
      for (let x = 50; x < S; x += 100) hat(x, 190, Math.floor(r() * 3));
      for (let x = 100; x < S; x += 100) hat(x, 330, Math.floor(r() * 3));
    }

    // Lampenlicht von oben, Ränder dunkler
    const light = ctx.createRadialGradient(S / 2, S * 0.3, 20, S / 2, S * 0.45, S * 0.75);
    light.addColorStop(0, 'rgba(255,220,150,0.25)');
    light.addColorStop(0.6, 'rgba(0,0,0,0)');
    light.addColorStop(1, 'rgba(10,5,0,0.55)');
    ctx.fillStyle = light;
    ctx.fillRect(0, 0, S, S);

    // Goldschrift oben auf der Scheibe
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '56px "UnifrakturMaguntia", serif';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(25,14,4,0.85)';
    ctx.strokeText(SHOP_NAMES[kind], S / 2, 52, S - 40);
    const gold = ctx.createLinearGradient(0, 28, 0, 76);
    gold.addColorStop(0, '#f6dc96');
    gold.addColorStop(1, '#a87a2a');
    ctx.fillStyle = gold;
    ctx.fillText(SHOP_NAMES[kind], S / 2, 52, S - 40);

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Geschlossener Laden: hölzerne Klappläden vor dem Schaufenster, mit Eisenriegel.
export function shopShutter() {
  return cached('shutter', () => {
    const S = 256;
    const c = canvas(S);
    const ctx = c.getContext('2d');
    const r = rng(23);
    for (let x = 0; x < S; x += 32) {
      const v = 0.85 + r() * 0.3;
      ctx.fillStyle = `rgb(${Math.round(42 * v)},${Math.round(52 * v)},${Math.round(40 * v)})`;
      ctx.fillRect(x, 0, 32, S);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(x, 0, 2, S);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x + 2, 0, 3, S);
    }
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, S * 0.48, S, 12);
    ctx.fillStyle = '#2a2a2a';
    ctx.beginPath();
    ctx.arc(S / 2, S * 0.48 + 6, 9, 0, 7);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Schwerer, zugezogener Samtvorhang (dunkelgrün), senkrechte Falten.
export function velvetDrape() {
  return cached('velvet', () => {
    const w = 128;
    const h = 256;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    for (let x = 0; x < w; x++) {
      const v = 0.5 + 0.35 * Math.sin(x * 0.31) + 0.15 * Math.sin(x * 0.83 + 1);
      ctx.fillStyle = `rgb(${14 + v * 26},${34 + v * 40},${24 + v * 28})`;
      ctx.fillRect(x, 0, 1, h);
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0,0,0,0.35)');
    g.addColorStop(0.2, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Goldschrift auf einer Schaufensterscheibe, Grund durchsichtig. Erste Zeile im Bogen.
export function glassLettering(lines) {
  const w = 1024;
  const h = 512;
  const c = canvas(w, h);
  const ctx = c.getContext('2d');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gold = (y0, y1) => {
    const g = ctx.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#f6dc96');
    g.addColorStop(0.5, '#c89a3c');
    g.addColorStop(1, '#8a6420');
    return g;
  };
  const [arc, ...rest] = lines;
  ctx.font = '96px "UnifrakturMaguntia", serif';
  const R = 640;
  const total = ctx.measureText(arc).width;
  let a = -total / R / 2;
  ctx.fillStyle = gold(60, 200);
  ctx.strokeStyle = 'rgba(30,18,6,0.8)';
  ctx.lineWidth = 6;
  for (const ch of arc) {
    const cw = ctx.measureText(ch).width;
    a += cw / R / 2;
    ctx.save();
    ctx.translate(w / 2 + Math.sin(a) * R, 120 + R - Math.cos(a) * R);
    ctx.rotate(a);
    ctx.strokeText(ch, 0, 0);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += cw / R / 2;
  }
  ctx.font = '58px "EB Garamond", serif';
  rest.forEach((line, i) => {
    const y = 270 + i * 76;
    ctx.fillStyle = gold(y - 30, y + 30);
    ctx.strokeText(line, w / 2, y);
    ctx.fillText(line, w / 2, y);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// Erleuchtete Wohnungsfenster: ein Atlas mit 4 Arten (Zeilen) zu je 4 Varianten (Spalten).
// 0 Spitzengardine, 1 Blick ins Zimmer zwischen Übergardinen, 2 halb herabgelassenes Rollo,
// 3 zugezogene dünne Vorhänge. avg ist der lineare Mittelwert, damit das Fenster aus der
// Ferne (kleinste Mipmap) so hell bleibt wie die bisherige einfarbige Scheibe.
export const WINDOW_ATLAS = { cols: 4, rows: 4 };

export function windowAtlas() {
  return cached('windows', () => {
    const CW = 256;
    const CH = 384;
    const { cols, rows } = WINDOW_ATLAS;
    const c = canvas(CW * cols, CH * rows);
    const ctx = c.getContext('2d');
    const r = rng(29);
    const pick = (list) => list[Math.floor(r() * list.length)];

    // Weicher Schatten einer Person hinter Stoff: Kopf und Schultern als Verläufe.
    const figure = (x, y, s, a) => {
      const soft = (cx, cy, rx, ry) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, ry / rx);
        const g = ctx.createRadialGradient(0, 0, rx * 0.4, 0, 0, rx);
        g.addColorStop(0, `rgba(30,14,4,${a})`);
        g.addColorStop(1, 'rgba(30,14,4,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rx, 0, 7);
        ctx.fill();
        ctx.restore();
      };
      soft(x, y, 30 * s, 36 * s);
      soft(x, y + 120 * s, 78 * s, 90 * s);
      soft(x, y + 230 * s, 80 * s, 110 * s);
    };
    const glow = (x, y, r0, r1, inner, outer) => {
      const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
      g.addColorStop(0, inner);
      g.addColorStop(1, outer);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CW, CH);
    };
    // Spitze: Rautennetz, Rosetten, Bogenrand unten, senkrechte Falten.
    const lace = (alpha) => {
      ctx.strokeStyle = `rgba(255,244,222,${0.45 * alpha})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let k = -CH; k < CW + CH; k += 14) {
        ctx.moveTo(k, 0);
        ctx.lineTo(k + CH, CH);
        ctx.moveTo(k, 0);
        ctx.lineTo(k - CH, CH);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(255,246,228,${0.4 * alpha})`;
      for (let y = 24; y < CH - 40; y += 42) {
        for (let x = 20 + ((y / 42) % 2) * 21; x < CW; x += 42) {
          for (let p = 0; p < 6; p++) {
            const a = (p / 6) * Math.PI * 2;
            ctx.beginPath();
            ctx.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 5, 2.4, a, 0, 7);
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = `rgba(255,246,228,${0.5 * alpha})`;
      for (let x = 0; x < CW; x += 16) {
        ctx.beginPath();
        ctx.arc(x + 8, CH - 30, 8, 0, Math.PI);
        ctx.fill();
      }
      for (let x = 0; x < CW; x += 9 + r() * 10) {
        ctx.fillStyle = `rgba(60,30,10,${0.05 + r() * 0.1})`;
        ctx.fillRect(x, 0, 3 + r() * 5, CH - 22);
      }
    };
    // Schwere Übergardinen links und rechts, mit Kordel gerafft.
    const drapes = (rgb, width = 52) => {
      for (const side of [0, 1]) {
        const x0 = side ? CW - width : 0;
        for (let i = 0; i < width; i += 2) {
          const v = 0.5 + 0.5 * Math.sin(i * 0.55);
          ctx.fillStyle = `rgb(${rgb.map((k) => Math.round(k * (0.55 + v * 0.45))).join(',')})`;
          const waist = Math.abs(i - (side ? width : 0)) * 0.35;
          ctx.fillRect(x0 + i, 0, 2, CH * 0.55);
          ctx.fillRect(x0 + i + (side ? waist * 0.4 : -waist * 0.4), CH * 0.55, 2, CH * 0.45);
        }
        ctx.fillStyle = '#c8a050';
        ctx.fillRect(x0 + (side ? 0 : width - 12), CH * 0.54, 12, 6);
      }
    };
    // Tapete mit Streifen oder Streumuster.
    const wallpaper = (base, ink, striped) => {
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, CW, CH);
      ctx.fillStyle = ink;
      if (striped) for (let x = 6; x < CW; x += 22) ctx.fillRect(x, 0, 6, CH);
      else {
        for (let y = 14; y < CH; y += 30) {
          for (let x = 12 + ((y / 30) % 2) * 15; x < CW; x += 30) {
            ctx.beginPath();
            ctx.ellipse(x, y, 4, 6, 0, 0, 7);
            ctx.fill();
          }
        }
      }
    };
    const frame = (x, y, w, h, inside) => {
      ctx.fillStyle = '#6a4a1a';
      ctx.fillRect(x - 6, y - 6, w + 12, h + 12);
      ctx.fillStyle = inside;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = 'rgba(255,230,180,0.15)';
      ctx.fillRect(x, y, w, h * 0.3);
    };
    const tableLamp = (x, y) => {
      glow(x, y - 30, 4, 120, 'rgba(255,214,140,0.55)', 'rgba(255,214,140,0)');
      ctx.fillStyle = '#3a2410';
      ctx.fillRect(x - 3, y - 20, 6, 40);
      ctx.fillStyle = '#e8b868';
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 18);
      ctx.lineTo(x - 16, y - 52);
      ctx.lineTo(x + 16, y - 52);
      ctx.lineTo(x + 28, y - 18);
      ctx.fill();
    };
    // Blick ins Zimmer: Tapete, Bild, Möbel im Gegenlicht, Licht von einer Lampe.
    const room = (v, top = 0) => {
      const paper = [
        ['#7a5a32', 'rgba(60,36,14,0.45)', true],
        ['#6a3a2a', 'rgba(150,90,50,0.35)', false],
        ['#6a5a3a', 'rgba(50,36,18,0.4)', true],
        ['#8a6a42', 'rgba(110,60,30,0.35)', false],
      ][v];
      wallpaper(...paper);
      glow(CW * 0.5, top + 40, 10, CH * 0.9, 'rgba(255,220,150,0.45)', 'rgba(20,10,0,0.35)');
      if (v === 0) frame(80, top + 70, 96, 70, '#4a3a22');
      if (v === 1) {
        frame(50, top + 60, 50, 64, '#3a2a1a');
        frame(150, top + 80, 56, 44, '#5a4a2a');
      }
      if (v === 3) {
        // Spiegel mit hellem Widerschein
        ctx.fillStyle = '#8a6a2a';
        ctx.beginPath();
        ctx.ellipse(CW / 2, top + 120, 48, 64, 0, 0, 7);
        ctx.fill();
        ctx.fillStyle = '#d8b880';
        ctx.beginPath();
        ctx.ellipse(CW / 2, top + 120, 40, 56, 0, 0, 7);
        ctx.fill();
      }
      // Möbel unten: Vertiko, Sofalehne, Klavier
      ctx.fillStyle = 'rgba(28,14,6,0.92)';
      if (v === 0 || v === 3) ctx.fillRect(40, CH - 120, 176, 120);
      else if (v === 1) {
        ctx.beginPath();
        ctx.moveTo(20, CH);
        ctx.lineTo(20, CH - 80);
        ctx.quadraticCurveTo(128, CH - 120, 236, CH - 80);
        ctx.lineTo(236, CH);
        ctx.fill();
      } else {
        ctx.fillRect(10, CH - 140, 236, 140);
        ctx.fillStyle = 'rgba(230,220,200,0.5)';
        ctx.fillRect(10, CH - 140, 236, 6);
      }
      if (v !== 1) tableLamp(v === 2 ? 190 : 70, CH - 120);
      if (v === 2) figure(110, top + 70, 0.75, 0.75);
    };

    for (let row = 0; row < rows; row++) {
      for (let v = 0; v < cols; v++) {
        ctx.save();
        ctx.translate(v * CW, row * CH);
        ctx.beginPath();
        ctx.rect(0, 0, CW, CH);
        ctx.clip();
        if (row === 0) {
          // Spitzengardine vor warmem Zimmerlicht
          glow(CW * 0.5, CH * 0.42, 10, CH * 0.62, '#f2c27a', '#5a3418');
          ctx.fillStyle = 'rgba(40,20,8,0.5)';
          ctx.fillRect(0, 0, CW, CH);
          glow(CW * 0.5, CH * 0.42, 10, CH * 0.62, 'rgba(240,190,120,0.7)', 'rgba(0,0,0,0)');
          if (v === 1) {
            // Topfpflanze auf dem Fensterbrett
            ctx.fillStyle = 'rgba(30,22,8,0.85)';
            ctx.fillRect(100, CH - 60, 56, 50);
            for (let i = 0; i < 14; i++) {
              const a = -Math.PI / 2 + (r() - 0.5) * 2.4;
              ctx.beginPath();
              ctx.ellipse(128 + Math.cos(a) * 50, CH - 70 + Math.sin(a) * 60, 26, 9, a, 0, 7);
              ctx.fill();
            }
          }
          if (v === 2) figure(150, 90, 0.8, 0.7);
          if (v === 3) glow(70, CH * 0.62, 5, 110, 'rgba(255,230,170,0.8)', 'rgba(255,230,170,0)');
          lace(1);
        } else if (row === 1) {
          room(v);
          drapes(pick([[120, 40, 30], [96, 56, 28], [110, 70, 30], [80, 34, 44]]));
        } else if (row === 2) {
          // Rollo aus Leinen, halb (oder weit) herabgelassen, darunter das Zimmer.
          const drop = v === 3 ? CH * 0.68 : CH * (0.38 + r() * 0.1);
          room(v, drop - 60);
          const g = ctx.createLinearGradient(0, 0, 0, drop);
          g.addColorStop(0, '#c89a5a');
          g.addColorStop(1, '#f0cc8a');
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, CW, drop);
          ctx.fillStyle = 'rgba(80,50,20,0.15)';
          for (let y = 18; y < drop; y += 18) ctx.fillRect(0, y, CW, 2);
          ctx.fillStyle = '#6a4a22';
          ctx.fillRect(0, drop - 8, CW, 8);
          ctx.strokeStyle = '#6a4a22';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(CW / 2, drop + 12, 9, 0, 7);
          ctx.stroke();
        } else {
          // Zugezogene dünne Vorhänge, von innen durchleuchtet.
          const tone = [
            [235, 160, 80],
            [220, 120, 70],
            [228, 168, 96],
            [200, 128, 80],
          ][v];
          for (let x = 0; x < CW; x += 2) {
            const half = x < CW / 2 ? x : CW - x;
            const f = 0.72 + 0.28 * Math.sin(half * 0.22 + (x < CW / 2 ? 0 : 1.3));
            ctx.fillStyle = `rgb(${tone.map((k) => Math.round(k * f)).join(',')})`;
            ctx.fillRect(x, 0, 2, CH);
          }
          glow(CW * 0.5, CH * 0.4, 10, CH * 0.7, 'rgba(255,230,180,0.35)', 'rgba(40,16,4,0.45)');
          if (v === 1) {
            // Spalt in der Mitte, dahinter heller
            ctx.fillStyle = 'rgba(255,236,190,0.75)';
            ctx.fillRect(CW / 2 - 5, 0, 10, CH);
          }
          if (v === 2) figure(90, 80, 0.8, 0.6);
          ctx.fillStyle = 'rgba(60,30,10,0.5)';
          ctx.fillRect(0, 0, CW, 10);
        }
        ctx.restore();
      }
    }

    // Linearer Mittelwert aller Bildpunkte (sRGB → linear).
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    const lin = (k) => {
      const s = k / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < px.length; i += 16) {
      for (let k = 0; k < 3; k++) sum[k] += lin(px[i + k]);
      n++;
    }
    const map = new THREE.CanvasTexture(c);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return { map, avg: new THREE.Color(sum[0] / n, sum[1] / n, sum[2] / n) };
  });
}

// Schmiedeeisernes Balkongitter, ausgestanzt: Grund durchsichtig. Eine Kachel ist 0,5 m breit
// und 0,92 m hoch: Stäbe alle 12,5 cm, oben ein Fries aus Ringen, in der Mitte S-Voluten,
// unten ein Fußband. Die Kachel beginnt und endet mit einem Stab, so stehen an jedem Ende Pfosten.
export function railing() {
  return cached('railing', () => {
    const w = 256;
    const h = 512;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const iron = '#1c201e';
    ctx.fillStyle = iron;
    ctx.strokeStyle = iron;
    // Stäbe, die äußeren halb, damit sich Kacheln zu einem ganzen Stab fügen
    for (let x = 0; x <= w; x += 64) ctx.fillRect(x - 5, 0, 10, h);
    // Riegel oben, unter dem Fries und unten
    ctx.fillRect(0, 0, w, 12);
    ctx.fillRect(0, 86, w, 10);
    ctx.fillRect(0, h - 24, w, 24);
    ctx.fillRect(0, h - 64, w, 8);
    // Fries aus Ringen
    ctx.lineWidth = 7;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(32 + k * 64, 49, 25, 0, Math.PI * 2);
      ctx.stroke();
    }
    // S-Voluten in jedem zweiten Feld, im anderen eine Raute
    ctx.lineWidth = 6;
    for (let k = 0; k < 4; k++) {
      const cx = 32 + k * 64;
      ctx.beginPath();
      if (k % 2) {
        ctx.arc(cx, 250, 20, Math.PI * 0.5, Math.PI * 2);
        ctx.moveTo(cx + 20, 290);
        ctx.arc(cx, 290, 20, 0, Math.PI * 1.5, true);
      } else {
        ctx.moveTo(cx, 220);
        ctx.lineTo(cx + 22, 270);
        ctx.lineTo(cx, 320);
        ctx.lineTo(cx - 22, 270);
        ctx.closePath();
      }
      ctx.stroke();
    }
    // Kleine Ringe im Fußband
    ctx.lineWidth = 5;
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(32 + k * 64, h - 40, 11, 0, Math.PI * 2);
      ctx.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  });
}

// Was dunkle Fensterscheiben spiegeln, als Rundumbild (equirektangular, Mitte = Horizont).
// In einer schmalen Straße füllen die Häuser gegenüber das Spiegelbild bis etwa 45° nach
// oben und unten: Fassaden mit Fensterreihen, einzelne erleuchtet, unten Läden und
// Laternen, darüber ein Streifen Himmel mit dem Widerschein der Stadt, ganz unten das Pflaster.
export function nightReflection() {
  return cached('night-reflection', () => {
    const w = 1024;
    const h = 512;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(41);
    const sky = ctx.createLinearGradient(0, 0, 0, 170);
    sky.addColorStop(0, '#06080e');
    sky.addColorStop(1, '#2c2a34');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, 170);
    const street = ctx.createLinearGradient(0, 330, 0, h);
    street.addColorStop(0, '#1e1a16');
    street.addColorStop(1, '#08080a');
    ctx.fillStyle = street;
    ctx.fillRect(0, 330, w, h - 330);
    for (let x = 0; x < w; ) {
      const bw = 90 + r() * 110;
      const top = 110 + r() * 40;
      const tone = 22 + r() * 12;
      ctx.fillStyle = `rgb(${tone + 4},${tone},${tone - 4})`;
      ctx.fillRect(x, top, bw + 1, 330 - top);
      // Fensterreihen: meist dunkel mit schwachem Glanz, einige erleuchtet
      for (let wy = top + 14; wy < 280; wy += 34) {
        for (let wx = x + 10; wx < x + bw - 14; wx += 24) {
          const lit = r() < 0.2;
          ctx.fillStyle = lit ? (r() < 0.5 ? '#e8a858' : '#c8803e') : '#0c0d12';
          ctx.fillRect(wx, wy, 11, 20);
        }
      }
      // Läden im Erdgeschoss
      for (let wx = x + 8; wx < x + bw - 30; wx += 44) {
        if (r() < 0.45) {
          ctx.fillStyle = r() < 0.5 ? '#d8a060' : '#b88048';
          ctx.fillRect(wx, 292, 30, 30);
        }
      }
      x += bw;
    }
    // Laternen vor den Häusern, darunter ihr Widerschein auf dem nassen Pflaster
    for (let x = 30; x < w; x += 120 + r() * 60) {
      const y = 286;
      const glow = ctx.createRadialGradient(x, y, 1, x, y, 30);
      glow.addColorStop(0, 'rgba(255,226,160,1)');
      glow.addColorStop(0.25, 'rgba(255,184,96,0.6)');
      glow.addColorStop(1, 'rgba(255,160,70,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(x - 30, y - 30, 60, 60);
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(x - 2, y + 6, 4, 330 - y - 6);
      const streak = ctx.createLinearGradient(0, 330, 0, 450);
      streak.addColorStop(0, 'rgba(255,170,80,0.4)');
      streak.addColorStop(1, 'rgba(255,170,80,0)');
      ctx.fillStyle = streak;
      ctx.fillRect(x - 6, 330, 12, 120);
    }
    const t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

// Ladenschilder der gewöhnlichen Läden. boards: Schriftbretter über dem Schaufenster, je
// Ladensorte SIGN_NAMES Inhaber (Zelle = Sorte * SIGN_NAMES + Inhaber), Inhabername in
// Fraktur, darunter die Sorte. emblems: ausgestanzte Zunftzeichen für die Ausleger, eine
// Zelle je Sorte in der Reihenfolge von SHOP_KINDS.
export const SIGN_NAMES = 4;
export const SIGN_ATLAS = { boards: { cols: 2, rows: 14 }, emblems: { cols: 4, rows: 2 } };
const OWNERS = [
  'Wilh. Krause', 'Carl Lehmann', 'Aug. Schulze', 'Gebr. Neumann', 'H. Friedländer', 'Otto Hahn',
  'Rob. Zimmermann', 'L. Jacobsohn', 'Fr. Wolff', 'Ernst Richter', 'J. Levy', 'Gust. Braun',
  'Paul Hoffmann', 'M. Hirschfeld', 'Ad. Wagner', 'Herm. Klein', 'Th. Schmidt', 'S. Rosenthal',
  'Rich. Böhm', 'Alb. Fischer', 'E. Mendel', 'Fritz Kühn', 'A. Schwarz', 'Jul. Petersen',
  'W. Lindemann', 'B. Cohn', 'K. Wendland', 'Max Ebert',
];
const SIGN_KIND_LINE = {
  baecker: 'Bäckerei & Conditorei',
  fleischer: 'Fleisch- & Wurstwaaren',
  kolonial: 'Colonialwaaren · Delicatessen',
  tuche: 'Tuche · Manufacturwaaren',
  buch: 'Buch- & Kunsthandlung',
  zigarren: 'Cigarren & Tabake',
  hut: 'Hüte · Mützen · Schirme',
};

export function shopSigns() {
  return cached('shop-signs', () => {
    // Schriftbretter: 512 × 88 je Zelle, Seitenverhältnis wie das Brett (2,9 m × 0,5 m)
    const BW = 512;
    const BH = 88;
    const { cols, rows } = SIGN_ATLAS.boards;
    const b = canvas(BW * cols, BH * rows);
    const ctx = b.getContext('2d');
    const grounds = ['#1c2a20', '#2a1612', '#151515', '#18202e'];
    SHOP_KINDS.forEach((kind, k) => {
      for (let n = 0; n < SIGN_NAMES; n++) {
        const cell = k * SIGN_NAMES + n;
        const x = (cell % cols) * BW;
        const y = Math.floor(cell / cols) * BH;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = grounds[(k + n) % grounds.length];
        ctx.fillRect(0, 0, BW, BH);
        ctx.strokeStyle = '#a8843a';
        ctx.lineWidth = 3;
        ctx.strokeRect(5, 5, BW - 10, BH - 10);
        ctx.lineWidth = 1;
        ctx.strokeRect(10, 10, BW - 20, BH - 20);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const gold = ctx.createLinearGradient(0, 16, 0, 58);
        gold.addColorStop(0, '#f4d890');
        gold.addColorStop(1, '#a87828');
        ctx.font = '42px "UnifrakturMaguntia", serif';
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillText(OWNERS[cell % OWNERS.length], BW / 2 + 2, 38, BW - 60);
        ctx.fillStyle = gold;
        ctx.fillText(OWNERS[cell % OWNERS.length], BW / 2, 36, BW - 60);
        ctx.font = '600 17px "EB Garamond", serif';
        ctx.fillStyle = '#d0b47a';
        ctx.fillText(SIGN_KIND_LINE[kind].toUpperCase(), BW / 2, 69, BW - 80);
        ctx.restore();
      }
    });
    const boards = new THREE.CanvasTexture(b);
    boards.colorSpace = THREE.SRGBColorSpace;
    boards.anisotropy = 8;

    // Zunftzeichen: 256 × 256 je Zelle, Grund durchsichtig
    const S = 256;
    const e = canvas(S * SIGN_ATLAS.emblems.cols, S * SIGN_ATLAS.emblems.rows);
    const g = e.getContext('2d');
    const draw = {
      baecker() {
        // Brezel
        g.strokeStyle = '#b8742c';
        g.lineWidth = 26;
        g.lineCap = 'round';
        g.beginPath();
        g.arc(128, 128, 84, Math.PI * 0.72, Math.PI * 2.28);
        g.stroke();
        g.beginPath();
        g.moveTo(66, 186);
        g.quadraticCurveTo(128, 150, 176, 92);
        g.moveTo(190, 186);
        g.quadraticCurveTo(128, 150, 80, 92);
        g.stroke();
        g.fillStyle = '#f0e8d0';
        for (let i = 0; i < 18; i++) {
          const a = Math.PI * (0.8 + i * 0.08);
          g.fillRect(128 + Math.cos(a) * 84 - 2, 128 + Math.sin(a) * 84 - 2, 4, 4);
        }
      },
      fleischer() {
        // Ochsenkopf, vergoldet
        g.fillStyle = '#c8a040';
        g.beginPath();
        g.moveTo(84, 70);
        g.quadraticCurveTo(128, 50, 172, 70);
        g.quadraticCurveTo(170, 150, 146, 210);
        g.quadraticCurveTo(128, 224, 110, 210);
        g.quadraticCurveTo(86, 150, 84, 70);
        g.fill();
        g.strokeStyle = '#d8b450';
        g.lineWidth = 14;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(90, 72);
        g.quadraticCurveTo(40, 60, 40, 20);
        g.moveTo(166, 72);
        g.quadraticCurveTo(216, 60, 216, 20);
        g.stroke();
        g.fillStyle = '#3a2810';
        for (const x of [108, 148]) {
          g.beginPath();
          g.arc(x, 110, 7, 0, 7);
          g.fill();
        }
        g.beginPath();
        g.ellipse(128, 196, 18, 10, 0, 0, 7);
        g.fill();
      },
      kolonial() {
        // Kaffeekanne aus Kupfer
        g.fillStyle = '#b86a3a';
        g.beginPath();
        g.moveTo(96, 220);
        g.quadraticCurveTo(70, 150, 100, 90);
        g.lineTo(156, 90);
        g.quadraticCurveTo(186, 150, 160, 220);
        g.closePath();
        g.fill();
        g.fillRect(104, 72, 48, 20);
        g.beginPath();
        g.arc(128, 66, 10, 0, 7);
        g.fill();
        g.strokeStyle = '#b86a3a';
        g.lineWidth = 12;
        g.beginPath();
        g.moveTo(90, 170);
        g.quadraticCurveTo(50, 150, 40, 100);
        g.moveTo(166, 110);
        g.quadraticCurveTo(214, 120, 170, 190);
        g.stroke();
        g.fillStyle = 'rgba(255,220,170,0.35)';
        g.fillRect(108, 100, 10, 100);
      },
      tuche() {
        // Schere
        g.strokeStyle = '#a8acb0';
        g.lineWidth = 12;
        for (const x of [88, 168]) {
          g.beginPath();
          g.arc(x, 196, 26, 0, 7);
          g.stroke();
        }
        g.fillStyle = '#b8bcc0';
        g.beginPath();
        g.moveTo(100, 172);
        g.lineTo(196, 30);
        g.lineTo(184, 26);
        g.lineTo(112, 150);
        g.fill();
        g.beginPath();
        g.moveTo(156, 172);
        g.lineTo(60, 30);
        g.lineTo(72, 26);
        g.lineTo(144, 150);
        g.fill();
        g.fillStyle = '#d8a040';
        g.beginPath();
        g.arc(128, 128, 9, 0, 7);
        g.fill();
      },
      buch() {
        // Aufgeschlagenes Buch
        g.fillStyle = '#7a1a18';
        g.beginPath();
        g.moveTo(20, 80);
        g.lineTo(128, 96);
        g.lineTo(236, 80);
        g.lineTo(236, 196);
        g.lineTo(128, 214);
        g.lineTo(20, 196);
        g.closePath();
        g.fill();
        g.fillStyle = '#ece0c0';
        g.beginPath();
        g.moveTo(30, 74);
        g.quadraticCurveTo(80, 70, 124, 92);
        g.lineTo(124, 202);
        g.quadraticCurveTo(80, 182, 30, 188);
        g.closePath();
        g.moveTo(226, 74);
        g.quadraticCurveTo(176, 70, 132, 92);
        g.lineTo(132, 202);
        g.quadraticCurveTo(176, 182, 226, 188);
        g.closePath();
        g.fill();
        g.strokeStyle = 'rgba(60,40,20,0.5)';
        g.lineWidth = 3;
        for (let y = 104; y < 180; y += 14) {
          g.beginPath();
          g.moveTo(44, y - 6);
          g.lineTo(112, y + 4);
          g.moveTo(144, y + 4);
          g.lineTo(212, y - 6);
          g.stroke();
        }
      },
      zigarren() {
        // Zigarre mit Bauchbinde, schräg
        g.save();
        g.translate(128, 128);
        g.rotate(-0.5);
        g.fillStyle = '#7a4a22';
        g.beginPath();
        g.ellipse(0, 0, 112, 28, 0, 0, 7);
        g.fill();
        g.fillStyle = 'rgba(255,220,170,0.25)';
        g.fillRect(-100, -20, 200, 8);
        g.fillStyle = '#b82a1a';
        g.fillRect(40, -28, 26, 56);
        g.fillStyle = '#e0c060';
        g.fillRect(46, -28, 14, 56);
        g.fillStyle = '#d8582a';
        g.beginPath();
        g.ellipse(-108, 0, 10, 20, 0, 0, 7);
        g.fill();
        g.restore();
      },
      hut() {
        // Zylinder mit goldenem Rand, damit er nachts nicht im Dunkel verschwindet
        g.fillStyle = '#181818';
        g.fillRect(80, 50, 96, 140);
        g.beginPath();
        g.ellipse(128, 192, 92, 22, 0, 0, 7);
        g.fill();
        g.fillStyle = '#5a1a1a';
        g.fillRect(80, 160, 96, 22);
        g.strokeStyle = '#c8a040';
        g.lineWidth = 5;
        g.strokeRect(80, 50, 96, 140);
        g.beginPath();
        g.ellipse(128, 192, 92, 22, 0, 0, 7);
        g.stroke();
      },
    };
    SHOP_KINDS.forEach((kind, k) => {
      g.save();
      g.translate((k % SIGN_ATLAS.emblems.cols) * S, Math.floor(k / SIGN_ATLAS.emblems.cols) * S);
      g.beginPath();
      g.rect(0, 0, S, S);
      g.clip();
      draw[kind]();
      g.restore();
    });
    const emblems = new THREE.CanvasTexture(e);
    emblems.colorSpace = THREE.SRGBColorSpace;
    emblems.anisotropy = 8;
    return { boards, emblems };
  });
}

// Lindenrinde: graubraun mit Längsrissen und hellen Graten, waagerecht nahtlos.
export function bark() {
  const W = 128;
  const H = 256;
  const c = canvas(W, H);
  const ctx = c.getContext('2d');
  const r = rng(83);
  ctx.fillStyle = '#56534d';
  ctx.fillRect(0, 0, W, H);
  const crack = (style, width, n) => {
    for (let i = 0; i < n; i++) {
      const pts = [];
      let x = r() * W;
      let y = -20 - r() * 40;
      while (y < H + 20) {
        pts.push([x, y]);
        y += 10 + r() * 16;
        x += (r() - 0.5) * 7;
      }
      ctx.strokeStyle = style();
      ctx.lineWidth = width();
      for (const off of [-W, 0, W]) {
        ctx.beginPath();
        pts.forEach(([px, py], k) => (k ? ctx.lineTo(px + off, py) : ctx.moveTo(px + off, py)));
        ctx.stroke();
      }
    }
  };
  crack(() => `rgba(${120 + r() * 30},${110 + r() * 25},${96 + r() * 20},0.35)`, () => 2 + r() * 5, 16);
  crack(() => `rgba(24,19,15,${0.55 + r() * 0.4})`, () => 1 + r() * 2.5, 30);
  // Flechten, wie sie an alten Stadtbäumen sitzen.
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${100 + r() * 30},${112 + r() * 30},${90 + r() * 20},${0.12 + r() * 0.15})`;
    const x = r() * W;
    const y = r() * H;
    const s = 2 + r() * 6;
    for (const off of [-W, 0, W]) ctx.fillRect(x + off, y, s, s * 1.6);
  }
  return tex(c);
}

// Reisig für die Kronenspitzen: feine, im Zickzack verzweigte Lindentriebe, weiß auf
// durchsichtig. Die Farbe kommt aus dem Material.
export function twigs() {
  const S = 256;
  const c = canvas(S);
  const ctx = c.getContext('2d');
  const r = rng(97);
  ctx.strokeStyle = '#fff';
  ctx.lineCap = 'round';
  const grow = (x, y, a, len, w, d) => {
    const x2 = x + Math.sin(a) * len;
    const y2 = y - Math.cos(a) * len;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.25, (y + y2) / 2, x2, y2);
    ctx.stroke();
    if (d === 0) return;
    const n = r() < 0.55 ? 3 : 2;
    for (let i = 0; i < n; i++) grow(x2, y2, a + (r() - 0.5) * 1.3, len * (0.6 + r() * 0.2), Math.max(1, w * 0.7), d - 1);
  };
  for (let i = 0; i < 3; i++) grow(S / 2 + (r() - 0.5) * 24, S, (r() - 0.5) * 0.5, 62, 4, 5);
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// Fronten der Stadtbahnbögen, vier Sorten im Atlas 2 × 2: Destille (0) und Schlosserei (1)
// mit Licht, Kohlenhandlung (2) und Speditionslager (3) dunkel. Eine Zelle zeigt die ganze
// Bogenöffnung, 8,8 m breit und 8,5 m hoch: unten die Ladenfront, darüber die verglaste
// Lünette mit Strahlensprossen. map ist die Farbe, emissiveMap das Licht hinter den Scheiben.
export const ARCH_FRONT = { w: 8.8, h: 8.5, spring: 4.1 };
export function archFronts() {
  return cached('archFronts', () => {
    const C = 768;
    const color = canvas(C * 2);
    const glow = canvas(C * 2);
    const cx = color.getContext('2d');
    const gx = glow.getContext('2d');
    gx.fillStyle = '#000';
    gx.fillRect(0, 0, C * 2, C * 2);
    const { w: W, h: H, spring: SP } = ARCH_FRONT;
    const sx = C / W;
    const sy = C / H;
    const r = rng(1893);
    for (let cell = 0; cell < 4; cell++) {
      const ox = (cell % 2) * C;
      const oy = Math.floor(cell / 2) * C;
      const lit = cell < 2;
      // Meter (x von links, y von unten) in Pixel der Zelle.
      const X = (x) => ox + x * sx;
      const Y = (y) => oy + C - y * sy;
      const rect = (ctx, x0, y0, x1, y1, style) => {
        ctx.fillStyle = style;
        ctx.fillRect(X(x0), Y(y1), (x1 - x0) * sx, (y1 - y0) * sy);
      };
      cx.save();
      cx.beginPath();
      cx.rect(ox, oy, C, C);
      cx.clip();
      // Ziegel wie am Viadukt.
      cx.fillStyle = '#5c3326';
      cx.fillRect(ox, oy, C, C);
      for (let row = 0, y = oy; y < oy + C; row++, y += 7) {
        for (let x = ox - (row % 2) * 11; x < ox + C; x += 22) {
          const v = 70 + r() * 40;
          cx.fillStyle = `rgb(${v + 30},${v * 0.48},${v * 0.36})`;
          cx.fillRect(x + 1, y + 1, 20, 5);
        }
      }
      // Lünette: Halbkreis über dem Kämpfer, Glas zwischen Strahlensprossen.
      const lx = X(W / 2);
      const ly = Y(SP);
      const R = (W / 2 - 0.25) * sx;
      // Mit Licht: Schein von den Lampen im Raum, nach oben ins dunkle Gewölbe abnehmend.
      // Ohne Licht: dunkles Glas, in dem sich der Platz schwach spiegelt.
      const glass = (ctx, warm) => {
        const g = ctx.createLinearGradient(0, ly, 0, ly - R);
        if (warm) {
          g.addColorStop(0, '#d89048');
          g.addColorStop(0.45, '#8a4a1c');
          g.addColorStop(1, '#2e180a');
        } else {
          g.addColorStop(0, '#3a434a');
          g.addColorStop(1, '#232a30');
        }
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(lx, ly, R, Math.PI, 0);
        ctx.closePath();
        ctx.fill();
        if (!warm) {
          ctx.save();
          ctx.clip();
          ctx.fillStyle = 'rgba(150,165,180,0.12)';
          for (const off of [-0.35, 0.1]) {
            ctx.beginPath();
            ctx.moveTo(lx + R * off, ly);
            ctx.lineTo(lx + R * (off + 0.22), ly);
            ctx.lineTo(lx + R * (off + 0.62), ly - R);
            ctx.lineTo(lx + R * (off + 0.4), ly - R);
            ctx.fill();
          }
          ctx.restore();
        }
      };
      glass(cx, lit);
      if (lit) glass(gx, true);
      const mullions = (ctx) => {
        ctx.strokeStyle = '#141414';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(lx, ly, R, Math.PI, 0);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(lx, ly, R * 0.55, Math.PI, 0);
        ctx.stroke();
        for (let k = 1; k < 12; k++) {
          const a = Math.PI + (k / 12) * Math.PI;
          const inner = k % 2 ? R * 0.55 : R * 0.12;
          ctx.beginPath();
          ctx.moveTo(lx + Math.cos(a) * inner, ly + Math.sin(a) * inner);
          ctx.lineTo(lx + Math.cos(a) * R, ly + Math.sin(a) * R);
          ctx.stroke();
        }
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(X(0), ly);
        ctx.lineTo(X(W), ly);
        ctx.stroke();
      };
      mullions(cx);
      mullions(gx);
      // Sprossenfenster mit Licht dahinter; curtain: Scheibengardine in der unteren Hälfte.
      const pane = (x0, y0, x1, y1, cols, rows, frame, curtain) => {
        rect(cx, x0 - 0.12, y0 - 0.12, x1 + 0.12, y1 + 0.12, frame);
        const paint = (ctx, isGlow) => {
          const g = ctx.createLinearGradient(0, Y(y1), 0, Y(y0));
          if (lit) {
            g.addColorStop(0, isGlow ? '#c8782c' : '#e0a050');
            g.addColorStop(1, isGlow ? '#ffc070' : '#f0c27a');
          } else {
            g.addColorStop(0, '#181c20');
            g.addColorStop(1, '#262b30');
          }
          rect(ctx, x0, y0, x1, y1, g);
          if (curtain && lit) {
            const cy = y0 + (y1 - y0) * 0.5;
            rect(ctx, x0, y0, x1, cy, isGlow ? 'rgba(255,214,150,0.9)' : 'rgba(236,222,196,0.95)');
            ctx.fillStyle = isGlow ? 'rgba(60,30,10,0.35)' : 'rgba(120,100,80,0.35)';
            for (let px = X(x0); px < X(x1); px += 9) {
              for (let py = Y(cy); py < Y(y0); py += 9) ctx.fillRect(px + ((py / 9) % 2) * 4, py, 3, 3);
            }
          }
          ctx.fillStyle = '#121212';
          for (let c = 1; c < cols; c++) ctx.fillRect(X(x0 + ((x1 - x0) * c) / cols) - 2, Y(y1), 4, (y1 - y0) * sy);
          for (let k = 1; k < rows; k++) ctx.fillRect(X(x0), Y(y0 + ((y1 - y0) * k) / rows) - 2, (x1 - x0) * sx, 4);
        };
        paint(cx, false);
        if (lit) paint(gx, true);
      };
      const lettering = (text, x, y, size, style, font = '"EB Garamond", serif') => {
        cx.font = `${size}px ${font}`;
        cx.fillStyle = style;
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.fillText(text, X(x), Y(y), (W - 1) * sx);
      };
      const planks = (x0, y0, x1, y1, base) => {
        rect(cx, x0, y0, x1, y1, base);
        cx.fillStyle = 'rgba(0,0,0,0.35)';
        for (let x = x0; x < x1; x += 0.16) cx.fillRect(X(x), Y(y1), 2, (y1 - y0) * sy);
      };
      if (cell === 0) {
        // Destille: grüne Holzfront mit Firmenschild, zwei Fenster mit Gardinen, Tür in der Mitte.
        rect(cx, 0.25, 0, W - 0.25, 4.0, '#22301f');
        rect(cx, 0.25, 3.3, W - 0.25, 3.95, '#0f1410');
        lettering('Destillation  ·  Bier-Ausschank', W / 2, 3.62, 40, '#d8b56a', '"UnifrakturMaguntia", serif');
        pane(0.8, 1.0, 3.5, 3.0, 3, 4, '#2c3c28', true);
        pane(5.3, 1.0, 8.0, 3.0, 3, 4, '#2c3c28', true);
        rect(cx, 3.85, 0, 4.95, 2.75, '#1a2418');
        pane(4.05, 1.5, 4.75, 2.55, 2, 2, '#1a2418', false);
        pane(3.95, 2.82, 4.85, 3.2, 3, 1, '#1a2418', false);
      } else if (cell === 1) {
        // Schlosserei: großes Werkstattfenster mit vielen Scheiben, Schatten von Werkzeug.
        pane(0.6, 0.9, 5.6, 3.6, 8, 5, '#2a2622', false);
        gx.fillStyle = 'rgba(0,0,0,0.55)';
        cx.fillStyle = 'rgba(30,20,10,0.5)';
        for (const ctx of [cx, gx]) {
          ctx.fillRect(X(0.9), Y(1.6), 4.2 * sx, 0.12 * sy);
          for (let k = 0; k < 9; k++) ctx.fillRect(X(1.1 + k * 0.42), Y(3.2), 0.05 * sx, (0.3 + (k % 3) * 0.12) * sy);
          ctx.beginPath();
          ctx.arc(X(4.6), Y(2.4), 0.35 * sx, 0, Math.PI * 2);
          ctx.fill();
        }
        planks(6.3, 0, 7.6, 2.6, '#3a2a1c');
        rect(cx, 0.6, 3.72, 5.6, 4.02, '#1c1a16');
        lettering('Schlosserei  C. Brandt', 3.1, 3.87, 26, '#e6dcc2');
      } else if (cell === 2) {
        // Kohlenhandlung: zweiflügliges Tor, Schrift direkt auf den Ziegeln.
        planks(2.6, 0, 6.2, 3.4, '#2e241a');
        rect(cx, 4.37, 0, 4.43, 3.4, '#120e0a');
        for (const y of [0.6, 2.8]) rect(cx, 2.6, y, 6.2, y + 0.12, '#1e1810');
        pane(0.9, 1.7, 1.9, 2.8, 2, 2, '#241c14', false);
        pane(6.9, 1.7, 7.9, 2.8, 2, 2, '#241c14', false);
        lettering('KOHLEN  ·  KOKS  ·  BRIKETTS', W / 2, 3.72, 34, 'rgba(232,226,210,0.85)');
      } else {
        // Speditionslager: Doppeltür, kleine vergitterte Fenster, verblasste Schrift.
        planks(3.4, 0, 5.4, 2.9, '#33291f');
        rect(cx, 4.37, 0, 4.43, 2.9, '#120e0a');
        for (const x0 of [1.0, 6.6]) {
          pane(x0, 2.3, x0 + 1.2, 3.2, 1, 1, '#1e1a16', false);
          cx.fillStyle = '#0c0c0c';
          for (let k = 1; k < 5; k++) cx.fillRect(X(x0 + k * 0.24) - 2, Y(3.2), 4, 0.9 * sy);
        }
        lettering('Speditions-Lager  A. Kunze', W / 2, 3.68, 34, 'rgba(220,214,196,0.55)');
      }
      cx.restore();
    }
    const map = tex(color);
    map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping;
    const emissiveMap = tex(glow);
    emissiveMap.wrapS = emissiveMap.wrapT = THREE.ClampToEdgeWrapping;
    return { map, emissiveMap };
  });
}

// Fenster der Bahnhofshalle Börse: Stichbogen mit Sprossen, warmes Licht der Bahnsteige.
export function hallWindow() {
  return cached('hallWindow', () => {
    const c = canvas(256, 128);
    const ctx = c.getContext('2d');
    const shape = () => {
      ctx.beginPath();
      ctx.moveTo(8, 124);
      ctx.lineTo(8, 34);
      ctx.quadraticCurveTo(128, -6, 248, 34);
      ctx.lineTo(248, 124);
      ctx.closePath();
    };
    shape();
    ctx.fillStyle = '#16120e';
    ctx.fill();
    ctx.save();
    ctx.translate(128, 64);
    ctx.scale(0.93, 0.86);
    ctx.translate(-128, -64);
    shape();
    const g = ctx.createLinearGradient(0, 10, 0, 124);
    g.addColorStop(0, '#ffe2a8');
    g.addColorStop(0.6, '#f0b060');
    g.addColorStop(1, '#a8601e');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
    // Lampenkugeln unter dem Hallendach.
    for (const x of [70, 186]) {
      const l = ctx.createRadialGradient(x, 40, 1, x, 40, 22);
      l.addColorStop(0, 'rgba(255,250,230,1)');
      l.addColorStop(1, 'rgba(255,230,170,0)');
      ctx.fillStyle = l;
      ctx.fillRect(x - 24, 16, 48, 48);
    }
    ctx.fillStyle = '#16120e';
    for (const x of [70, 128, 186]) ctx.fillRect(x - 3, 0, 6, 128);
    for (const x of [41, 99, 157, 215]) ctx.fillRect(x - 1.5, 0, 3, 128);
    for (const y of [62, 94]) ctx.fillRect(0, y - 2, 256, 4);
    const t = tex(c);
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });
}
