import * as THREE from 'three';

// Tropfenringe auf stehendem Wasser: in den Pfützen des Pflasters (wetStreet in index.js) und im
// Brunnen am Platz (plaza.js). Kleine Ringe, die sich ausbreiten und das Spiegelbild der Laternen
// kräuseln; ihre schrägen Kämme fangen das Laternenlicht als feine helle Kreise.
// rainTime zählt index.js im Takt der Szene hoch.

export const rainTime = { value: 0 };

export const RIPPLES = `
uniform float rainTime;
float rippleGlint;
float rippleHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
// Ein Ring je Zelle (cell Meter), der in jedem Takt neu und an anderer Stelle einschlägt oder
// aussetzt. Gibt die Neigung der Wasseroberfläche in x und z zurück.
vec2 ripple(vec2 xz, float cell, float seed) {
  vec2 p = xz / cell + seed;
  vec2 id = floor(p);
  float h = rippleHash(id);
  float u = rainTime / (0.9 + h * 1.4) + h * 13.0;
  float cyc = floor(u);
  float ph = fract(u);
  float on = step(rippleHash(id + cyc * 7.31), 0.22);
  vec2 c = vec2(rippleHash(id + cyc * 3.7 + 1.3), rippleHash(id + cyc * 5.1 + 2.9)) * 0.6 + 0.2;
  vec2 d = (fract(p) - c) * cell;
  float r = length(d);
  float x = r - ph * 0.08;
  float fade = (1.0 - ph) * (1.0 - ph);
  return on * fade * sin(x * 110.0) * exp(-x * x * 1400.0) * d / max(r, 0.001);
}`;

// Glanz der Ringkämme, nach lights_fragment_end einzusetzen.
export const RIPPLE_GLINT = `
reflectedLight.directSpecular += rippleGlint * 1.6 * reflectedLight.directDiffuse / max(material.diffuseColor, vec3(0.01));`;

// Ganze Wasserfläche aus MeshStandardMaterial mit Tropfenringen, etwa ein Brunnenbecken.
// key unterscheidet das Shaderprogramm von anderen Materialien.
// clear: Das Wasser ist durchsichtig wie echtes, flaches Wasser. Von oben sieht man den Grund,
// je flacher der Blick, desto mehr spiegelt es (Fresnel, Brechzahl 1,33 → 2 % senkrecht). Das
// Gemischte wird so überblendet, dass Spiegelung und Glanz voll erhalten bleiben und nur der
// Grund dahinter abgedunkelt wird: Farbe + Grund × (1 − Deckung).
// mirror: Spiegelbild aus waterMirror(); es ersetzt die Umgebungskarte und wird von den
// Tropfenringen gekräuselt.
export function rainOnWater(material, key = 'rainOnWater', { clear = false, mirror = null } = {}) {
  if (clear) {
    material.transparent = true;
    material.blending = THREE.CustomBlending;
    material.blendSrc = THREE.OneFactor;
    material.blendDst = THREE.OneMinusSrcAlphaFactor;
  }
  material.onBeforeCompile = (shader) => {
    shader.uniforms.rainTime = rainTime;
    if (mirror) Object.assign(shader.uniforms, mirror.uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWaterPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWaterPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWaterPos;
        vec2 rippleTilt = vec2(0.0);
        ${mirror ? 'uniform sampler2D mirrorMap;\nuniform mat4 mirrorMatrix;\nuniform float mirrorOn;' : ''}
        ${RIPPLES}`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        // In der Ferne, wo ein Pixel mehr als ein paar Zentimeter deckt, flimmerten die Ringe nur.
        float rippleNear = 1.0 - smoothstep(0.025, 0.07, length(fwidth(vWaterPos.xz)));
        rippleGlint = 0.0;
        if (rippleNear > 0.01) {
          vec2 rip = ripple(vWaterPos.xz, 0.45, 0.0) + ripple(vWaterPos.xz, 0.37, 17.3);
          rippleGlint = length(rip) * rippleNear;
          rippleTilt = rip * rippleNear;
          normal = normalize(normal + mat3(viewMatrix) * vec3(rip.x, 0.0, rip.y) * (0.45 * rippleNear));
        }`,
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>${RIPPLE_GLINT}
        ${
          mirror
            ? `// Spiegelbild statt Umgebungskarte; die Ringe verschieben es ein wenig. Gewichtet nach
        // Fresnel, aber kräftiger als physikalisch (Potenz 3 statt 5): Nach reinem Fresnel spiegelte das
        // Becken aus Stehhöhe nur 3 bis 10 %, im dunklen Bild sah man davon so gut wie nichts.
        vec4 mirrorP = mirrorMatrix * vec4(vWaterPos, 1.0);
        vec3 mirrorCol = texture2D(mirrorMap, mirrorP.xy / mirrorP.w + rippleTilt * 0.035).rgb;
        float mirrorF = 1.4 * (0.05 + 0.95 * pow(1.0 - clamp(dot(normal, geometryViewDir), 0.0, 1.0), 3.0));
        reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, mirrorCol * mirrorF, mirrorOn);`
            : ''
        }`,
      );
    if (clear) {
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `float waterFresnel = 0.02 + 0.98 * pow(1.0 - clamp(dot(normal, geometryViewDir), 0.0, 1.0), 5.0);
        // Trübes Stadtwasser: auch senkrecht von oben verschluckt es gut die Hälfte des Grundes.
        diffuseColor.a = mix(0.55, 1.0, waterFresnel);
        #include <opaque_fragment>`,
      );
    }
  };
  material.customProgramCacheKey = () => key;
  return material;
}

