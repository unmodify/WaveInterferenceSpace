// dist4/eventHandlers.js
export function setupEventHandlers(
  canvas,                // The renderer’s DOM element
  points,
  updateUniforms,
  updateCircles,
  spawnParticle,
  addPointCallback,
  removePointCallback,
  toggleCirclesCallback,
  syncGui
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

  function updateLatestUV(e) {
    const rect = canvas.getBoundingClientRect();
    latestUV = {
      x: (e.clientX - rect.left) / rect.width,
      y: 1 - (e.clientY - rect.top) / rect.height
    };
  }

  // Keep UV updated on pointermove and mousemove
  document.addEventListener('pointermove', updateLatestUV);
  canvas.addEventListener('mousemove', updateLatestUV);

  // Pointer down: start drag if over a point, else add a new point
  canvas.addEventListener('pointerdown', e => {
    updateLatestUV(e);
    const hit = getPointAtUV(latestUV);
    if (hit) {
      selectedPointId = hit.id;
      isDragging = true;
    } else {
      addPointCallback(latestUV);
      syncGui(points);
    }
  });

  // Pointer move: if dragging, move the selected point
  canvas.addEventListener('pointermove', e => {
    if (!isDragging || selectedPointId === null) return;
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

  // Pointer up: end drag
  canvas.addEventListener('pointerup', () => {
    isDragging = false;
    selectedPointId = null;
  });

  // Keyboard: Space removes point under cursor or toggles circles; Z spawns particle
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
