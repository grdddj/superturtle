const GRID_SIZE = 40;
const BASE_TICK_MS = 180;
const INITIAL_DIRECTION = "right";
const GOLDEN_ANGLE_RADIANS = (137.5 * Math.PI) / 180;
const FOOD_SPIRAL_SCALE = 0.5;
const FOOD_SPAWN_SEARCH_LIMIT = GRID_SIZE * GRID_SIZE * 8;

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const KEY_TO_DIRECTION = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  a: "left",
  A: "left",
  s: "down",
  S: "down",
  d: "right",
  D: "right",
};

const PAUSE_KEYS = new Set([" ", "Spacebar"]);

const OPPOSITE_DIRECTION = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const listeners = new Set();

let animationFrameId = null;
let lastFrameTime = 0;
let accumulatedTime = 0;
let tickInterval = BASE_TICK_MS;
let isInitialized = false;
let pendingGrowth = 0;
let foodSpawnIndex = 0;

let state = createInitialState();
let queuedDirection = INITIAL_DIRECTION;

function createInitialSnake() {
  const center = Math.floor(GRID_SIZE / 2);

  return [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];
}

function createInitialState() {
  const snake = createInitialSnake();

  return {
    gridSize: GRID_SIZE,
    snake,
    direction: INITIAL_DIRECTION,
    food: createFoodPosition(snake),
    score: 0,
    fibIndex: 0,
    currentFibValue: 1,
    isGameOver: false,
    isPaused: false,
  };
}

function getFibonacciValue(index) {
  if (index <= 1) {
    return 1;
  }

  let previous = 1;
  let current = 1;

  for (let fibStep = 2; fibStep <= index; fibStep += 1) {
    const next = previous + current;
    previous = current;
    current = next;
  }

  return current;
}

function isInsideGrid(position) {
  return (
    position.x >= 0 &&
    position.x < GRID_SIZE &&
    position.y >= 0 &&
    position.y < GRID_SIZE
  );
}

function createSpiralPosition(index) {
  const center = (GRID_SIZE - 1) / 2;
  const angle = index * GOLDEN_ANGLE_RADIANS;
  const radius = FOOD_SPIRAL_SCALE * Math.sqrt(index);

  return {
    x: Math.round(center + Math.cos(angle) * radius),
    y: Math.round(center + Math.sin(angle) * radius),
  };
}

function createFoodPosition(snake) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const visited = new Set();

  // Use a Vogel spiral so successive food placements advance outward from center.
  for (
    let attempt = 0;
    attempt < FOOD_SPAWN_SEARCH_LIMIT;
    attempt += 1
  ) {
    const spiralIndex = foodSpawnIndex + attempt;
    const candidate = createSpiralPosition(spiralIndex);

    if (!isInsideGrid(candidate)) {
      continue;
    }

    const key = `${candidate.x},${candidate.y}`;

    if (visited.has(key)) {
      continue;
    }

    visited.add(key);

    if (!occupied.has(key)) {
      foodSpawnIndex = spiralIndex + 1;
      return candidate;
    }
  }

  foodSpawnIndex += FOOD_SPAWN_SEARCH_LIMIT;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }

  return null;
}

function cloneState() {
  return {
    ...state,
    snake: state.snake.map((segment) => ({ ...segment })),
    food: state.food ? { ...state.food } : null,
  };
}

function emitStateChange() {
  const snapshot = cloneState();

  listeners.forEach((listener) => {
    listener(snapshot);
  });
}

function isSamePosition(a, b) {
  return Boolean(a) && Boolean(b) && a.x === b.x && a.y === b.y;
}

function advancePosition(head, direction) {
  const vector = DIRECTION_VECTORS[direction];

  return {
    x: head.x + vector.x,
    y: head.y + vector.y,
  };
}

function togglePause() {
  if (state.isGameOver) {
    return;
  }

  state.isPaused = !state.isPaused;
  resetTiming();
  emitStateChange();
}

function isSelfCollision(nextHead, ateFood) {
  const tailWillMove = !ateFood && pendingGrowth === 0;
  const collisionSegments = tailWillMove ? state.snake.slice(0, -1) : state.snake;

  return collisionSegments.some((segment) => isSamePosition(segment, nextHead));
}

function setGameOver() {
  state.isGameOver = true;
  state.isPaused = false;
  resetTiming();
  emitStateChange();
}

function queueDirection(direction) {
  if (!direction || direction === queuedDirection) {
    return;
  }

  if (
    state.snake.length > 1 &&
    OPPOSITE_DIRECTION[state.direction] === direction
  ) {
    return;
  }

  queuedDirection = direction;
}

function handleKeyDown(event) {
  if (event.code === "Space" || PAUSE_KEYS.has(event.key)) {
    event.preventDefault();
    togglePause();
    return;
  }

  const nextDirection = KEY_TO_DIRECTION[event.key];

  if (!nextDirection) {
    return;
  }

  event.preventDefault();
  queueDirection(nextDirection);
}

function step() {
  state.direction = queuedDirection;

  const nextHead = advancePosition(state.snake[0], state.direction);
  const ateFood = isSamePosition(nextHead, state.food);

  if (!isInsideGrid(nextHead) || isSelfCollision(nextHead, ateFood)) {
    setGameOver();
    return;
  }

  const nextSnake = [nextHead, ...state.snake];

  if (ateFood) {
    const growthAmount = getFibonacciValue(state.fibIndex);

    pendingGrowth += growthAmount;
    state.score += 1;
    state.fibIndex += 1;
    state.currentFibValue = growthAmount;
    state.food = createFoodPosition(nextSnake);
  }

  if (pendingGrowth > 0) {
    pendingGrowth -= 1;
  } else {
    nextSnake.pop();
  }

  state.snake = nextSnake;
  emitStateChange();
}

function frame(timestamp) {
  if (lastFrameTime === 0) {
    lastFrameTime = timestamp;
  }

  accumulatedTime += timestamp - lastFrameTime;
  lastFrameTime = timestamp;

  while (!state.isPaused && !state.isGameOver && accumulatedTime >= tickInterval) {
    step();
    accumulatedTime -= tickInterval;
  }

  animationFrameId = window.requestAnimationFrame(frame);
}

function ensureLoop() {
  if (animationFrameId !== null) {
    return;
  }

  animationFrameId = window.requestAnimationFrame(frame);
}

function resetTiming() {
  lastFrameTime = 0;
  accumulatedTime = 0;
}

function init() {
  if (isInitialized) {
    emitStateChange();
    return getState();
  }

  window.addEventListener("keydown", handleKeyDown);
  isInitialized = true;
  reset();
  start();

  return getState();
}

function start() {
  state.isPaused = false;
  ensureLoop();
  emitStateChange();

  return getState();
}

function reset() {
  pendingGrowth = 0;
  foodSpawnIndex = 0;
  queuedDirection = INITIAL_DIRECTION;
  tickInterval = BASE_TICK_MS;
  state = createInitialState();
  resetTiming();
  emitStateChange();

  return getState();
}

function getState() {
  return cloneState();
}

function onStateChange(listener) {
  if (typeof listener !== "function") {
    throw new TypeError("onStateChange requires a function listener");
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

window.FractalSnake = window.FractalSnake || {};
window.FractalSnake.engine = {
  init,
  start,
  reset,
  getState,
  onStateChange,
};
