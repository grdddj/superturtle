# Review Scope

Window captured from the last 12 hours of history on 2026-03-20 using `git log --since='12 hours ago'`.

## In-scope commits

- `1323d7a7` (2026-03-20 11:15:53 +0100) `Show only answer snapshots in progress history`
  Files: `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`
- `501fcfea` (2026-03-20 10:57:30 +0100) `Refine Telegram streaming progress UI`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`
- `36cd90a5` (2026-03-20 10:35:22 +0100) `test retained progress callback navigation`
  Files: `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`
- `da2b688d` (2026-03-20 09:31:38 +0100) `Align Telegram terminal progress and artifact delivery`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `edde2789` (2026-03-20 09:24:58 +0100) `Retain Telegram progress state on stop and failure`
  Files: `super_turtle/claude-telegram-bot/src/codex-session.ts`, `super_turtle/claude-telegram-bot/src/handlers/codex.flow.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `super_turtle/claude-telegram-bot/src/handlers/text.progress.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/text.ts`, `super_turtle/claude-telegram-bot/src/session.ask-user.test.ts`, `super_turtle/claude-telegram-bot/src/session.ts`
- `6320317c` (2026-03-20 09:11:10 +0100) `Add retained progress snapshot navigation`
  Files: `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/callback.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `7e60edff` (2026-03-20 09:02:59 +0100) `Render canonical Telegram progress states`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `7190056d` (2026-03-20 02:16:20 +0100) `test telegram retained progress streaming flow`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`
- `be0256d9` (2026-03-20 02:12:15 +0100) `Implement retained Telegram progress message flow`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `1509c0da` (2026-03-20 00:54:22 +0100) `Fix duplicate stop replies and clean stale subturtle state`
  Files: `super_turtle/claude-telegram-bot/src/codex-session.conductor-inbox.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
- `0c67d747` (2026-03-20 00:36:28 +0100) `Preserve final text notification after media sends`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`, `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `4e4dad7b` (2026-03-20 00:01:59 +0100) `Clean tracked subturtle state and add message kind helpers`
  Files: `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`, `super_turtle/claude-telegram-bot/src/message-kinds.test.ts`, `super_turtle/claude-telegram-bot/src/message-kinds.ts`, `super_turtle/claude-telegram-bot/src/types.ts`

## Aggregate touched files

- `super_turtle/claude-telegram-bot/src/handlers/streaming.ts`
- `super_turtle/claude-telegram-bot/src/handlers/streaming.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.ts`
- `super_turtle/claude-telegram-bot/src/handlers/text.progress.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/stop.ts`
- `super_turtle/claude-telegram-bot/src/handlers/stop.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.ts`
- `super_turtle/claude-telegram-bot/src/handlers/callback.test.ts`
- `super_turtle/claude-telegram-bot/src/handlers/codex.flow.test.ts`
- `super_turtle/claude-telegram-bot/src/codex-session.ts`
- `super_turtle/claude-telegram-bot/src/session.ts`
- `super_turtle/claude-telegram-bot/src/session.ask-user.test.ts`
- `super_turtle/claude-telegram-bot/src/message-kinds.ts`
- `super_turtle/claude-telegram-bot/src/message-kinds.test.ts`
- `super_turtle/claude-telegram-bot/src/types.ts`
- `super_turtle/docs/TELEGRAM_PROGRESS_UX_SPEC.md`

## Adjacent same-window commits

These touched nearby files but look secondary to the retained-progress / streaming lane and can be revisited only if the primary review turns up coupling:

- `f2d472a5` `Refresh live subturtle board lifecycle` -> `super_turtle/claude-telegram-bot/src/handlers/commands.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`
- `bd78702e` `Isolate subturtle handler tests from config mock leaks` -> `super_turtle/claude-telegram-bot/src/handlers/callback.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.ts`, subturtle handler tests
- `9399ab84` `Fix subturtle board pin lifecycle` -> `super_turtle/claude-telegram-bot/src/handlers/commands.ts`, `super_turtle/claude-telegram-bot/src/handlers/commands.subturtle.test.ts`
- `d664d182` `Stabilize Telegram bot CI tests` -> mixed test-harness stabilization with incidental `streaming.test.ts`, `session.ts`, and `session.ask-user.test.ts` changes
