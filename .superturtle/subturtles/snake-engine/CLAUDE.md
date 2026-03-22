# Current task

Export public API init start reset getState onStateChange on window.FractalSnake.engine and fire state change callbacks to all registered listeners.

# End goal with specs

A fully working snake game engine in snake-game/engine.js that runs a classic snake on a 40x40 grid with Fibonacci growth mechanics. Snake grows by fib sequence amounts (1,1,2,3,5,8...). Food spawns using golden angle (137.5 degrees) spiral from center. Keyboard controls: arrows + WASD, space to pause. Exposes init, start, reset, getState, onStateChange on window.FractalSnake.engine. Game state includes snake segments, food position, score, fibIndex, currentFibValue, isGameOver, isPaused. Speed increases with each Fibonacci level.

File ownership: YOU OWN snake-game/engine.js (create it). DO NOT EDIT index.html, styles.css, visuals.js, ui.js, audio.js, main.js.

# Roadmap (Completed)
- Project scaffold created with index.html, main.js, styles.css

# Roadmap (Upcoming)
- Complete engine.js with all game mechanics and test in browser

# Backlog
- [x] Create engine.js with grid system, snake data structure, movement logic, and requestAnimationFrame game loop with tick rate control
- [x] Add Fibonacci growth sequence tracking fibIndex and computing fib(n) to determine how many segments to add on each eat event
- [x] Add golden-ratio food spawning using golden angle 137.5 degrees to place food in a spiral pattern outward from center
- [x] Add collision detection for walls and self plus game over state and pause resume with space key
- [x] Add speed scaling so tick interval decreases as fibIndex grows making the game progressively harder
- [ ] Export public API init start reset getState onStateChange on window.FractalSnake.engine and fire state change callbacks to all registered listeners <- current
