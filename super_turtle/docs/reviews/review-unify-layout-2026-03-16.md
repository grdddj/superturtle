# Review: unify-superturtle-layout

Date: 2026-03-16
Branch: `unify-superturtle-layout`
Baseline: `main...HEAD` plus local unstaged deletion of `.subturtles/teleport-provider-registry/CLAUDE.md`

## Diff triage

`git diff --stat main...HEAD` reports 111 files changed, with 13,067 insertions and 9,031 deletions.

Highest-risk review order:

1. Hosted cloud CLI and runtime ownership
   Files:
   - `super_turtle/bin/cloud.js` (1,825 lines)
   - `super_turtle/bin/cloud-control-plane-contract.js` (475 lines)
   - `super_turtle/bin/runtime-ownership-agent.js` (195 lines)
   - `super_turtle/tests/cloud-cli.test.js`
   - `super_turtle/tests/cloud-session-durability.test.js`
   - `super_turtle/tests/cloud-session-permission-race.test.js`
   - `super_turtle/tests/cloud-session-read-race.test.js`
   - `super_turtle/tests/cloud-session-size-race.test.js`
   Rationale: this is the largest new behavioral surface, it persists auth/session state on disk, and it introduces lease/ownership logic that can break runtime exclusivity or strand sessions.

2. Telegram ownership handoff and remote runtime gating
   Files:
   - `super_turtle/claude-telegram-bot/src/index.ts` (1,170 lines)
   - `super_turtle/claude-telegram-bot/src/telegram-transport.ts` (484 lines)
   - `super_turtle/claude-telegram-bot/src/teleport.ts` (162 lines)
   - `super_turtle/claude-telegram-bot/src/handlers/commands.ts`
   - `super_turtle/claude-telegram-bot/src/handlers/commands.teleport.test.ts`
   - `super_turtle/claude-telegram-bot/src/telegram-transport.test.ts`
   - `super_turtle/claude-telegram-bot/src/handlers/text.remote.test.ts`
   - `super_turtle/claude-telegram-bot/src/handlers/voice.remote.test.ts`
   Rationale: this path changes how Telegram delivery moves between polling, webhook, standby, and remote control/agent modes. Regressions here can black-hole updates or break `/teleport` and `/home`.

3. Remote webhook bootstrap and E2B runtime orchestration
   Files:
   - `super_turtle/bin/e2b-webhook-poc-lib.js` (1,309 lines)
   - `super_turtle/bin/e2b-webhook-poc.js`
   - `super_turtle/e2b-template/*`
   - `super_turtle/tests/e2b-webhook-poc.test.js`
   Rationale: this code provisions the remote sandbox, syncs the repo/auth state, and performs webhook cutover. Failures here are operationally expensive and may not show up in unit-only coverage.

4. Runtime layout migration and config compatibility
   Files:
   - `super_turtle/claude-telegram-bot/src/config.ts` (570 lines)
   - `super_turtle/subturtle/lib/env.sh`
   - `super_turtle/setup`
   - `super_turtle/tests/runtime-layout-migration.sh`
   - `.subturtles/teleport-provider-registry/CLAUDE.md` (local deletion)
   Rationale: the branch moves runtime data under `.superturtle/` and performs automatic migration at startup. Compatibility mistakes here can delete or orphan existing user state.

## Review sequence for later passes

- First pass: `super_turtle/bin/cloud.js`, `super_turtle/bin/cloud-control-plane-contract.js`, `super_turtle/bin/runtime-ownership-agent.js`
- Second pass: `super_turtle/claude-telegram-bot/src/index.ts`, `super_turtle/claude-telegram-bot/src/telegram-transport.ts`, `super_turtle/claude-telegram-bot/src/teleport.ts`, `super_turtle/claude-telegram-bot/src/config.ts`
- Third pass: touched tests for the new cloud, transport, teleport, and migration behavior
- Final pass: local deletion of `.subturtles/teleport-provider-registry/CLAUDE.md` and final findings write-up
