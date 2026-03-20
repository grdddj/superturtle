# Current task
Check retained progress callback navigation behavior in `super_turtle/claude-telegram-bot/src/handlers/callback.ts`.

# End goal with specs
Produce a code review of the new Telegram streaming UI with findings focused on bugs, behavioral mismatches, regressions, and missing tests. Compare the Claude and Codex paths for retained progress creation, pacing, snapshot history, final result promotion, and arrow navigation behavior. Do not implement product changes unless a bug fix is required to complete the review. Review should cite concrete files/functions and highlight whether Codex and Claude behave the same way or where they diverge.

# Roadmap (Completed)
- Scanned repo instructions and SubTurtle contract.
- Chosen worker scope: code review only, focused on Telegram streaming UI parity.

# Roadmap (Upcoming)
- Read the retained progress renderer and shared streaming state logic.
- Compare Claude session streaming flow against Codex driver/session flow.
- Check callback navigation behavior and history snapshot behavior for both paths.
- Review focused tests for parity gaps and missing coverage.
- Summarize findings with file references and severity ordering.

# Backlog
- [x] Inspect shared retained progress renderer in `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- [x] Compare Claude streaming path in `super_turtle/claude-telegram-bot/src/session.ts`
- [x] Compare Codex streaming path in `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts` and `super_turtle/claude-telegram-bot/src/codex-session.ts`
- [ ] Check retained progress callback navigation behavior in `super_turtle/claude-telegram-bot/src/handlers/callback.ts` <- current
- [ ] Review focused tests in `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts` and `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`
- [ ] Write code review findings with parity conclusions and concrete file/function references

# Working notes
- Parity confirmed: `CodexDriver.runMessage()` defers downstream `done` until the pending MCP output pump stops and the final flush completes, which preserves the same "side effects before retained-progress teardown" outcome Claude gets by handling pending outputs inline before `done`. Refs: `super_turtle/claude-telegram-bot/src/drivers/codex-driver.ts:16-89`, `super_turtle/claude-telegram-bot/src/session.ts:881-972`, `super_turtle/claude-telegram-bot/src/session.ts:1104-1116`.
- Parity confirmed: Codex persists a resumable session as soon as the stream yields `thread_id`, then saves again after the assistant reply is finalized. Claude does the same with `session_id` capture plus a final save after the completed response. Refs: `super_turtle/claude-telegram-bot/src/codex-session.ts:1352-1365`, `super_turtle/claude-telegram-bot/src/codex-session.ts:1566-1573`, `super_turtle/claude-telegram-bot/src/session.ts:776-780`, `super_turtle/claude-telegram-bot/src/session.ts:1111-1116`.
- Candidate finding `P1`: Codex has no tool-active stall grace. `CodexSession.sendMessage()` always races the event iterator against `EVENT_STREAM_STALL_TIMEOUT_MS`, while Claude switches to `TOOL_ACTIVE_STALL_TIMEOUT_MS` once a tool starts. A long-running Codex tool with no intermediate events can therefore abort at 120s even when the equivalent Claude run is still within its allowed tool-execution window. Refs: `super_turtle/claude-telegram-bot/src/codex-session.ts:1310-1338`, `super_turtle/claude-telegram-bot/src/session.ts:722-800`.
- Candidate finding `P2`: Codex reports every completed MCP tool call into the retained-progress callback, including `ask_user`, `send_image`, `send_turtle`, `bot_control`, and `pino_logs`. Claude explicitly suppresses those MCP tool status messages because those tools render their own UI or side effects. This means Codex can add extra "Using tools" snapshots and different progress text/history for the same user-visible flow. Refs: `super_turtle/claude-telegram-bot/src/codex-session.ts:1417-1436`, `super_turtle/claude-telegram-bot/src/session.ts:846-879`, `super_turtle/claude-telegram-bot/src/message-kinds.ts:24-39`.
- Candidate finding `P3`: Codex hardcodes `500` for streamed text throttling instead of using `STREAMING_THROTTLE_MS`. It currently matches config by coincidence, but pacing will diverge if the shared throttle changes. Refs: `super_turtle/claude-telegram-bot/src/codex-session.ts:1397-1401`, `super_turtle/claude-telegram-bot/src/session.ts:980-991`, `super_turtle/claude-telegram-bot/src/config.ts:491`.
