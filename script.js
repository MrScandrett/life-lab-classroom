import * as THREE from "https://unpkg.com/three@0.183.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.183.1/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("lifeCanvas");
const ctx = canvas.getContext("2d");

const modeSelect = document.getElementById("modeSelect");
const levelSelect = document.getElementById("levelSelect");
const ruleSelect = document.getElementById("ruleSelect");
const voxelRuleSelect = document.getElementById("voxelRuleSelect");
const patternSelect = document.getElementById("patternSelect");
const seedSelect = document.getElementById("seedSelect");
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

const rule2dWrap = document.getElementById("rule2dWrap");
const rule3dWrap = document.getElementById("rule3dWrap");
const patternWrap = document.getElementById("patternWrap");
const seedWrap = document.getElementById("seedWrap");
const hintText = document.getElementById("hintText");

const startPauseBtn = document.getElementById("startPauseBtn");
const stepBtn = document.getElementById("stepBtn");
const randomBtn = document.getElementById("randomBtn");
const clearBtn = document.getElementById("clearBtn");
const applyPatternBtn = document.getElementById("applyPatternBtn");

const generationCount = document.getElementById("generationCount");
const liveCount = document.getElementById("liveCount");
const levelSummary = document.getElementById("levelSummary");

const voxelViewport = document.getElementById("voxelViewport");

const LEVELS = {
  beginner: {
    rows: 20,
    cols: 20,
    voxels: 12,
    speed: 4,
    wrap2d: false,
    wrap3d: false,
    randomFill2d: 0.28,
    randomFill3d: 0.18,
    summary2d: "Beginner 2D: 20 x 20, slower pace for first-time learners.",
    summary3d: "Beginner 3D: 12 x 12 x 12, no edge wrapping, easier to observe structures."
  },
  intermediate: {
    rows: 35,
    cols: 35,
    voxels: 16,
    speed: 8,
    wrap2d: false,
    wrap3d: false,
    randomFill2d: 0.24,
    randomFill3d: 0.16,
    summary2d: "Intermediate 2D: 35 x 35, richer interactions and moving structures.",
    summary3d: "Intermediate 3D: 16 x 16 x 16, denser interactions with manageable complexity."
  },
  advanced: {
    rows: 60,
    cols: 60,
    voxels: 22,
    speed: 12,
    wrap2d: true,
    wrap3d: true,
    randomFill2d: 0.2,
    randomFill3d: 0.14,
    summary2d: "Advanced 2D: 60 x 60, fast evolution with toroidal edge wrapping.",
    summary3d: "Advanced 3D: 22 x 22 x 22, toroidal wrapping in all axes and rapid evolution."
  }
};

const HINT_2D = "Tip: Click or drag on the grid to toggle cells before pressing Start.";
const HINT_3D = "Tip: Drag to orbit, scroll to zoom, and place a voxel seed before pressing Start.";

let mode = "2d";
let generation = 0;
let running = false;
let timerId = null;
let pointerDown = false;

let rows = 20;
let cols = 20;
let grid2d = [];

let voxelSize = 12;
let grid3d = new Uint8Array(0);

let scene = null;
let camera = null;
let renderer = null;
let controls = null;
let voxelMesh = null;
let voxelGeometry = null;
let voxelMaterial = null;
let threeReady = false;
let threeAnimating = false;

function parseRulePart(partText) {
  const part = partText.trim();
  if (!part) return new Set();

  if (part.includes(",")) {
    return new Set(
      part
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value >= 0)
    );
  }

  const digits = part.match(/\d/g) || [];
  return new Set(digits.map(Number));
}

function parseRule(rule) {
  const [birthPart = "B", survivePart = "S"] = rule.toUpperCase().split("/");
  const births = parseRulePart(birthPart.replace("B", ""));
  const survives = parseRulePart(survivePart.replace("S", ""));
  return { births, survives };
}

