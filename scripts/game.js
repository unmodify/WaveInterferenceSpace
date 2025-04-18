import * as THREE from 'three';

export default function () {
  // Setup renderer
  const renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Setup scene and orthographic camera
  const gridSize = 20;
  const tileSize = 1;
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    -gridSize * tileSize / 2,
    gridSize * tileSize / 2,
    gridSize * tileSize / 2,
    -gridSize * tileSize / 2,
    0.1,
    100
  );
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);

  // Create grid of planes
  const grid = [];
  for (let x = 0; x < gridSize; x++) {
    grid[x] = [];
    for (let y = 0; y < gridSize; y++) {
      const geometry = new THREE.PlaneGeometry(tileSize, tileSize);
      const material = new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide });
      const plane = new THREE.Mesh(geometry, material);
      plane.position.set(
        x * tileSize - gridSize * tileSize / 2 + tileSize / 2,
        y * tileSize - gridSize * tileSize / 2 + tileSize / 2,
        0
      );
      scene.add(plane);
      grid[x][y] = { plane, occupied: null, resource: Math.random() < 0.1 ? 10 : 0 };
    }
  }

  // Helper to create a sprite
  function createSprite(color, x, y) {
    const geometry = new THREE.PlaneGeometry(0.5, 0.5);
    const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
    const sprite = new THREE.Mesh(geometry, material);
    sprite.position.set(
      x * tileSize - gridSize * tileSize / 2 + tileSize / 2,
      y * tileSize - gridSize * tileSize / 2 + tileSize / 2,
      0.1
    );
    scene.add(sprite);
    return sprite;
  }

  // Player
  const player = {
    sprite: createSprite(0xff0000, 2, 2),
    x: 2,
    y: 2,
  };
  grid[2][2].occupied = player;

  // NPCs
  const npcs = [
    { role: 'gatherer', x: 5, y: 5, sprite: createSprite(0x00ff00, 5, 5), resources: 0 },
    { role: 'builder', x: 7, y: 7, sprite: createSprite(0x0000ff, 7, 7) },
    { role: 'attacker', x: 10, y: 10, sprite: createSprite(0xff00ff, 10, 10), target: null },
    { role: 'defender', x: 12, y: 12, sprite: createSprite(0xffff00, 12, 12) },
  ];
  npcs.forEach(npc => grid[npc.x][npc.y].occupied = npc);

  // Movement helper
  function moveCharacter(char, newX, newY) {
    if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize && !grid[newX][newY].occupied) {
      grid[char.x][char.y].occupied = null;
      char.x = newX;
      char.y = newY;
      grid[newX][newY].occupied = char;
      char.sprite.position.set(
        newX * tileSize - gridSize * tileSize / 2 + tileSize / 2,
        newY * tileSize - gridSize * tileSize / 2 + tileSize / 2,
        0.1
      );
    }
  }

  // NPC behaviors
  function updateNPCs() {
    npcs.forEach(npc => {
      const { role, x, y } = npc;
      const randMove = () => Math.random() < 0.5 ? -1 : 1;
      let newX = x, newY = y;

      if (role === 'gatherer') {
        // Find nearest resource
        let target = null;
        let minDist = Infinity;
        for (let i = 0; i < gridSize; i++) {
          for (let j = 0; j < gridSize; j++) {
            if (grid[i][j].resource > 0) {
              const dist = Math.abs(i - x) + Math.abs(j - y);
              if (dist < minDist) {
                minDist = dist;
                target = { x: i, y: j };
              }
            }
          }
        }
        if (target) {
          newX = x + (target.x > x ? 1 : target.x < x ? -1 : 0);
          newY = y + (target.y > y ? 1 : target.y < y ? -1 : 0);
          if (newX === target.x && newY === target.y) {
            npc.resources += grid[newX][newY].resource;
            grid[newX][newY].resource = 0;
          }
        } else {
          newX = x + randMove();
          newY = y + randMove();
        }
      } else if (role === 'builder') {
        // Build on empty tile
        if (Math.random() < 0.1) {
          const buildX = x + randMove(), buildY = y + randMove();
          if (buildX >= 0 && buildX < gridSize && buildY >= 0 && buildY < gridSize && !grid[buildX][buildY].occupied) {
            grid[buildX][buildY].plane.material.color.set(0x666666);
          }
        }
        newX = x + randMove();
        newY = y + randMove();
      } else if (role === 'attacker') {
        // Attack nearest NPC (not self)
        let target = null;
        let minDist = Infinity;
        npcs.forEach(other => {
          if (other !== npc) {
            const dist = Math.abs(other.x - x) + Math.abs(other.y - y);
            if (dist < minDist) {
              minDist = dist;
              target = other;
            }
          }
        });
        if (target && minDist <= 1) {
          target.sprite.material.color.set(0x888888); // "Damage"
        } else if (target) {
          newX = x + (target.x > x ? 1 : target.x < x ? -1 : 0);
          newY = y + (target.y > y ? 1 : target.y < y ? -1 : 0);
        }
      } else if (role === 'defender') {
        // Attack nearby enemies
        npcs.forEach(other => {
          if (other !== npc && Math.abs(other.x - x) + Math.abs(other.y - y) <= 1) {
            other.sprite.material.color.set(0x888888);
          }
        });
      }

      moveCharacter(npc, newX, newY);
    });
  }

  // Player controls
  document.addEventListener('keydown', e => {
    let newX = player.x, newY = player.y;
    if (e.key === 'ArrowUp') newY--;
    if (e.key === 'ArrowDown') newY++;
    if (e.key === 'ArrowLeft') newX--;
    if (e.key === 'ArrowRight') newX++;
    moveCharacter(player, newX, newY);
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    updateNPCs();
    renderer.render(scene, camera);
  }
  animate();
}