const MUTE_KEYS = new Set(["m", "M"]);
const DEFAULT_MASTER_VOLUME = 0.2;
const EAT_BASE_FREQUENCY = 110;
const EAT_ATTACK_SECONDS = 0.012;
const EAT_DECAY_SECONDS = 0.18;
const EAT_PEAK_GAIN = 0.24;
const DEATH_START_FREQUENCY = 440;
const DEATH_STEP_SECONDS = 0.055;
const DEATH_TONE_DURATION = 0.18;
const DEATH_ATTACK_SECONDS = 0.004;
const DEATH_PEAK_GAIN = 0.14;
const DEATH_SEMITONE_STEPS = 12;
const DEATH_REVERB_DURATION_SECONDS = 1.6;
const DEATH_REVERB_DECAY_POWER = 2.4;
const DEATH_REVERB_WET_GAIN = 0.34;
const LEVEL_UP_BASE_FREQUENCY = 220;
const LEVEL_UP_STEP_SECONDS = 0.11;
const LEVEL_UP_TONE_DURATION = 0.3;
const LEVEL_UP_ATTACK_SECONDS = 0.01;
const LEVEL_UP_PEAK_GAIN = 0.12;
const LEVEL_UP_FIBONACCI_RATIOS = Object.freeze([
  1,
  5 / 4,
  3 / 2,
  2,
]);
const GOLDEN_RATIO = 1.61803398875;
const AMBIENT_BASE_FREQUENCY = 54;
const AMBIENT_OUTPUT_GAIN = 0.32;
const AMBIENT_FADE_IN_SECONDS = 1.8;
const AMBIENT_FILTER_FREQUENCY = 920;
const AMBIENT_LFO_FREQUENCY = 0.07;
const AMBIENT_LFO_DEPTH = 0.012;
const AMBIENT_LAYER_CONFIGS = Object.freeze([
  { ratio: 1 / GOLDEN_RATIO, type: "sine", gain: 0.032, detune: -7 },
  { ratio: 1, type: "triangle", gain: 0.026, detune: 0 },
  { ratio: GOLDEN_RATIO, type: "sine", gain: 0.02, detune: 5 },
  { ratio: GOLDEN_RATIO ** 2, type: "triangle", gain: 0.014, detune: -3 },
]);
const PARTICLE_CANVAS_ID = "snake-particle-canvas";
const PARTICLE_ENGINE_RETRY_MS = 250;
const MAX_ACTIVE_PARTICLES = 320;
const PARTICLE_FRAME_DELTA_LIMIT_SECONDS = 0.05;
const EAT_PARTICLE_COUNT = 18;
const EAT_PARTICLE_SPEED_MIN = 70;
const EAT_PARTICLE_SPEED_MAX = 220;
const DEATH_PARTICLE_RING_COUNT = 30;
const DEATH_PARTICLE_SEGMENT_COUNT = 18;
const TRAIL_PARTICLE_COUNT = 3;
const TRAIL_PARTICLE_SPEED_MIN = 16;
const TRAIL_PARTICLE_SPEED_MAX = 48;

let audioContext = null;
let masterGainNode = null;
let isInitialized = false;
let isMuted = false;
let unlockListenersAttached = false;
let deathReverbBuffer = null;
let deathReverbSampleRate = 0;
let ambientDroneNodes = null;
let engineStateListenerAttached = false;
let engineAttachRetryId = null;

