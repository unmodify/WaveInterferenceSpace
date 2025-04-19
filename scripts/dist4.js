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

  // Points Array
  const points = [
    createPoint({ x:0.3, y:0.3, frequency:10, amplitude:1, phase:0, phaseSpeed:0 }),
    createPoint({ x:0.7, y:0.7, frequency:15, amplitude:0.8, phase:1, phaseSpeed:0 })
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
      const mat  = new THREE.MeshBasicMaterial({ color:0x00ff00, depthTest:false });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(p.x*2-1, p.y*2-1, 0);
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
    const p = createPoint({ x:uv.x, y:uv.y, frequency:10, amplitude:1, phase:0, phaseSpeed:0 });
    points.push(p);
    updateUniforms();
    updateCircles();
    return p;
  }
  function removePointCallback(id) {
    if (points.length <= 1) { console.warn("Cannot remove last point."); return; }
    const idx = points.findIndex(p => p.id === id);
    if (idx >= 0) {
      points.splice(idx,1);
      updateUniforms();
      updateCircles();
    }
  }
  const { gui, addPointGUI, removePoint, syncPoints, pointFolders } =
        setupGuiSystem(points, shader.material, updateUniforms, addPointCallback, removePointCallback);
  points.forEach(p => addPointGUI(p));

  // Particle System
  const ps = setupParticleSystem(scene);
  const pf = gui.addFolder("Particles");
  pf.add(ps.particleParams,'forceEffect',0,1).name("Force Effect");
  pf.add(ps.particleParams,'info').name("Info").listen();

  // Command UI + Help
  const ui = document.createElement('div');
  Object.assign(ui.style, {
    position:'absolute', bottom:'10px', left:'10px', zIndex:100, font:'12px sans-serif'
  });
  ui.innerHTML = `
    <button id="helpBtn" style="font-size:16px;">?</button>
    <div id="helpBox" style="
      display:none;
      max-width:320px;
      background:rgba(0,0,0,0.75);
      color:#fff;
      padding:12px;
      margin-top:6px;
      border-radius:6px;
      font-size:12px;
      line-height:1.4;
    ">
      <strong>Point Indexing</strong><br>
      • <code>p</code> – all points<br>
      • <code>p(3)</code> – point 3 (creates up to 3 if needed)<br>
      • <code>p(1,3)</code> – points 1 &amp; 3<br>
      • <code>p(2-4)</code> – points 2,3,4<br>
      • <code>p(1,3-5)</code> – points 1,3,4,5<br>
      <br>
      <strong>Point Actions</strong><br>
      • <code>p.rem</code> – remove selected<br>
      • <code>p.xy(x,y)</code> – set position<br>
      • <code>p.freq(v)</code> – set frequency<br>
      • <code>p.ampl(v)</code> – set amplitude<br>
      • <code>p.phase(v)</code> – set phase<br>
      • <code>p.phaseSpeed(v)</code> – set phase speed<br>
      • <code>p.circle()</code> – arrange in circle<br>
      • <code>p.grid()</code> – arrange in square grid<br>
      <br>
      <strong>Blend &amp; Particles</strong><br>
      • <code>b.mode(add|subtract|…)</code><br>
      • <code>part.force(v)</code> – particle force<br>
      • <code>part.info(text)</code> – particle info text<br>
      <br>
      <strong>Mouse &amp; Keys</strong><br>
      • Click empty – add point<br>
      • Drag point – move point<br>
      • <code>Space</code> – remove point under cursor (or toggle circles)<br>
      • <code>Z</code> – spawn particle<br>
      • <code>Submit</code> – run commands<br>
    </div>
    <textarea id="commandBox" rows="4" cols="40" placeholder="Enter commands…"></textarea><br>
    <button id="submitCommand" style="margin-top:4px;">Submit</button>
  `;
  document.body.appendChild(ui);

  const helpBtn = document.getElementById('helpBtn');
  const helpBox = document.getElementById('helpBox');
  helpBtn.addEventListener('click', () => {
    helpBox.style.display = helpBox.style.display === 'block' ? 'none' : 'block';
  });

  document.getElementById('submitCommand').onclick = () => {
    const txt = document.getElementById('commandBox').value.trim();
    if (!txt) return;
    const context = {
      points,
      material: shader.material,
      blendModes: { add:0, subtract:1, multiply:2, normalize:3, min:4, max:5, average:6 },
      particleParams: ps.particleParams,
      removePoint: removePointCallback
    };
    interpretCommand(txt, context);
    // Rebuild GUI folders to match data
    syncPoints(points);
    updateUniforms();
    updateCircles();
  };

  // Event Handlers
  setupEventHandlers(
    renderer, points, updateUniforms, updateCircles,
    ps.spawnParticle,
    addPointCallback, removePointCallback,
    toggleCircles,
    () => syncPoints(points)
  );

  // Animation Loop
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    points.forEach(p => p.phase += p.phaseSpeed * dt);
    updateUniforms();
    ps.updateParticles(dt, points, getFieldGradient);
    renderer.render(scene, camera);
  })();
}

main_dist4();
