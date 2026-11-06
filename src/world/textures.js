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

// Nasses Kopfsteinpflaster: map, normalMap und roughnessMap aus einem Guss.
export function cobble() {
  return cached('cobble', () => {
    const size = 1024;
    const color = canvas(size);
    const height = canvas(size);
    const rough = canvas(size);
    const c = color.getContext('2d');
    const h = height.getContext('2d');
    const r = rng(7);
    c.fillStyle = '#17171a';
    c.fillRect(0, 0, size, size);
    h.fillStyle = '#000';
    h.fillRect(0, 0, size, size);
    const rowH = 26;
    const stoneW = 30;
    for (let row = 0; row * rowH < size; row++) {
      const off = row % 2 ? stoneW / 2 : 0;
      for (let i = -1; i * stoneW < size + stoneW; i++) {
        const x = i * stoneW + off + (r() - 0.5) * 4;
        const y = row * rowH + (r() - 0.5) * 4;
        const w = stoneW - 3 - r() * 3;
        const hh = rowH - 3 - r() * 3;
        const v = 62 + r() * 46;
        const tint = r() * 10;
        c.fillStyle = `rgb(${v + tint},${v + tint * 0.5},${v})`;
        h.fillStyle = `rgb(${130 + r() * 110},${130},${130})`;
        for (const ctx of [c, h]) {
          for (const ox of [0, x + w > size ? -size : 0]) {
            ctx.beginPath();
            ctx.roundRect(x + ox, y, w, hh, 7);
            ctx.fill();
          }
        }
      }
    }
    grain(c, size, 16, 3);
    const rc = rough.getContext('2d');
    rc.fillStyle = 'rgb(180,180,180)';
    rc.fillRect(0, 0, size, size);
    // Pfützen: glatter und dunkler.
    blotches(rc, size, 22, 40, 150, 'rgba(25,25,25,0.85)', 11);
    blotches(c, size, 22, 40, 150, 'rgba(8,10,14,0.55)', 11);
    return {
      map: tex(color),
      normalMap: tex(normalFromHeight(height, 2.2), { srgb: false }),
      roughnessMap: tex(rough, { srgb: false }),
    };
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
    const s = i === 0 ? size : size * 0.5;
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
export function posterWall() {
  return cached('posters', () => {
    const w = 2048;
    const h = 512;
    const c = canvas(w, h);
    const ctx = c.getContext('2d');
    const r = rng(91);
    ctx.fillStyle = '#6a6252';
    ctx.fillRect(0, 0, w, h);
    const posters = [
      ['#d9c9a0', '#222', 'Wintergarten', 'Varieté · Täglich 8 Uhr'],
      ['#b23a2c', '#f2e4c0', 'Extrablatt', 'Bankhaus Lindner & Sohn · Revision'],
      ['#e5d8b0', '#233', 'Urania', 'Sternwarte · Invalidenstraße'],
      ['#26384a', '#e9d9a8', 'Schultheiss', 'Lagerbier'],
      ['#e0cfa0', '#402010', 'Kaufhaus', 'Mäntel für den Winter'],
      ['#9a2f2a', '#f2e4c0', 'Königl. Oper', 'Der fliegende Holländer'],
      ['#d9c9a0', '#222', 'Zirkus Renz', 'Karlstraße · Pferdedressur'],
      ['#3c4a30', '#e9d9a8', 'Bekanntmachung', 'Kanalbau, Rosenthaler Str.'],
    ];
    const pw = w / posters.length;
    posters.forEach(([bg, fg, title, sub], i) => {
      const x = i * pw + 6;
      const y = 14 + r() * 30;
      const pwh = h - 60 - r() * 30;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((r() - 0.5) * 0.02);
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, pw - 12, pwh);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.font = '56px "UnifrakturMaguntia", serif';
      ctx.fillText(title, (pw - 12) / 2, 130, pw - 30);
      ctx.font = '25px "EB Garamond", serif';
      ctx.fillText(sub, (pw - 12) / 2, 200, pw - 24);
      ctx.fillRect(30, 240, pw - 72, 3);
      ctx.restore();
    });
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
