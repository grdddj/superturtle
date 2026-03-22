# Current task

Build the pause overlay in the menu overlay for the fractal/Fibonacci snake game in snake-game/ui.js and snake-game/styles.css, showing PAUSED text centered with resume instructions.
The game over screen overlay is done; the next slice is the pause-state menu screen.

# End goal with specs

UI module in snake-game/ui.js rendering: HUD overlay in the hud div showing score, fibonacci level, snake length, and high score from localStorage. Start screen with FRACTAL SNAKE title and animated CSS Fibonacci spiral logo and play button. Game over screen with final stats and play again button. Pause overlay. Level-up toast notifications. Golden/amber CSS theme. Responsive with mobile touch swipe controls. All transitions use CSS animations.

File ownership: YOU OWN snake-game/ui.js (create it) and snake-game/styles.css (extend it, keep existing base styles). DO NOT EDIT index.html, engine.js, visuals.js, audio.js, main.js. Register as window.FractalSnake.ui = { init }.

# Roadmap (Completed)
- Project scaffold created with index.html, main.js, styles.css with base styles

# Roadmap (Upcoming)
- Complete ui.js and styles.css with all UI features and test responsiveness

# Backlog
- [x] Create ui.js with HUD rendering showing score and current fibonacci level and snake length and high score persisted in localStorage
- [x] Build start screen in menu-overlay with FRACTAL SNAKE title and animated spiral logo using CSS keyframes and a play button that calls engine.start
- [x] Build game over screen showing final score and fibonacci level reached and high score comparison with play again button
- [ ] Build pause overlay showing PAUSED text centered with resume instructions <- current
- [ ] Add level-up toast notification that slides in from the right showing fibonacci level number and growth amount then fades out
- [ ] Add mobile touch controls with swipe detection for direction changes and display touch hint arrows on mobile viewports
- [ ] Update styles.css with all UI component styles using golden amber color theme and CSS transition animations and responsive breakpoints
