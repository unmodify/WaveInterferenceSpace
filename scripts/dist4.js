// main.js
import * as THREE from 'three';
import { setupRenderer, setupSceneAndCamera } from "./dist4/rendererSetup.js";
import { setupShaderSystem, getUniformPoints, getUniformPhases } from "./dist4/shaderSystem.js";
import { setupGuiSystem } from "./dist4/guiSystem.js";
import { fieldValue, getFieldGradient } from "./dist4/forceField.js";
import { setupParticleSystem } from "./dist4/particleSystem.js";
import { setupEventHandlers } from "./dist4/eventHandlers.js";
import { createPoint } from "./dist4/utils.js";

function main_dist4() {
  // Renderer, scene, and camera.
  const renderer = setupRenderer();
  const { scene, camera } = setupSceneAndCamera();

  // Shader system.
  const shader = setupShaderSystem(scene);

  // Initialize points (wave centers).
  const points = [
    createPoint({ x: 0.3, y: 0.3, frequency: 10.0, amplitude: 1.0, phase: 0.0, phaseSpeed: 0 }),
    createPoint({ x: 0.7, y: 0.7, frequency: 15.0, amplitude: 0.8, phase: 1.0, phaseSpeed: 0 })
  ];

  // Update shader uniforms.
  function updateUniforms() {
    shader.material.uniforms.uPoints.value = getUniformPoints(points);
    shader.material.uniforms.uPhases.value = getUniformPhases(points);
    shader.material.uniforms.uPointCount.value = points.length;
  }
  updateUniforms();

  // Circles overlay (reference centers in green).
  const circlesGroup = new THREE.Group();
  scene.add(circlesGroup);
  let circlesVisible = true;
  function updateCircles() {
    circlesGroup.clear();
    for (let i = 0; i < points.length; i++) {
      const circleGeom = new THREE.CircleGeometry(0.03, 32);
      const circleMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
      const circleMesh = new THREE.Mesh(circleGeom, circleMat);
      circleMesh.position.set(points[i].x * 2 - 1, points[i].y * 2 - 1, 0);
      circleMesh.renderOrder = 1;
      circlesGroup.add(circleMesh);
    }
  }
  updateCircles();
  function toggleCircles() {
    circlesVisible = !circlesVisible;
    circlesGroup.visible = circlesVisible;
  }

  // GUI system.
  function addPointCallback(uv) {
    const newPoint = createPoint({ x: uv.x, y: uv.y, frequency: 10.0, amplitude: 1.0, phase: 0.0, phaseSpeed: 0 });
    points.push(newPoint);
    updateUniforms();
    guiSystem.addPointGUI(newPoint);
    updateCircles();
    return newPoint;
  }
  function removePointCallback(pointId) {
    if (points.length <= 1) {
      console.warn("Cannot remove the last point.");
      return;
    }
    const idx = points.findIndex(p => p.id === pointId);
    if (idx !== -1) {
      points.splice(idx, 1);
      guiSystem.removePoint(pointId);
      updateUniforms();
      updateCircles();
    }
  }
  const guiSystem = setupGuiSystem(points, shader.material, updateUniforms, addPointCallback, removePointCallback);
  points.forEach(point => guiSystem.addPointGUI(point));

  // Particle system.
  const particleSystem = setupParticleSystem(scene);
  // Add Particle System GUI folder at the top.
  const particleFolder = guiSystem.gui.addFolder("Particles");
  particleFolder.add(particleSystem.particleParams, 'forceEffect', 0, 1).name("Force Effect");
  particleFolder.add(particleSystem.particleParams, 'info').name("Info").listen();

  // Event handlers.
  setupEventHandlers(
    renderer,
    points,
    updateUniforms,
    updateCircles,
    particleSystem.spawnParticle,
    addPointCallback,
    removePointCallback,
    toggleCircles
  );

  // Animation loop.
  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    points.forEach(p => { p.phase += p.phaseSpeed * delta; });
    updateUniforms();
    particleSystem.updateParticles(delta, points, getFieldGradient);
    renderer.render(scene, camera);
  }
  animate();
}

main_dist4();
