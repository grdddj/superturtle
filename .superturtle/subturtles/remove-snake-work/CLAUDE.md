# Current task
Implement the snake-work removal surgically in the repo, keeping live shared-infrastructure changes from mixed snake-labeled commits and removing only any remaining snake-specific behavior that is still present.

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
- [x] Decide whether to revert commits or remove remaining files manually.
  Strategy note: do not revert snake-labeled commits wholesale. `d89bf0d9` already removed the active `snake/` and `snake-game/` trees, while `34fe19e2`, `f22a81c4`, and `a0c4aa1c` also changed live SuperTurtle security, restart, supervision, greeting, metadata, and tunnel code that must be kept.
- [ ] Implement the snake-work removal in the repo. <- current
- [ ] Run targeted verification for the affected paths.
- [ ] Update the worker state and commit the removal.
