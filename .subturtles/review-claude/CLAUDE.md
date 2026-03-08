# Current task
Review bot runtime (handlers, session, config, drivers) in super_turtle/claude-telegram-bot/src/ — deep dive into code patterns, error handling, and concurrency.

# End goal with specs
Produce a thorough code review saved to `docs/reviews/claude-review-2026-03-08.md`. Focus on architectural concerns, async/concurrency correctness, type safety gaps, error propagation, test coverage blind spots, and design patterns that could be simplified. Think architecturally — patterns, not just individual lines. Be specific with file paths and line numbers. This is a READ-ONLY review task: don't fix things, just report them.

# Roadmap (Completed)
- (none yet)

# Roadmap (Upcoming)
- Code review of entire Super Turtle codebase
- Written review document with prioritized findings

# Backlog
- [x] Explore the codebase structure and key files
- [ ] Review bot runtime (handlers, session, config, drivers) in super_turtle/claude-telegram-bot/src/ <- current
- [ ] Review conductor system (state, wakeups, inbox, events) in super_turtle/claude-telegram-bot/src/conductor/
- [ ] Review SubTurtle orchestration (ctl, loops, watchdog) in super_turtle/subturtle/
- [ ] Review MCP tools and utilities
- [ ] Write findings to docs/reviews/claude-review-2026-03-08.md
- [ ] Commit the review

# Exploration Notes (for future iterations)

## Codebase Scale
- ~35K lines TypeScript (bot runtime), ~2K lines core Python (SubTurtle loops/ctl)
- ~110 source files (excluding docs, venv, node_modules)
- Extensive test suite: 50+ test files

## Architecture Summary
- **Bot runtime** (TypeScript/Bun): Telegram bot that IS the meta agent. Grammy framework, dual Claude/Codex drivers, streaming responses, MCP tool integration, session management.
- **Conductor** (TypeScript): Durable state for SubTurtle orchestration — worker state files, append-only event log, wakeup queue, meta-agent inbox. All persisted under `.superturtle/state/`.
- **SubTurtle** (Python + bash): `ctl` shell script (1,543 lines) manages spawn/stop/status. Python `__main__.py` (888 lines) runs execution loops (slow/yolo/yolo-codex). `agents.py` (207 lines) wraps Claude/Codex CLIs.
- **MCP servers** (TypeScript): send-turtle (stickers), bot-control (session/model/usage), ask-user (inline buttons). File-based IPC in `/tmp/superturtle-{TOKEN_PREFIX}/`.
- **Dashboard** (TypeScript): Web UI for operational visibility. ~3,400 lines.

## Key Findings So Far
- **Concurrency model**: Single-threaded bot with 10s cron timer, single-flight maintenance. Grammy runner provides message ordering. Flag-based coordination (not mutexes) for drain suppression, cron overlap.
- **Atomicity**: Conductor uses temp-file + rename for atomic writes. Cron jobs use full-file overwrite (not atomic rename). Metadata files in ctl use non-atomic multi-line writes.
- **Error handling**: Defensive but some catch blocks only warn. Fire-and-forget callbacks in streaming. Audit log write failures silently logged.
- **Resource management**: No GC for conductor state, MCP IPC files, pino logs, or event log. All grow unbounded.
- **Type safety**: Strong in conductor subsystem. Some `@ts-expect-error` in streaming, `Record<string, unknown>` in worker metadata/checkpoint.
- **PID file races**: TOCTOU in ctl read-then-kill. No retry on PID read after spawn.
- **Watchdog orphaning**: Detached background process not tracked after parent exit.
