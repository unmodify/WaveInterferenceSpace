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

  // Shader system
  const shader = setupShaderSystem(scene);

  // Points array
  const points = [
    createPoint({ x:0.3,y:0.3,frequency:10,amplitude:1,phase:0,phaseSpeed:0 }),
    createPoint({ x:0.7,y:0.7,frequency:15,amplitude:0.8,phase:1,phaseSpeed:0 })
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
    for (let i=0;i<points.length;i++){
      const geom = new THREE.CircleGeometry(0.03,32);
      const mat  = new THREE.MeshBasicMaterial({color:0x00ff00,depthTest:false});
      const m    = new THREE.Mesh(geom,mat);
      m.position.set(points[i].x*2-1, points[i].y*2-1, 0);
      m.renderOrder=1;
      circlesGroup.add(m);
    }
  }
  updateCircles();
  function toggleCircles(){
    circlesVisible=!circlesVisible;
    circlesGroup.visible=circlesVisible;
  }

  // GUI
  function addPointCallback(uv){
    const p = createPoint({x:uv.x,y:uv.y,frequency:10,amplitude:1,phase:0,phaseSpeed:0});
    points.push(p);
    updateUniforms(); updateCircles();
    guiSystem.addPointGUI(p);
    return p;
  }
  function removePointCallback(id){
    if(points.length<=1){ console.warn("Cannot remove last point."); return; }
    const idx = points.findIndex(p=>p.id===id);
    if(idx>-1){
      points.splice(idx,1);
      guiSystem.removePoint(id);
      updateUniforms(); updateCircles();
    }
  }
  const guiSystem = setupGuiSystem(points, shader.material, updateUniforms, addPointCallback, removePointCallback);
  points.forEach(p=>guiSystem.addPointGUI(p));

  // Particle system
  const particleSystem = setupParticleSystem(scene);
  const pf = guiSystem.gui.addFolder("Particles");
  pf.add(particleSystem.particleParams,'forceEffect',0,1).name("Force Effect");
  pf.add(particleSystem.particleParams,'info').name("Info").listen();

  // Command UI
  const cmdDiv = document.createElement('div');
  Object.assign(cmdDiv.style,{position:'absolute',bottom:'10px',left:'10px',zIndex:100,background:'rgba(255,255,255,0.8)',padding:'10px'});
  cmdDiv.innerHTML=`
    <textarea id="commandBox" rows="4" cols="40" placeholder="Enter commands"></textarea><br>
    <button id="submitCommand">Submit Command</button>
  `;
  document.body.appendChild(cmdDiv);
  const box = document.getElementById('commandBox');
  document.getElementById('submitCommand').addEventListener('click',()=>{
    const cmds = box.value.trim();
    if(!cmds) return;
    // Build context
    const blendModes = { add:0, subtract:1, multiply:2, normalize:3, min:4, max:5, average:6 };
    const context = { points, material:shader.material, blendModes, particleParams:particleSystem.particleParams, removePoint:removePointCallback };
    interpretCommand(cmds, context);
    // Sync GUI for any newly created points
    points.forEach(p=>{
      if (!guiSystem.pointFolders[p.id]) {
        guiSystem.addPointGUI(p);
      }
    });
    updateUniforms();
    updateCircles();
  });

  // Events
  setupEventHandlers(renderer, points, updateUniforms, updateCircles,
                     particleSystem.spawnParticle, addPointCallback,
                     removePointCallback, toggleCircles);

  // Animate
  const clock = new THREE.Clock();
  (function animate(){
    requestAnimationFrame(animate);
    const dt = clock.getDelta();
    points.forEach(p=>p.phase+=p.phaseSpeed*dt);
    updateUniforms();
    particleSystem.updateParticles(dt, points, getFieldGradient);
    renderer.render(scene, camera);
  })();
}

main_dist4();
