# Current task
Implement the visible board and score display for the snake game in `snake/`.

# End goal with specs
- Deliver a usable local UI for the snake game under `snake/`.
- Render the board, score, and clear game states such as start, active play, and game over.
- Support practical keyboard controls for play and restart.
- Keep the UI intentionally simple and coherent rather than ornate.
- Integrate with the game engine cleanly and avoid unnecessary framework sprawl.

# Roadmap (Completed)
- No implementation work completed yet.

# Roadmap (Upcoming)
- Inspect the current `snake/` scaffold and engine state before making UI decisions.
- Implement the board rendering and scoreboard.
- Wire keyboard controls and restart affordances.
- Polish the visual clarity enough that the demo is obviously playable.

# Backlog
- [x] Inspect the current `snake/` state and claim the rendering/control surface
- [ ] Implement the visible board and score display <- current
- [ ] Add keyboard control handling and a clear restart path
- [ ] Make the active, paused/start, and game-over states understandable
- [ ] Commit the UI slice with minimal overlap against engine-owned logic
