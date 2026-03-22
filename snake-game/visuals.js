const FRACTAL_SNAKE = (window.FractalSnake = window.FractalSnake || {});
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
const TAU = Math.PI * 2;
const TRAIL_FADE_MS = 2000;
const MAX_TRAIL_MARKS = 24;
const EAT_FLASH_MS = 220;
const DEATH_TINT_FADE_MS = 420;
const LEVEL_BURST_MS = 950;
const LEVEL_BURST_PARTICLES = 24;
const MAX_LEVEL_BURSTS = 6;

const visualsState = {
  canvas: null,
  context: null,
  animationFrameId: 0,
  resizeAttached: false,
  width: 0,
  height: 0,
  pixelRatio: 1,
  stars: [],
  fractalCanvas: null,
  fractalWidth: 0,
  fractalHeight: 0,
  trailMarks: [],
  lastSnakeSnapshot: [],
  lastEngineSnapshot: null,
  eatFlashStartedAt: Number.NEGATIVE_INFINITY,
  eatFlashPoint: null,
  deathStartedAt: null,
  levelBursts: [],
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
  ensureFractalBackdrop(cssWidth, cssHeight);

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
  const layout = inferBoardLayout(engineState, visualsState.width, visualsState.height);

  updateReactiveEffects(engineState, timestamp);
  pruneLevelBursts(timestamp);

  drawBackdrop(context, visualsState.width, visualsState.height, timestamp, engineState);
  drawBoardPlaceholder(context, layout, timestamp, engineState);
  drawReactiveEffects(
    context,
    visualsState.width,
    visualsState.height,
    layout,
    timestamp,
    engineState
  );
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

function drawBackdrop(context, width, height, timestamp, state) {
  const pulse = 0.5 + Math.sin(timestamp / 1800) * 0.5;
  const score = typeof state?.score === 'number' ? state.score : 0;
  const hueRotation = (score * 17) % 360;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#070816');
  gradient.addColorStop(0.55, '#101b3d');
  gradient.addColorStop(1, '#040509');

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  drawFractalLayer(context, width, height, timestamp, hueRotation, pulse);

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

function drawFractalLayer(context, width, height, timestamp, hueRotation, pulse) {
  const { fractalCanvas } = visualsState;
  if (!fractalCanvas) {
    return;
  }

  const driftX = Math.sin(timestamp / 12000) * width * 0.015;
  const driftY = Math.cos(timestamp / 10000) * height * 0.02;

  context.save();
  context.globalAlpha = 0.34 + pulse * 0.16;
  context.filter = `hue-rotate(${hueRotation}deg) saturate(1.35) brightness(${0.78 + pulse * 0.18})`;
  context.drawImage(fractalCanvas, driftX, driftY, width, height);
  context.restore();

  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha = 0.16;
  context.fillStyle = `hsl(${(225 + hueRotation) % 360} 88% 64%)`;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawBoardPlaceholder(context, layout, timestamp, state) {
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
  syncTrailMarks(snake, timestamp, state);
  drawSnakeTrail(context, layout, timestamp);
  drawSnakeSegments(context, layout, snake, timestamp);

  const food = collectPoints(state?.food);
  drawFoodItems(context, layout, food, timestamp);

  context.restore();
}

function updateReactiveEffects(state, timestamp) {
  if (!state) {
    visualsState.lastEngineSnapshot = null;
    resetReactiveEffects();
    return;
  }

  const snapshot = createEngineSnapshot(state);
  const previous = visualsState.lastEngineSnapshot;

  if (!previous) {
    visualsState.lastEngineSnapshot = snapshot;
    visualsState.deathStartedAt = snapshot.isGameOver ? timestamp : null;
    return;
  }

  const resetOccurred =
    snapshot.score < previous.score
    || snapshot.fibIndex < previous.fibIndex
    || (!snapshot.isGameOver && previous.isGameOver && snapshot.score === 0);

  if (resetOccurred) {
    resetReactiveEffects();
  }

  if (snapshot.score > previous.score) {
    visualsState.eatFlashStartedAt = timestamp;
    visualsState.eatFlashPoint = snapshot.head ? { ...snapshot.head } : null;
  }

  if (snapshot.fibIndex > previous.fibIndex && snapshot.head) {
    const burstsToSpawn = snapshot.fibIndex - previous.fibIndex;

    for (let burstIndex = 0; burstIndex < burstsToSpawn; burstIndex += 1) {
      spawnLevelBurst(snapshot.head, timestamp);
    }
  }

  if (snapshot.isGameOver && !previous.isGameOver) {
    visualsState.deathStartedAt = timestamp;
  } else if (!snapshot.isGameOver) {
    visualsState.deathStartedAt = null;
  }

  visualsState.lastEngineSnapshot = snapshot;
}

function createEngineSnapshot(state) {
  const snake = extractPoints(state?.snake);

  return {
    score: Number.isFinite(state?.score) ? state.score : 0,
    fibIndex: Number.isFinite(state?.fibIndex) ? state.fibIndex : 0,
    isGameOver: Boolean(state?.isGameOver),
    head: snake[0] ? { ...snake[0] } : null,
  };
}

function resetReactiveEffects() {
  visualsState.eatFlashStartedAt = Number.NEGATIVE_INFINITY;
  visualsState.eatFlashPoint = null;
  visualsState.deathStartedAt = null;
  visualsState.levelBursts = [];
}

function spawnLevelBurst(origin, timestamp) {
  const particles = [];

  for (let index = 0; index < LEVEL_BURST_PARTICLES; index += 1) {
    const angle = (index / LEVEL_BURST_PARTICLES) * TAU + Math.random() * 0.35;
    const speed = 0.8 + Math.random() * 1.65;

    particles.push({
      angle,
      speed,
      lift: -0.12 - Math.random() * 0.28,
      drag: 0.86 + Math.random() * 0.18,
      size: 0.06 + Math.random() * 0.12,
      alpha: 0.45 + Math.random() * 0.4,
      hueShift: -4 + Math.random() * 18,
    });
  }

  visualsState.levelBursts.push({
    origin: { ...origin },
    createdAt: timestamp,
    particles,
  });

  if (visualsState.levelBursts.length > MAX_LEVEL_BURSTS) {
    visualsState.levelBursts.splice(0, visualsState.levelBursts.length - MAX_LEVEL_BURSTS);
  }
}

function pruneLevelBursts(timestamp) {
  visualsState.levelBursts = visualsState.levelBursts.filter(
    (burst) => timestamp - burst.createdAt < LEVEL_BURST_MS
  );
}

function drawReactiveEffects(context, width, height, layout, timestamp, state) {
  drawLevelBursts(context, layout, timestamp);
  drawEatFlash(context, width, height, layout, timestamp);
  drawDeathTint(context, width, height, timestamp, state);
}

function drawEatFlash(context, width, height, layout, timestamp) {
  const age = timestamp - visualsState.eatFlashStartedAt;
  if (age < 0 || age > EAT_FLASH_MS) {
    return;
  }

  const life = clamp(1 - age / EAT_FLASH_MS, 0, 1);
  const intensity = Math.pow(life, 1.6);

  context.save();
  context.globalCompositeOperation = 'screen';

  context.fillStyle = `rgba(255, 242, 194, ${0.08 + intensity * 0.22})`;
  context.fillRect(0, 0, width, height);

  if (layout && visualsState.eatFlashPoint) {
    const center = getCellCenter(layout, visualsState.eatFlashPoint);
    const radius = Math.max(layout.cellSize * 2.4, Math.min(width, height) * (0.12 + intensity * 0.22));
    const aura = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, radius);

    aura.addColorStop(0, `rgba(255, 252, 228, ${0.18 + intensity * 0.42})`);
    aura.addColorStop(0.35, `rgba(255, 214, 112, ${0.12 + intensity * 0.3})`);
    aura.addColorStop(0.72, `rgba(72, 235, 255, ${intensity * 0.18})`);
    aura.addColorStop(1, 'rgba(72, 235, 255, 0)');

    context.fillStyle = aura;
    context.beginPath();
    context.arc(center.x, center.y, radius, 0, TAU);
    context.fill();
  }

  context.restore();
}

function drawDeathTint(context, width, height, timestamp, state) {
  if (!state?.isGameOver || visualsState.deathStartedAt === null) {
    return;
  }

  const age = Math.max(0, timestamp - visualsState.deathStartedAt);
  const onset = clamp(age / DEATH_TINT_FADE_MS, 0, 1);
  const pulse = 0.5 + Math.sin(timestamp / 180) * 0.5;

  context.save();
  context.fillStyle = `rgba(92, 0, 14, ${0.12 + onset * 0.16})`;
  context.fillRect(0, 0, width, height);

  const centerGlow = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.14,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.72
  );

  centerGlow.addColorStop(0, `rgba(255, 110, 128, ${0.05 + onset * 0.05 + pulse * 0.03})`);
  centerGlow.addColorStop(0.55, `rgba(182, 18, 44, ${0.08 + onset * 0.08})`);
  centerGlow.addColorStop(1, `rgba(18, 0, 4, ${0.34 + onset * 0.18})`);

  context.fillStyle = centerGlow;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawLevelBursts(context, layout, timestamp) {
  if (!layout || !visualsState.levelBursts.length) {
    return;
  }

  context.save();
  context.globalCompositeOperation = 'screen';

  visualsState.levelBursts.forEach((burst) => {
    const age = Math.max(0, timestamp - burst.createdAt);
    const life = clamp(1 - age / LEVEL_BURST_MS, 0, 1);
    if (life <= 0) {
      return;
    }

    const center = getCellCenter(layout, burst.origin);
    const originGlow = context.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      layout.cellSize * (0.5 + (1 - life) * 1.6)
    );

    originGlow.addColorStop(0, `rgba(255, 252, 210, ${life * 0.22})`);
    originGlow.addColorStop(0.45, `rgba(255, 196, 86, ${life * 0.15})`);
    originGlow.addColorStop(1, 'rgba(255, 196, 86, 0)');

    context.fillStyle = originGlow;
    context.beginPath();
    context.arc(center.x, center.y, layout.cellSize * 1.45, 0, TAU);
    context.fill();

    burst.particles.forEach((particle) => {
      const progress = 1 - life;
      const velocity = particle.speed * particle.drag;
      const distance = layout.cellSize * velocity * (0.55 + progress * 1.9);
      const px = center.x + Math.cos(particle.angle) * distance;
      const py =
        center.y
        + Math.sin(particle.angle) * distance
        + particle.lift * layout.cellSize * (0.25 + progress * 2.1);
      const streakLength = layout.cellSize * (0.18 + progress * 0.24);
      const startX = px - Math.cos(particle.angle) * streakLength;
      const startY = py - Math.sin(particle.angle) * streakLength;
      const alpha = particle.alpha * Math.pow(life, 1.45);
      const radius = Math.max(1.1, layout.cellSize * particle.size * (0.8 + progress * 0.75));

      context.beginPath();
      context.moveTo(startX, startY);
      context.lineTo(px, py);
      context.lineCap = 'round';
      context.lineWidth = Math.max(1, radius * 0.9);
      context.strokeStyle = hsla(40 + particle.hueShift, 100, 72, alpha * 0.85);
      context.shadowColor = hsla(46 + particle.hueShift, 100, 76, alpha);
      context.shadowBlur = radius * 3.2;
      context.stroke();

      context.beginPath();
      context.arc(px, py, radius, 0, TAU);
      context.fillStyle = hsla(46 + particle.hueShift, 100, 76, alpha);
      context.fill();
    });
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
  const food = collectPoints(state?.food);
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

function collectPoints(value) {
  if (Array.isArray(value)) {
    return extractPoints(value);
  }

  const point = normalizePoint(value);
  return point ? [point] : [];
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

function drawSnakeSegments(context, layout, snake, timestamp) {
  if (!snake.length) {
    return;
  }

  context.save();

  snake.forEach((point, index) => {
    const center = getCellCenter(layout, point);
    const progressToHead = snake.length <= 1 ? 1 : 1 - index / (snake.length - 1);
    const colors = getSnakeSegmentColors(progressToHead);
    const heading = getSnakeSegmentHeading(snake, index);
    const animatedRotation = heading + Math.sin(timestamp / 260 + index * 0.9) * 0.08;
    const spiralRadius = layout.cellSize * (0.24 + progressToHead * 0.16);
    const lineWidth = Math.max(2.4, layout.cellSize * (0.085 + progressToHead * 0.03));

    drawGoldenSpiralArc(
      context,
      center.x,
      center.y,
      spiralRadius,
      lineWidth,
      animatedRotation,
      colors
    );
  });

  context.restore();
}

function syncTrailMarks(snake, timestamp, state) {
  pruneTrailMarks(timestamp);

  if (!snake.length) {
    visualsState.lastSnakeSnapshot = [];
    return;
  }

  const previousSnake = visualsState.lastSnakeSnapshot;
  if (!previousSnake.length) {
    visualsState.lastSnakeSnapshot = clonePoints(snake);
    return;
  }

  const previousHead = previousSnake[0];
  const currentHead = snake[0];
  const headStep = manhattanDistance(previousHead, currentHead);

  if (headStep === 0) {
    visualsState.lastSnakeSnapshot = clonePoints(snake);
    return;
  }

  if (headStep > 1 || snake.length + 2 < previousSnake.length) {
    visualsState.trailMarks = [];
    visualsState.lastSnakeSnapshot = clonePoints(snake);
    return;
  }

  const previousTail = previousSnake[previousSnake.length - 1];
  if (previousTail && !pointInCollection(previousTail, snake)) {
    visualsState.trailMarks.push({
      point: previousTail,
      heading: getSnakeSegmentHeading(previousSnake, previousSnake.length - 1),
      createdAt: timestamp,
      branches: 3 + Math.min(2, Math.floor(((state?.fibIndex || 0) + snake.length) / 7)),
      energy: clamp(0.62 + snake.length / 28, 0.62, 1.15),
    });
  }

  if (visualsState.trailMarks.length > MAX_TRAIL_MARKS) {
    visualsState.trailMarks.splice(0, visualsState.trailMarks.length - MAX_TRAIL_MARKS);
  }

  visualsState.lastSnakeSnapshot = clonePoints(snake);
}

function pruneTrailMarks(timestamp) {
  visualsState.trailMarks = visualsState.trailMarks.filter(
    (mark) => timestamp - mark.createdAt < TRAIL_FADE_MS
  );
}

function drawSnakeTrail(context, layout, timestamp) {
  if (!visualsState.trailMarks.length) {
    return;
  }

  context.save();
  context.globalCompositeOperation = 'screen';

  visualsState.trailMarks.forEach((mark, index) => {
    const age = Math.max(0, timestamp - mark.createdAt);
    const life = clamp(1 - age / TRAIL_FADE_MS, 0, 1);
    if (life <= 0) {
      return;
    }

    const center = getCellCenter(layout, mark.point);
    const fade = Math.pow(life, 1.55);
    const size = layout.cellSize * (0.28 + (1 - life) * 0.26) * mark.energy;
    const glowRadius = layout.cellSize * (0.7 + (1 - life) * 0.45) * mark.energy;
    const hueShift = ((index * 9) % 28) - 8;
    const aura = context.createRadialGradient(
      center.x,
      center.y,
      0,
      center.x,
      center.y,
      glowRadius
    );

    aura.addColorStop(0, hsla(42 + hueShift, 100, 76, fade * 0.3));
    aura.addColorStop(0.48, hsla(184 + hueShift, 92, 58, fade * 0.16));
    aura.addColorStop(1, hsla(210 + hueShift, 88, 52, 0));

    context.fillStyle = aura;
    context.beginPath();
    context.arc(center.x, center.y, glowRadius, 0, TAU);
    context.fill();

    drawTrailBranchFractal(
      context,
      center.x,
      center.y,
      mark.heading,
      size,
      mark.branches,
      Math.PI / 4.6,
      fade * 0.72
    );
  });

  context.restore();
}

function drawTrailBranchFractal(context, x, y, angle, length, depth, spread, alpha) {
  if (depth <= 0 || length < 1.2 || alpha <= 0.02) {
    return;
  }

  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  const bend = length * 0.2 * (depth % 2 === 0 ? 1 : -1);
  const controlX = (x + endX) / 2 + Math.cos(angle + Math.PI / 2) * bend;
  const controlY = (y + endY) / 2 + Math.sin(angle + Math.PI / 2) * bend;
  const gradient = context.createLinearGradient(x, y, endX, endY);

  gradient.addColorStop(0, hsla(38 + depth * 4, 100, 74, alpha));
  gradient.addColorStop(0.55, hsla(45 + depth * 3, 96, 63, alpha * 0.9));
  gradient.addColorStop(1, hsla(188 - depth * 3, 84, 58, alpha * 0.18));

  context.beginPath();
  context.moveTo(x, y);
  context.quadraticCurveTo(controlX, controlY, endX, endY);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1, length * 0.16);
  context.shadowColor = hsla(44, 100, 70, alpha * 0.7);
  context.shadowBlur = length * 0.8;
  context.strokeStyle = gradient;
  context.stroke();

  context.beginPath();
  context.arc(endX, endY, Math.max(0.9, length * 0.07), 0, TAU);
  context.fillStyle = hsla(190, 85, 72, alpha * 0.35);
  context.fill();

  const nextLength = length * 0.68;
  const nextAlpha = alpha * 0.76;

  drawTrailBranchFractal(
    context,
    endX,
    endY,
    angle - spread,
    nextLength,
    depth - 1,
    spread,
    nextAlpha
  );
  drawTrailBranchFractal(
    context,
    endX,
    endY,
    angle + spread,
    nextLength,
    depth - 1,
    spread,
    nextAlpha
  );
}

function drawFoodItems(context, layout, food, timestamp) {
  if (!food.length) {
    return;
  }

  context.save();
  context.globalCompositeOperation = 'screen';

  food.forEach((point, index) => {
    const center = getCellCenter(layout, point);
    const pulse = 0.5 + Math.sin(timestamp / 220 + index * 0.8) * 0.5;
    const rotation = timestamp / 720 + index * (Math.PI / GOLDEN_RATIO);
    const spiralRadius = layout.cellSize * (0.16 + pulse * 0.09);
    const haloRadius = layout.cellSize * (0.48 + pulse * 0.14);
    const halo = context.createRadialGradient(center.x, center.y, 0, center.x, center.y, haloRadius);

    halo.addColorStop(0, 'rgba(190, 255, 255, 0.38)');
    halo.addColorStop(0.45, 'rgba(72, 235, 255, 0.18)');
    halo.addColorStop(1, 'rgba(72, 235, 255, 0)');

    context.fillStyle = halo;
    context.beginPath();
    context.arc(center.x, center.y, haloRadius, 0, TAU);
    context.fill();

    drawFibonacciSpiral(context, center.x, center.y, spiralRadius, rotation, pulse);
  });

  context.restore();
}

function drawFibonacciSpiral(context, x, y, radius, rotation, pulse) {
  const turns = 2.4;
  const maxTheta = turns * TAU;
  const minRadius = Math.max(1.2, radius * 0.11);
  const growthRate = Math.log(radius / minRadius) / maxTheta;
  const steps = 64;
  const endX = x + Math.cos(rotation + maxTheta) * radius;
  const endY = y + Math.sin(rotation + maxTheta) * radius;
  const gradient = context.createLinearGradient(x, y, endX, endY);

  gradient.addColorStop(0, 'rgba(218, 255, 255, 0.98)');
  gradient.addColorStop(0.45, 'rgba(92, 244, 255, 0.95)');
  gradient.addColorStop(1, 'rgba(18, 180, 215, 0.78)');

  context.beginPath();
  for (let step = 0; step <= steps; step += 1) {
    const theta = (step / steps) * maxTheta;
    const spiralRadius = minRadius * Math.exp(growthRate * theta);
    const px = x + Math.cos(rotation + theta) * spiralRadius;
    const py = y + Math.sin(rotation + theta) * spiralRadius;

    if (step === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1.8, radius * (0.16 + pulse * 0.05));
  context.shadowColor = 'rgba(122, 245, 255, 0.95)';
  context.shadowBlur = radius * (1.2 + pulse * 1.5);
  context.strokeStyle = gradient;
  context.stroke();

  context.beginPath();
  context.arc(x, y, Math.max(1.6, radius * 0.16), 0, TAU);
  context.fillStyle = 'rgba(220, 255, 255, 0.95)';
  context.fill();
}

function drawGoldenSpiralArc(context, x, y, radius, lineWidth, rotation, colors) {
  const maxTheta = Math.PI * 1.65;
  const minRadius = Math.max(1.5, radius * 0.12);
  const growthRate = Math.log(radius / minRadius) / maxTheta;
  const steps = 42;
  const endX = x + Math.cos(rotation + maxTheta) * radius;
  const endY = y + Math.sin(rotation + maxTheta) * radius;
  const gradient = context.createLinearGradient(x, y, endX, endY);

  gradient.addColorStop(0, colors.inner);
  gradient.addColorStop(0.55, colors.mid);
  gradient.addColorStop(1, colors.outer);

  context.beginPath();
  for (let step = 0; step <= steps; step += 1) {
    const theta = (step / steps) * maxTheta;
    const spiralRadius = minRadius * Math.exp(growthRate * theta);
    const px = x + Math.cos(rotation + theta) * spiralRadius;
    const py = y + Math.sin(rotation + theta) * spiralRadius;

    if (step === 0) {
      context.moveTo(px, py);
    } else {
      context.lineTo(px, py);
    }
  }

  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = lineWidth;
  context.shadowColor = colors.glow;
  context.shadowBlur = radius * 0.85;
  context.strokeStyle = gradient;
  context.stroke();

  context.beginPath();
  context.arc(x, y, lineWidth * 0.42, 0, TAU);
  context.fillStyle = colors.inner;
  context.fill();
}

function getSnakeSegmentColors(progressToHead) {
  const eased = Math.pow(progressToHead, 0.82);
  const hue = 32 + eased * 13;
  const saturation = 70 + eased * 18;
  const lightness = 22 + eased * 40;

  return {
    inner: hsla(hue + 4, saturation + 8, Math.min(lightness + 16, 88), 0.98),
    mid: hsla(hue + 1, saturation + 4, Math.min(lightness + 5, 76), 0.96),
    outer: hsla(hue - 3, Math.max(65, saturation - 6), Math.max(18, lightness - 8), 0.92),
    glow: hsla(hue + 6, 100, Math.min(lightness + 22, 82), 0.38 + eased * 0.28),
  };
}

function getSnakeSegmentHeading(snake, index) {
  const current = snake[index];
  const towardHead = index > 0 ? snake[index - 1] : null;
  const towardTail = index < snake.length - 1 ? snake[index + 1] : null;

  let vectorX = 1;
  let vectorY = 0;

  if (towardHead && towardTail) {
    vectorX = towardHead.x - towardTail.x;
    vectorY = towardHead.y - towardTail.y;
  } else if (towardHead) {
    vectorX = towardHead.x - current.x;
    vectorY = towardHead.y - current.y;
  } else if (towardTail) {
    vectorX = current.x - towardTail.x;
    vectorY = current.y - towardTail.y;
  }

  if (vectorX === 0 && vectorY === 0) {
    return -Math.PI / 2 + index * (Math.PI / GOLDEN_RATIO);
  }

  return Math.atan2(vectorY, vectorX) - Math.PI / GOLDEN_RATIO;
}

function clonePoints(points) {
  return points.map((point) => ({ x: point.x, y: point.y }));
}

function pointInCollection(target, points) {
  return points.some((point) => point.x === target.x && point.y === target.y);
}

function manhattanDistance(a, b) {
  if (!a || !b) {
    return Infinity;
  }

  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function hsla(hue, saturation, lightness, alpha) {
  return `hsla(${Math.round(hue)}, ${Math.round(saturation)}%, ${Math.round(lightness)}%, ${alpha})`;
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

function ensureFractalBackdrop(width, height) {
  const targetWidth = clamp(Math.round(width * 0.42), 180, 480);
  const targetHeight = clamp(Math.round(height * 0.42), 180, 480);

  if (
    visualsState.fractalCanvas &&
    visualsState.fractalWidth === targetWidth &&
    visualsState.fractalHeight === targetHeight
  ) {
    return;
  }

  const fractalCanvas = document.createElement('canvas');
  fractalCanvas.width = targetWidth;
  fractalCanvas.height = targetHeight;

  const fractalContext = fractalCanvas.getContext('2d');
  if (!fractalContext) {
    visualsState.fractalCanvas = null;
    visualsState.fractalWidth = 0;
    visualsState.fractalHeight = 0;
    return;
  }

  paintJuliaSet(fractalContext, targetWidth, targetHeight);
  visualsState.fractalCanvas = fractalCanvas;
  visualsState.fractalWidth = targetWidth;
  visualsState.fractalHeight = targetHeight;
}

function paintJuliaSet(context, width, height) {
  const imageData = context.createImageData(width, height);
  const pixels = imageData.data;
  const aspect = width / height;
  const maxIterations = 88;
  const constantReal = -0.82;
  const constantImaginary = 0.156;
  const zoom = 1.55;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      let zx = ((x / width) * 2 - 1) * aspect * zoom - 0.18;
      let zy = ((y / height) * 2 - 1) * zoom + 0.04;
      let iteration = 0;

      while (zx * zx + zy * zy < 16 && iteration < maxIterations) {
        const nextReal = zx * zx - zy * zy + constantReal;
        zy = 2 * zx * zy + constantImaginary;
        zx = nextReal;
        iteration += 1;
      }

      const smoothIteration =
        iteration === maxIterations
          ? 0
          : iteration + 1 - Math.log2(Math.log2(zx * zx + zy * zy));
      const escape = iteration === maxIterations ? 0 : 1 - smoothIteration / maxIterations;
      const glow = Math.max(0, Math.min(1, Math.pow(escape, 1.35)));
      const grain = 0.78 + pseudoRandom(x * 0.37 + y * 0.61) * 0.22;
      const band = 0.5 + Math.sin((zx + zy) * 6.2) * 0.5;
      const luminance = glow * grain * (0.8 + band * 0.35);

      pixels[offset] = Math.round(8 + luminance * 82);
      pixels[offset + 1] = Math.round(14 + luminance * 116);
      pixels[offset + 2] = Math.round(30 + luminance * 190);
      pixels[offset + 3] = Math.round(30 + luminance * 220);
    }
  }

  context.putImageData(imageData, 0, 0);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pseudoRandom(seed) {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

FRACTAL_SNAKE.visuals = { init };