const particleSystemState = {
  canvas: null,
  context: null,
  width: 0,
  height: 0,
  pixelRatio: 1,
  resizeAttached: false,
  animationFrameId: 0,
  lastTimestamp: 0,
  particles: [],
  previousState: null,
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function getCanvasMetrics() {
  const gameCanvas = document.getElementById("game-canvas");
  const referenceElement = gameCanvas instanceof HTMLCanvasElement
    ? gameCanvas
    : particleSystemState.canvas;
  const rect = referenceElement
    ? referenceElement.getBoundingClientRect()
    : { width: window.innerWidth, height: window.innerHeight };

  return {
    width: Math.max(1, Math.floor(rect.width || window.innerWidth || 1)),
    height: Math.max(1, Math.floor(rect.height || window.innerHeight || 1)),
  };
}

function ensureParticleCanvas() {
  if (particleSystemState.canvas && particleSystemState.context) {
    return particleSystemState.context;
  }

  const container = document.getElementById("game-container");
  if (!(container instanceof HTMLElement)) {
    return null;
  }

  let canvas = document.getElementById(PARTICLE_CANVAS_ID);
  if (!(canvas instanceof HTMLCanvasElement)) {
    canvas = document.createElement("canvas");
    canvas.id = PARTICLE_CANVAS_ID;
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";

    const hudElement = document.getElementById("hud");
    if (hudElement && hudElement.parentNode === container) {
      container.insertBefore(canvas, hudElement);
    } else {
      container.appendChild(canvas);
    }
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  particleSystemState.canvas = canvas;
  particleSystemState.context = context;
  resizeParticleCanvas();
  attachParticleResizeHandler();

  return context;
}

function attachParticleResizeHandler() {
  if (particleSystemState.resizeAttached) {
    return;
  }

  particleSystemState.resizeAttached = true;
  window.addEventListener("resize", resizeParticleCanvas);
}

function resizeParticleCanvas() {
  const { canvas, context } = particleSystemState;
  if (!canvas || !context) {
    return;
  }

  const { width, height } = getCanvasMetrics();
  const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
  const backingWidth = Math.floor(width * pixelRatio);
  const backingHeight = Math.floor(height * pixelRatio);

  if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
    canvas.width = backingWidth;
    canvas.height = backingHeight;
  }

  particleSystemState.width = width;
  particleSystemState.height = height;
  particleSystemState.pixelRatio = pixelRatio;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  context.imageSmoothingEnabled = true;
}

function normalizeGridPoint(point) {
  if (!point || typeof point !== "object") {
    return null;
  }

  const x = Number.isFinite(point.x) ? point.x : null;
  const y = Number.isFinite(point.y) ? point.y : null;
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return {
    x: Math.floor(x),
    y: Math.floor(y),
  };
}

function normalizeSnakePoints(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((point) => normalizeGridPoint(point))
    .filter((point) => point !== null);
}

function cloneParticleStateSnapshot(state) {
  if (!state || typeof state !== "object") {
    return null;
  }

  return {
    score: Number.isFinite(state.score) ? state.score : 0,
    fibIndex: Number.isFinite(state.fibIndex) ? state.fibIndex : 0,
    gridSize: Number.isFinite(state.gridSize) ? state.gridSize : 0,
    isGameOver: Boolean(state.isGameOver),
    snake: normalizeSnakePoints(state.snake),
    food: normalizeGridPoint(state.food),
  };
}

function inferGridSize(state) {
  if (state && Number.isFinite(state.gridSize) && state.gridSize > 0) {
    return Math.floor(state.gridSize);
  }

  const points = normalizeSnakePoints(state?.snake);
  const foodPoint = normalizeGridPoint(state?.food);
  if (foodPoint) {
    points.push(foodPoint);
  }

  if (!points.length) {
    return 40;
  }

  const maxCoordinate = Math.max(
    ...points.map((point) => Math.max(point.x, point.y)),
  );
  return Math.max(8, maxCoordinate + 3);
}

function getBoardLayout(state) {
  const width = particleSystemState.width || getCanvasMetrics().width;
  const height = particleSystemState.height || getCanvasMetrics().height;
  const gridSize = inferGridSize(state);
  const cellSize = Math.max(10, Math.floor(Math.min(width / gridSize, height / gridSize)));
  const boardWidth = cellSize * gridSize;
  const boardHeight = cellSize * gridSize;

  return {
    cellSize,
    offsetX: Math.floor((width - boardWidth) / 2),
    offsetY: Math.floor((height - boardHeight) / 2),
  };
}

function getPointCanvasPosition(point, state) {
  const normalizedPoint = normalizeGridPoint(point);
  if (!normalizedPoint) {
    return null;
  }

  const layout = getBoardLayout(state);

  return {
    x: layout.offsetX + normalizedPoint.x * layout.cellSize + layout.cellSize / 2,
    y: layout.offsetY + normalizedPoint.y * layout.cellSize + layout.cellSize / 2,
    cellSize: layout.cellSize,
  };
}

function createParticle({
  x,
  y,
  vx,
  vy,
  life,
  radius,
  hue,
  saturation,
  lightness,
  alpha,
  glow,
  gravity = 0,
  drag = 0.96,
  shrink = 0.62,
}) {
  return {
    x,
    y,
    prevX: x,
    prevY: y,
    vx,
    vy,
    age: 0,
    life,
    radius,
    hue,
    saturation,
    lightness,
    alpha,
    glow,
    gravity,
    drag,
    shrink,
  };
}

function addParticles(particles) {
  if (!Array.isArray(particles) || !particles.length) {
    return 0;
  }

  if (!ensureParticleCanvas()) {
    return 0;
  }

  particleSystemState.particles.push(...particles);

  if (particleSystemState.particles.length > MAX_ACTIVE_PARTICLES) {
    particleSystemState.particles.splice(
      0,
      particleSystemState.particles.length - MAX_ACTIVE_PARTICLES,
    );
  }

  ensureParticleLoop();
  return particles.length;
}

function updateParticles(deltaSeconds) {
  particleSystemState.particles = particleSystemState.particles.filter((particle) => {
    particle.age += deltaSeconds;
    if (particle.age >= particle.life) {
      return false;
    }

    particle.prevX = particle.x;
    particle.prevY = particle.y;
    particle.vx *= Math.pow(particle.drag, deltaSeconds * 60);
    particle.vy = particle.vy * Math.pow(particle.drag, deltaSeconds * 60)
      + particle.gravity * deltaSeconds;
    particle.x += particle.vx * deltaSeconds;
    particle.y += particle.vy * deltaSeconds;

    return true;
  });
}

function drawParticles() {
  const { context } = particleSystemState;
  if (!context) {
    return;
  }

  context.clearRect(0, 0, particleSystemState.width, particleSystemState.height);
  if (!particleSystemState.particles.length) {
    return;
  }

  context.save();
  context.globalCompositeOperation = "lighter";

  particleSystemState.particles.forEach((particle) => {
    const lifeProgress = clamp(particle.age / particle.life, 0, 1);
    const fade = Math.pow(1 - lifeProgress, 1.45);
    const radius = Math.max(0.6, particle.radius * (1 - lifeProgress * particle.shrink));
    const glowRadius = radius * particle.glow;
    const gradient = context.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      glowRadius,
    );

    gradient.addColorStop(
      0,
      `hsla(${particle.hue} ${particle.saturation}% ${Math.min(98, particle.lightness + 16)}% / ${particle.alpha * fade})`,
    );
    gradient.addColorStop(
      0.35,
      `hsla(${particle.hue} ${particle.saturation}% ${particle.lightness}% / ${particle.alpha * fade * 0.8})`,
    );
    gradient.addColorStop(
      1,
      `hsla(${particle.hue} ${particle.saturation}% ${particle.lightness}% / 0)`,
    );

    context.beginPath();
    context.fillStyle = gradient;
    context.arc(particle.x, particle.y, glowRadius, 0, Math.PI * 2);
    context.fill();

    context.beginPath();
    context.lineCap = "round";
    context.lineWidth = Math.max(1, radius * 0.65);
    context.strokeStyle = `hsla(${particle.hue} ${particle.saturation}% ${particle.lightness}% / ${particle.alpha * fade * 0.65})`;
    context.moveTo(particle.prevX, particle.prevY);
    context.lineTo(particle.x, particle.y);
    context.stroke();

    context.beginPath();
    context.fillStyle = `hsla(${particle.hue} ${particle.saturation}% ${Math.min(100, particle.lightness + 24)}% / ${particle.alpha * fade})`;
    context.arc(particle.x, particle.y, radius, 0, Math.PI * 2);
    context.fill();
  });

  context.restore();
}