// Ebene der Dinge, die sich in Wasserflächen spiegeln (waterMirror). Die ganze Stadt ein zweites
// Mal zu zeichnen kostete am Brunnen 5 ms je Bild; gespiegelt werden darum nur, wer sich dafür
// einträgt: Brunnen, Laternen und Himmel. Lichter kommen von selbst dazu.
export const MIRROR_LAYER = 2;

// Spiegelbild für eine waagerechte Wasserfläche (mesh, Oberfläche in Höhe y). Bevor das Wasser
// gezeichnet wird, rendert eine an der Wasserfläche gespiegelte Kamera alles auf MIRROR_LAYER
// in ein kleines Bild; der Wasser-Shader liest es über mirrorMatrix an der Stelle des Pixels aus.
// Das geschieht nur, wenn das Wasser im Bild ist und die Kamera näher als range Meter steht,
// sonst spiegelt wieder die Umgebungskarte (mirrorOn = 0). Linear und ohne Tonwerte wie die
// Szene selbst (view.js).
export function waterMirror(mesh, y, { size = 512, range = 30 } = {}) {
  const uniforms = {
    mirrorMap: { value: null },
    mirrorMatrix: { value: new THREE.Matrix4() },
    mirrorOn: { value: 0 },
  };
  let target = null;
  const cam = new THREE.PerspectiveCamera();
  cam.layers.set(MIRROR_LAYER);
  let lightsTagged = false;
  const center = new THREE.Vector3();
  const eye = new THREE.Vector3();
  const look = new THREE.Vector3();
  const clip = new THREE.Vector4();
  const q = new THREE.Vector4();
  const plane = new THREE.Plane();
  const up = new THREE.Vector3(0, 1, 0);
  const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  mesh.geometry.computeBoundingSphere();
  center.copy(mesh.geometry.boundingSphere.center).applyMatrix4(mesh.matrixWorld);
  center.y = y;

  mesh.onBeforeRender = (renderer, scene, camera) => {
    eye.setFromMatrixPosition(camera.matrixWorld);
    if (eye.y <= y || eye.distanceTo(center) > range) {
      uniforms.mirrorOn.value = 0;
      return;
    }
    // Lichter werden wie alles andere nach Ebenen ausgewählt; ohne sie bliebe das Spiegelbild schwarz.
    if (!lightsTagged) {
      scene.traverse((o) => o.isLight && o.layers.enable(MIRROR_LAYER));
      lightsTagged = true;
    }
    if (!target) {
      const compact = renderer.extensions.has('EXT_color_buffer_float');
      target = new THREE.WebGLRenderTarget(size, size, compact ? { format: THREE.RGBFormat, type: THREE.UnsignedInt101111Type } : { type: THREE.HalfFloatType });
      uniforms.mirrorMap.value = target.texture;
    }
    // Gespiegelte Kamera: Lage, Blickrichtung und Oben an der Ebene y gespiegelt.
    cam.projectionMatrix.copy(camera.projectionMatrix);
    cam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
    cam.position.set(eye.x, 2 * y - eye.y, eye.z);
    look.set(0, 0, -1).transformDirection(camera.matrixWorld);
    look.y = -look.y;
    cam.up.set(0, 1, 0).transformDirection(camera.matrixWorld);
    cam.up.y = -cam.up.y;
    cam.lookAt(look.add(cam.position));
    cam.updateMatrixWorld();
    uniforms.mirrorMatrix.value.multiplyMatrices(bias, cam.projectionMatrix).multiply(cam.matrixWorldInverse);
    // Schräge nahe Schnittebene auf der Wasserfläche, damit nichts unter Wasser ins Bild kommt.
    plane.setFromNormalAndCoplanarPoint(up, center).applyMatrix4(cam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const p = cam.projectionMatrix.elements;
    q.set((Math.sign(clip.x) + p[8]) / p[0], (Math.sign(clip.y) + p[9]) / p[5], -1, (1 + p[10]) / p[14]);
    clip.multiplyScalar(2 / clip.dot(q));
    p[2] = clip.x;
    p[6] = clip.y;
    p[10] = clip.z + 1;
    p[14] = clip.w;

    const previous = renderer.getRenderTarget();
    const shadows = renderer.shadowMap.autoUpdate;
    renderer.shadowMap.autoUpdate = false;
    mesh.visible = false;
    renderer.setRenderTarget(target);
    renderer.state.buffers.depth.setMask(true);
    if (renderer.autoClear === false) renderer.clear();
    renderer.render(scene, cam);
    mesh.visible = true;
    renderer.shadowMap.autoUpdate = shadows;
    renderer.setRenderTarget(previous);
    uniforms.mirrorOn.value = 1;
  };
  return { uniforms };
}
