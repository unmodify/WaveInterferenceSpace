// guiSystem.js
import * as dat from 'https://cdn.jsdelivr.net/npm/dat.gui@0.7.9/build/dat.gui.module.js';

export function setupGuiSystem(points, material, updateUniforms, addPointCallback, removePointCallback) {
  const gui = new dat.GUI();
  const mainParams = {
    blendMode: 'add',
    addPoint: addPointCallback
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
  gui.add(mainParams, 'blendMode', Object.keys(blendModes)).onChange(value => {
    material.uniforms.uBlendMode.value = blendModes[value];
  });
  gui.add(mainParams, 'addPoint').name('Add Point');

  const pointFolders = {};

  function addPointGUI(point) {
    const folder = gui.addFolder(`Point ${point.id}`);
    folder.add(point, 'x', 0, 1).onChange(updateUniforms);
    folder.add(point, 'y', 0, 1).onChange(updateUniforms);
    folder.add(point, 'frequency', 1, 10000).onChange(updateUniforms);
    folder.add(point, 'amplitude', 0, 2).onChange(updateUniforms);
    folder.add(point, 'phase', -Math.PI, Math.PI).onChange(updateUniforms);
    folder.add(point, 'phaseSpeed', -10, 10).name("Phase Speed").onChange(updateUniforms);
    folder.add({ remove: () => {
      removePointCallback(point.id);
    }}, 'remove').name('Remove Point');
    pointFolders[point.id] = folder;
    folder.open();
  }

  function removePoint(pointId) {
    if (pointFolders[pointId]) {
      gui.removeFolder(pointFolders[pointId]);
      delete pointFolders[pointId];
    }
  }

  return { gui, addPointGUI, removePoint, pointFolders };
}
