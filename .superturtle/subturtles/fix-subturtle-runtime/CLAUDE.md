# Current task
Add regression tests for single spawn board establishment, pin failure, four-way parallel spawn, and stop cleanup.

# End goal with specs
- Make SubTurtle board establishment correct and explicit: a board must not be considered established unless Telegram message creation/edit and pinning actually succeeded.
- Add an immediate board refresh path on successful spawn and stop so correctness does not depend only on the background watcher debounce.
- Make shared runtime-state mutation concurrency-safe for parallel `ctl spawn` / `ctl stop` / `ctl reschedule-cron`, especially around `.superturtle/cron-jobs.json`.
- Keep the fix clean: centralize shared-state mutation, avoid ad hoc sleeps/retries, and preserve existing user-facing behavior where possible.
- Add regression coverage for single spawn, pin failure, burst parallel spawn, and cleanup/recovery paths.

# Roadmap (Completed)
- Investigated the current behavior and confirmed a false-positive live-board record can exist even when Telegram pinning does not visibly succeed.
- Reproduced a parallel spawn race where one worker lost cron registration in `.superturtle/cron-jobs.json`.

# Roadmap (Upcoming)
- Read the current board sync and spawn/runtime-state mutation paths end to end.
- Implement explicit board-establishment semantics and immediate refresh on spawn/stop.
- Introduce a concurrency-safe shared-state mutation path for cron/runtime updates.
- Add regression tests that prove the fixes under both single-worker and burst-parallel conditions.

# Backlog
- [x] Reproduce the current board pinning and parallel spawn failure modes in tests and document the exact contracts the fix must satisfy
- [x] Refactor live board sync so pin failure is not treated as success and tracked board state matches actual Telegram state
- [x] Add an explicit board reconcile call after successful spawn and stop paths in addition to the background watcher
- [x] Introduce a locked shared-state helper for cron registration, removal, and reschedule so parallel spawns cannot lose updates
- [ ] Add regression tests for single spawn board establishment, pin failure, four-way parallel spawn, and stop cleanup <- current
- [ ] Run the relevant test slices and summarize any remaining risks or follow-up cleanup
