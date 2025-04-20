// dist4/sceneSetup.js
import * as THREE from 'three';

export function createScene() {
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  window.addEventListener("resize", () => {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h);
    camera.updateProjectionMatrix();
    scene.dispatchEvent({ type: "resize", width: w, height: h });
  });

  return { renderer, scene, camera };
}
