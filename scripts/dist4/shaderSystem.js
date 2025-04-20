// dist4/shaderSystem.js
import * as THREE from 'three';
const UNIFORM_SIZE = 100;

export function getUniformPoints(points) {
  const arr = [];
  for (let i = 0; i < UNIFORM_SIZE; i++) {
    if (i < points.length) {
      const p = points[i];
      arr.push(new THREE.Vector4(p.x, p.y, p.frequency, p.amplitude));
    } else {
      arr.push(new THREE.Vector4(0, 0, 0, 0));
    }
  }
  return arr;
}

export function getUniformPhases(points) {
  const arr = [];
  for (let i = 0; i < UNIFORM_SIZE; i++) {
    if (i < points.length) {
      arr.push(points[i].phase);
    } else {
      arr.push(0);
    }
  }
  return arr;
}

export function setupShaderSystem(scene) {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPoints:    { value: [] },
      uPhases:    { value: [] },
      uPointCount:{ value: 0 },
      uBlendMode: { value: 0 },    // 0: add, 1: subtract, 2: multiply, 3: normalize, 4: min, 5: max, 6: average
      uSumAmp:    { value: 1.0 },  // sum of all point amplitudes
      uMapMode:   { value: 0 },    // 0: clip [-1..1], 1: remap to [0..1]
      uResolution:{ value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec4  uPoints[100];
      uniform float uPhases[100];
      uniform int   uPointCount;
      uniform int   uBlendMode;
      uniform float uSumAmp;
      uniform int   uMapMode;
      uniform vec2  uResolution;
      varying vec2  vUv;

      void main() {
        float value  = 0.0;
        float sum    = 0.0;
        float count  = float(uPointCount);
        float minVal = 9999.0;
        float maxVal = -9999.0;
        float prod   = 1.0;

        for (int i = 0; i < uPointCount; i++) {
          vec2  center = uPoints[i].xy;
          float freq   = uPoints[i].z;
          float amp    = uPoints[i].w;
          float phase  = uPhases[i];
          float dist   = distance(vUv, center);
          float sinVal = amp * sin(dist * freq + phase);
          float circle = smoothstep(0.02, 0.015, dist);

          if (uBlendMode == 0) {
            value += sinVal;
          } else if (uBlendMode == 1) {
            value -= sinVal;
          } else if (uBlendMode == 2) {
            prod *= sinVal;
          } else if (uBlendMode == 3) {
            sum += sinVal;
          } else if (uBlendMode == 4) {
            minVal = min(minVal, sinVal);
          } else if (uBlendMode == 5) {
            maxVal = max(maxVal, sinVal);
          } else if (uBlendMode == 6) {
            sum += sinVal;
          }

          // overlay circle highlight
          value = mix(value, 1.0, circle);
        }

        // finalize based on blend mode
        if (uBlendMode == 2) {
          value = prod;
        } else if (uBlendMode == 3 && count > 0.0) {
          value = sum / count;
        } else if (uBlendMode == 4) {
          value = minVal;
        } else if (uBlendMode == 5) {
          value = maxVal;
        } else if (uBlendMode == 6 && count > 0.0) {
          value = sum / count;
        }

        // normalize add/subtract and average to [-1..1]
        if (uBlendMode == 0 || uBlendMode == 1) {
          if (uSumAmp > 0.0) value = value / uSumAmp;
        } else if (uBlendMode == 6 && count > 0.0) {
          float meanAmp = uSumAmp / count;
          if (meanAmp > 0.0) value = value / meanAmp;
        }

        // optional remap to [0..1]
        if (uMapMode == 1) {
          value = value * 0.5 + 0.5;
        }

        gl_FragColor = vec4(vec3(value), 1.0);
      }
    `
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const plane    = new THREE.Mesh(geometry, material);
  scene.add(plane);

  return { material };
}
