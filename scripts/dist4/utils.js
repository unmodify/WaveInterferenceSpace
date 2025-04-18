// utils.js
export function createPoint({ x, y, frequency, amplitude, phase, phaseSpeed = 0 }) {
    // Maintain a static counter property.
    createPoint.nextId = createPoint.nextId || 0;
    const point = { id: createPoint.nextId, x, y, frequency, amplitude, phase, phaseSpeed };
    createPoint.nextId++;
    return point;
  }
  
  export function mix(a, b, t) {
    return a * (1 - t) + b * t;
  }
  
  export function smoothstep(edge0, edge1, x) {
    if (x <= edge1) return 1;
    if (x >= edge0) return 0;
    return (edge0 - x) / (edge0 - edge1);
  }
  