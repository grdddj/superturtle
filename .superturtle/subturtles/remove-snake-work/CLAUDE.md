# Current task
Decide whether to revert commits or remove remaining snake-related changes manually, using the inspection result that active snake project files are already gone and several snake-labeled commits also contain unrelated shared-infrastructure work.

# End goal with specs
Remove the snake-game work that was introduced in the recent snake-related commits without damaging unrelated SuperTurtle behavior.
The worker should identify the exact snake-related changes, remove or revert them safely, verify the repo still passes targeted checks, and leave a clear commit trail.

# Roadmap (Completed)
- Defined a dedicated worker scope for removing the snake-game work.

# Roadmap (Upcoming)
- Inspect the snake-related commits and files still present in the repo.
- Choose the safest removal strategy for remaining snake-related changes.
- Implement the removal and verify the affected areas.

# Backlog
- [x] Define the worker scope for removing the snake-game work.
- [x] Inspect snake-related commits and current repo state.
- [ ] Decide whether to revert commits or remove remaining files manually. <- current
- [ ] Implement the snake-work removal in the repo.
- [ ] Run targeted verification for the affected paths.
- [ ] Update the worker state and commit the removal.
