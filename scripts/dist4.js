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
  // Renderer, scene, camera
  const renderer = setupRenderer();
  const { scene, camera } = setupSceneAndCamera();

  // Shader
  const shader = setupShaderSystem(scene);

  // Points
  const points = [
    createPoint({ x: .3, y: .3, frequency: 10, amplitude: 1, phase: 0, phaseSpeed: 0 }),
    createPoint({ x: .7, y: .7, frequency: 15, amplitude: 0.8, phase: 1, phaseSpeed: 0 })
  ];
  function updateUniforms() {
    shader.material.uniforms.uPoints.value = getUniformPoints(points);
    shader.material.uniforms.uPhases.value = getUniformPhases(points);
    shader.material.uniforms.uPointCount.value = points.length;
  }
  updateUniforms();

  // Circles overlay
  const circlesGroup = new THREE.Group();
  scene.add(circlesGroup);
  let circlesVisible = true;
  function updateCircles() {
    circlesGroup.clear();
    points.forEach(p => {
      const geom = new THREE.CircleGeometry(0.03, 32);
      const mat  = new THREE.MeshBasicMaterial({ color: 0x00ff00, depthTest: false });
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

  // GUI
  function addPointCallback(uv) {
    const p = createPoint({ x: uv.x, y: uv.y, frequency: 10, amplitude: 1, phase: 0, phaseSpeed: 0 });
    points.push(p);
    updateUniforms(); updateCircles();
    guiSystem.addPointGUI(p);
    return p;
  }
  function removePointCallback(id) {
    if (points.length <= 1) { console.warn("Cannot remove last point."); return; }
    const idx = points.findIndex(p => p.id === id);
    if (idx >= 0) {
      const [rem] = points.splice(idx, 1);
      guiSystem.removePoint(rem.id);
      updateUniforms(); updateCircles();
    }
  }
  const guiSystem = setupGuiSystem(points, shader.material, updateUniforms, addPointCallback, removePointCallback);
  points.forEach(p=>guiSystem.addPointGUI(p));

  // Particle system
  const particleSystem = setupParticleSystem(scene);
  const pf = guiSystem.gui.addFolder("Particles");
  pf.add(particleSystem.particleParams, 'forceEffect', 0, 1).name("Force Effect");
  pf.add(particleSystem.particleParams, 'info').name("Info").listen();

  // Command UI + Help Button
  const uiDiv = document.createElement('div');
  Object.assign(uiDiv.style, {
    position:'absolute', bottom:'10px', left:'10px', zIndex:100, fontFamily:'sans-serif'
  });
  uiDiv.innerHTML = `
    <button id="helpBtn" style="font-size:16px;padding:4px;cursor:pointer;">?</button>
    <div id="helpBox" style="
      display:none;
      max-width:300px;
      background:rgba(0,0,0,0.7);
      color:#fff;
      padding:10px;
      margin-top:5px;
      border-radius:4px;
      font-size:12px;
      line-height:1.4;
    ">
      <strong>Interpreter Syntax</strong><br>
      • <code>p.rem</code> – remove points<br>
      • <code>p(1-3).xy(x,y)</code> – set x,y for points 1–3<br>
      • <code>p(1,4).freq(v)</code>, <code>.ampl(v)</code>, <code>.phase(v)</code>, <code>.phaseSpeed(v)</code><br>
      • <code>p.circle()</code> – arrange selected on circle<br>
      • <code>p.grid()</code> – arrange on grid<br>
      • <code>b.mode(add|subtract|...)</code> – blend mode<br>
      • <code>part.force(v)</code>, <code>part.info(text)</code><br>
      <br>
      <strong>Mouse &amp; Keys</strong><br>
      • Click empty space – add point<br>
      • Click+drag point – move it<br>
      • Space – remove point under cursor, or toggle circles<br>
      • Z – spawn particle<br>
      • Submit – run commands<br>
    </div>
    <textarea id="commandBox" rows="4" cols="40" placeholder="Enter commands…"></textarea><br>
    <button id="submitCommand" style="margin-top:4px;">Submit Command</button>
  `;
  document.body.appendChild(uiDiv);

  const helpBtn = document.getElementById('helpBtn');
  const helpBox = document.getElementById('helpBox');
  helpBtn.addEventListener('click', () => {
    helpBox.style.display = helpBox.style.display === 'block' ? 'none' : 'block';
  });

  const cmdBox = document.getElementById('commandBox');
  document.getElementById('submitCommand').addEventListener('click', () => {
    const txt = cmdBox.value.trim();
    if (!txt) return;
    const context = {
      points,
      material: shader.material,
      blendModes: { add:0, subtract:1, multiply:2, normalize:3, min:4, max:5, average:6 },
      particleParams: particleSystem.particleParams,
      removePoint: removePointCallback
    };
    interpretCommand(txt, context);
    // sync GUI for new points
    points.forEach(p => {
      if (!guiSystem.pointFolders[p.id]) {
        guiSystem.addPointGUI(p);
      }
    });
    updateUniforms();
    updateCircles();
  });

  // Event handlers
  setupEventHandlers(
    renderer, points, updateUniforms, updateCircles,
    particleSystem.spawnParticle,
    addPointCallback, removePointCallback,
    toggleCircles
  );

  // Animation
  const clock = new THREE.Clock();
  (function animate() {
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    points.forEach(p => p.phase += p.phaseSpeed * dt);
    updateUniforms();
    particleSystem.updateParticles(dt, points, getFieldGradient);
    renderer.render(scene, camera);
  })();
}

main_dist4();