function renderParticleFrame(timestamp) {
  particleSystemState.animationFrameId = 0;
  const previousTimestamp = particleSystemState.lastTimestamp || timestamp;
  const deltaSeconds = clamp(
    (timestamp - previousTimestamp) / 1000,
    0,
    PARTICLE_FRAME_DELTA_LIMIT_SECONDS,
  );

  particleSystemState.lastTimestamp = timestamp;
  updateParticles(deltaSeconds);
  drawParticles();

  if (particleSystemState.particles.length) {
    particleSystemState.animationFrameId = window.requestAnimationFrame(renderParticleFrame);
  }
}

function ensureParticleLoop() {
  if (particleSystemState.animationFrameId) {
    return;
  }

  particleSystemState.lastTimestamp = performance.now();
  particleSystemState.animationFrameId = window.requestAnimationFrame(renderParticleFrame);
}

function spawnEatParticles(options = {}) {
  const engineState = options.state || readEngineState();
  const origin = getPointCanvasPosition(options.point, engineState);
  if (!origin) {
    return 0;
  }

  const count = Math.max(6, Math.floor(options.count || EAT_PARTICLE_COUNT));
  const particles = [];

  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count + randomBetween(-0.18, 0.18);
    const speed = randomBetween(EAT_PARTICLE_SPEED_MIN, EAT_PARTICLE_SPEED_MAX);

    particles.push(createParticle({
      x: origin.x + randomBetween(-origin.cellSize * 0.08, origin.cellSize * 0.08),
      y: origin.y + randomBetween(-origin.cellSize * 0.08, origin.cellSize * 0.08),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomBetween(8, 32),
      life: randomBetween(0.28, 0.58),
      radius: randomBetween(origin.cellSize * 0.08, origin.cellSize * 0.16),
      hue: randomBetween(36, 52),
      saturation: randomBetween(88, 100),
      lightness: randomBetween(58, 76),
      alpha: randomBetween(0.7, 0.96),
      glow: randomBetween(2.4, 3.4),
      gravity: randomBetween(70, 120),
      drag: randomBetween(0.9, 0.95),
      shrink: randomBetween(0.5, 0.7),
    }));
  }

  return addParticles(particles);
}

