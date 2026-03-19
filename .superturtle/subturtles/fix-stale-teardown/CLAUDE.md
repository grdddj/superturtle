# Current task
Investigate and fix the full-suite dashboard log endpoint failure that still blocks a clean `bun test` run after the codex-driver stale-session teardown fix.

# End goal with specs
In `codex-driver.ts`, the `done` status is deferred (line 51-57) so it fires after pending output flush. But in `codex-session.ts` (line 1543-1546), the stale-session detection path calls `statusCallback("done", "")` then throws. This means:

1. Wrapped status callback captures `done` into `deferredDone`
2. Then the throw causes `codexSession.sendMessage()` to reject
3. The `finally` block stops the pending pump (line 77)
4. But lines 80-88 (flushAfterCompletion + deferred done delivery) are SKIPPED because the exception propagates
5. The downstream `done` callback (which runs `teardownStreamingState`) never fires

Fix: Move the deferred done delivery into the `finally` block (or a try/finally wrapping lines 80-88) so it always runs even when sendMessage throws.

Acceptance criteria:
- When stale-session throws after emitting done, the downstream done callback still fires
- Normal (non-stale) done flow is unchanged
- Add test: stale session emits done then throws → downstream done callback still called
- All existing tests pass: `cd super_turtle/claude-telegram-bot && bun test`

# Roadmap (Completed)
- (none yet)

# Roadmap (Upcoming)
- Fix deferred done teardown on stale-session retry

# Backlog
- [x] Read `src/drivers/codex-driver.ts` runMessage method, focus on deferred done + finally block
- [x] Read stale-session detection in `src/codex-session.ts` around line 1532-1548
- [x] Implement fix: wrap lines 80-88 in try/finally so deferred done always delivered
- [x] Add test: stale session emits `done`, then throws, and the downstream `done` callback still fires
- [ ] Investigate and fix the existing `src/dashboard.test.ts` full-suite failure where `GET /api/subturtles/:name/logs` returns 404 during `bun test` runs but passes in isolation <- current
- [ ] Re-run all tests (`cd super_turtle/claude-telegram-bot && bun test`) after the dashboard failure is resolved
- [x] Commit with descriptive message

Note: `bun test src/drivers/codex-driver.test.ts` passed. Full `bun test` still fails in `src/dashboard.test.ts` for `GET /api/subturtles/:name/logs`; the same dashboard test passes when run in isolation, so the remaining blocker appears unrelated to the codex-driver change.
