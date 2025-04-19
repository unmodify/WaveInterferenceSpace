// main.js
import * as THREE from 'three';
import { setupRenderer, setupSceneAndCamera } from "./dist4/rendererSetup.js";
import { setupShaderSystem, getUniformPoints, getUniformPhases } from "./dist4/shaderSystem.js";
import { setupGuiSystem } from "./dist4/guiSystem.js";
import { getFieldGradient } from "./dist4/forceField.js";
import { setupParticleSystem } from "./dist4/particleSystem.js";
import { setupEventHandlers } from "./dist4/eventHandlers.js";
import { createPoint } from "./dist4/utils.js";
import { interpretCommand } from "./dist4/commandInterpreter.js";

function main_dist4() {
  // Renderer / Scene / Camera
  const renderer = setupRenderer();
  const { scene, camera } = setupSceneAndCamera();

  // Shader System
  const shader = setupShaderSystem(scene);

  // Points Array: initial two
  const points = [
    createPoint({ x: 0.24, y: 0.27, frequency: 100, amplitude: 1, phase: 0, phaseSpeed: 3 }),
    createPoint({ x: 0.81, y: 0.51, frequency: 100, amplitude: 1, phase: 0, phaseSpeed: 3 })
  ];

  function updateUniforms() {
    shader.material.uniforms.uPoints.value = getUniformPoints(points);
    shader.material.uniforms.uPhases.value = getUniformPhases(points);
    shader.material.uniforms.uPointCount.value = points.length;
  }
  updateUniforms();

  // Circles Overlay
  const circlesGroup = new THREE.Group();
  scene.add(circlesGroup);
  let circlesVisible = true;
  function updateCircles() {
    circlesGroup.clear();
    points.forEach(p => {
      const geom = new THREE.CircleGeometry(0.03, 32);
      const mat  = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(p.x * 2 - 1, p.y * 2 - 1, 0);
      mesh.renderOrder = 1;
      circlesGroup.add(mesh);
    });
  }
  updateCircles();

  function toggleCircles() {
    circlesVisible = !circlesVisible;
    circlesGroup.visible = circlesVisible;
  }

  // GUI System
  function addPointCallback(uv) {
    const p = createPoint({ x: uv.x, y: uv.y, frequency: 100, amplitude: 1, phase: 0, phaseSpeed: 3 });
    points.push(p);
    updateUniforms(); updateCircles();
    return p;
  }
  function removePointCallback(id) {
    if (points.length <= 1) { console.warn("Cannot remove last point."); return; }
    const idx = points.findIndex(p => p.id === id);
    if (idx >= 0) {
      points.splice(idx, 1);
      updateUniforms(); updateCircles();
    }
  }
  const { gui, addPointGUI, removePoint, syncPoints } =
    setupGuiSystem(points, shader.material, updateUniforms, addPointCallback, removePointCallback);
  points.forEach(p => addPointGUI(p));

  // Map Mode GUI (clip vs remap)
  const mapParams = { mapMode: 'clip' }; // 'clip' or 'remap'
  gui.add(mapParams, 'mapMode', ['clip','remap']).name('Value Map').onChange(v => {
    shader.material.uniforms.uMapMode.value = (v === 'remap' ? 1 : 0);
  });

  // Particle System
  const ps = setupParticleSystem(scene);
  const pf = gui.addFolder("Particles");
  pf.add(ps.particleParams, 'forceEffect', 0, 1).name("Force Effect");
  pf.add(ps.particleParams, 'info').name("Info").listen();

  // Save / Load & Help UI
  const ui = document.createElement('div');
  Object.assign(ui.style, { position: 'absolute', bottom: '10px', left: '10px', zIndex: 100, font: '12px sans-serif' });
  ui.innerHTML = `
    <button id="helpBtn" style="font-size:16px;">?</button>
    <button id="saveBtn" style="margin-left:8px;">Save Config</button>
    <button id="loadBtn" style="margin-left:4px;">Load Config</button>
    <input type="file" id="fileInput" style="display:none;" accept="application/json">
    <div id="helpBox" style="display:none; max-width:320px; background:rgba(0,0,0,0.75); color:#fff; padding:12px; margin-top:6px; border-radius:6px; font-size:12px; line-height:1.4;">
      <strong>Point Indexing</strong><br>
      • <code>p</code> – all points<br>
      • <code>p(3)</code> – point 3 (creates if needed)<br>
      • <code>p(1,3)</code> – points 1 & 3<br>
      • <code>p(2-4)</code> – points 2,3,4<br>
      • <code>p(1,3-5)</code> – points 1,3,4,5<br>
      <br>
      <strong>Point Actions</strong><br>
      • <code>p.rem</code><br>
      • <code>p.xy(x,y)</code><br>
      • <code>p.freq(v)</code><br>
      • <code>p.ampl(v)</code><br>
      • <code>p.phase(v)</code><br>
      • <code>p.phaseSpeed(v)</code><br>
      • <code>p.circle()</code><br>
      • <code>p.grid()</code><br>
      <br>
      <strong>Range Mapping</strong><br>
      • <code>Value Map: clip</code> shows raw [-1..1]<br>
      • <code>Value Map: remap</code> shifts to [0..1]<br>
      <br>
      <strong>Blend & Particles</strong><br>
      • <code>b.mode(add|…)</code><br>
      • <code>part.force(v)</code><br>
      • <code>part.info(text)</code><br>
      <br>
      <strong>Mouse & Keys</strong><br>
      • Click empty – add point<br>
      • Drag point – move<br>
      • <code>Space</code> – remove/toggle circles<br>
      • <code>Z</code> – spawn particle<br>
      • <code>Submit</code> – run commands<br>
    </div>
    <br>
    <textarea id="commandBox" rows="4" cols="40" placeholder="Enter commands…"></textarea><br>
    <button id="submitCommand">Submit</button>
  `;
  document.body.appendChild(ui);

  const helpBtn = document.getElementById('helpBtn');
  const helpBox = document.getElementById('helpBox');
  helpBtn.onclick = () => helpBox.style.display = helpBox.style.display === 'block' ? 'none' : 'block';

  document.getElementById('saveBtn').onclick = () => {
    const config = {
      points: points.map(p => ({ x:p.x, y:p.y, frequency:p.frequency, amplitude:p.amplitude, phase:p.phase, phaseSpeed:p.phaseSpeed })),
      blendMode: shader.material.uniforms.uBlendMode.value,
      mapMode: shader.material.uniforms.uMapMode.value,
      particleParams: ps.particleParams
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = 'config.json'; a.click();
    URL.revokeObjectURL(url);
  };

  const fileInput = document.getElementById('fileInput');
  document.getElementById('loadBtn').onclick = () => fileInput.click();
  fileInput.onchange = e => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const cfg = JSON.parse(ev.target.result);
        points.length = 0;
        cfg.points.forEach(o => points.push(createPoint(o)));
        shader.material.uniforms.uBlendMode.value = cfg.blendMode;
        shader.material.uniforms.uMapMode.value = cfg.mapMode;
        Object.assign(ps.particleParams, cfg.particleParams);
        syncPoints(points);
        updateUniforms(); updateCircles();
      } catch(err) { console.error(err); }
    };
    reader.readAsText(file);
  };

  document.getElementById('submitCommand').onclick = () => {
    const txt = document.getElementById('commandBox').value.trim(); if (!txt) return;
    const context = {
      points,
      material: shader.material,
      blendModes: { add:0, subtract:1, multiply:2, normalize:3, min:4, max:5, average:6 },
      particleParams: ps.particleParams,
      removePoint: removePointCallback
    };
    interpretCommand(txt, context);
    syncPoints(points);
    updateUniforms(); updateCircles();
  };

  // Handle resize
  window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    shader.material.uniforms.uResolution.value.set(width, height);
  });

  setupEventHandlers(
    renderer, points, updateUniforms, updateCircles,
    ps.spawnParticle,
    addPointCallback, removePointCallback,
    toggleCircles,
    () => syncPoints(points)
  );

  const clock = new THREE.Clock();
  (function anim(){
    requestAnimationFrame(anim);
    const dt = clock.getDelta();
    points.forEach(p => p.phase += p.phaseSpeed * dt);
    updateUniforms();
    ps.updateParticles(dt, points, getFieldGradient);
    renderer.render(scene, camera);
  })();
}

main_dist4();
