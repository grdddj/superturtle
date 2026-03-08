# Review Findings: Conductor Restart Recovery

Date: 2026-03-08
Scope: restart/recovery state reconstruction after bot restarts.

This audit focused on whether the bot can rebuild worker lifecycle state, wakeup delivery state, and meta-agent inbox state from disk alone after a crash or manual restart.

## Findings

### High: Wakeups stranded in `processing` are never replayed after a bot restart

Files:
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:158`
- `super_turtle/claude-telegram-bot/src/conductor-supervisor.ts:975`
- `super_turtle/claude-telegram-bot/src/index.ts:474`
- `super_turtle/state/run_state_writer.py:230`

Why this is a real recovery bug:
- `loadPendingWakeups()` only loads wakeups whose `delivery_state` is exactly `pending`.
- `processPendingConductorWakeups()` flips each wakeup to `processing` before the Telegram send happens.
- After a crash, the bot timer only re-enters delivery through `processPendingConductorWakeups()`, so a wakeup left on disk in `processing` is never re-queued.
- The rendered `handoff.md` path also only surfaces `pending` wakeups, so the stranded record drops out of the main operator summary too.

Reproduction:
1. Persist a canonical worker plus a wakeup whose `delivery_state` is `processing`.
2. Restart the bot and let the timer call `processPendingConductorWakeups()`.
3. Result: no message is sent, no reconciliation happens, and the wakeup stays `processing` indefinitely.

I reproduced this locally with a one-off `bun --eval` script against the real `processPendingConductorWakeups()` implementation. The function returned `{ sent: 0, skipped: 0, errors: 0, reconciled: 0 }` and left the wakeup unchanged on disk.

Impact:
- A crash between the pre-send `processing` write and the final `sent` write can permanently wedge completion, failure, timeout, or milestone delivery.
- Durable restart recovery stops being deterministic for in-flight notifications, because the persisted state can no longer be reconciled by the normal timer path.
- The missing replay also means the wakeup can disappear from `handoff.md`'s pending-wakeup section even though it still needs recovery attention.

Coverage gap:
- Existing supervisor recovery tests only seed wakeups in `pending` state, not `processing`: `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:97`, `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:195`, `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:310`.

Recommendation:
- Requeue stale `processing` wakeups during recovery, or treat `processing` as replayable when the previous attempt did not durably finish.
- Add a restart regression test that starts from a persisted `processing` wakeup and proves delivery resumes deterministically after restart.

## Checked And Passing

The durable-state foundation itself looks sound for the happy-path restart cases:
- Canonical worker and wakeup directories are created on disk by the conductor store at `super_turtle/state/conductor_state.py:102`.
- Multi-worker pending wakeups survive until interactive acknowledgment in `super_turtle/claude-telegram-bot/src/conductor-supervisor.test.ts:251`.
- Claude acknowledges durable inbox items only after a successful interactive turn in `super_turtle/claude-telegram-bot/src/session.conductor-inbox.test.ts:75`.
- Codex does the same in `super_turtle/claude-telegram-bot/src/codex-session.conductor-inbox.test.ts:68`.
