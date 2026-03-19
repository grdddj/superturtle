# Review Findings

## Commit `27cf3247` - `Fix Codex stall on pending output flush`

### High

- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts:134`: the new timeout wrapper changes `ask_user` semantics. If `checkPendingAskUserRequests()` takes longer than `CODEX_PENDING_REQUEST_TIMEOUT_MS`, `runPendingCheck()` returns `false`, so the MCP completion callback does not return `true` for `ask_user`. In `super_turtle/claude-telegram-bot/src/codex-session.ts:1427` and `super_turtle/claude-telegram-bot/src/codex-session.ts:1477`, that means `askUserTriggered` is never set and the event loop keeps running instead of pausing for the human reply. Before this commit the driver waited indefinitely here, so a slow Telegram/API write was annoying but still correct; now it can silently continue the turn without the requested user input.

### Test Gaps

- `super_turtle/claude-telegram-bot/src/drivers/codex-driver.test.ts:102` only covers the "non-ask_user checker hangs after completion" case. There is no regression test for a slow or hanging `checkPendingAskUserRequests()` inside the `ask_user` MCP callback, which is the path that now changes control flow.

## Commit `b9b70972` - `Add board POC workspace note`

### Medium

- `.superturtle/subturtles/board-poc-check-3/CLAUDE.md:1` and `.superturtle/subturtles/board-poc-check-3/board-poc-check-note.md:1` commit ephemeral worker-runtime files from `.superturtle/subturtles/`, even though `.gitignore:39` marks `.superturtle/` as local runtime state and `AGENTS.md:16` says live project state now lives there. Tracking these files means normal worker cleanup shows up as repository deletions/modifications and makes it easier to accidentally commit future local state from the same runtime tree.
