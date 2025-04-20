// dist4/uiPanel.js
export function createUiPanel({ onSave, onLoad, onRunCommand }) {
  const container = document.createElement("div");
  Object.assign(container.style, {
    position: "absolute",
    bottom: "10px",
    left: "10px",
    zIndex: 100,
    font: "12px sans-serif"
  });
  container.innerHTML = `
    <button id="helpBtn">?</button>
    <button id="saveBtn" style="margin-left:8px;">Save Config</button>
    <button id="loadBtn" style="margin-left:4px;">Load Config</button>
    <input type="file" id="fileInput" style="display:none;" accept="application/json">
    <div id="helpBox" style="
      display:none; max-width:320px; background:rgba(0,0,0,0.75);
      color:#fff; padding:12px; margin-top:6px; border-radius:6px;
      font-size:12px; line-height:1.4;
    ">
      <strong>Point Indexing</strong><br>
      • <code>p</code> – all points<br>
      • <code>p(3)</code> – point 3 (creates if needed)<br>
      • <code>p(1,3)</code> – points 1 & 3<br>
      • <code>p(2-4)</code> – points 2,3,4<br>
      • <code>p(1,3-5)</code> – points 1,3,4,5<br>
      <br>
      <strong>Point Actions</strong><br>
      • <code>p.rem</code> – remove selected<br>
      • <code>p.xy(x,y)</code> – set position<br>
      • <code>p.freq(v)</code> – frequency<br>
      • <code>p.ampl(v)</code> – amplitude<br>
      • <code>p.phase(v)</code> – phase offset<br>
      • <code>p.phaseSpeed(v)</code> – phase rate<br>
      • <code>p.circle()</code> – arrange in circle<br>
      • <code>p.grid()</code> – arrange in grid<br>
      <br>
      <strong>Range Mapping</strong><br>
      • <code>clip</code> shows raw [-1…1]<br>
      • <code>remap</code> shifts to [0…1]<br>
      <br>
      <strong>Blend &amp; Particles</strong><br>
      • <code>b.mode(add|…)</code><br>
      • <code>part.force(v)</code><br>
      • <code>part.info(text)</code><br>
      <br>
      <strong>Mouse &amp; Keys</strong><br>
      • Click empty – add point<br>
      • Drag point – move<br>
      • <code>Space</code> – remove under cursor / toggle circles<br>
      • <code>Z</code> – spawn particle<br>
      • <code>Submit</code> – run commands<br>
    </div>
    <br>
    <textarea id="commandBox" rows="4" cols="40" placeholder="Enter commands…"></textarea><br>
    <button id="submitCommand">Submit</button>
  `;
  document.body.appendChild(container);

  // wire up
  const helpBtn = container.querySelector("#helpBtn");
  const helpBox = container.querySelector("#helpBox");
  helpBtn.onclick = () => {
    helpBox.style.display = helpBox.style.display === "block" ? "none" : "block";
  };

  container.querySelector("#saveBtn").onclick = onSave;
  container.querySelector("#loadBtn").onclick = () => {
    container.querySelector("#fileInput").click();
  };
  container.querySelector("#fileInput").onchange = onLoad;

  container.querySelector("#submitCommand").onclick = () => {
    const txt = container.querySelector("#commandBox").value.trim();
    if (txt) onRunCommand(txt);
  };

  return container;
}
