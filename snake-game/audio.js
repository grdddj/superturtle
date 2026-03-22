const MUTE_KEYS = new Set(["m", "M"]);
const DEFAULT_MASTER_VOLUME = 0.2;
const EAT_BASE_FREQUENCY = 110;
const EAT_ATTACK_SECONDS = 0.012;
const EAT_DECAY_SECONDS = 0.18;
const EAT_PEAK_GAIN = 0.24;

let audioContext = null;
let masterGainNode = null;
let isInitialized = false;
let isMuted = false;
let unlockListenersAttached = false;

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

  if (!context || context.state !== "suspended") {
    return context;
  }

  try {
    await context.resume();
  } catch (error) {
    console.warn("Failed to resume audio context.", error);
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

function playDeath() {
  return resumeAudioContext();
}

function playLevelUp() {
  return resumeAudioContext();
}

function spawnParticles() {}

window.FractalSnake = window.FractalSnake || {};
window.FractalSnake.audio = {
  init,
  playEat,
  playDeath,
  playLevelUp,
  spawnParticles,
  toggleMute,
};
