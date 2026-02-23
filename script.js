const canvas = document.getElementById("lifeCanvas");
const ctx = canvas.getContext("2d");

const levelSelect = document.getElementById("levelSelect");
const ruleSelect = document.getElementById("ruleSelect");
const patternSelect = document.getElementById("patternSelect");
const speedRange = document.getElementById("speedRange");
const speedValue = document.getElementById("speedValue");

const startPauseBtn = document.getElementById("startPauseBtn");
const stepBtn = document.getElementById("stepBtn");
const randomBtn = document.getElementById("randomBtn");
const clearBtn = document.getElementById("clearBtn");
const applyPatternBtn = document.getElementById("applyPatternBtn");

const generationCount = document.getElementById("generationCount");
const liveCount = document.getElementById("liveCount");
const levelSummary = document.getElementById("levelSummary");

const LEVELS = {
  beginner: {
    rows: 20,
    cols: 20,
    speed: 4,
    wrap: false,
    summary: "Beginner: 20 x 20, slower pace for first-time learners.",
    randomFill: 0.28
  },
  intermediate: {
    rows: 35,
    cols: 35,
    speed: 8,
    wrap: false,
    summary: "Intermediate: 35 x 35, more interactions and moving structures.",
    randomFill: 0.24
  },
  advanced: {
    rows: 60,
    cols: 60,
    speed: 14,
    wrap: true,
    summary: "Advanced: 60 x 60, fast evolution and toroidal edge wrapping.",
    randomFill: 0.2
  }
};

let rows = 20;
let cols = 20;
let grid = [];
let generation = 0;
let running = false;
let timerId = null;
let cellSize = 1;
let pointerDown = false;

function makeGrid(r, c, fill = 0) {
  return Array.from({ length: r }, () => Array(c).fill(fill));
}

function resetGrid() {
  grid = makeGrid(rows, cols);
  generation = 0;
  updateStats();
  drawGrid();
}

function countLiveCells() {
  let total = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      total += grid[r][c];
    }
  }
  return total;
}

function updateStats() {
  generationCount.textContent = String(generation);
  liveCount.textContent = String(countLiveCells());
}

function parseRule(rule) {
  const [birthPart, survivePart] = rule.toUpperCase().split("/");
  const births = new Set((birthPart.replace("B", "").match(/\d/g) || []).map(Number));
  const survives = new Set((survivePart.replace("S", "").match(/\d/g) || []).map(Number));
  return { births, survives };
}

function neighborsAt(r, c, wrapMode) {
  let n = 0;
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) continue;
      let nr = r + dr;
      let nc = c + dc;

      if (wrapMode) {
        nr = (nr + rows) % rows;
        nc = (nc + cols) % cols;
        n += grid[nr][nc];
      } else if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        n += grid[nr][nc];
      }
    }
  }
  return n;
}

function nextGeneration() {
  const next = makeGrid(rows, cols);
  const { births, survives } = parseRule(ruleSelect.value);
  const wrapMode = LEVELS[levelSelect.value].wrap;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const alive = grid[r][c] === 1;
      const n = neighborsAt(r, c, wrapMode);

      if (!alive && births.has(n)) {
        next[r][c] = 1;
      } else if (alive && survives.has(n)) {
        next[r][c] = 1;
      }
    }
  }

  grid = next;
  generation += 1;
  updateStats();
  drawGrid();
}

function drawGrid() {
  const width = canvas.width;
  const height = canvas.height;
  cellSize = Math.floor(Math.min(width / cols, height / rows));

  ctx.fillStyle = "#f4efde";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#ff6b35";
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      if (grid[r][c] === 1) {
        ctx.fillRect(c * cellSize + 1, r * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    }
  }

  ctx.strokeStyle = "rgba(76, 95, 103, 0.24)";
  ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r += 1) {
    const y = r * cellSize;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(cols * cellSize, y);
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c += 1) {
    const x = c * cellSize;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, rows * cellSize);
    ctx.stroke();
  }
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
    timerId = setInterval(nextGeneration, intervalMs);
  }
}

function applyLevel(levelName) {
  const cfg = LEVELS[levelName];
  rows = cfg.rows;
  cols = cfg.cols;
  speedRange.value = String(cfg.speed);
  speedValue.textContent = String(cfg.speed);
  levelSummary.textContent = cfg.summary;

  setRunning(false);
  resetGrid();
}

function randomize() {
  const fillChance = LEVELS[levelSelect.value].randomFill;
  grid = makeGrid(rows, cols);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      grid[r][c] = Math.random() < fillChance ? 1 : 0;
    }
  }
  generation = 0;
  updateStats();
  drawGrid();
}

function centerPattern(coords) {
  const centerR = Math.floor(rows / 2);
  const centerC = Math.floor(cols / 2);

  for (const [r, c] of coords) {
    const nr = centerR + r;
    const nc = centerC + c;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      grid[nr][nc] = 1;
    }
  }
}

function applyPattern(name) {
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
      [-1, -4],
      [-1, -3],
      [-1, -2],
      [-1, 2],
      [-1, 3],
      [-1, 4],
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
      [6, 4],
      [-4, -6],
      [-3, -6],
      [-2, -6],
      [2, -6],
      [3, -6],
      [4, -6]
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

  centerPattern(patterns[name] || []);
  drawGrid();
  updateStats();
}

function pointerToCell(evt) {
  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;
  const c = Math.floor(x / rect.width * cols);
  const r = Math.floor(y / rect.height * rows);
  return { r, c };
}

function toggleCellFromPointer(evt, paintValue = null) {
  const { r, c } = pointerToCell(evt);
  if (r < 0 || r >= rows || c < 0 || c >= cols) return;

  if (paintValue === null) {
    grid[r][c] = grid[r][c] ? 0 : 1;
  } else {
    grid[r][c] = paintValue;
  }
  drawGrid();
  updateStats();
}

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
  if (!running) nextGeneration();
});

randomBtn.addEventListener("click", () => {
  setRunning(false);
  randomize();
});

clearBtn.addEventListener("click", () => {
  setRunning(false);
  resetGrid();
});

applyPatternBtn.addEventListener("click", () => {
  setRunning(false);
  applyPattern(patternSelect.value);
});

canvas.addEventListener("pointerdown", (evt) => {
  pointerDown = true;
  toggleCellFromPointer(evt);
});

canvas.addEventListener("pointermove", (evt) => {
  if (!pointerDown) return;
  toggleCellFromPointer(evt, 1);
});

window.addEventListener("pointerup", () => {
  pointerDown = false;
});

window.addEventListener("resize", drawGrid);

applyLevel("beginner");