function spawnDeathParticles(options = {}) {
  const engineState = options.state || readEngineState();
  const snake = normalizeSnakePoints(options.snake || engineState?.snake);
  const headPoint = normalizeGridPoint(options.point || snake[0]);
  const headOrigin = getPointCanvasPosition(headPoint, engineState);
  if (!headOrigin) {
    return 0;
  }

  const particles = [];

  for (let index = 0; index < DEATH_PARTICLE_RING_COUNT; index += 1) {
    const angle = (Math.PI * 2 * index) / DEATH_PARTICLE_RING_COUNT + randomBetween(-0.12, 0.12);
    const speed = randomBetween(110, 300);

    particles.push(createParticle({
      x: headOrigin.x + randomBetween(-headOrigin.cellSize * 0.12, headOrigin.cellSize * 0.12),
      y: headOrigin.y + randomBetween(-headOrigin.cellSize * 0.12, headOrigin.cellSize * 0.12),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - randomBetween(12, 40),
      life: randomBetween(0.45, 0.95),
      radius: randomBetween(headOrigin.cellSize * 0.11, headOrigin.cellSize * 0.2),
      hue: randomBetween(2, 14),
      saturation: randomBetween(82, 98),
      lightness: randomBetween(48, 64),
      alpha: randomBetween(0.68, 0.94),
      glow: randomBetween(2.8, 4.4),
      gravity: randomBetween(140, 220),
      drag: randomBetween(0.9, 0.96),
      shrink: randomBetween(0.44, 0.7),
    }));
  }

  const step = Math.max(1, Math.floor(snake.length / Math.max(1, DEATH_PARTICLE_SEGMENT_COUNT / 3)));
  for (let index = 0; index < snake.length; index += step) {
    const segmentOrigin = getPointCanvasPosition(snake[index], engineState);
    if (!segmentOrigin) {
      continue;
    }

    for (let segmentParticle = 0; segmentParticle < 3; segmentParticle += 1) {
      const angle = randomBetween(0, Math.PI * 2);
      const speed = randomBetween(55, 160);

      particles.push(createParticle({
        x: segmentOrigin.x + randomBetween(-segmentOrigin.cellSize * 0.18, segmentOrigin.cellSize * 0.18),
        y: segmentOrigin.y + randomBetween(-segmentOrigin.cellSize * 0.18, segmentOrigin.cellSize * 0.18),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - randomBetween(4, 22),
        life: randomBetween(0.35, 0.75),
        radius: randomBetween(segmentOrigin.cellSize * 0.06, segmentOrigin.cellSize * 0.12),
        hue: randomBetween(8, 24),
        saturation: randomBetween(75, 92),
        lightness: randomBetween(44, 58),
        alpha: randomBetween(0.4, 0.72),
        glow: randomBetween(2.2, 3.2),
        gravity: randomBetween(100, 180),
        drag: randomBetween(0.92, 0.97),
        shrink: randomBetween(0.48, 0.76),
      }));
    }
  }

  return addParticles(particles);
}

function getMovementVector(previousHead, currentHead) {
  if (!previousHead || !currentHead) {
    return null;
  }

  const deltaX = currentHead.x - previousHead.x;
  const deltaY = currentHead.y - previousHead.y;
  const magnitude = Math.hypot(deltaX, deltaY);

  if (!magnitude) {
    return null;
  }

  return {
    x: deltaX / magnitude,
    y: deltaY / magnitude,
  };
}

function getGridStepDistance(previousHead, currentHead) {
  if (!previousHead || !currentHead) {
    return 0;
  }

  return Math.abs(currentHead.x - previousHead.x) + Math.abs(currentHead.y - previousHead.y);
}

