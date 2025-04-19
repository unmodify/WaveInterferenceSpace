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
  syncGui                  // new callback
) {
  let selectedPointId = null;
  let isDragging = false;
  let latestUV = { x: 0, y: 0 };

  function getPointAtUV(uv) {
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      if (Math.hypot(p.x - uv.x, p.y - uv.y) < 0.05) {
        return { point: p, id: p.id };
      }
    }
    return null;
  }

  renderer.domElement.addEventListener('pointerdown', e => {
    const r = renderer.domElement.getBoundingClientRect();
    latestUV = { x: (e.clientX - r.left)/r.width, y: 1 - (e.clientY - r.top)/r.height };
    const hit = getPointAtUV(latestUV);
    if (hit) {
      selectedPointId = hit.id;
      isDragging = true;
    } else {
      addPointCallback(latestUV);
      syncGui(points); // reflect new point in GUI
      selectedPointId = null;
      isDragging = false;
    }
  });

  renderer.domElement.addEventListener('pointermove', e => {
    if (!isDragging) return;
    const r = renderer.domElement.getBoundingClientRect();
    latestUV = { x: (e.clientX - r.left)/r.width, y: 1 - (e.clientY - r.top)/r.height };
    const idx = points.findIndex(p => p.id === selectedPointId);
    if (idx !== -1) {
      points[idx].x = latestUV.x;
      points[idx].y = latestUV.y;
      updateUniforms();
      updateCircles();
      syncGui(points); // update GUI sliders for x,y
    }
  });

  renderer.domElement.addEventListener('pointerup', () => {
    if (isDragging) {
      isDragging = false;
      selectedPointId = null;
    }
  });

  document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      const hit = getPointAtUV(latestUV);
      if (hit) {
        removePointCallback(hit.id);
        syncGui(points); // reflect removal in GUI
      } else {
        toggleCirclesCallback();
      }
    } else if (e.code === 'KeyZ') {
      e.preventDefault();
      spawnParticle(latestUV);
    }
  });
}
