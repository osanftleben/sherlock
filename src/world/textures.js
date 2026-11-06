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
