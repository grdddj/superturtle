# Snake UI Surface

This file claims the presentation-layer boundary for the snake game before the rest of the scaffold lands.

## Repo state during inspection

- `snake/` did not exist when this task started.
- No engine module or local build command exists yet.
- The UI work should stay portable enough to fit either a zero-build static app or a very small JavaScript toolchain.

## UI-owned surface

The UI worker owns the browser-facing layer only:

- app shell markup for the board, score, and status copy
- visual rendering of the board and occupied cells
- keyboard input wiring for movement and restart
- readable start, active, paused, and game-over messaging

The UI should not own:

- movement timing
- collision rules
- food placement
- score mutation
- restart state resets beyond invoking an engine action

## Proposed engine contract

The UI should be able to render from a single snapshot object and a small action API:

```js
{
  width: 16,
  height: 16,
  score: 0,
  phase: "ready" | "running" | "paused" | "game-over",
  snake: [{ x: 8, y: 8 }],
  food: { x: 12, y: 4 },
  lastDirection: "up" | "down" | "left" | "right"
}
```

Required engine hooks:

- `getState()` returns the latest snapshot
- `subscribe(listener)` emits a new snapshot after engine updates
- `turn(direction)` requests a direction change
- `restart()` starts a fresh game

## Planned UI files

These paths are the intended rendering/control surface once the scaffold exists:

- `snake/index.html` for the page shell
- `snake/styles.css` for board and state presentation
- `snake/src/ui/render.js` for DOM updates from engine snapshots
- `snake/src/ui/controls.js` for keyboard and restart bindings
- `snake/src/ui/app.js` for wiring engine hooks to the renderer

## Notes for follow-up work

- Keep the UI implementation simple and dependency-light.
- Prefer CSS Grid or a canvas-based board, but do not push board logic into the view.
- Status text should make the current phase obvious without reading code or console output.
