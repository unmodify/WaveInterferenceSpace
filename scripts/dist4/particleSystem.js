// particleSystem.js
import * as THREE from 'three';

export function setupParticleSystem(scene) {
  const particles = [];
  const particleGroup = new THREE.Group();
  scene.add(particleGroup);
  const particleParams = {
    forceEffect: 0.5, // Scale factor (0 to 1)
    info: "Press 'Z' to spawn a particle at the current pointer position."
  };

  function spawnParticle(uv) {
    const particle = {
      position: { x: uv.x, y: uv.y },
      velocity: { x: 0, y: 0 },
      mesh: null
    };
    const radius = 0.015;
    const geo = new THREE.CircleGeometry(radius, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xff0000, depthTest: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    particle.mesh = mesh;
    particleGroup.add(mesh);
    particles.push(particle);
  }

  function updateParticles(delta, points, getGradient) {
    particles.forEach(p => {
      const grad = getGradient(p.position, points);
      const fx = particleParams.forceEffect * grad.x;
      const fy = particleParams.forceEffect * grad.y;
      p.velocity.x += fx * delta;
      p.velocity.y += fy * delta;
      p.velocity.x *= 0.98;
      p.velocity.y *= 0.98;
      p.position.x += p.velocity.x * delta;
      p.position.y += p.velocity.y * delta;
      p.mesh.position.set(p.position.x * 2 - 1, p.position.y * 2 - 1, 0.05);
    });
  }

  return { spawnParticle, updateParticles, particleParams, particleGroup };
}
