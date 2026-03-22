const FRACTAL_SNAKE = (window.FractalSnake = window.FractalSnake || {});

const visualsState = {
  canvas: null,
  context: null,
  animationFrameId: 0,
  resizeAttached: false,
  width: 0,
  height: 0,
  pixelRatio: 1,
  stars: [],
};

function init() {
  if (visualsState.animationFrameId) {
    return;
  }

  const canvas = document.getElementById('game-canvas');
  if (!(canvas instanceof HTMLCanvasElement)) {
    console.warn('FractalSnake.visuals: #game-canvas was not found.');
    return;
  }

  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    console.warn('FractalSnake.visuals: 2D canvas context is unavailable.');
    return;
  }

  visualsState.canvas = canvas;
  visualsState.context = context;

  resizeCanvas();
  attachResizeHandler();
  renderFrame(0);
}

function attachResizeHandler() {
  if (visualsState.resizeAttached) {
    return;
  }

  visualsState.resizeAttached = true;
  window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
  const { canvas, context } = visualsState;
  if (!canvas || !context) {
    return;
  }

  const cssWidth = Math.max(1, Math.floor(canvas.clientWidth || window.innerWidth || 1));
  const cssHeight = Math.max(1, Math.floor(canvas.clientHeight || window.innerHeight || 1));
  const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const backingWidth = Math.floor(cssWidth * pixelRatio);
  const backingHeight = Math.floor(cssHeight * pixelRatio);

  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  visualsState.width = cssWidth;
  visualsState.height = cssHeight;
  visualsState.pixelRatio = pixelRatio;
  visualsState.stars = buildStars(cssWidth, cssHeight);

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.imageSmoothingEnabled = true;
}

function renderFrame(timestamp) {
  const { context } = visualsState;
  if (!context) {
    visualsState.animationFrameId = 0;
    return;
  }

  const engineState = readEngineState();

  drawBackdrop(context, visualsState.width, visualsState.height, timestamp);
  drawBoardPlaceholder(context, visualsState.width, visualsState.height, engineState);
  drawStateOverlay(context, visualsState.width, visualsState.height, engineState);

  visualsState.animationFrameId = window.requestAnimationFrame(renderFrame);
}

function readEngineState() {
  const engine = FRACTAL_SNAKE.engine;
  if (!engine || typeof engine.getState !== 'function') {
    return null;
  }

  try {
    return engine.getState();
  } catch (error) {
    console.warn('FractalSnake.visuals: engine.getState() failed.', error);
    return null;
  }
}

