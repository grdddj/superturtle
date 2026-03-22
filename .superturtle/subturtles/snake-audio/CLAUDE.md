# Current task

All backlog items are complete.

# End goal with specs

Audio and effects module in snake-game/audio.js using Web Audio API with zero external audio files. Eat sound uses Fibonacci frequency scaling with fib(n) times base frequency. Death sound is descending chromatic cascade. Level-up sound is major chord arpeggio using Fibonacci frequency ratios. Ambient drone uses golden ratio frequency layering at gentle volume. Particle system renders gold burst on eat, red burst on death, subtle trailing particles behind snake. Mute toggle on M key.

File ownership: YOU OWN snake-game/audio.js (create it). DO NOT EDIT index.html, styles.css, engine.js, visuals.js, ui.js, main.js. Register as window.FractalSnake.audio = { init, playEat, playDeath, playLevelUp, spawnParticles, toggleMute }.

# Roadmap (Completed)
- Project scaffold created with index.html, main.js, styles.css

# Roadmap (Upcoming)
- Complete audio.js with all sound and particle features and test with live engine

# Backlog
- [x] Create audio.js with Web Audio API AudioContext setup and mute toggle listening for M key press
- [x] Implement eat sound with oscillator frequency set to fib of fibIndex times a base frequency with a short attack-decay envelope
- [x] Implement death sound as descending chromatic cascade playing rapid sequence of falling tones with convolver reverb
- [x] Implement level-up sound as major chord arpeggio where chord intervals use Fibonacci frequency ratios
- [x] Implement ambient background drone using golden ratio 1.618 frequency layering with multiple quiet oscillators
- [x] Add particle system rendering gold burst particles on food eat and red particles on death and subtle trailing particles behind snake movement

## Loop Control
STOP
