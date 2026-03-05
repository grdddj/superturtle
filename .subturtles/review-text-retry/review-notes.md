# Retry Cleanup Review Notes

## 2026-03-05 - Item 1: handleText() flow vs old inline cleanup

### Summary
- `handleText()` now calls `cleanupToolMessages(ctx, state)` at the top of the retry catch path before retry classification in [text.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/text.ts:208).
- Previous behavior (pre-`282273c`) performed an inline loop in `text.ts` with the same delete intent (delete tool messages, skip ask-user prompt messages, ignore cleanup failures).

### Old vs New Behavior Delta
1. Deletion intent is preserved:
 - Old inline logic skipped ask-user prompt messages via `isAskUserPromptMessage` and deleted all other `state.toolMessages`.
 - New helper does the same skip/delete in [streaming.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/streaming.ts:696).
2. Error handling changed:
 - Old inline logic swallowed all delete errors.
 - New helper suppresses known benign delete failures but logs unexpected ones in debug.
3. State mutation changed:
 - New helper explicitly clears `state.toolMessages` and `state.heartbeatMessage` after cleanup in [streaming.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/streaming.ts:712).
 - Old inline logic did not clear these fields.

### Initial Risk Readout
- No retry-control-flow regression found in this slice: retry gating branches still run after cleanup with the same decision order.
- Behavior is stricter about in-memory cleanup state and observability, with equivalent user-facing delete/skip semantics for this path.

## 2026-03-05 - Item 2: Does cleanup delete persistent ask-user prompts?

### Verification
1. Ask-user prompts are identified by inline keyboard presence in `isAskUserPromptMessage()` at [streaming.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/streaming.ts:74).
2. `cleanupToolMessages()` explicitly skips those messages before delete calls at [streaming.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/streaming.ts:696).
3. Regression test coverage exists and passes for the skip behavior at [streaming.test.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts:285).
4. Ask-user lifecycle confirms persistence-until-selection semantics: callback path edits the same prompt message on selection rather than assuming pre-deletion at [callback.ts](/Users/Richard.Mladek/Documents/projects/agentic/super_turtle/claude-telegram-bot/src/handlers/callback.ts:381).

### Conclusion
- No evidence that `cleanupToolMessages()` deletes ask-user prompt messages that should persist.
- Confirmed by direct code path inspection and targeted test execution (`bun test ... -t "cleanupToolMessages"`: 3/3 pass).

### Residual Note
- The preservation heuristic is broader than ask-user specifically (it preserves any inline-keyboard tool message). This is likely intentional but should be kept in mind when auditing non-ask-user inline controls.