function drawBackdrop(context, width, height, timestamp) {
  const pulse = 0.5 + Math.sin(timestamp / 1800) * 0.5;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#070816');
  gradient.addColorStop(0.55, '#101b3d');
  gradient.addColorStop(1, '#040509');

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.save();
  context.globalAlpha = 0.3 + pulse * 0.1;
  for (const star of visualsState.stars) {
    context.fillStyle = star.color;
    context.beginPath();
    context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawBoardPlaceholder(context, width, height, state) {
  const layout = inferBoardLayout(state, width, height);
  if (!layout) {
    return;
  }

  context.save();
  context.strokeStyle = 'rgba(112, 150, 255, 0.12)';
  context.lineWidth = 1;
  context.strokeRect(layout.offsetX, layout.offsetY, layout.boardWidth, layout.boardHeight);

  for (let x = 1; x < layout.cols; x += 1) {
    const lineX = layout.offsetX + x * layout.cellSize;
    context.beginPath();
    context.moveTo(lineX, layout.offsetY);
    context.lineTo(lineX, layout.offsetY + layout.boardHeight);
    context.stroke();
  }

  for (let y = 1; y < layout.rows; y += 1) {
    const lineY = layout.offsetY + y * layout.cellSize;
    context.beginPath();
    context.moveTo(layout.offsetX, lineY);
    context.lineTo(layout.offsetX + layout.boardWidth, lineY);
    context.stroke();
  }

  const snake = extractPoints(state?.snake);
  snake.forEach((point, index) => {
    const center = getCellCenter(layout, point);
    const intensity = snake.length <= 1 ? 1 : index / (snake.length - 1);
    context.fillStyle = `rgba(${Math.round(160 + intensity * 70)}, ${Math.round(100 + intensity * 90)}, 28, 0.9)`;
    context.beginPath();
    context.arc(center.x, center.y, layout.cellSize * 0.32, 0, Math.PI * 2);
    context.fill();
  });

  const food = extractPoints(state?.food);
  food.forEach((point) => {
    const center = getCellCenter(layout, point);
    context.fillStyle = 'rgba(80, 225, 255, 0.95)';
    context.beginPath();
    context.arc(center.x, center.y, layout.cellSize * 0.25, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function drawStateOverlay(context, width, height, state) {
  const score = typeof state?.score === 'number' ? state.score : 0;
  const snakeLength = Array.isArray(state?.snake) ? state.snake.length : 0;
  const status = typeof state?.status === 'string' ? state.status : 'booting';

  context.save();
  context.fillStyle = 'rgba(244, 247, 255, 0.9)';
  context.font = "14px 'Courier New', monospace";
  context.textBaseline = 'top';

  const lines = [
    `Score ${score}`,
    `Length ${snakeLength}`,
    `Status ${status}`,
  ];

  if (!state) {
    lines.push('Waiting for engine state');
  }

  lines.forEach((line, index) => {
    context.fillText(line, 18, height - 74 + index * 18);
  });

  context.restore();
}

function inferBoardLayout(state, width, height) {
  const board = state?.board || state?.grid || state?.bounds || null;
  const snake = extractPoints(state?.snake);
  const food = extractPoints(state?.food);
  const allPoints = snake.concat(food);

  const cols = readDimension(board, ['cols', 'columns', 'width'], allPoints, 'x');
  const rows = readDimension(board, ['rows', 'height'], allPoints, 'y');
  if (!cols || !rows) {
    return null;
  }

  const cellSize = Math.max(10, Math.floor(Math.min(width / cols, height / rows)));
  const boardWidth = cellSize * cols;
  const boardHeight = cellSize * rows;

  return {
    cols,
    rows,
    cellSize,
    boardWidth,
    boardHeight,
    offsetX: Math.floor((width - boardWidth) / 2),
    offsetY: Math.floor((height - boardHeight) / 2),
  };
}

function readDimension(board, keys, points, axis) {
  for (const key of keys) {
    const value = board?.[key];
    if (Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
  }

  if (!points.length) {
    return 20;
  }

  const maxPoint = Math.max(...points.map((point) => point[axis]));
  return Math.max(8, maxPoint + 3);
}

function extractPoints(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((point) => normalizePoint(point))
    .filter((point) => point !== null);
}

function normalizePoint(point) {
  if (!point || typeof point !== 'object') {
    return null;
  }

  const x = firstFinite(point.x, point.col, point.column, point.i);
  const y = firstFinite(point.y, point.row, point.j);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.floor(x),
    y: Math.floor(y),
  };
}

function firstFinite(...values) {
  return values.find((value) => Number.isFinite(value));
}

function getCellCenter(layout, point) {
  return {
    x: layout.offsetX + point.x * layout.cellSize + layout.cellSize / 2,
    y: layout.offsetY + point.y * layout.cellSize + layout.cellSize / 2,
  };
}

function buildStars(width, height) {
  const count = Math.max(30, Math.floor((width * height) / 18000));
  const stars = [];

  for (let index = 0; index < count; index += 1) {
    const seed = pseudoRandom(index * 97.13 + width * 0.17 + height * 0.29);
    stars.push({
      x: pseudoRandom(seed + 1.2) * width,
      y: pseudoRandom(seed + 2.4) * height,
      radius: 0.6 + pseudoRandom(seed + 3.6) * 1.8,
      color: pseudoRandom(seed + 4.8) > 0.7 ? 'rgba(111, 220, 255, 0.9)' : 'rgba(255, 226, 168, 0.8)',
    });
  }

  return stars;
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

FRACTAL_SNAKE.visuals = { init };
