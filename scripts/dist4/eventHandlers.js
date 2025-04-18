// eventHandlers.js
export function setupEventHandlers(
    renderer,
    points,
    updateUniforms,
    updateCircles,
    spawnParticle,
    addPointCallback,
    removePointCallback,
    toggleCirclesCallback
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
  
    renderer.domElement.addEventListener('pointerdown', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const uvX = (e.clientX - rect.left) / rect.width;
      const uvY = 1 - (e.clientY - rect.top) / rect.height;
      latestUV = { x: uvX, y: uvY };
      const hit = getPointAtUV(latestUV);
      if (hit) {
        selectedPointId = hit.id;
        isDragging = true;
      } else {
        // Not over an existing center, so add a new one.
        addPointCallback(latestUV);
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
          updateUniforms();
          updateCircles();
        }
      }
    });
  
    renderer.domElement.addEventListener('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        selectedPointId = null;
      }
    });
  
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const hit = getPointAtUV(latestUV);
        if (hit) {
          removePointCallback(hit.id);
        } else {
          toggleCirclesCallback();
        }
      } else if (e.code === 'KeyZ') {
        e.preventDefault();
        spawnParticle(latestUV);
      }
    });
  }
  