function makeGrid2d(r, c, fill = 0) {
  return Array.from({ length: r }, () => Array(c).fill(fill));
}

function makeGrid3d(size, fill = 0) {
  const data = new Uint8Array(size * size * size);
  if (fill !== 0) data.fill(fill);
  return data;
}

function idx3d(x, y, z) {
  return x + y * voxelSize + z * voxelSize * voxelSize;
}

function countLive2d() {
  let total = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      total += grid2d[r][c];
    }
  }
  return total;
}

function countLive3d() {
  let total = 0;
  for (let i = 0; i < grid3d.length; i += 1) {
    total += grid3d[i];
  }
  return total;
}

function activeLiveCount() {
  return mode === "2d" ? countLive2d() : countLive3d();
}

function updateStats() {
  generationCount.textContent = String(generation);
  liveCount.textContent = String(activeLiveCount());
}

function drawGrid2d() {
  const width = canvas.width;
  const height = canvas.height;
  const cellWidth = width / cols;
  const cellHeight = height / rows;

  ctx.fillStyle = "#f4efde";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ff6b35";
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (grid2d[r][c] === 1) {
        ctx.fillRect(c * cellWidth + 1, r * cellHeight + 1, Math.max(1, cellWidth - 2), Math.max(1, cellHeight - 2));
      }
    }
  }

  ctx.strokeStyle = "rgba(76, 95, 103, 0.24)";
  ctx.lineWidth = 1;

  for (let r = 0; r <= rows; r += 1) {
    const y = r * cellHeight;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c += 1) {
    const x = c * cellWidth;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
}

function resetGrid2d() {
  grid2d = makeGrid2d(rows, cols);
  generation = 0;
  drawGrid2d();
  updateStats();
}

function resetGrid3d() {
  grid3d = makeGrid3d(voxelSize);
  generation = 0;
  drawGrid3d();
  updateStats();
}

function neighbors2d(r, c, wrapMode) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;

      let nr = r + dr;
      let nc = c + dc;
      if (wrapMode) {
        nr = (nr + rows) % rows;
        nc = (nc + cols) % cols;
        n += grid2d[nr][nc];
      } else if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        n += grid2d[nr][nc];
      }
    }
  }
  return n;
}

function step2d() {
  const next = makeGrid2d(rows, cols);
  const { births, survives } = parseRule(ruleSelect.value);
  const wrapMode = LEVELS[levelSelect.value].wrap2d;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const alive = grid2d[r][c] === 1;
      const n = neighbors2d(r, c, wrapMode);
      if (!alive && births.has(n)) {
        next[r][c] = 1;
      } else if (alive && survives.has(n)) {
        next[r][c] = 1;
      }
    }
  }

  grid2d = next;
  generation += 1;
  drawGrid2d();
  updateStats();
}

function neighbors3d(x, y, z, wrapMode) {
  let n = 0;

  for (let dz = -1; dz <= 1; dz += 1) {
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0 && dz === 0) continue;

        let nx = x + dx;
        let ny = y + dy;
        let nz = z + dz;

        if (wrapMode) {
          nx = (nx + voxelSize) % voxelSize;
          ny = (ny + voxelSize) % voxelSize;
          nz = (nz + voxelSize) % voxelSize;
          n += grid3d[idx3d(nx, ny, nz)];
        } else if (nx >= 0 && nx < voxelSize && ny >= 0 && ny < voxelSize && nz >= 0 && nz < voxelSize) {
          n += grid3d[idx3d(nx, ny, nz)];
        }
      }
    }
  }

  return n;
}

