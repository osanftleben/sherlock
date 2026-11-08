// Gleise der Pferdebahn in der Rosenthaler Straße, ins Pflaster gezeichnet (wetStreet in index.js).
//
// Belegt: Seit 1882 endete eine Linie der Großen Berliner Pferde-Eisenbahn am Hackeschen Markt, und
// seit dem 16. Oktober 1888 fuhr die Neue Berliner Pferdebahn vom Alexanderplatz über Münzstraße und
// Rosenthaler Straße zur Brunnenstraße. Ob die Straße ein- oder zweigleisig war, ließ sich nicht
// finden; hier liegen zwei Gleise, wie in den Hauptstraßen der Zeit üblich.
//
// Rillenschienen in Normalspur, bündig im Pflaster: außen der blank gefahrene Fahrkopf, daneben die
// Rille, in der das Wasser steht, innen die rostige Leitlippe. Gezeichnet im Pflaster-Shader statt als
// Geometrie: Die schmalen Streifen bekommen ihre Pixeldeckung (Kastenfilter über die Pixelbreite quer
// zum Gleis), so werden sie in der Ferne schwächer, statt zu flimmern.
//
// Verlauf: aus dem Norden (hinter der Baustelle biegen die Gleise nach Osten in die Querstraße) die
// Straße herab bis zur Endstelle auf dem Platz. Kurz vor der Endstelle liegt ein Gleiswechsel: Wer auf
// dem westlichen Gleis ankommt, spannt um und fährt über ihn auf das östliche Gleis Richtung Norden.

export const GAUGE = 1.435;
// Gleismitten quer zur Straße; Richtung Süden fährt man rechts, also auf dem westlichen Gleis.
export const TRAM = {
  west: -1.5,
  east: 1.5,
  // Stumpfende auf dem Platz, gut 5 m vor dem Brunnenbecken.
  end: -13,
  // Gleiswechsel zwischen diesen beiden z: im Süden auf dem westlichen, im Norden auf dem östlichen Gleis.
  cross: { south: -26, north: -40 },
  // Bogen nach Osten in die Querstraße um (x, z): das westliche Gleis außen, das östliche innen.
  turn: { x: 9.5, z: -227.5, outer: 11, inner: 8 },
  // So weit läuft das Gleis in der Querstraße nach Osten (dort ist längst alles im Nebel).
  far: 90,
};

// --- Fahrwege ------------------------------------------------------------------------------
// Linien entlang der Gleismitte mit ihrer Bogenlänge s, dicht genug gerastert, dass man dazwischen
// gerade rechnen darf. Hinter den Enden wird geradeaus weitergerechnet.
export class TramPath {
  constructor(points) {
    const n = points.length;
    this.x = new Float64Array(n);
    this.z = new Float64Array(n);
    this.s = new Float64Array(n);
    points.forEach(([x, z], i) => {
      this.x[i] = x;
      this.z[i] = z;
      if (i > 0) this.s[i] = this.s[i - 1] + Math.hypot(x - this.x[i - 1], z - this.z[i - 1]);
    });
    this.length = this.s[n - 1];
  }

  // Abschnitt i mit s[i] <= s < s[i + 1], an den Enden der erste bzw. letzte.
  seek(s) {
    let lo = 0;
    let hi = this.s.length - 2;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.s[mid] <= s) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  }

  // Punkt bei s in out.x / out.z.
  at(s, out) {
    const i = this.seek(s);
    const len = this.s[i + 1] - this.s[i];
    const k = len > 0 ? (s - this.s[i]) / len : 0;
    out.x = this.x[i] + (this.x[i + 1] - this.x[i]) * k;
    out.z = this.z[i] + (this.z[i + 1] - this.z[i]) * k;
    return out;
  }

  // Fahrtrichtung bei s als Einheitsvektor in out.x / out.z.
  dir(s, out) {
    const i = this.seek(s);
    const dx = this.x[i + 1] - this.x[i];
    const dz = this.z[i + 1] - this.z[i];
    const d = Math.hypot(dx, dz) || 1;
    out.x = dx / d;
    out.z = dz / d;
    return out;
  }

  // Erstes s, an dem die Linie die Höhe z (bzw. die Querlage x) erreicht.
  cross(key, v) {
    const a = this[key];
    for (let i = 0; i < a.length - 1; i++) {
      if ((a[i] - v) * (a[i + 1] - v) <= 0 && a[i] !== a[i + 1]) return this.s[i] + ((v - a[i]) / (a[i + 1] - a[i])) * (this.s[i + 1] - this.s[i]);
    }
    return null;
  }
}

