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
