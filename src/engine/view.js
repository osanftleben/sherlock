import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

// Schlussbild in einem Durchgang: Szene plus Leuchten, Tonwerte (ACES), sRGB und etwas Fotografie
// von 1892 – leichte Tonung, Vignette, Korn, Überblendung.
const FinalShader = {
  uniforms: {
    tScene: { value: null },
    tGlow: { value: null },
    glow: { value: 1 },
    sharpen: { value: 0 },
    texel: { value: new THREE.Vector2() },
    toneMappingExposure: { value: 1 },
    time: { value: 0 },
    fade: { value: 0 },
  },
  vertexShader: `
    precision highp float;
    attribute vec3 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tScene;
    uniform sampler2D tGlow;
    uniform float glow;
    uniform float sharpen;
    uniform vec2 texel;
    uniform float time;
    uniform float fade;
    varying vec2 vUv;
    #include <tonemapping_pars_fragment>
    #include <colorspace_pars_fragment>
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tScene, vUv).rgb;
      if (sharpen > 0.0) {
        // Szene in verringerter Auflösung: beim Hochskalieren leicht nachschärfen.
        vec3 n = texture2D(tScene, vUv + vec2(texel.x, 0.0)).rgb + texture2D(tScene, vUv - vec2(texel.x, 0.0)).rgb
               + texture2D(tScene, vUv + vec2(0.0, texel.y)).rgb + texture2D(tScene, vUv - vec2(0.0, texel.y)).rgb;
        c = max(vec3(0.0), c + (c - n * 0.25) * sharpen);
      }
      c += texture2D(tGlow, vUv).rgb * glow;
      c = ACESFilmicToneMapping(c);
      c = sRGBTransferOETF(vec4(c, 1.0)).rgb;
      float l = dot(c, vec3(0.3, 0.59, 0.11));
      c = mix(c, vec3(l), 0.16);
      c *= mix(vec3(0.94, 0.97, 1.05), vec3(1.05, 1.0, 0.92), smoothstep(0.05, 0.7, l));
      vec2 p = vUv - 0.5;
      c *= 1.0 - dot(p, p) * 0.95;
      c += (hash(vUv * vec2(1920.0, 1080.0) + time) - 0.5) * 0.022;
      c *= 1.0 - fade;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

// Belichtungsmesser für die Augenanpassung: teilt die (lineare, noch unbelichtete) Szene in
// 16 × 9 Felder und schreibt je Feld den Mittelwert des Logarithmus der Leuchtdichte aus 16
// Proben. Der Wert (log2 von -14 bis 4) steht auf zwei Bytes verteilt in Rot und Grün, damit
// er sich fein genug auslesen lässt.
const METER = { cols: 16, rows: 9, lo: -14, hi: 4 };
const MeterShader = {
  uniforms: { tScene: { value: null } },
  vertexShader: FinalShader.vertexShader,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tScene;
    varying vec2 vUv;
    void main() {
      vec2 cells = vec2(${METER.cols}.0, ${METER.rows}.0);
      vec2 cell = floor(vUv * cells);
      float sum = 0.0;
      for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4; j++) {
          vec2 uv = (cell + (vec2(float(i), float(j)) + 0.5) / 4.0) / cells;
          float l = dot(texture2D(tScene, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
          sum += log2(max(l, 1e-5));
        }
      }
      float v = clamp((sum / 16.0 - (${METER.lo}.0)) / (${METER.hi - METER.lo}.0), 0.0, 1.0) * 255.0;
      gl_FragColor = vec4(floor(v) / 255.0, fract(v), 0.0, 1.0);
    }
  `,
};

// Augenanpassung: Ist das Bild dunkler als eine gewöhnliche Straßenecke bei Nacht, öffnet sich
// das Auge langsam (einige Sekunden), vor Hellem schließt es sich rascher. Nur teilweise und in
// Grenzen, damit die Nacht Nacht bleibt und dunkle Ecken nicht zu grauem Brei werden.
const EYE = {
  // Bereich der mittleren log2-Leuchtdichte, in dem nichts nachgeregelt wird. Gemessen an den
  // Standpunkten von ?messen: Straßen und Plätze -4,9 bis -6,7, Stuben -5,0 bis -5,5; darunter
  // Viadukt und Spree (-7), der Hof (-7,2 bis -7,6) und die Tordurchfahrt (-8).
  low: -6.6,
  high: -4.4,
  // Anteil, um den das Auge den Abstand zu diesem Bereich ausgleicht (1 = ganz).
  strength: 0.7,
  // Grenzen des Faktors auf die Belichtung.
  min: 0.75,
  max: 2.1,
  // Zeitkonstanten in Sekunden: ins Dunkle, ins Helle.
  open: 2.4,
  close: 0.7,
  // Abstand der Messungen in Sekunden.
  every: 0.2,
};

