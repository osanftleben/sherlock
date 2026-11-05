import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

// Letzter Schritt: etwas Fotografie von 1892 – Vignette, Korn, leichte Tonung, Überblendung.
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    fade: { value: 0 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float fade;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec3 c = texture2D(tDiffuse, vUv).rgb;
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

export class View {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = false;
    this.camera = new THREE.PerspectiveCamera(68, 1, 0.08, 700);

    this.pixelRatio = Math.min(devicePixelRatio, 1.5);
    this.renderer.setPixelRatio(this.pixelRatio);

    const target = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.renderPass = new RenderPass(new THREE.Scene(), this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(4, 4), 0.32, 0.5, 1.0);
    this.grade = new ShaderPass(GradeShader);
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(this.grade);

    this.fade = 1;
    this.fadeTarget = 0;
    this.slowTime = 0;
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
    this.composer.setPixelRatio(this.pixelRatio);
    this.composer.setSize(w, h);
  }

  setLocation(location) {
    this.renderPass.scene = location.scene;
    this.renderer.toneMappingExposure = 1.15 * location.exposure;
  }

  // Schwache Rechner: erst die Auflösung senken, dann das Leuchten abschalten.
  adapt(dt) {
    this.slowTime = dt > 1 / 28 ? this.slowTime + dt : Math.max(0, this.slowTime - dt);
    if (this.slowTime < 3) return;
    this.slowTime = 0;
    if (this.pixelRatio > 0.75) {
      this.pixelRatio = Math.max(0.75, this.pixelRatio - 0.25);
      this.resize();
    } else if (this.bloom.enabled) {
      this.bloom.enabled = false;
    }
  }

  render(dt, time) {
    this.fade += (this.fadeTarget - this.fade) * Math.min(1, dt * 5);
    this.grade.uniforms.fade.value = this.fade;
    this.grade.uniforms.time.value = time % 10;
    this.composer.render(dt);
  }
}
