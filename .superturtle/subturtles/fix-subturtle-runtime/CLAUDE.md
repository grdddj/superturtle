# Current task
All backlog items are complete. Verification summary: `bash super_turtle/subturtle/tests/test_ctl_integration.sh`, `node super_turtle/tests/subturtle-cron-race.test.js`, and `bun test super_turtle/claude-telegram-bot/src/subturtle-board-reconcile.test.ts` passed. Remaining follow-up cleanup: `bun test super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts` still fails on the existing `logger` export mismatch, and `cd super_turtle/claude-telegram-bot && bun run typecheck` still reports pre-existing `commands.ts`, `streaming.ts`, and `streaming.test.ts` type errors.

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
- [x] Add regression tests for single spawn board establishment, pin failure, four-way parallel spawn, and stop cleanup
- [x] Run the relevant test slices and summarize any remaining risks or follow-up cleanup, including the existing `commands.subturtle` logger export mismatch

## Loop Control
STOP