function step3d() {
  const next = makeGrid3d(voxelSize);
  const { births, survives } = parseRule(voxelRuleSelect.value);
  const wrapMode = LEVELS[levelSelect.value].wrap3d;

  for (let z = 0; z < voxelSize; z += 1) {
    for (let y = 0; y < voxelSize; y += 1) {
      for (let x = 0; x < voxelSize; x += 1) {
        const i = idx3d(x, y, z);
        const alive = grid3d[i] === 1;
        const n = neighbors3d(x, y, z, wrapMode);

        if (!alive && births.has(n)) {
          next[i] = 1;
        } else if (alive && survives.has(n)) {
          next[i] = 1;
        }
      }
    }
  }

  grid3d = next;
  generation += 1;
  drawGrid3d();
  updateStats();
}

function randomize2d() {
  const fillChance = LEVELS[levelSelect.value].randomFill2d;
  grid2d = makeGrid2d(rows, cols);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      grid2d[r][c] = Math.random() < fillChance ? 1 : 0;
    }
  }
  generation = 0;
  drawGrid2d();
  updateStats();
}

function randomize3d() {
  const fillChance = LEVELS[levelSelect.value].randomFill3d;
  grid3d = makeGrid3d(voxelSize);

  for (let i = 0; i < grid3d.length; i += 1) {
    grid3d[i] = Math.random() < fillChance ? 1 : 0;
  }

  generation = 0;
  drawGrid3d();
  updateStats();
}

function centerPattern2d(coords) {
  const centerR = Math.floor(rows / 2);
  const centerC = Math.floor(cols / 2);

  for (const [r, c] of coords) {
    const nr = centerR + r;
    const nc = centerC + c;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      grid2d[nr][nc] = 1;
    }
  }
}

function applyPattern2d(name) {
  if (name === "none") return;

  const patterns = {
    glider: [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 1],
      [2, 2]
    ],
    lwss: [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 0],
      [1, 4],
      [2, 4],
      [3, 0],
      [3, 3]
    ],
    pulsar: [
      [-6, -4],
      [-6, -3],
      [-6, -2],
      [-6, 2],
      [-6, 3],
      [-6, 4],
      [-4, -6],
      [-3, -6],
      [-2, -6],
      [2, -6],
      [3, -6],
      [4, -6],
      [-1, -4],
      [-1, -3],
      [-1, -2],
      [-1, 2],
      [-1, 3],
      [-1, 4],
      [-4, -1],
      [-3, -1],
      [-2, -1],
      [2, -1],
      [3, -1],
      [4, -1],
      [-4, 1],
      [-3, 1],
      [-2, 1],
      [2, 1],
      [3, 1],
      [4, 1],
      [1, -4],
      [1, -3],
      [1, -2],
      [1, 2],
      [1, 3],
      [1, 4],
      [-4, 6],
      [-3, 6],
      [-2, 6],
      [2, 6],
      [3, 6],
      [4, 6],
      [6, -4],
      [6, -3],
      [6, -2],
      [6, 2],
      [6, 3],
      [6, 4]
    ],
    gosper: [
      [0, 24],
      [1, 22],
      [1, 24],
      [2, 12],
      [2, 13],
      [2, 20],
      [2, 21],
      [2, 34],
      [2, 35],
      [3, 11],
      [3, 15],
      [3, 20],
      [3, 21],
      [3, 34],
      [3, 35],
      [4, 0],
      [4, 1],
      [4, 10],
      [4, 16],
      [4, 20],
      [4, 21],
      [5, 0],
      [5, 1],
      [5, 10],
      [5, 14],
      [5, 16],
      [5, 17],
      [5, 22],
      [5, 24],
      [6, 10],
      [6, 16],
      [6, 24],
      [7, 11],
      [7, 15],
      [8, 12],
      [8, 13]
    ]
  };

  centerPattern2d(patterns[name] || []);
  drawGrid2d();
  updateStats();
}

function setVoxelCell(x, y, z, value) {
  if (x < 0 || x >= voxelSize || y < 0 || y >= voxelSize || z < 0 || z >= voxelSize) return;
  grid3d[idx3d(x, y, z)] = value;
}