class Eye {
  constructor(renderer, scene) {
    this.renderer = renderer;
    this.target = new THREE.WebGLRenderTarget(METER.cols, METER.rows, { depthBuffer: false });
    this.material = new THREE.RawShaderMaterial({ ...MeterShader, uniforms: { tScene: { value: scene } }, depthTest: false, depthWrite: false });
    this.quad = new FullScreenQuad(this.material);
    this.pixels = new Uint8Array(METER.cols * METER.rows * 4);
    this.wait = 0;
    this.busy = false;
    // Gemessene mittlere log2-Leuchtdichte (null bis zur ersten Messung) und aktueller Faktor.
    this.level = null;
    this.factor = 1;
    this.enabled = true;
  }

  // Misst in Abständen (asynchron, ohne auf die Grafikkarte zu warten) und führt den Faktor nach.
  update(dt) {
    if (!this.enabled) {
      this.factor = 1;
      return;
    }
    this.wait -= dt;
    if (this.wait <= 0 && !this.busy) {
      this.wait = EYE.every;
      this.measure();
    }
    if (this.level === null) return;
    const off = this.level < EYE.low ? EYE.low - this.level : this.level > EYE.high ? EYE.high - this.level : 0;
    const stops = THREE.MathUtils.clamp(EYE.strength * off, Math.log2(EYE.min), Math.log2(EYE.max));
    const goal = 2 ** stops;
    const tau = goal > this.factor ? EYE.open : EYE.close;
    this.factor += (goal - this.factor) * Math.min(1, dt / tau);
  }

  measure() {
    const r = this.renderer;
    r.setRenderTarget(this.target);
    this.quad.render(r);
    this.busy = true;
    r.readRenderTargetPixelsAsync(this.target, 0, 0, METER.cols, METER.rows, this.pixels)
      .then(() => {
        // Mitte stärker gewichtet: Dorthin schaut man.
        const p = this.pixels;
        let sum = 0;
        let weight = 0;
        for (let y = 0; y < METER.rows; y++) {
          for (let x = 0; x < METER.cols; x++) {
            const i = (y * METER.cols + x) * 4;
            const v = (p[i] + p[i + 1] / 255) / 255;
            const dx = (x + 0.5) / METER.cols - 0.5;
            const dy = (y + 0.5) / METER.rows - 0.5;
            const w = 1 - 1.4 * (dx * dx + dy * dy);
            sum += (METER.lo + v * (METER.hi - METER.lo)) * w;
            weight += w;
          }
        }
        this.level = sum / weight;
      })
      .catch(() => {
        this.enabled = false;
      })
      .finally(() => {
        this.busy = false;
      });
  }
}

// Leuchten wie UnrealBloomPass, aber ohne den teuren letzten Schritt zurück in volle Auflösung:
// Das Ergebnis bleibt in halber Auflösung liegen und wird erst im Schlussbild addiert.
class Glow extends UnrealBloomPass {
  get texture() {
    return this.renderTargetsHorizontal[0].texture;
  }

  draw(renderer, input) {
    const quad = this._fsQuad;
    this.highPassUniforms.tDiffuse.value = input.texture;
    this.highPassUniforms.luminosityThreshold.value = this.threshold;
    quad.material = this.materialHighPassFilter;
    renderer.setRenderTarget(this.renderTargetBright);
    quad.render(renderer);

    let source = this.renderTargetBright;
    for (let i = 0; i < this.nMips; i++) {
      const blur = this.separableBlurMaterials[i];
      quad.material = blur;
      blur.uniforms.colorTexture.value = source.texture;
      blur.uniforms.direction.value = UnrealBloomPass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
      quad.render(renderer);
      blur.uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture;
      blur.uniforms.direction.value = UnrealBloomPass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetsVertical[i]);
      quad.render(renderer);
      source = this.renderTargetsVertical[i];
    }

    quad.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength;
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius;
    renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
    quad.render(renderer);
  }
}

// Misst die GPU-Zeit einzelner Durchgänge (wo der Browser Zeitabfragen erlaubt).
// Abfragen sind asynchron: Ergebnisse kommen ein paar Bilder später über poll().
class GpuClock {
  constructor(gl) {
    this.gl = gl;
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2');
    this.pending = [];
    this.active = null;
  }

