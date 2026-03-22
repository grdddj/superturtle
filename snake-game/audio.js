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

let audioContext = null;
let masterGainNode = null;
let isInitialized = false;
let isMuted = false;
let unlockListenersAttached = false;
let deathReverbBuffer = null;
let deathReverbSampleRate = 0;
let ambientDroneNodes = null;

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