function applySeed3d(name) {
  resetGrid3d();
  const c = Math.floor(voxelSize / 2);

  if (name === "random") {
    randomize3d();
    return;
  }

  if (name === "cluster") {
    for (let z = c - 1; z <= c + 1; z += 1) {
      for (let y = c - 1; y <= c + 1; y += 1) {
        for (let x = c - 1; x <= c + 1; x += 1) {
          setVoxelCell(x, y, z, 1);
        }
      }
    }
  }

  if (name === "cross") {
    for (let i = -3; i <= 3; i += 1) {
      setVoxelCell(c + i, c, c, 1);
      setVoxelCell(c, c + i, c, 1);
      setVoxelCell(c, c, c + i, 1);
    }
  }

  if (name === "shell") {
    const radius = 3;
    for (let z = -radius; z <= radius; z += 1) {
      for (let y = -radius; y <= radius; y += 1) {
        for (let x = -radius; x <= radius; x += 1) {
          const edge =
            Math.abs(x) === radius ||
            Math.abs(y) === radius ||
            Math.abs(z) === radius;
          if (edge) {
            setVoxelCell(c + x, c + y, c + z, 1);
          }
        }
      }
    }
  }

  generation = 0;
  drawGrid3d();
  updateStats();
}

function pointerToCell2d(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const c = Math.floor((x / rect.width) * cols);
  const r = Math.floor((y / rect.height) * rows);
  return { r, c };
}

function toggleCell2d(evt, paintValue = null) {
  const { r, c } = pointerToCell2d(evt);
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;

  if (paintValue === null) {
    grid2d[r][c] = grid2d[r][c] ? 0 : 1;
  } else {
    grid2d[r][c] = paintValue;
  }

  drawGrid2d();
  updateStats();
}

function setRunning(state) {
  running = state;
  startPauseBtn.textContent = running ? "Pause" : "Start";

  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }

  if (running) {
    const intervalMs = Math.max(40, Math.floor(1000 / Number(speedRange.value)));
    timerId = setInterval(() => {
      if (mode === "2d") {
        step2d();
      } else {
        step3d();
      }
    }, intervalMs);
  }
}

function updateSummary() {
  const cfg = LEVELS[levelSelect.value];
  levelSummary.textContent = mode === "2d" ? cfg.summary2d : cfg.summary3d;
}

function applyLevel(levelName) {
  const cfg = LEVELS[levelName];
  rows = cfg.rows;
  cols = cfg.cols;
  voxelSize = cfg.voxels;
  speedRange.value = String(cfg.speed);
  speedValue.textContent = String(cfg.speed);
  updateSummary();

  setRunning(false);

  if (mode === "2d") {
    resetGrid2d();
  } else {
    resetGrid3d();
    rebuildVoxelMesh();
    drawGrid3d();
  }
}

function updateModeUi() {
  const is3d = mode === "3d";

  rule2dWrap.classList.toggle("hidden", is3d);
  rule3dWrap.classList.toggle("hidden", !is3d);
  patternWrap.classList.toggle("hidden", is3d);
  seedWrap.classList.toggle("hidden", !is3d);

  canvas.classList.toggle("hidden", is3d);
  voxelViewport.classList.toggle("hidden", !is3d);

  applyPatternBtn.textContent = is3d ? "Place Voxel Seed" : "Place Pattern";
  hintText.textContent = is3d ? HINT_3D : HINT_2D;
}

function initThreeIfNeeded() {
  if (threeReady) return true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1418);

  camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1500);
  camera.position.set(24, 22, 24);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  voxelViewport.innerHTML = "";
  voxelViewport.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff1d6, 0.95);
  keyLight.position.set(20, 25, 12);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x84d9ff, 0.55);
  rimLight.position.set(-14, 10, -12);
  scene.add(rimLight);

  const gridHelper = new THREE.GridHelper(40, 20, 0x406070, 0x283843);
  scene.add(gridHelper);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0, 0);

  voxelGeometry = new THREE.BoxGeometry(0.92, 0.92, 0.92);
  voxelMaterial = new THREE.MeshStandardMaterial({
    color: 0xff7a35,
    roughness: 0.34,
    metalness: 0.1
  });

  threeReady = true;
  resizeThree();

  if (!threeAnimating) {
    animateThree();
  }

  return true;
}