  begin(label) {
    if (!this.ext || this.pending.length > 24) return;
    this.active = { label, query: this.gl.createQuery() };
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.active.query);
  }

  end() {
    if (!this.active) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.active);
    this.active = null;
  }

  // Fertige Messungen als { label, ms }, älteste zuerst.
  poll() {
    const { gl, ext } = this;
    const out = [];
    if (!ext) return out;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT);
    while (this.pending.length && gl.getQueryParameter(this.pending[0].query, gl.QUERY_RESULT_AVAILABLE)) {
      const { label, query } = this.pending.shift();
      if (!disjoint) out.push({ label, ms: gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 });
      gl.deleteQuery(query);
    }
    return out;
  }
}

export const STAGES = ['Szene', 'Leuchten', 'Schluss'];

// Ziel: mindestens 60 Bilder je Sekunde (16,7 ms). Die Grafikkarte bekommt 15,5 ms je Bild, der Rest bleibt
// für Browser und Bildschirmausgabe. Auf einem Rundgang durch Fall 1 (Iris Xe, 1080p) waren bei 13,5,
// 14,5 und 15,5 ms gleich wenige Bilder verspätet (0,5 %); mit 15,5 ms bleibt die Auflösung bei 95–100 %.
const BUDGET = 15.5;

// Alles Feste wirft und empfängt Schatten; Leuchtendes und Glas nicht. Erst beim Betreten,
// damit auch die Figuren erfasst sind, die der Fall an die Anker stellt.
function castShadows(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.receiveShadow = true;
    o.castShadow = !mats.some((m) => m.isMeshBasicMaterial || m.transparent);
  });
}
const MIN_SCALE = 0.6;

