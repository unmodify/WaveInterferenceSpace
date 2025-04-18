import * as THREE from 'three';
import * as dat from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

export default function () {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // Shader material with uniforms for center, frequency, amplitude, phase
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uFrequency: { value: 10.0 },
      uAmplitude: { value: 1.0 },
      uPhase: { value: 0.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec2 uCenter;
      uniform float uFrequency;
      uniform float uAmplitude;
      uniform float uPhase;
      varying vec2 vUv;
      void main() {
        float dist = distance(vUv, uCenter);
        float value = uAmplitude * sin(dist * uFrequency + uPhase);
        gl_FragColor = vec4(value, value, value, 1.0);
      }
    `
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // GUI setup
  const gui = new dat.GUI();
  const params = {
    centerX: 0.5,
    centerY: 0.5,
    frequency: 10.0,
    amplitude: 1.0,
    phase: 0.0
  };

  gui.add(params, 'centerX', 0, 1).onChange(value => {
    material.uniforms.uCenter.value.x = value;
  });
  gui.add(params, 'centerY', 0, 1).onChange(value => {
    material.uniforms.uCenter.value.y = value;
  });
  gui.add(params, 'frequency', 1, 500).onChange(value => {
    material.uniforms.uFrequency.value = value;
  });
  gui.add(params, 'amplitude', 0, 2).onChange(value => {
    material.uniforms.uAmplitude.value = value;
  });
  gui.add(params, 'phase', -Math.PI, Math.PI).onChange(value => {
    material.uniforms.uPhase.value = value;
  });

  function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
  }
  animate();
}