// dist4/appCore.js
import * as THREE from 'three';
import { createScene } from './sceneSetup.js';
import { setupShaderSystem, getUniformPoints, getUniformPhases } from './shaderSystem.js';
import { setupGuiSystem } from './guiSystem.js';
import { createUiPanel } from './uiPanel.js';
import { setupParticleSystem } from './particleSystem.js';
import { setupEventHandlers } from './eventHandlers.js';
import { createPoint } from './utils.js';
import { interpretCommand } from './commandInterpreter.js';
import { getFieldGradient } from './forceField.js';

export default function initApp() {
  // Scene, renderer, camera
  const { renderer, scene, camera } = createScene();
  const shaderSys = setupShaderSystem(scene);

  // Data model: points array
  const points = [];

  // Overlay group for reference circles
  const circlesGroup = new THREE.Group();
  scene.add(circlesGroup);
  let circlesVisible = true;

  // Redraw reference circles
  function updateCircles() {
    circlesGroup.clear();
    for (const p of points) {
      const geo = new THREE.CircleGeometry(0.03, 32);
      const mat = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(p.x * 2 - 1, p.y * 2 - 1, 0);
      mesh.renderOrder = 1;
      circlesGroup.add(mesh);
    }
    circlesGroup.visible = circlesVisible;
  }

  // Toggle overlay visibility
  function toggleCircles() {
    circlesVisible = !circlesVisible;
    circlesGroup.visible = circlesVisible;
  }

  // Update all shader uniforms based on current points
  function updateUniforms() {
    shaderSys.material.uniforms.uPoints.value     = getUniformPoints(points);
    shaderSys.material.uniforms.uPhases.value     = getUniformPhases(points);
    shaderSys.material.uniforms.uPointCount.value = points.length;
    // Sum of amplitudes for normalization
    const sumAmp = points.reduce((sum, p) => sum + p.amplitude, 0);
    shaderSys.material.uniforms.uSumAmp.value = sumAmp > 0 ? sumAmp : 1.0;
  }

  // Add a new point at the given UV
  function addPoint(uv) {
    const p = createPoint({
      x: uv.x, y: uv.y,
      frequency: 100, amplitude: 1,
      phase: 0, phaseSpeed: 3
    });
    points.push(p);
    updateUniforms();
    updateCircles();
    guiSys.addPointGUI(p);
    return p;
  }

  // Remove a point by id, mutate in place
  function removePoint(id) {
    if (points.length <= 1) {
      console.warn('Cannot remove last point.');
      return;
    }
    const idx = points.findIndex(p => p.id === id);
    if (idx !== -1) {
      points.splice(idx, 1);
      guiSys.removePoint(id);
      updateUniforms();
      updateCircles();
    }
  }

  // Set up the GUI
  const guiSys = setupGuiSystem(
    points,
    shaderSys.material,
    updateUniforms,
    addPoint,
    removePoint
  );

  // Initialize with two starting points
  points.push(createPoint({ x: 0.24, y: 0.27, frequency: 100, amplitude: 1, phase: 0, phaseSpeed: 3 }));
  points.push(createPoint({ x: 0.81, y: 0.51, frequency: 100, amplitude: 1, phase: 0, phaseSpeed: 3 }));
  points.forEach(p => guiSys.addPointGUI(p));
  updateUniforms();
  updateCircles();

  // Value‐map toggle in GUI
  const mapParams = { mapMode: 'clip' };
  guiSys.gui
    .add(mapParams, 'mapMode', ['clip', 'remap'])
    .name('Value Map')
    .onChange(v => {
      shaderSys.material.uniforms.uMapMode.value = (v === 'remap' ? 1 : 0);
    });

  // Particle system GUI
  const psys = setupParticleSystem(scene);
  const pf = guiSys.gui.addFolder('Particles');
  pf.add(psys.particleParams, 'forceEffect', 0, 1).name('Force Effect');
  pf.add(psys.particleParams, 'info').name('Info').listen();

  // Save configuration to JSON
  function onSave() {
    const config = {
      points: points.map(p => ({
        x: p.x, y: p.y,
        frequency: p.frequency,
        amplitude: p.amplitude,
        phase: p.phase,
        phaseSpeed: p.phaseSpeed
      })),
      blendMode: shaderSys.material.uniforms.uBlendMode.value,
      mapMode: shaderSys.material.uniforms.uMapMode.value,
      particleParams: psys.particleParams
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'config.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // Load configuration from JSON
  function onLoad(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const cfg = JSON.parse(ev.target.result);
        // Clear existing points in place
        points.splice(0, points.length);
        // Add new points
        cfg.points.forEach(o => points.push(createPoint(o)));
        // Restore blend and map modes
        shaderSys.material.uniforms.uBlendMode.value = cfg.blendMode;
        shaderSys.material.uniforms.uMapMode.value   = cfg.mapMode;
        // Restore particle params
        Object.assign(psys.particleParams, cfg.particleParams);
        // Sync GUI and visuals
        guiSys.syncPoints(points);
        updateUniforms();
        updateCircles();
      } catch (err) {
        console.error('Load failed:', err);
      }
    };
    reader.readAsText(file);
  }

  // Handle interpreter commands
  function onRunCommand(txt) {
    interpretCommand(txt, {
      points,
      material: shaderSys.material,
      blendModes: guiSys.blendModes,
      particleParams: psys.particleParams,
      removePoint
    });
    guiSys.syncPoints(points);
    updateUniforms();
    updateCircles();
  }

  // Create the bottom‑left UI panel
  createUiPanel({ onSave, onLoad, onRunCommand });

  // Wire up pointer/keyboard events
  setupEventHandlers(
    renderer.domElement,
    points,
    updateUniforms,
    updateCircles,
    psys.spawnParticle,
    addPoint,
    removePoint,
    toggleCircles,
    () => guiSys.syncPoints(points)
  );

  // Start render/animation loop
  function start() {
    const clock = new THREE.Clock();
    (function animate() {
      requestAnimationFrame(animate);
      const dt = clock.getDelta();
      points.forEach(p => p.phase += p.phaseSpeed * dt);
      updateUniforms();
      psys.updateParticles(dt, points, getFieldGradient);
      renderer.render(scene, camera);
    })();
  }

  return { start };
}
