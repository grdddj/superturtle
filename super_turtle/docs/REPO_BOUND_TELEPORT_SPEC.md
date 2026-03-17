# E2B Teleport Runtime Spec

## Status

Active product/runtime spec for `teleport-v2.0`.

This file keeps its historical path, but the repo-sync design has been removed.

## Decision

Teleport is now E2B-only and package-based.

There is no active Azure, GCP, AWS, or generic VM target in this branch.

The remote runtime model is:

1. local SuperTurtle keeps using long polling
2. `/teleport` creates or resumes one E2B sandbox
3. the sandbox runs the published `superturtle` package in webhook mode
4. Telegram ownership flips only after the remote webhook is healthy
5. `/home` deletes the webhook and returns ownership to local polling

## Runtime Artifact

Teleport, managed onboarding, and local installs should all converge on one runtime artifact:

- the published `superturtle` npm package

The E2B sandbox should get that runtime through:

- the selected E2B template channel, and/or
- an exact `SUPERTURTLE_RUNTIME_INSTALL_SPEC`

Repo content is not transferred to the sandbox as part of teleport.

## Remote Runtime Contract

The E2B sandbox is the remote runtime boundary.

Required sandbox properties:

- the published `superturtle` package is installable and runnable
- the bot can boot in a `teleport-remote` role
- the bot can run Bun HTTP webhook transport
- sandbox-local runtime state can be written at launch time
- sandbox lifecycle supports start, pause, resume, and destroy

Expected runtime state on the sandbox:

- `.superturtle/project.json`
- `.superturtle/.env`
- optional sandbox-local auth material for the selected driver

Expected runtime env:

- `SUPERTURTLE_RUNTIME_ROLE=teleport-remote`
- `TELEGRAM_TRANSPORT=webhook`
- `TELEGRAM_WEBHOOK_REGISTER=false`
- `TELEGRAM_WEBHOOK_URL=<public webhook url>`
- `TELEGRAM_WEBHOOK_SECRET=<secret token>`

## Ownership And Cutover

Teleport requires:

1. create or reconnect to the E2B sandbox
2. verify or install the exact runtime package spec
3. write sandbox-local runtime state
4. bootstrap any required auth
5. start the remote runtime
6. verify webhook readiness
7. switch Telegram to the remote webhook
8. verify cutover before local ownership is treated as released

Rollback requirement:

- if sandbox startup fails, local ownership stays authoritative
- if webhook registration fails, local polling stays authoritative
- if post-cutover health fails, revert ownership rather than leaving Telegram detached

## Telegram Transport Policy

Transport is mode-specific, not global:

- local development/runtime: long polling
- remote E2B runtime: webhooks

This keeps local installs from exposing ports while allowing cloud sandboxes to receive Telegram updates directly.

## Pause/Resume Policy

Remote lifecycle must be controllable from Telegram.

The expected user model is:

- `/teleport` starts or resumes the sandbox and flips Telegram to the webhook runtime
- `/home` deletes the webhook and hands ownership back to local polling
- a paused sandbox may auto-resume on inbound webhook traffic while it still owns Telegram

Precise Telegram commands can evolve, but the sandbox lifecycle contract must support this flow.

## Non-Goals

Teleport is not:

- repo sync
- workspace mirroring
- whole-machine backup
- home-directory replication
- generic folder sync
- multi-provider cloud orchestration

## Practical Consequences

This spec implies:

1. teleport code should assume E2B, not a generic provider abstraction
2. webhook cutover is part of teleport correctness, not an optional extra
3. runtime version and template selection must be explicit and auditable
4. pause/resume semantics must map directly to E2B sandbox lifecycle operations

## Near-Term Hardening Focus

1. keep repeated `/teleport` and `/home` cycles reliable
2. make runtime channel/version selection first-class UX instead of env-only knobs
3. decide how much auth bootstrap remains in local teleport versus managed onboarding
4. expose runtime/template drift clearly in status and debug output
