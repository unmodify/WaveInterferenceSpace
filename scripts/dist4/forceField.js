// forceField.js
import { mix, smoothstep } from './utils.js';

export function fieldValue(uv, points) {
  let value = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    const dx = uv.x - p.x;
    const dy = uv.y - p.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const sinVal = p.amplitude * Math.sin(dist * p.frequency + p.phase);
    const circle = smoothstep(0.02, 0.015, dist);
    value = mix(value + sinVal, 1.0, circle);
  }
  return value;
}

export function getFieldGradient(uv, points) {
  const delta = 0.001;
  const fx1 = fieldValue({ x: uv.x + delta, y: uv.y }, points);
  const fx2 = fieldValue({ x: uv.x - delta, y: uv.y }, points);
  const fy1 = fieldValue({ x: uv.x, y: uv.y + delta }, points);
  const fy2 = fieldValue({ x: uv.x, y: uv.y - delta }, points);
  return {
    x: (fx1 - fx2) / (2 * delta),
    y: (fy1 - fy2) / (2 * delta)
  };
}
