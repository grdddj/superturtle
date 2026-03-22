const GRID_SIZE = 40;
const BASE_TICK_MS = 180;
const INITIAL_DIRECTION = "right";

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

function createFoodPosition(snake) {
  const occupied = new Set(snake.map((segment) => `${segment.x},${segment.y}`));
  const center = Math.floor(GRID_SIZE / 2);
  const fallback = { x: center + 5, y: center };

  if (!occupied.has(`${fallback.x},${fallback.y}`)) {
    return fallback;
  }

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

function wrapPosition(position) {
  return {
    x: (position.x + GRID_SIZE) % GRID_SIZE,
    y: (position.y + GRID_SIZE) % GRID_SIZE,
  };
}

function isSamePosition(a, b) {
  return Boolean(a) && Boolean(b) && a.x === b.x && a.y === b.y;
}

function advancePosition(head, direction) {
  const vector = DIRECTION_VECTORS[direction];

  return wrapPosition({
    x: head.x + vector.x,
    y: head.y + vector.y,
  });
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
  const nextSnake = [nextHead, ...state.snake];
  const ateFood = isSamePosition(nextHead, state.food);

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