function spawnTrailParticles(options = {}) {
  const engineState = options.state || readEngineState();
  const previousHead = normalizeGridPoint(options.previousHead);
  const currentHead = normalizeGridPoint(options.point || engineState?.snake?.[0]);
  const direction = getMovementVector(previousHead, currentHead);
  const origin = getPointCanvasPosition(currentHead, engineState);
  if (!origin || !direction) {
    return 0;
  }

  const count = Math.max(1, Math.floor(options.count || TRAIL_PARTICLE_COUNT));
  const particles = [];
  const offsetDistance = origin.cellSize * 0.38;
  const spawnX = origin.x - direction.x * offsetDistance;
  const spawnY = origin.y - direction.y * offsetDistance;

  for (let index = 0; index < count; index += 1) {
    const spread = randomBetween(-0.55, 0.55);
    const speed = randomBetween(TRAIL_PARTICLE_SPEED_MIN, TRAIL_PARTICLE_SPEED_MAX);
    const driftAngle = Math.atan2(-direction.y, -direction.x) + spread;

    particles.push(createParticle({
      x: spawnX + randomBetween(-origin.cellSize * 0.08, origin.cellSize * 0.08),
      y: spawnY + randomBetween(-origin.cellSize * 0.08, origin.cellSize * 0.08),
      vx: Math.cos(driftAngle) * speed,
      vy: Math.sin(driftAngle) * speed,
      life: randomBetween(0.22, 0.42),
      radius: randomBetween(origin.cellSize * 0.03, origin.cellSize * 0.07),
      hue: randomBetween(42, 56),
      saturation: randomBetween(70, 92),
      lightness: randomBetween(58, 74),
      alpha: randomBetween(0.16, 0.28),
      glow: randomBetween(1.8, 2.5),
      gravity: randomBetween(-10, 14),
      drag: randomBetween(0.86, 0.92),
      shrink: randomBetween(0.3, 0.48),
    }));
  }

  return addParticles(particles);
}

function readEngineState() {
  const engine = window.FractalSnake && window.FractalSnake.engine;

  if (!engine || typeof engine.getState !== "function") {
    return null;
  }

  try {
    return engine.getState();
  } catch (error) {
    console.warn("FractalSnake.audio: engine.getState() failed.", error);
    return null;
  }
}

function handleEngineStateChange(nextState) {
  const snapshot = cloneParticleStateSnapshot(nextState);
  if (!snapshot) {
    return;
  }

  const previousState = particleSystemState.previousState;
  if (!previousState) {
    particleSystemState.previousState = snapshot;
    return;
  }

  const previousHead = previousState.snake[0] || null;
  const currentHead = snapshot.snake[0] || null;
  const headStepDistance = getGridStepDistance(previousHead, currentHead);
  const hasMoved = Boolean(
    previousHead
    && currentHead
    && (previousHead.x !== currentHead.x || previousHead.y !== currentHead.y),
  );

  if (snapshot.score < previousState.score || headStepDistance > 1) {
    particleSystemState.previousState = snapshot;
    return;
  }

  const justAte = snapshot.score > previousState.score;
  const justDied = snapshot.isGameOver && !previousState.isGameOver;

  if (hasMoved && !snapshot.isGameOver) {
    spawnTrailParticles({
      state: snapshot,
      previousHead,
      point: currentHead,
    });
  }

  if (justAte && currentHead) {
    spawnEatParticles({
      state: snapshot,
      point: currentHead,
      count: EAT_PARTICLE_COUNT + Math.min(10, snapshot.fibIndex),
    });
  }

  if (justDied && currentHead) {
    spawnDeathParticles({
      state: snapshot,
      point: currentHead,
      snake: snapshot.snake,
    });
  }

  particleSystemState.previousState = snapshot;
}