function animateThree() {
  if (!threeReady) return;
  threeAnimating = true;

  const frame = () => {
    if (!threeReady) {
      threeAnimating = false;
      return;
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);
}

function rebuildVoxelMesh() {
  if (!threeReady) return;

  if (voxelMesh) {
    scene.remove(voxelMesh);
  }

  const maxInstances = voxelSize * voxelSize * voxelSize;
  voxelMesh = new THREE.InstancedMesh(voxelGeometry, voxelMaterial, maxInstances);
  voxelMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(voxelMesh);
}

function drawGrid3d() {
  if (!threeReady || !voxelMesh) return;

  const dummy = new THREE.Object3D();
  const offset = (voxelSize - 1) / 2;
  let instanceCount = 0;

  for (let z = 0; z < voxelSize; z += 1) {
    for (let y = 0; y < voxelSize; y += 1) {
      for (let x = 0; x < voxelSize; x += 1) {
        if (grid3d[idx3d(x, y, z)] !== 1) continue;

        dummy.position.set(x - offset, y - offset, z - offset);
        dummy.updateMatrix();
        voxelMesh.setMatrixAt(instanceCount, dummy.matrix);
        instanceCount += 1;
      }
    }
  }

  voxelMesh.count = instanceCount;
  voxelMesh.instanceMatrix.needsUpdate = true;
}

function resizeThree() {
  if (!threeReady || voxelViewport.classList.contains("hidden")) return;

  const width = voxelViewport.clientWidth;
  const height = voxelViewport.clientHeight;
  if (width <= 0 || height <= 0) return;

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function switchMode(nextMode) {
  mode = nextMode;
  setRunning(false);
  updateModeUi();

  if (mode === "3d") {
    const ok = initThreeIfNeeded();
    if (!ok) {
      modeSelect.value = "2d";
      mode = "2d";
      updateModeUi();
    }
  }

  applyLevel(levelSelect.value);
  resizeThree();
}

modeSelect.addEventListener("change", () => {
  switchMode(modeSelect.value);
});

levelSelect.addEventListener("change", () => {
  applyLevel(levelSelect.value);
});

speedRange.addEventListener("input", () => {
  speedValue.textContent = speedRange.value;
  if (running) setRunning(true);
});

startPauseBtn.addEventListener("click", () => {
  setRunning(!running);
});

stepBtn.addEventListener("click", () => {
  if (running) return;
  if (mode === "2d") {
    step2d();
  } else {
    step3d();
  }
});

randomBtn.addEventListener("click", () => {
  setRunning(false);
  if (mode === "2d") {
    randomize2d();
  } else {
    randomize3d();
  }
});

clearBtn.addEventListener("click", () => {
  setRunning(false);
  if (mode === "2d") {
    resetGrid2d();
  } else {
    resetGrid3d();
  }
});

applyPatternBtn.addEventListener("click", () => {
  setRunning(false);
  if (mode === "2d") {
    applyPattern2d(patternSelect.value);
  } else {
    applySeed3d(seedSelect.value);
  }
});

canvas.addEventListener("pointerdown", (evt) => {
  if (mode !== "2d") return;
  pointerDown = true;
  toggleCell2d(evt);
});

canvas.addEventListener("pointermove", (evt) => {
  if (mode !== "2d" || !pointerDown) return;
  toggleCell2d(evt, 1);
});

window.addEventListener("pointerup", () => {
  pointerDown = false;
});

window.addEventListener("resize", () => {
  if (mode === "2d") {
    drawGrid2d();
  }
  resizeThree();
});

switchMode("2d");
