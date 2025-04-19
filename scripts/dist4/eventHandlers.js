// eventHandlers.js
export function setupEventHandlers(
  renderer,
  points,
  updateUniforms,
  updateCircles,
  spawnParticle,
  addPointCallback,
  removePointCallback,
  toggleCirclesCallback,
  syncGui                  // callback to sync GUI
) {
  let selectedPointId = null;
  let isDragging = false;
  let latestUV = { x: 0, y: 0 };

  function getPointAtUV(uv) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dist = Math.hypot(p.x - uv.x, p.y - uv.y);
      if (dist < 0.05) return { point: p, id: p.id };
    }
    return null;
  }

  function updateLatestUV(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = 1 - (e.clientY - rect.top) / rect.height;
    latestUV = { x, y };
  }

  // Always track pointer moves over the whole document
  document.addEventListener('pointermove', e => {
    updateLatestUV(e);
  });

  // Pointer down: select or add
  renderer.domElement.addEventListener('pointerdown', e => {
    updateLatestUV(e);
    const hit = getPointAtUV(latestUV);
    if (hit) {
      selectedPointId = hit.id;
      isDragging = true;
    } else {
      addPointCallback(latestUV);
      syncGui(points);
      selectedPointId = null;
      isDragging = false;
    }
  });

  // Pointer move: if dragging, move point
  renderer.domElement.addEventListener('pointermove', e => {
    if (!isDragging) return;
    updateLatestUV(e);
    const idx = points.findIndex(p => p.id === selectedPointId);
    if (idx !== -1) {
      points[idx].x = latestUV.x;
      points[idx].y = latestUV.y;
      updateUniforms();
      updateCircles();
      syncGui(points);
    }
  });

  // Pointer up: stop drag
  renderer.domElement.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      selectedPointId = null;
    }
  });

  // Key handling
  document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      const hit = getPointAtUV(latestUV);
      if (hit) {
        removePointCallback(hit.id);
        syncGui(points);
      } else {
        toggleCirclesCallback();
      }
    } else if (e.code === 'KeyZ') {
      e.preventDefault();
      spawnParticle(latestUV);
    }
  });
}