function attachEngineStateListener() {
  if (engineStateListenerAttached) {
    return;
  }

  const engine = window.FractalSnake && window.FractalSnake.engine;
  if (!engine) {
    if (engineAttachRetryId === null) {
      engineAttachRetryId = window.setTimeout(() => {
        engineAttachRetryId = null;
        attachEngineStateListener();
      }, PARTICLE_ENGINE_RETRY_MS);
    }

    return;
  }

  const initialState = readEngineState();
  if (initialState) {
    particleSystemState.previousState = cloneParticleStateSnapshot(initialState);
  }

  if (typeof engine.onStateChange === "function") {
    engine.onStateChange(handleEngineStateChange);
    engineStateListenerAttached = true;
    return;
  }

  if (engineAttachRetryId === null) {
    engineAttachRetryId = window.setTimeout(() => {
      engineAttachRetryId = null;
      attachEngineStateListener();
    }, PARTICLE_ENGINE_RETRY_MS);
  }
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

function getCurrentFibIndex() {
  const engine = window.FractalSnake && window.FractalSnake.engine;

  if (!engine || typeof engine.getState !== "function") {
    return 0;
  }

  const state = engine.getState();
  return Number.isFinite(state.fibIndex) ? state.fibIndex : 0;
}

function normalizeFibIndex(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function normalizeBaseFrequency(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return EAT_BASE_FREQUENCY;
  }

  return value;
}

function getMaxAudibleFrequency(context) {
  return Math.max(40, context.sampleRate * 0.45);
}

function createEnvelopeGainNode(context, startTime) {
  const gainNode = context.createGain();

  gainNode.gain.cancelScheduledValues(startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(
    EAT_PEAK_GAIN,
    startTime + EAT_ATTACK_SECONDS,
  );
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    startTime + EAT_ATTACK_SECONDS + EAT_DECAY_SECONDS,
  );

  return gainNode;
}

function createDeathEnvelopeGainNode(context, startTime, stopTime) {
  const gainNode = context.createGain();

  gainNode.gain.cancelScheduledValues(startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(
    DEATH_PEAK_GAIN,
    startTime + DEATH_ATTACK_SECONDS,
  );
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  return gainNode;
}

function createLevelUpEnvelopeGainNode(context, startTime, stopTime) {
  const gainNode = context.createGain();

  gainNode.gain.cancelScheduledValues(startTime);
  gainNode.gain.setValueAtTime(0.0001, startTime);
  gainNode.gain.linearRampToValueAtTime(
    LEVEL_UP_PEAK_GAIN,
    startTime + LEVEL_UP_ATTACK_SECONDS,
  );
  gainNode.gain.exponentialRampToValueAtTime(0.0001, stopTime);

  return gainNode;
}

function getDeathReverbBuffer(context) {
  if (
    deathReverbBuffer
    && deathReverbSampleRate === context.sampleRate
  ) {
    return deathReverbBuffer;
  }

  const frameCount = Math.max(
    1,
    Math.floor(context.sampleRate * DEATH_REVERB_DURATION_SECONDS),
  );
  const impulseBuffer = context.createBuffer(2, frameCount, context.sampleRate);

  for (let channelIndex = 0; channelIndex < impulseBuffer.numberOfChannels; channelIndex += 1) {
    const channelData = impulseBuffer.getChannelData(channelIndex);

    for (let sampleIndex = 0; sampleIndex < frameCount; sampleIndex += 1) {
      const decayPosition = 1 - sampleIndex / frameCount;
      const randomSample = Math.random() * 2 - 1;
      channelData[sampleIndex] = randomSample * (decayPosition ** DEATH_REVERB_DECAY_POWER);
    }
  }

  deathReverbBuffer = impulseBuffer;
  deathReverbSampleRate = context.sampleRate;

  return deathReverbBuffer;
}

function scheduleEatTone(context, {
  fibIndex = 0,
  baseFrequency = EAT_BASE_FREQUENCY,
} = {}) {
  if (!masterGainNode) {
    return null;
  }

  const frequency = Math.min(
    getFibonacciValue(fibIndex) * baseFrequency,
    getMaxAudibleFrequency(context),
  );
  const startTime = context.currentTime + 0.005;
  const stopTime = startTime + EAT_ATTACK_SECONDS + EAT_DECAY_SECONDS + 0.03;
  const oscillator = context.createOscillator();
  const envelopeGainNode = createEnvelopeGainNode(context, startTime);

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startTime);
  oscillator.connect(envelopeGainNode);
  envelopeGainNode.connect(masterGainNode);

  oscillator.addEventListener("ended", () => {
    oscillator.disconnect();
    envelopeGainNode.disconnect();
  }, { once: true });

  oscillator.start(startTime);
  oscillator.stop(stopTime);

  return frequency;
}

function scheduleDeathCascade(context) {
  if (!masterGainNode) {
    return null;
  }

  const startTime = context.currentTime + 0.01;
  const maxFrequency = getMaxAudibleFrequency(context);
  const convolverNode = context.createConvolver();
  const wetGainNode = context.createGain();
  let lastStopTime = startTime;

  convolverNode.buffer = getDeathReverbBuffer(context);
  wetGainNode.gain.setValueAtTime(DEATH_REVERB_WET_GAIN, startTime);
  convolverNode.connect(wetGainNode);
  wetGainNode.connect(masterGainNode);

  for (let stepIndex = 0; stepIndex < DEATH_SEMITONE_STEPS; stepIndex += 1) {
    const toneStartTime = startTime + stepIndex * DEATH_STEP_SECONDS;
    const toneStopTime = toneStartTime + DEATH_TONE_DURATION;
    const baseFrequency = DEATH_START_FREQUENCY * (2 ** (-stepIndex / 12));
    const nextFrequency = DEATH_START_FREQUENCY * (2 ** (-(stepIndex + 1) / 12));
    const oscillator = context.createOscillator();
    const envelopeGainNode = createDeathEnvelopeGainNode(
      context,
      toneStartTime,
      toneStopTime,
    );

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(
      Math.min(baseFrequency, maxFrequency),
      toneStartTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, Math.min(nextFrequency, maxFrequency)),
      toneStopTime,
    );
    oscillator.detune.setValueAtTime(-stepIndex * 4, toneStartTime);

    oscillator.connect(envelopeGainNode);
    envelopeGainNode.connect(masterGainNode);
    envelopeGainNode.connect(convolverNode);

    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelopeGainNode.disconnect();
    }, { once: true });

    oscillator.start(toneStartTime);
    oscillator.stop(toneStopTime + 0.01);
    lastStopTime = toneStopTime + 0.01;
  }

  const cleanupDelayMs = Math.ceil(
    (lastStopTime - context.currentTime + DEATH_REVERB_DURATION_SECONDS + 0.1) * 1000,
  );

  window.setTimeout(() => {
    convolverNode.disconnect();
    wetGainNode.disconnect();
  }, cleanupDelayMs);

  return {
    steps: DEATH_SEMITONE_STEPS,
    startFrequency: DEATH_START_FREQUENCY,
  };
}