const smooth = (q) => q * q * (3 - 2 * q);
function line(pts, x1, z1, step = 1) {
  const [x0, z0] = pts[pts.length - 1];
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, z1 - z0) / step));
  for (let i = 1; i <= n; i++) pts.push([x0 + ((x1 - x0) * i) / n, z0 + ((z1 - z0) * i) / n]);
}
function curve(pts, f, n) {
  for (let i = 1; i <= n; i++) pts.push(f(i / n));
}

// Hinein: aus der Querstraße (dort steckt der Wagen noch hinter den Häusern) über den äußeren
// Bogen und das westliche Gleis bis über das Stumpfende hinaus, denn das Pferd geht vor dem Wagen.
// Hinaus: von der Endstelle das westliche Gleis hinauf, über den Gleiswechsel aufs östliche,
// durch den inneren Bogen und die Querstraße hinunter, bis die Häuser den Wagen wieder verdecken.
export const TRAM_HIDE_X = 34;
export function tramPaths() {
  const { west, east, cross, turn } = TRAM;
  const zIn = turn.z - turn.outer;
  const zOut = turn.z - turn.inner;
  const inbound = [[TRAM_HIDE_X, zIn]];
  line(inbound, turn.x, zIn);
  curve(inbound, (q) => [turn.x - turn.outer * Math.sin((q * Math.PI) / 2), turn.z - turn.outer * Math.cos((q * Math.PI) / 2)], 72);
  line(inbound, west, 4);
  const outbound = [[west, -6]];
  line(outbound, west, cross.south);
  curve(outbound, (q) => [west + (east - west) * smooth(q), cross.south - (cross.south - cross.north) * q], 56);
  line(outbound, east, turn.z);
  curve(outbound, (q) => [turn.x - turn.inner * Math.cos((q * Math.PI) / 2), turn.z - turn.inner * Math.sin((q * Math.PI) / 2)], 52);
  line(outbound, TRAM_HIDE_X + 12, zOut);
  return { inbound: new TramPath(inbound), outbound: new TramPath(outbound) };
}

// Querschnitt der Schiene, von der Fahrkante aus nach außen gemessen (Meter).
const HEAD = 0.058;
const GROOVE = 0.034;
const LIP = 0.018;

const f = (v) => Number(v).toFixed(4);

