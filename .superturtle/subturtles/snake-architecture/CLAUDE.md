# Current task
Add a short architecture note in `snake/` describing folders, commands, and module ownership.

# End goal with specs
- Deliver a playable snake game inside the `snake/` directory in this repo.
- Establish the base project structure, shared conventions, and integration plan so the other workers can build against stable paths.
- Choose a minimal stack that runs locally with straightforward commands and no unnecessary framework churn.
- Document the agreed folder layout, core modules, and integration contracts for gameplay, UI, and QA.
- Leave the repo in a state where the other workers can land code into `snake/` without guessing file ownership.

# Roadmap (Completed)
- No implementation work completed yet.

# Roadmap (Upcoming)
- Inspect the repo and decide the most pragmatic stack for a local snake game in `snake/`.
- Create the initial `snake/` project skeleton and shared documentation.
- Define module boundaries for engine, UI, and QA/polish work.
- Coordinate through commits and repo state rather than speculative planning.

# Backlog
- [x] Inspect the repo, choose the minimal stack, and create the `snake/` project skeleton
- [ ] Add a short architecture note in `snake/` describing folders, commands, and module ownership <- current
- [ ] Create any shared bootstrap files needed by the engine and UI workers
- [ ] Leave clear integration seams for scoring, restart flow, and game-over state
- [ ] Commit the foundation work with a message that clearly signals the scaffold is ready
