# Current task
Wait for the initial `snake/` scaffold to land, then identify the local run/build entry points needed to own integration and QA. The repo currently has no `snake/` directory or runnable game target.

# End goal with specs
- Make the `snake/` game easy to run locally from this repo with concise instructions.
- Validate that the game is actually playable end to end, not just partially implemented.
- Add lightweight polish or fixes where integration gaps appear, especially around restart flow, controls, and edge cases.
- Avoid broad refactors; focus on integration, verification, and small targeted fixes.
- Leave a concise record of how to run and verify the game.

# Roadmap (Completed)
- No implementation work completed yet.

# Roadmap (Upcoming)
- Inspect repo changes as they land under `snake/`.
- Add run instructions and verify the current build path.
- Fix integration issues and small gameplay/UI regressions.
- Commit final polish once the demo is coherent.

# Backlog
- [x] Inspect the repo and prepare to own integration and verification for `snake/`
- [ ] Re-check once the initial `snake/` scaffold lands and identify the local run/build entry points; blocked until `snake/` exists with runnable files <- current
- [ ] Add or update concise local run instructions for the snake game
- [ ] Verify core gameplay flows and fix any obvious integration regressions
- [ ] Polish restart flow, controls, or messaging if they feel incomplete
- [ ] Commit the QA/polish pass with a clear summary of what was validated