// GLSL: tramRails(xz, dFdx(xz), dFdy(xz)) gibt die Deckung von Fahrkopf (x), Rille (y), Leitlippe (z)
// und dem verschmutzten Pflaster gleich neben der Schiene (w). Die Ableitungen holt der Aufrufer
// außerhalb aller Verzweigungen.
export const TRAM_GLSL = `
float tramBand(float u, float a, float b, float w) {
  return clamp((min(b, u + 0.5 * w) - max(a, u - 0.5 * w)) / w, 0.0, 1.0);
}
// s: Abstand von der Gleismitte quer zum Gleis, w: Pixelbreite in dieser Richtung.
vec4 tramProfile(float s, float w) {
  float u = abs(s) - ${f(GAUGE / 2)};
  return vec4(
    tramBand(u, 0.0, ${f(HEAD)}, w),
    tramBand(u, ${f(-GROOVE)}, 0.0, w),
    tramBand(u, ${f(-GROOVE - LIP)}, ${f(-GROOVE)}, w),
    tramBand(u, ${f(HEAD)}, ${f(HEAD + 0.07)}, w) + tramBand(u, ${f(-GROOVE - LIP - 0.06)}, ${f(-GROOVE - LIP)}, w));
}
vec4 tramRails(vec2 p, vec2 gx, vec2 gy) {
  vec4 c = vec4(0.0);
  float wx = abs(gx.x) + abs(gy.x) + 1e-4;
  float wz = abs(gx.y) + abs(gy.y) + 1e-4;
  // Die beiden Gleise in der Straße, vom Bogen im Norden bis zur Endstelle.
  if (abs(p.x) < 2.8 && p.y < ${f(TRAM.end + 1)} && p.y > ${f(TRAM.turn.z - 1)}) {
    float along = tramBand(p.y, ${f(TRAM.turn.z - 0.3)}, ${f(TRAM.end)}, wz);
    c = max(c, tramProfile(p.x - ${f(TRAM.west)}, wx) * along);
    c = max(c, tramProfile(p.x - ${f(TRAM.east)}, wx) * along);
  }
  // Gleiswechsel als S-Bogen; s quer zum Bogen genähert über die Steigung dx/dz.
  if (abs(p.x) < 3.0 && p.y < ${f(TRAM.cross.south + 1)} && p.y > ${f(TRAM.cross.north - 1)}) {
    float L = ${f(TRAM.cross.south - TRAM.cross.north)};
    float q = clamp((${f(TRAM.cross.south)} - p.y) / L, 0.0, 1.0);
    float x0 = ${f(TRAM.west)} + ${f(TRAM.east - TRAM.west)} * q * q * (3.0 - 2.0 * q);
    float dx = -${f(TRAM.east - TRAM.west)} * 6.0 * q * (1.0 - q) / L;
    float k = inversesqrt(1.0 + dx * dx);
    vec2 n = vec2(1.0, -dx) * k;
    float w = abs(dot(n, gx)) + abs(dot(n, gy)) + 1e-4;
    c = max(c, tramProfile((p.x - x0) * k, w) * tramBand(p.y, ${f(TRAM.cross.north)}, ${f(TRAM.cross.south)}, wz));
  }
  // Bogen in die Querstraße: ein Viertelkreis je Gleis um denselben Mittelpunkt.
  vec2 d = p - vec2(${f(TRAM.turn.x)}, ${f(TRAM.turn.z)});
  if (d.x < 0.5 && d.y < 0.5 && d.x > ${f(-TRAM.turn.outer - 2)} && d.y > ${f(-TRAM.turn.outer - 2)}) {
    float r = length(d);
    vec2 n = d / max(r, 1e-3);
    float w = abs(dot(n, gx)) + abs(dot(n, gy)) + 1e-4;
    float clip = tramBand(d.x, -20.0, 0.0, wx) * tramBand(d.y, -20.0, 0.0, wz);
    c = max(c, tramProfile(r - ${f(TRAM.turn.outer)}, w) * clip);
    c = max(c, tramProfile(r - ${f(TRAM.turn.inner)}, w) * clip);
  }
  // In der Querstraße nach Osten.
  if (d.x > -1.0 && p.x < ${f(TRAM.far + 1)} && d.y < ${f(-TRAM.turn.inner + 2)} && d.y > ${f(-TRAM.turn.outer - 2)}) {
    float along = tramBand(p.x, ${f(TRAM.turn.x - 0.3)}, ${f(TRAM.far)}, wx);
    c = max(c, tramProfile(d.y + ${f(TRAM.turn.outer)}, wz) * along);
    c = max(c, tramProfile(d.y + ${f(TRAM.turn.inner)}, wz) * along);
  }
  return min(c, vec4(1.0));
}
`;
