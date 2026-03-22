window.FractalSnake = window.FractalSnake || {};

window.FractalSnake.ui = (() => {
  const HIGH_SCORE_KEY = "fractal-snake-high-score";
  const ENGINE_RETRY_MS = 250;
  const STATE_POLL_MS = 200;
  const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2;
  const defaultState = Object.freeze({
    score: 0,
    fibIndex: 0,
    currentFibValue: 1,
    snakeLength: 1,
    snake: [],
    isPaused: false,
    isGameOver: false,
  });

  let hudElement = null;
  let menuOverlayElement = null;
  let initialized = false;
  let retryTimer = null;
  let pollTimer = null;
  let highScore = readHighScore();
  let engineRef = null;
  let hasStartedGame = false;
  let runHighScoreBaseline = highScore;

  function init() {
    if (initialized) return;

    initialized = true;
    hudElement = document.getElementById("hud");
    menuOverlayElement = document.getElementById("menu-overlay");
    if (!hudElement) return;

    hudElement.classList.add("hud-overlay");
    hudElement.setAttribute("aria-live", "polite");
    renderHud(normalizeState(defaultState));
    renderStartScreen(false);
    attachToEngine();
  }

  function attachToEngine() {
    clearRetryTimer();

    const engine = window.FractalSnake && window.FractalSnake.engine;
    if (!engine) {
      renderStartScreen(false);
      retryTimer = window.setTimeout(attachToEngine, ENGINE_RETRY_MS);
      return;
    }

    engineRef = engine;
    renderStartScreen(typeof engine.start === "function");

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

    if (normalized.isGameOver) {
      renderGameOverScreen(normalized);
      return;
    }

    if (hasStartedGame && normalized.isPaused) {
      renderPauseScreen(normalized);
      return;
    }

    if (hasStartedGame) {
      hideMenuOverlay();
    }
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

  function renderStartScreen(isReady) {
    if (!menuOverlayElement || hasStartedGame) return;

    menuOverlayElement.className = "menu-overlay is-visible";
    menuOverlayElement.setAttribute("aria-hidden", "false");
    menuOverlayElement.innerHTML = `
      <section class="menu-screen start-screen" aria-labelledby="start-screen-title">
        <div class="start-screen__halo" aria-hidden="true"></div>
        <div class="start-screen__content">
          <p class="start-screen__eyebrow">Sequence-driven arcade survival</p>
          <h1 id="start-screen-title" class="start-screen__title">Fractal Snake</h1>
          <div class="start-screen__logo" aria-hidden="true">
            ${renderSpiralLogo()}
          </div>
          <p class="start-screen__subtitle">
            Grow by Fibonacci steps, chase the pattern, and hold the line.
          </p>
          <button
            class="start-screen__button"
            type="button"
            ${isReady ? "" : "disabled"}
          >
            ${isReady ? "Play" : "Syncing Engine..."}
          </button>
        </div>
      </section>
    `;

    const playButton = menuOverlayElement.querySelector(".start-screen__button");
    if (playButton) {
      playButton.addEventListener("click", handlePlayClick, { once: true });
    }
  }

  function renderSpiralLogo() {
    const nodes = [1, 1, 2, 3, 5, 8, 13];
    const spiralPath = buildSpiralPath();

    return `
      <svg class="spiral-logo" viewBox="0 0 260 260" role="presentation" focusable="false">
        <defs>
          <linearGradient id="spiral-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fff4c7"></stop>
            <stop offset="45%" stop-color="#ffcf66"></stop>
            <stop offset="100%" stop-color="#ff9b22"></stop>
          </linearGradient>
        </defs>
        <path class="spiral-logo__path spiral-logo__path--glow" d="${spiralPath}"></path>
        <path class="spiral-logo__path" d="${spiralPath}"></path>
        ${nodes.map((value, index) => renderSpiralNode(value, index)).join("")}
      </svg>
    `;
  }

  function renderSpiralNode(value, index) {
    const angle = -Math.PI / 2 + index * (Math.PI / 2);
    const radius = 10 * GOLDEN_RATIO ** index;
    const x = 130 + Math.cos(angle) * radius;
    const y = 130 + Math.sin(angle) * radius;
    const size = 3 + index * 1.8;

    return `
      <circle
        class="spiral-logo__node"
        cx="${x.toFixed(2)}"
        cy="${y.toFixed(2)}"
        r="${size.toFixed(2)}"
        style="--node-delay:${(index * 140).toFixed(0)}ms"
      >
        <title>Fibonacci ${value}</title>
      </circle>
    `;
  }

  function buildSpiralPath() {
    const center = 130;
    const quarterTurn = Math.PI / 2;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + quarterTurn * 6.4;
    const points = [];

    for (let angle = startAngle; angle <= endAngle; angle += 0.08) {
      const radius = 7.5 * GOLDEN_RATIO ** ((angle - startAngle) / quarterTurn);
      const x = center + Math.cos(angle) * radius;
      const y = center + Math.sin(angle) * radius;
      points.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
    }

    return `M ${points.join(" L ")}`;
  }

  function handlePlayClick() {
    startNewRun();
  }

  function handleReplayClick() {
    startNewRun();
  }

  function startNewRun() {
    if (!engineRef || typeof engineRef.start !== "function") return;

    hasStartedGame = true;
    runHighScoreBaseline = highScore;
    hideMenuOverlay();

    if (typeof engineRef.reset === "function") {
      engineRef.reset();
    }

    engineRef.start();
  }

  function hideMenuOverlay() {
    if (!menuOverlayElement) return;

    menuOverlayElement.className = "menu-overlay";
    menuOverlayElement.setAttribute("aria-hidden", "true");
    menuOverlayElement.innerHTML = "";
  }

  function renderPauseScreen(state) {
    if (!menuOverlayElement) return;

    const fibLevel = state.currentFibValue || fibonacciValue(state.fibIndex);

    menuOverlayElement.className = "menu-overlay is-visible";
    menuOverlayElement.setAttribute("aria-hidden", "false");
    menuOverlayElement.innerHTML = `
      <section class="menu-screen pause-screen" aria-labelledby="pause-screen-title">
        <div class="pause-screen__halo" aria-hidden="true"></div>
        <div class="pause-screen__content">
          <p class="pause-screen__eyebrow">Run paused</p>
          <h2 id="pause-screen-title" class="pause-screen__title">Paused</h2>
          <p class="pause-screen__summary">
            Fibonacci level ${fibLevel} is on hold. Press Space to resume the run.
          </p>
          <div class="pause-screen__instructions" aria-label="Pause instructions">
            <p class="pause-screen__instruction">
              <span class="pause-screen__key">Space</span>
              Resume immediately
            </p>
            <p class="pause-screen__instruction">
              <span class="pause-screen__key">Stay sharp</span>
              Your current score is ${state.score}
            </p>
          </div>
        </div>
      </section>
    `;
  }

  function renderGameOverScreen(state) {
    if (!menuOverlayElement) return;

    const fibLevel = state.currentFibValue || fibonacciValue(state.fibIndex);
    const comparison = buildHighScoreComparison(state.score);

    menuOverlayElement.className = "menu-overlay is-visible";
    menuOverlayElement.setAttribute("aria-hidden", "false");
    menuOverlayElement.innerHTML = `
      <section class="menu-screen game-over-screen" aria-labelledby="game-over-title">
        <div class="game-over-screen__halo" aria-hidden="true"></div>
        <div class="game-over-screen__content">
          <p class="game-over-screen__eyebrow">Run complete</p>
          <h2 id="game-over-title" class="game-over-screen__title">Game Over</h2>
          <p class="game-over-screen__summary">${comparison.summary}</p>
          <div class="game-over-screen__stats" role="list" aria-label="Final run statistics">
            <div class="game-over-screen__stat" role="listitem">
              <span class="game-over-screen__label">Final Score</span>
              <span class="game-over-screen__value">${state.score}</span>
            </div>
            <div class="game-over-screen__stat" role="listitem">
              <span class="game-over-screen__label">Fibonacci Peak</span>
              <span class="game-over-screen__value">${fibLevel}</span>
            </div>
            <div class="game-over-screen__stat" role="listitem">
              <span class="game-over-screen__label">High Score</span>
              <span class="game-over-screen__value">${highScore}</span>
            </div>
          </div>
          <p class="game-over-screen__detail">${comparison.detail}</p>
          <button class="start-screen__button game-over-screen__button" type="button">
            Play Again
          </button>
        </div>
      </section>
    `;

    const replayButton = menuOverlayElement.querySelector(".game-over-screen__button");
    if (replayButton) {
      replayButton.addEventListener("click", handleReplayClick, { once: true });
    }
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
    const isPaused = Boolean(source.isPaused);
    const isGameOver = Boolean(source.isGameOver);

    return {
      score,
      fibIndex,
      currentFibValue,
      snakeLength,
      snake,
      isPaused,
      isGameOver,
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

  function buildHighScoreComparison(score) {
    if (runHighScoreBaseline === 0 && score > 0) {
      return {
        summary: "First mark on the board.",
        detail: "You posted the opening high score for Fractal Snake.",
      };
    }

    if (score > runHighScoreBaseline) {
      const margin = score - runHighScoreBaseline;
      return {
        summary: "New high score.",
        detail: `You beat the previous best by ${margin}.`,
      };
    }

    if (score === runHighScoreBaseline && score > 0) {
      return {
        summary: "You matched the high score.",
        detail: `The best score remains ${highScore}.`,
      };
    }

    const deficit = Math.max(runHighScoreBaseline - score, 0);
    return {
      summary: `You finished ${deficit} short of the record.`,
      detail: `Current high score to beat: ${highScore}.`,
    };
  }

  return { init };
})();
