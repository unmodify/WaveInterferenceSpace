// commandInterpreter.js
export function interpretCommand(commandStr, context) {
    const feedback = [];
    // Split commands on newline or semicolon.
    const commands = commandStr.split(/[\n;]+/).map(s => s.trim()).filter(s => s.length);
    for (const cmd of commands) {
      if (/^p/i.test(cmd)) {
        // Point‐based commands: p(indices).action(args)
        const regex = /^p(?:\(([^)]+)\))?\.(\w+)(?:\(([^)]*)\))?$/i;
        const match = cmd.match(regex);
        if (!match) {
          feedback.push(`Unrecognized point command: "${cmd}"`);
          continue;
        }
        const [, indicesStr, actionRaw, argsStr] = match;
        const action = actionRaw.toLowerCase();
        // Build targetIndices array (0‐based)
        let targetIndices = [];
        if (indicesStr) {
          const parts = indicesStr.split(',').map(s => s.trim());
          for (const part of parts) {
            if (part.includes('-')) {
              const [a, b] = part.split('-').map(n => parseInt(n, 10));
              if (isNaN(a)||isNaN(b)) continue;
              for (let i = a; i <= b; i++) targetIndices.push(i-1);
            } else {
              const idx = parseInt(part, 10);
              if (!isNaN(idx)) targetIndices.push(idx-1);
            }
          }
        } else {
          targetIndices = context.points.map((_,i)=>i);
        }
        targetIndices = Array.from(new Set(targetIndices)).sort((a,b)=>a-b);
        // Extend points if needed
        const maxIdx = Math.max(...targetIndices, -1);
        while (context.points.length <= maxIdx) {
          const p = { id: context.points.length, x:0.5, y:0.5, frequency:10, amplitude:1, phase:0, phaseSpeed:0 };
          context.points.push(p);
          feedback.push(`Created default point index ${context.points.length} (id ${p.id}).`);
        }
  
        // Perform action
        if (action === 'rem') {
          // remove in descending order
          for (const idx of targetIndices.sort((a,b)=>b-a)) {
            if (context.points.length<=1) {
              feedback.push("Cannot remove last point.");
              break;
            }
            const [rem] = context.points.splice(idx,1);
            context.removePoint(rem.id);
            feedback.push(`Removed point id ${rem.id} at index ${idx+1}.`);
          }
        } else if (['xy','phase','freq','ampl','phasespeed'].includes(action)) {
          if (!argsStr) {
            feedback.push(`No args for ${action} in "${cmd}".`);
            continue;
          }
          const args = argsStr.split(',').map(n=>parseFloat(n.trim()));
          if (action==='xy' && args.length===2 && args.every(a=>!isNaN(a))) {
            targetIndices.forEach((i,j)=>{
              context.points[i].x=args[0];
              context.points[i].y=args[1];
            });
            feedback.push(`Set xy(${args[0]},${args[1]}) on points ${targetIndices.map(i=>i+1).join(',')}.`);
          } else if (action==='phase' && args.length===1 && !isNaN(args[0])) {
            targetIndices.forEach(i=>context.points[i].phase=args[0]);
            feedback.push(`Set phase=${args[0]} on points ${targetIndices.map(i=>i+1).join(',')}.`);
          } else if (action==='freq' && args.length===1 && !isNaN(args[0])) {
            targetIndices.forEach(i=>context.points[i].frequency=args[0]);
            feedback.push(`Set freq=${args[0]} on points ${targetIndices.map(i=>i+1).join(',')}.`);
          } else if (action==='ampl' && args.length===1 && !isNaN(args[0])) {
            targetIndices.forEach(i=>context.points[i].amplitude=args[0]);
            feedback.push(`Set ampl=${args[0]} on points ${targetIndices.map(i=>i+1).join(',')}.`);
          } else if (action==='phasespeed' && args.length===1 && !isNaN(args[0])) {
            targetIndices.forEach(i=>context.points[i].phaseSpeed=args[0]);
            feedback.push(`Set phaseSpeed=${args[0]} on points ${targetIndices.map(i=>i+1).join(',')}.`);
          } else {
            feedback.push(`Invalid args for ${action} in "${cmd}".`);
          }
        } else if (action === 'circle') {
          // Distribute selected points around a circle of radius .25 around (.5,.5)
          const N = targetIndices.length;
          if (N === 0) { feedback.push(`No targets for circle in "${cmd}".`); continue; }
          targetIndices.forEach((ptIdx,i)=>{
            const angle = (2 * Math.PI) * (i / N);
            context.points[ptIdx].x = 0.5 + 0.25 * Math.cos(angle);
            context.points[ptIdx].y = 0.5 + 0.25 * Math.sin(angle);
          });
          feedback.push(`Arranged points ${targetIndices.map(i=>i+1).join(',')} on circle.`);
        } else if (action === 'grid') {
          // Arrange in roughly square grid spanning .5 around .5
          const N = targetIndices.length;
          if (N === 0) { feedback.push(`No targets for grid in "${cmd}".`); continue; }
          const n = Math.ceil(Math.sqrt(N));
          const span = 0.5;
          const step = n>1 ? span / (n - 1) : 0;
          targetIndices.forEach((ptIdx,i)=>{
            const row = Math.floor(i / n), col = i % n;
            context.points[ptIdx].x = 0.5 - span/2 + col*step;
            context.points[ptIdx].y = 0.5 - span/2 + row*step;
          });
          feedback.push(`Arranged points ${targetIndices.map(i=>i+1).join(',')} on ${n}x${n} grid.`);
        } else {
          feedback.push(`Unknown point action "${action}" in "${cmd}".`);
        }
  
      } else if (/^b\./i.test(cmd)) {
        const regex = /^b\.(\w+)(?:\(([^)]*)\))?$/i;
        const [,act,args] = cmd.match(regex) || [];
        if (act && act.toLowerCase()==='mode' && args) {
          const m=args.trim().toLowerCase();
          if (context.blendModes[m]!==undefined) {
            context.material.uniforms.uBlendMode.value = context.blendModes[m];
            feedback.push(`Blend mode set to "${m}".`);
          } else {
            feedback.push(`Invalid blend mode "${m}" in "${cmd}".`);
          }
        } else {
          feedback.push(`Unknown blend command "${cmd}".`);
        }
  
      } else if (/^part\./i.test(cmd)) {
        const regex = /^part\.(\w+)(?:\(([^)]*)\))?$/i;
        const [,act,args] = cmd.match(regex) || [];
        if (act && act.toLowerCase()==='force' && args) {
          const v=parseFloat(args);
          if (!isNaN(v)) {
            context.particleParams.forceEffect=v;
            feedback.push(`Particle forceEffect set to ${v}.`);
          } else feedback.push(`Invalid part.force arg in "${cmd}".`);
        } else if (act && act.toLowerCase()==='info') {
          context.particleParams.info = args||'';
          feedback.push(`Particle info set to "${context.particleParams.info}".`);
        } else {
          feedback.push(`Unknown particle command "${cmd}".`);
        }
      } else {
        feedback.push(`Unrecognized command prefix in "${cmd}".`);
      }
    }
  
    feedback.forEach(m=>console.log(m));
    return feedback;
  }
  