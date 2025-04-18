import * as THREE from 'three';
import * as dat from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

// Global counter for unique point IDs.
let nextPointId = 0;
// Helper to create a point with a unique id; phaseSpeed defaults to 0.
function createPoint({ x, y, frequency, amplitude, phase, phaseSpeed = 0 }) {
  return { id: nextPointId++, x, y, frequency, amplitude, phase, phaseSpeed };
}

export default function () {
  // ---------------------------
  // Setup renderer, scene, and camera.
  // ---------------------------
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera.position.z = 1;

  // ---------------------------
  // Create a group for drawing circles overlay.
  // ---------------------------
  const circlesGroup = new THREE.Group();
  scene.add(circlesGroup);
  let circlesVisible = true;
  circlesGroup.visible = circlesVisible;

  // ---------------------------
  // Setup shader uniforms and initial points array.
  // ---------------------------
  const uniformSize = 100;
  const points = [
    createPoint({ x: 0.3, y: 0.3, frequency: 10.0, amplitude: 1.0, phase: 0.0, phaseSpeed: 0 }),
    createPoint({ x: 0.7, y: 0.7, frequency: 15.0, amplitude: 0.8, phase: 1.0, phaseSpeed: 0 })
  ];

  // Helper functions to build complete uniform arrays.
  function getUniformPoints() {
    const arr = [];
    for (let i = 0; i < uniformSize; i++) {
      if (i < points.length) {
        arr.push(new THREE.Vector4(points[i].x, points[i].y, points[i].frequency, points[i].amplitude));
      } else {
        arr.push(new THREE.Vector4(0, 0, 0, 0));
      }
    }
    return arr;
  }
  function getUniformPhases() {
    const arr = [];
    for (let i = 0; i < uniformSize; i++) {
      if (i < points.length) {
        arr.push(points[i].phase);
      } else {
        arr.push(0);
      }
    }
    return arr;
  }
  // Additionally, if you ever want to use phase speeds in the shader you might pass uPhaseSpeeds,
  // but here we update phase on the CPU then update uPhases.

  // ---------------------------
  // Create shader material and associated mesh.
  // ---------------------------
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uPoints: { value: getUniformPoints() },
      uPhases: { value: getUniformPhases() },
      uPointCount: { value: points.length },
      uBlendMode: { value: 0 }, // 0: add, 1: subtract, 2: multiply, 3: normalize, 4: min, 5: max, 6: average
      uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec4 uPoints[100];
      uniform float uPhases[100];
      uniform int uPointCount;
      uniform int uBlendMode;
      uniform vec2 uResolution;
      varying vec2 vUv;
  
      void main() {
        float value = 0.0;
        float sum = 0.0;
        float count = float(uPointCount);
        float minVal = 9999.0;
        float maxVal = -9999.0;
        float prod = 1.0;
  
        for (int i = 0; i < uPointCount; i++) {
          vec2 center = uPoints[i].xy;
          float freq = uPoints[i].z;
          float amp = uPoints[i].w;
          float phase = uPhases[i];
          float dist = distance(vUv, center);
          float sinVal = amp * sin(dist * freq + phase);
  
          // Draw circle around center.
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
  
          // Overlay circle.
          value = mix(value, 1.0, circle);
        }
  
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
  
        gl_FragColor = vec4(vec3(value), 1.0);
      }
    `
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  const plane = new THREE.Mesh(geometry, material);
  scene.add(plane);

  // ---------------------------
  // GUI Setup.
  // ---------------------------
  const gui = new dat.GUI();
  const params = {
    blendMode: 'add',
    addPoint: () => {
      const newPoint = createPoint({ x: 0.5, y: 0.5, frequency: 10.0, amplitude: 1.0, phase: 0.0, phaseSpeed: 0 });
      points.push(newPoint);
      updatePoints();
      addPointGUI(newPoint);
      updateCircles();
    }
  };

  const blendModes = {
    'add': 0,
    'subtract': 1,
    'multiply': 2,
    'normalize': 3,
    'min': 4,
    'max': 5,
    'average': 6
  };

  gui.add(params, 'blendMode', Object.keys(blendModes)).onChange(value => {
    material.uniforms.uBlendMode.value = blendModes[value];
  });
  gui.add(params, 'addPoint').name('Add Point');

  // Dictionary to track GUI folders (keyed by point id).
  const pointFolders = {};

  // Create the GUI folder for a point.
  function addPointGUI(point) {
    const folder = gui.addFolder(`Point ${point.id}`);
    folder.add(point, 'x', 0, 1).onChange(() => { updatePoints(); updateCircles(); });
    folder.add(point, 'y', 0, 1).onChange(() => { updatePoints(); updateCircles(); });
    // Frequency slider now goes from 1 to 10,000.
    folder.add(point, 'frequency', 1, 10000).onChange(updatePoints);
    folder.add(point, 'amplitude', 0, 2).onChange(updatePoints);
    folder.add(point, 'phase', -Math.PI, Math.PI).onChange(updatePoints);
    // New slider for phaseSpeed (range chosen as -10 to 10; adjust as needed)
    folder.add(point, 'phaseSpeed', -10, 10).name("Phase Speed").onChange(updatePoints);
    folder.add({ remove: () => {
      removePoint(point.id);
    }}, 'remove').name('Remove Point');
    pointFolders[point.id] = folder;
    folder.open();
  }

  // ---------------------------
  // Update the uniforms based on points.
  // ---------------------------
  function updatePoints() {
    material.uniforms.uPoints.value = getUniformPoints();
    material.uniforms.uPhases.value = getUniformPhases();
    material.uniforms.uPointCount.value = points.length;
  }

  // ---------------------------
  // Update the circles overlay based on current points.
  // ---------------------------
  function updateCircles() {
    circlesGroup.clear();
    for (let i = 0; i < points.length; i++) {
      const circleGeom = new THREE.CircleGeometry(0.03, 32);
      const circleMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false });
      const circleMesh = new THREE.Mesh(circleGeom, circleMat);
      // Convert UV ([0,1]) to scene coordinates ([-1,1]).
      circleMesh.position.set(points[i].x * 2 - 1, points[i].y * 2 - 1, 0);
      circleMesh.renderOrder = 1;
      circlesGroup.add(circleMesh);
    }
  }
  updateCircles();

  // ---------------------------
  // Helper: Given a UV coordinate, return the point (with its object, id, and array index) if near it.
  // ---------------------------
  function getPointAtUV(uvX, uvY) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dist = Math.sqrt((p.x - uvX) ** 2 + (p.y - uvY) ** 2);
      if (dist < 0.05) return { point: p, id: p.id, index: i };
    }
    return null;
  }

  // ---------------------------
  // Helper: Remove point with given unique id.
  // • Do nothing if only one point remains.
  // • Remove the point from the array and its GUI folder.
  // ---------------------------
  function removePoint(pointId) {
    if (points.length <= 1) {
      console.warn("Cannot remove the last point.");
      return;
    }
    const index = points.findIndex(p => p.id === pointId);
    if (index === -1) return;
    points.splice(index, 1);
    if (pointFolders[pointId]) {
      gui.removeFolder(pointFolders[pointId]);
      delete pointFolders[pointId];
    }
    updatePoints();
    updateCircles();
  }

  // ---------------------------
  // Pointer event handling (pointerdown, pointermove, pointerup).
  // Uses each point’s unique id.
  // ---------------------------
  let selectedPointId = null;
  let isDragging = false;
  let pointerDownUV = null;
  let latestUV = { x: 0, y: 0 };

  renderer.domElement.addEventListener('pointerdown', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const uvX = (e.clientX - rect.left) / rect.width;
    const uvY = 1 - (e.clientY - rect.top) / rect.height;
    pointerDownUV = { x: uvX, y: uvY };
    latestUV = { x: uvX, y: uvY };
    const result = getPointAtUV(uvX, uvY);
    if (result !== null) {
      selectedPointId = result.id;
      isDragging = true;
    } else {
      selectedPointId = null;
      isDragging = false;
    }
  });

  renderer.domElement.addEventListener('pointermove', (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    const uvX = (e.clientX - rect.left) / rect.width;
    const uvY = 1 - (e.clientY - rect.top) / rect.height;
    latestUV = { x: uvX, y: uvY };
    if (isDragging && selectedPointId !== null) {
      const idx = points.findIndex(p => p.id === selectedPointId);
      if (idx !== -1) {
        points[idx].x = uvX;
        points[idx].y = uvY;
        updatePoints();
        updateCircles();
        if (gui) gui.updateDisplay();
      }
    }
  });

  renderer.domElement.addEventListener('pointerup', (e) => {
    if (isDragging) {
      isDragging = false;
      selectedPointId = null;
    } else {
      // If pointer down/up in empty space, add a new point.
      const result = getPointAtUV(latestUV.x, latestUV.y);
      if (result === null) {
        const newPoint = createPoint({ x: latestUV.x, y: latestUV.y, frequency: 10.0, amplitude: 1.0, phase: 0.0, phaseSpeed: 0 });
        points.push(newPoint);
        updatePoints();
        addPointGUI(newPoint);
        updateCircles();
      }
    }
    pointerDownUV = null;
  });

  // ---------------------------
  // Space bar key handling:
  // • If pointer is over a point and more than one exists, remove that point.
  // • Otherwise, toggle the circles overlay.
  // ---------------------------
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      const result = getPointAtUV(latestUV.x, latestUV.y);
      if (result !== null) {
        if (points.length > 1) {
          removePoint(result.id);
        } else {
          console.warn("Cannot remove the last point.");
        }
      } else {
        circlesVisible = !circlesVisible;
        circlesGroup.visible = circlesVisible;
      }
    }
  });

  // ---------------------------
  // Initialize the GUI folders for the initial points.
  // ---------------------------
  points.forEach(point => addPointGUI(point));

  // ---------------------------
  // Setup clock for delta timing.
  // ---------------------------
  const clock = new THREE.Clock();

  // ---------------------------
  // Animation loop.
  // ---------------------------
  function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    // Update the phase for every point based on its phaseSpeed.
    points.forEach(p => {
      p.phase += p.phaseSpeed * delta;
    });
    // Update uniforms with any changes in phase.
    updatePoints();
    renderer.render(scene, camera);
  }
  animate();
}
