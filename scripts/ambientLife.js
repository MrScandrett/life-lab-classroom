const canvas = document.getElementById("ambient-life");

if (canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });

  const CELL_SIZE = 6;
  const INITIAL_DENSITY = 0.1;
  const BASE_INTERVAL_MS = 650;
  const REDUCED_MOTION_INTERVAL_MS = 10000;
  const MICRO_SEED_EVERY = 300;
  const MIN_LIVE_THRESHOLD = 60;
  const LIVE_COLOR = "rgba(120, 255, 180, 1)";

  let cols = 0;
  let rows = 0;
  let grid = new Uint8Array(0);
  let nextGrid = new Uint8Array(0);
  let generation = 0;
  let loopId = null;

  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function idx(x, y) {
    return y * cols + x;
  }

  function seedRandom(density) {
    for (let i = 0; i < grid.length; i += 1) {
      grid[i] = Math.random() < density ? 1 : 0;
    }
  }

  function injectCluster(centerX, centerY, cells, radius = 2) {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = cells * 8;

    while (placed < cells && attempts < maxAttempts) {
      attempts += 1;
      const x = centerX + randInt(-radius, radius);
      const y = centerY + randInt(-radius, radius);
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;

      const i = idx(x, y);
      if (grid[i] === 0) {
        grid[i] = 1;
        placed += 1;
      }
    }
  }

  function injectMicroSeed() {
    const clusters = randInt(2, 3);
    let remaining = randInt(8, 20);

    for (let i = 0; i < clusters; i += 1) {
      const clustersLeft = clusters - i;
      const minForThis = Math.max(2, Math.floor(remaining / clustersLeft));
      const maxForThis = Math.max(minForThis, Math.ceil(remaining / clustersLeft) + 1);
      const cells = i === clusters - 1 ? remaining : randInt(minForThis, maxForThis);
      remaining -= cells;

      const cx = randInt(0, Math.max(0, cols - 1));
      const cy = randInt(0, Math.max(0, rows - 1));
      injectCluster(cx, cy, cells, 2);
    }
  }

  function injectLowPopulationSeed() {
    const clusters = randInt(2, 4);
    for (let i = 0; i < clusters; i += 1) {
      const cells = randInt(10, 25);
      const cx = randInt(0, Math.max(0, cols - 1));
      const cy = randInt(0, Math.max(0, rows - 1));
      injectCluster(cx, cy, cells, 3);
    }
  }

  function countLive() {
    let live = 0;
    for (let i = 0; i < grid.length; i += 1) {
      live += grid[i];
    }
    return live;
  }

  function neighborsAt(x, y) {
    let total = 0;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;

        const nx = (x + dx + cols) % cols;
        const ny = (y + dy + rows) % rows;
        total += grid[idx(nx, ny)];
      }
    }

    return total;
  }

  function step() {
    nextGrid.fill(0);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const i = idx(x, y);
        const alive = grid[i] === 1;
        const neighbors = neighborsAt(x, y);

        if ((!alive && neighbors === 3) || (alive && (neighbors === 2 || neighbors === 3))) {
          nextGrid[i] = 1;
        }
      }
    }

    const swap = grid;
    grid = nextGrid;
    nextGrid = swap;
    generation += 1;
  }

  function render() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = LIVE_COLOR;

    const drawSize = Math.max(2, CELL_SIZE - 1);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        if (grid[idx(x, y)] === 1) {
          ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, drawSize, drawSize);
        }
      }
    }
  }

  function tick() {
    step();

    if (generation % MICRO_SEED_EVERY === 0) {
      injectMicroSeed();
    }

    if (countLive() < MIN_LIVE_THRESHOLD) {
      injectLowPopulationSeed();
    }

    render();
  }

  function stopLoop() {
    if (loopId !== null) {
      clearInterval(loopId);
      loopId = null;
    }
  }

  function startLoop() {
    stopLoop();

    if (document.visibilityState !== "visible") {
      return;
    }

    const interval = reduceMotionQuery.matches ? REDUCED_MOTION_INTERVAL_MS : BASE_INTERVAL_MS;
    loopId = window.setInterval(tick, interval);
  }

  function resizeCanvasAndGrid() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    cols = Math.ceil(width / CELL_SIZE);
    rows = Math.ceil(height / CELL_SIZE);

    grid = new Uint8Array(cols * rows);
    nextGrid = new Uint8Array(cols * rows);
    generation = 0;

    seedRandom(INITIAL_DENSITY);

    if (countLive() < MIN_LIVE_THRESHOLD) {
      injectLowPopulationSeed();
    }

    render();
  }

  let resizeTimeout = null;
  window.addEventListener("resize", () => {
    if (resizeTimeout !== null) {
      clearTimeout(resizeTimeout);
    }

    resizeTimeout = window.setTimeout(() => {
      resizeCanvasAndGrid();
    }, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      startLoop();
    } else {
      stopLoop();
    }
  });

  if (typeof reduceMotionQuery.addEventListener === "function") {
    reduceMotionQuery.addEventListener("change", () => {
      startLoop();
    });
  } else if (typeof reduceMotionQuery.addListener === "function") {
    reduceMotionQuery.addListener(() => {
      startLoop();
    });
  }

  resizeCanvasAndGrid();
  startLoop();
}