export class View {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    // Tonwerte erst im Schlussbild; die Szene landet linear in einem Fließkomma-Puffer.
    this.renderer.toneMapping = THREE.NoToneMapping;
    // Schatten nur von Lichtern, die ein Ort ausdrücklich dafür vorsieht (Room.shadows). Die Karte
    // entsteht einmal beim Betreten des Ortes statt in jedem Bild: Möbel und Figuren stehen still.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.shadowScene = null;
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.08, 700);
    this.scene = new THREE.Scene();
    this.exposure = 1.15;

    this.pixelRatio = Math.min(devicePixelRatio, 1.5);
    // Nur die Szene wird geglättet (MSAA); alle Nachbearbeitung läuft ohne. Der Puffer ist
    // R11G11B10F: Fließkomma für das Leuchten der Laternen, aber halb so breit wie RGBA16F. Löschen
    // und Auflösen des 4×-Puffers kosten in 1080p sonst allein mehrere Millisekunden.
    const compact = this.renderer.extensions.has('EXT_color_buffer_float');
    this.target = new THREE.WebGLRenderTarget(4, 4, compact
      ? { format: THREE.RGBFormat, type: THREE.UnsignedInt101111Type, samples: 4 }
      : { type: THREE.HalfFloatType, samples: 4 });
    this.glow = new Glow(new THREE.Vector2(4, 4), 0.32, 0.5, 1.0);
    this.final = new THREE.RawShaderMaterial({ ...FinalShader, uniforms: THREE.UniformsUtils.clone(FinalShader.uniforms), depthTest: false, depthWrite: false });
    this.final.uniforms.tScene.value = this.target.texture;
    this.final.uniforms.tGlow.value = this.glow.texture;
    this.quad = new FullScreenQuad(this.final);
    this.eye = new Eye(this.renderer, this.target.texture);

    this.fade = 1;
    this.fadeTarget = 0;
    // Innere Auflösung der Szene relativ zur Leinwand; die Regelung in adapt() hält damit 60 FPS.
    this.scale = 1;
    // GPU-Zeit je Bild, auf die die Regelung zielt (ms); Messwerkzeuge dürfen sie verstellen.
    this.budget = BUDGET;
    this.clock = new GpuClock(this.renderer.getContext());
    this.gpuMs = 0;
    this.sample = { time: 0, sum: 0, n: 0, slow: 0, frames: 0 };
    // Für Messwerkzeuge: Rückruf je fertiger GPU-Messung, Zeichenaufrufe und Dreiecke der Szene.
    this.onTiming = null;
    this.sceneInfo = { calls: 0, triangles: 0 };
    this.locked = false;
    this.resize();
    addEventListener('resize', () => this.resize());
  }

  resize() {
    const w = innerWidth;
    const h = innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(w, h, false);
    this.sizeScene();
  }

  sizeScene() {
    const pw = Math.max(1, Math.round(innerWidth * this.pixelRatio * this.scale));
    const ph = Math.max(1, Math.round(innerHeight * this.pixelRatio * this.scale));
    this.target.setSize(pw, ph);
    this.glow.setSize(pw, ph);
    this.final.uniforms.texel.value.set(1 / pw, 1 / ph);
    this.final.uniforms.sharpen.value = this.scale < 0.99 ? Math.min(0.5, (1 - this.scale) * 1.4) : 0;
  }

  setLocation(location) {
    this.scene = location.scene;
    this.exposure = 1.15 * location.exposure;
  }

  // Übersetzt die Shader der Szenen vorab, im Hintergrund und parallel, soweit der Browser das kann
  // (KHR_parallel_shader_compile). Ziel muss der Fließkomma-Puffer sein, in den render() zeichnet:
  // Dafür baut three.js eine eigene Variante mit linearer statt sRGB-Ausgabe. Ohne das Ziel
  // entstanden nur Programme, die nie benutzt wurden, und die richtigen übersetzte erst das erste
  // Bild eines Ortes, eines nach dem anderen.
  compile(scenes) {
    const r = this.renderer;
    const before = r.getRenderTarget();
    r.setRenderTarget(this.target);
    const done = scenes.map((scene) => r.compileAsync(scene, this.camera));
    r.setRenderTarget(before);
    return Promise.all(done);
  }

  // Regelt die innere Auflösung nach der gemessenen GPU-Zeit: über dem Budget sofort herunter,
  // mit viel Luft langsam wieder hinauf. Ohne Zeitabfragen zählt der Browser verspätete Bilder.
  // Reicht die kleinste Auflösung nicht, fällt das Leuchten weg.
  adapt(dt) {
    const s = this.sample;
    for (const t of this.clock.poll()) {
      s.sum += t.ms;
      if (t.label === 'Schluss') s.n++;
      if (this.onTiming) this.onTiming(t);
    }
    s.time += dt;
    s.frames++;
    if (dt > 1 / 50) s.slow++;
    if (s.time < 0.5 || this.locked) {
      if (this.locked) Object.assign(s, { time: 0, sum: 0, n: 0, slow: 0, frames: 0 });
      return;
    }

    let scale = this.scale;
    if (this.clock.ext) {
      if (s.n >= 8) {
        const ms = (this.gpuMs = s.sum / s.n);
        if (ms > this.budget * 1.05) scale = Math.max(scale - 0.15, scale * Math.sqrt(this.budget / ms) - 0.02);
        else if (ms < this.budget * 0.78) scale += 0.05;
        if (ms > this.budget * 1.2 && this.scale <= MIN_SCALE) this.glow.enabled = false;
      }
    } else if (s.slow > s.frames * 0.25) {
      scale -= 0.1;
      if (this.scale <= MIN_SCALE) this.glow.enabled = false;
    }
    Object.assign(s, { time: 0, sum: 0, n: 0, slow: 0, frames: 0 });

    scale = Math.min(1, Math.max(MIN_SCALE, Math.round(scale * 20) / 20));
    if (scale !== this.scale) {
      this.scale = scale;
      this.sizeScene();
    }
  }

  // Für Messungen: feste innere Auflösung, Regelung aus. lockScale(null) gibt sie wieder frei.
  lockScale(scale) {
    this.locked = scale !== null;
    if (this.locked) {
      this.scale = scale;
      this.glow.enabled = true;
      this.sizeScene();
    }
  }

  render(dt, time) {
    const r = this.renderer;
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, dt * 5);

    this.clock.begin('Szene');
    r.setRenderTarget(this.target);
    if (this.shadowScene !== this.scene) {
      this.shadowScene = this.scene;
      if (this.scene.userData.shadows) castShadows(this.scene);
      r.shadowMap.needsUpdate = true;
    }
    r.render(this.scene, this.camera);
    this.clock.end();
    this.sceneInfo.calls = r.info.render.calls;
    this.sceneInfo.triangles = r.info.render.triangles;
    this.eye.update(dt);

    const clear = r.autoClear;
    r.autoClear = false;
    if (this.glow.enabled) {
      this.clock.begin('Leuchten');
      this.glow.draw(r, this.target);
      this.clock.end();
    }

    const u = this.final.uniforms;
    u.glow.value = this.glow.enabled ? 1 : 0;
    u.toneMappingExposure.value = this.exposure * this.eye.factor;
    u.fade.value = this.fade;
    u.time.value = time % 10;
    this.clock.begin('Schluss');
    r.setRenderTarget(null);
    this.quad.render(r);
    this.clock.end();
    r.autoClear = clear;
  }
}
