import { facadeGrime } from '../textures.js';

// Verwitterte Wände: facadeGrime() in Weltkoordinaten über Putz und Ziegel gelegt, längs der
// Fassade (x + z, weil alle Häuser an achsparallelen Straßen stehen) und in der Höhe. Dazu
// ein dunkler, feuchter Streifen über dem Pflaster, wo der Regen hochspritzt.
// Für Lambert- und Standardmaterialien, mit und ohne Instanzen.
// kind: 'plaster' oder 'brick' (facadeGrime).
export function grimy(material, kind = 'plaster') {
  const grime = facadeGrime(kind);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.grimeMap = { value: grime };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrimePos;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 grimePos = vec4(transformed, 1.0);
        #ifdef USE_INSTANCING
          grimePos = instanceMatrix * grimePos;
        #endif
        vGrimePos = (modelMatrix * grimePos).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D grimeMap;\nvarying vec3 vGrimePos;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float grime = texture2D(grimeMap, vec2((vGrimePos.x + vGrimePos.z) / 8.0, vGrimePos.y / 16.0)).r * 1.6;
        float splash = mix(0.55, 1.0, smoothstep(0.05, 0.9, vGrimePos.y));
        diffuseColor.rgb *= grime * splash;`,
      );
  };
  material.customProgramCacheKey = () => `grimy-${material.type}`;
  return material;
}
