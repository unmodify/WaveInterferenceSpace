// eventHandlers.js
export function setupEventHandlers(renderer, points, updateUniforms, updateCircles, spawnParticle, addPointCallback, removePointCallback, toggleCirclesCallback) {
    let selectedPointId = null;
    let isDragging = false;
    let latestUV = { x: 0, y: 0 };
  
    // Helper: Given a UV coordinate, return the center if within 0.05.
    function getPointAtUV(uv) {
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const dist = Math.hypot(p.x - uv.x, p.y - uv.y);
        if (dist < 0.05) return { point: p, id: p.id };
      }
      return null;
    }
  
    // Pointer down: if over center, select for dragging; if not, add new center immediately.
    renderer.domElement.addEventListener('pointerdown', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const uvX = (e.clientX - rect.left) / rect.width;
      const uvY = 1 - (e.clientY - rect.top) / rect.height;
      latestUV = { x: uvX, y: uvY };
      const hit = getPointAtUV(latestUV);
      if (hit) {
        // Over an existing center: select it for dragging.
        selectedPointId = hit.id;
        isDragging = true;
      } else {
        // Not over a center: add new center immediately.
        addPointCallback(latestUV);
        // Do not select any center for dragging.
        selectedPointId = null;
        isDragging = false;
      }
    });
  
    // Pointer move: if dragging, update the selected center's position.
    renderer.domElement.addEventListener('pointermove', (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const uvX = (e.clientX - rect.left) / rect.width;
      const uvY = 1 - (e.clientY - rect.top) / rect.height;
      latestUV = { x: uvX, y: uvY };
      if (isDragging && selectedPointId !== null) {
        const index = points.findIndex(p => p.id === selectedPointId);
        if (index !== -1) {
          points[index].x = uvX;
          points[index].y = uvY;
          updateUniforms();
          updateCircles();
        }
      }
    });
  
    // Pointer up: stop dragging.
    renderer.domElement.addEventListener('pointerup', () => {
      if (isDragging) {
        isDragging = false;
        selectedPointId = null;
      }
    });
  
    // Key handling:
    // • Space bar: if pointer over a center, remove that center; otherwise, toggle overlay.
    // • Z key: spawn a particle.
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
  