function scheduleLevelUpArpeggio(context, {
  baseFrequency = LEVEL_UP_BASE_FREQUENCY,
} = {}) {
  if (!masterGainNode) {
    return null;
  }

  const startTime = context.currentTime + 0.01;
  const maxFrequency = getMaxAudibleFrequency(context);
  const rootFrequency = Math.min(
    normalizeBaseFrequency(baseFrequency),
    maxFrequency,
  );
  const scheduledFrequencies = [];

  LEVEL_UP_FIBONACCI_RATIOS.forEach((ratio, chordIndex) => {
    const toneStartTime = startTime + chordIndex * LEVEL_UP_STEP_SECONDS;
    const toneStopTime = toneStartTime + LEVEL_UP_TONE_DURATION;
    const oscillator = context.createOscillator();
    const envelopeGainNode = createLevelUpEnvelopeGainNode(
      context,
      toneStartTime,
      toneStopTime,
    );
    const frequency = Math.min(rootFrequency * ratio, maxFrequency);

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(frequency, toneStartTime);
    oscillator.detune.setValueAtTime(chordIndex * 3, toneStartTime);

    oscillator.connect(envelopeGainNode);
    envelopeGainNode.connect(masterGainNode);

    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      envelopeGainNode.disconnect();
    }, { once: true });

    oscillator.start(toneStartTime);
    oscillator.stop(toneStopTime + 0.01);
    scheduledFrequencies.push(frequency);
  });

  return {
    chord: "major",
    ratios: [...LEVEL_UP_FIBONACCI_RATIOS],
    frequencies: scheduledFrequencies,
  };
}

function ensureAmbientDrone(context) {
  if (ambientDroneNodes || !masterGainNode) {
    return ambientDroneNodes;
  }

  const startTime = context.currentTime;
  const maxFrequency = getMaxAudibleFrequency(context);
  const filterNode = context.createBiquadFilter();
  const outputGainNode = context.createGain();
  const lfoOscillator = context.createOscillator();
  const lfoGainNode = context.createGain();
  const layers = [];

  filterNode.type = "lowpass";
  filterNode.frequency.setValueAtTime(AMBIENT_FILTER_FREQUENCY, startTime);
  filterNode.Q.setValueAtTime(0.35, startTime);

  outputGainNode.gain.setValueAtTime(0.0001, startTime);
  outputGainNode.gain.exponentialRampToValueAtTime(
    AMBIENT_OUTPUT_GAIN,
    startTime + AMBIENT_FADE_IN_SECONDS,
  );

  lfoOscillator.type = "sine";
  lfoOscillator.frequency.setValueAtTime(AMBIENT_LFO_FREQUENCY, startTime);
  lfoGainNode.gain.setValueAtTime(AMBIENT_LFO_DEPTH, startTime);

  lfoOscillator.connect(lfoGainNode);
  lfoGainNode.connect(outputGainNode.gain);
  filterNode.connect(outputGainNode);
  outputGainNode.connect(masterGainNode);

  AMBIENT_LAYER_CONFIGS.forEach((layerConfig) => {
    const oscillator = context.createOscillator();
    const layerGainNode = context.createGain();
    const frequency = Math.min(
      AMBIENT_BASE_FREQUENCY * layerConfig.ratio,
      maxFrequency,
    );

    oscillator.type = layerConfig.type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.detune.setValueAtTime(layerConfig.detune, startTime);

    layerGainNode.gain.setValueAtTime(layerConfig.gain, startTime);

    oscillator.connect(layerGainNode);
    layerGainNode.connect(filterNode);
    oscillator.start(startTime);

    layers.push({
      oscillator,
      gainNode: layerGainNode,
      frequency,
    });
  });

  lfoOscillator.start(startTime);

  ambientDroneNodes = {
    filterNode,
    outputGainNode,
    lfoOscillator,
    lfoGainNode,
    layers,
  };

  return ambientDroneNodes;
}

