window.FractalSnake = window.FractalSnake || {};

window.FractalSnake.ui = (() => {
  const HIGH_SCORE_KEY = "fractal-snake-high-score";
  const ENGINE_RETRY_MS = 250;
  const STATE_POLL_MS = 200;
  const defaultState = Object.freeze({
    score: 0,
    fibIndex: 0,
    currentFibValue: 1,
    snakeLength: 1,
    snake: [],
  });

  let hudElement = null;
  let initialized = false;
  let retryTimer = null;
  let pollTimer = null;
  let highScore = readHighScore();

  function init() {
    if (initialized) return;

    initialized = true;
    hudElement = document.getElementById("hud");
    if (!hudElement) return;

    hudElement.classList.add("hud-overlay");
    hudElement.setAttribute("aria-live", "polite");
    renderHud(normalizeState(defaultState));
    attachToEngine();
  }

  function attachToEngine() {
    clearRetryTimer();

    const engine = window.FractalSnake && window.FractalSnake.engine;
    if (!engine) {
      retryTimer = window.setTimeout(attachToEngine, ENGINE_RETRY_MS);
      return;
    }

    if (typeof engine.getState === "function") {
      updateFromState(engine.getState());
    }

    if (typeof engine.onStateChange === "function") {
      engine.onStateChange(updateFromState);
      stopPolling();
      return;
    }

    startPolling(engine);
  }

  function startPolling(engine) {
    stopPolling();

    if (typeof engine.getState !== "function") return;

    pollTimer = window.setInterval(() => {
      updateFromState(engine.getState());
    }, STATE_POLL_MS);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function clearRetryTimer() {
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function updateFromState(nextState) {
    const normalized = normalizeState(nextState);

    if (normalized.score > highScore) {
      highScore = normalized.score;
      writeHighScore(highScore);
    }

    renderHud(normalized);
  }

  function renderHud(state) {
    if (!hudElement) return;

    const fibLevel = state.currentFibValue || fibonacciValue(state.fibIndex);

    hudElement.innerHTML = `
      <div class="hud-panel">
        <div class="hud-stat">
          <span class="hud-label">Score</span>
          <span class="hud-value">${state.score}</span>
        </div>
        <div class="hud-stat">
          <span class="hud-label">Fib Level</span>
          <span class="hud-value">${fibLevel}</span>
        </div>
        <div class="hud-stat">
          <span class="hud-label">Snake Length</span>
          <span class="hud-value">${state.snakeLength}</span>
        </div>
        <div class="hud-stat">
          <span class="hud-label">High Score</span>
          <span class="hud-value">${highScore}</span>
        </div>
      </div>
    `;
  }

  function normalizeState(nextState) {
    const source = nextState && typeof nextState === "object" ? nextState : defaultState;
    const snake = Array.isArray(source.snake)
      ? source.snake
      : Array.isArray(source.segments)
        ? source.segments
        : [];
    const fibIndex = finiteNumber(source.fibIndex, 0);
    const currentFibValue = finiteNumber(source.currentFibValue, fibonacciValue(fibIndex));
    const score = finiteNumber(source.score, 0);
    const snakeLength = finiteNumber(source.snakeLength, snake.length || 1);

    return {
      score,
      fibIndex,
      currentFibValue,
      snakeLength,
      snake,
    };
  }

  function finiteNumber(value, fallback) {
    return Number.isFinite(value) ? value : fallback;
  }

  function fibonacciValue(index) {
    if (index <= 1) return 1;

    let previous = 1;
    let current = 1;

    for (let step = 2; step <= index; step += 1) {
      const next = previous + current;
      previous = current;
      current = next;
    }

    return current;
  }

  function readHighScore() {
    try {
      const value = window.localStorage.getItem(HIGH_SCORE_KEY);
      const parsed = Number.parseInt(value || "", 10);
      return Number.isFinite(parsed) ? parsed : 0;
    } catch (error) {
      return 0;
    }
  }

  function writeHighScore(value) {
    try {
      window.localStorage.setItem(HIGH_SCORE_KEY, String(value));
    } catch (error) {
      // Ignore storage failures so HUD updates continue in private browsing contexts.
    }
  }

  return { init };
})();
