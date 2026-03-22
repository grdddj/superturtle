# Current task

Draw fractal background by precomputing a Julia set detail to an offscreen canvas and tinting the hue based on current score.

# End goal with specs

Canvas rendering module in snake-game/visuals.js that draws game state from window.FractalSnake.engine.getState() onto the game-canvas element. Features: Julia set fractal background that shifts color with score, snake body drawn as golden spiral arcs, fading fractal trail behind snake, food rendered as pulsing Fibonacci spirals. Color palette: deep cosmic purple/blue background, golden/amber snake, cyan food. Canvas auto-resizes to viewport. 60fps render loop.

File ownership: YOU OWN snake-game/visuals.js (create it). DO NOT EDIT index.html, styles.css, engine.js, ui.js, audio.js, main.js. Register as window.FractalSnake.visuals = { init }.

# Roadmap (Completed)
- Project scaffold created with index.html, main.js, styles.css

# Roadmap (Upcoming)
- Complete visuals.js with all rendering features and test with live engine

# Backlog
- [x] Create visuals.js with canvas context setup and auto-resize handler and 60fps render loop that reads engine state each frame
- [ ] Draw fractal background by precomputing a Julia set detail to an offscreen canvas and tinting the hue based on current score <- current
- [ ] Render snake segments as golden spiral arcs with gradient coloring from dark amber at tail to bright gold at head
- [ ] Render food items as pulsing rotating Fibonacci spirals with cyan glow effect using shadow blur
- [ ] Add trail effect with fading recursive branching fractal patterns behind the snake that fade over about 2 seconds
- [ ] Add visual feedback effects including screen flash on eat and red tint overlay on death and golden particle burst on fibonacci level up