function getAudioContextClass() {
  return window.AudioContext || window.webkitAudioContext || null;
}

function syncMuteState() {
  if (!masterGainNode || !audioContext) {
    return;
  }

  const targetVolume = isMuted ? 0 : DEFAULT_MASTER_VOLUME;
  masterGainNode.gain.setTargetAtTime(targetVolume, audioContext.currentTime, 0.01);
}

function ensureAudioContext() {
  if (audioContext) {
    return audioContext;
  }

  const AudioContextClass = getAudioContextClass();

  if (!AudioContextClass) {
    return null;
  }

  audioContext = new AudioContextClass();
  masterGainNode = audioContext.createGain();
  masterGainNode.connect(audioContext.destination);
  syncMuteState();

  return audioContext;
}

async function resumeAudioContext() {
  const context = ensureAudioContext();

  if (!context) {
    return context;
  }

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.warn("Failed to resume audio context.", error);
    }
  }

  if (context.state !== "closed") {
    ensureAmbientDrone(context);
  }

  return context;
}

function detachUnlockListeners() {
  if (!unlockListenersAttached) {
    return;
  }

  window.removeEventListener("pointerdown", handleUnlockInteraction);
  window.removeEventListener("touchstart", handleUnlockInteraction);
  window.removeEventListener("keydown", handleUnlockInteraction);
  unlockListenersAttached = false;
}

function handleUnlockInteraction() {
  resumeAudioContext().finally(() => {
    if (!audioContext || audioContext.state === "running") {
      detachUnlockListeners();
    }
  });
}

function attachUnlockListeners() {
  if (unlockListenersAttached) {
    return;
  }

  window.addEventListener("pointerdown", handleUnlockInteraction);
  window.addEventListener("touchstart", handleUnlockInteraction, { passive: true });
  window.addEventListener("keydown", handleUnlockInteraction);
  unlockListenersAttached = true;
}

function toggleMute(forceMuted) {
  if (typeof forceMuted === "boolean") {
    isMuted = forceMuted;
  } else {
    isMuted = !isMuted;
  }

  syncMuteState();
  return isMuted;
}

function handleKeyDown(event) {
  if (!MUTE_KEYS.has(event.key)) {
    return;
  }

  event.preventDefault();
  resumeAudioContext();
  toggleMute();
}

function init() {
  if (isInitialized) {
    return {
      isMuted,
      audioSupported: Boolean(getAudioContextClass()),
    };
  }

  ensureAudioContext();

  if (audioContext && audioContext.state === "running") {
    ensureAmbientDrone(audioContext);
  }

  ensureParticleCanvas();
  attachEngineStateListener();
  attachUnlockListeners();
  window.addEventListener("keydown", handleKeyDown);
  isInitialized = true;

  return {
    isMuted,
    audioSupported: Boolean(audioContext),
  };
}

async function playEat(options = {}) {
  const context = await resumeAudioContext();

  if (!context) {
    return null;
  }

  const safeOptions = options && typeof options === "object" ? options : {};
  const fibIndex = normalizeFibIndex(
    Number.isFinite(safeOptions.fibIndex)
      ? safeOptions.fibIndex
      : getCurrentFibIndex(),
  );
  const baseFrequency = normalizeBaseFrequency(safeOptions.baseFrequency);

  return scheduleEatTone(context, {
    fibIndex,
    baseFrequency,
  });
}

async function playDeath() {
  const context = await resumeAudioContext();

  if (!context) {
    return null;
  }

  return scheduleDeathCascade(context);
}

async function playLevelUp(options = {}) {
  const context = await resumeAudioContext();

  if (!context) {
    return null;
  }

  const safeOptions = options && typeof options === "object" ? options : {};
  const baseFrequency = normalizeBaseFrequency(
    Number.isFinite(safeOptions.baseFrequency)
      ? safeOptions.baseFrequency
      : LEVEL_UP_BASE_FREQUENCY,
  );

  return scheduleLevelUpArpeggio(context, { baseFrequency });
}

function spawnParticles(options = {}) {
  const safeOptions = options && typeof options === "object" ? options : {};
  const kind = typeof safeOptions.kind === "string" ? safeOptions.kind : "eat";

  ensureParticleCanvas();

  switch (kind) {
    case "death":
      return spawnDeathParticles(safeOptions);
    case "trail":
      return spawnTrailParticles(safeOptions);
    case "eat":
    default:
      return spawnEatParticles(safeOptions);
  }
}

window.FractalSnake = window.FractalSnake || {};
window.FractalSnake.audio = {
  init,
  playEat,
  playDeath,
  playLevelUp,
  spawnParticles,
  toggleMute,
};
