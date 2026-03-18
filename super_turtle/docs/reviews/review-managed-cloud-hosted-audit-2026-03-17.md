# Managed Cloud Hosted Audit - 2026-03-17

## Scope

Reviewed `../superturtle-web/super_turtle/docs/managed-cloud-plane-spec.md` against the current hosted implementation in:

- `../superturtle-web/src/features/cloud/controllers/managed-control-plane.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-provider-auth.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts`
- `../superturtle-web/src/features/cloud/controllers/runtime-lease.ts`
- `../superturtle-web/src/features/cloud/providers/`
- managed API and CLI routes under `../superturtle-web/src/app/`

## Findings

### 1. Managed cloud still exposes local-authoritative handoff and machine-owned lifecycle contracts

Current code still models managed mode as something a client or remote machine can claim and drive:

- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:46` creates `machine_token_id` and `machine_auth_token_hash` during `resumeManagedInstance()`.
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:155` exposes `getTeleportTarget()`, including `machine_auth_token`, sandbox coordinates, and project-root details for a CLI consumer.
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:200` and `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:245` accept machine self-registration and heartbeat updates.
- `../superturtle-web/src/app/v1/cli/teleport/target/route.ts:1`, `../superturtle-web/src/app/v1/machine/register/route.ts:1`, and `../superturtle-web/src/app/v1/machine/heartbeat/route.ts:1` publish those flows as active endpoints.
- `../superturtle-web/src/features/cloud/controllers/runtime-lease.ts:1` and the `/v1/cli/runtime/lease/*` routes still preserve a local-vs-cloud lease model.

This conflicts with the managed-cloud spec. Managed mode is supposed to be hosted-authoritative, cloud-only, and explicitly distinct from `/teleport`. The hosted backend should own lifecycle, ownership repair, and status through the E2B SDK rather than via machine tokens, CLI-resolved teleport targets, or lease arbitration between local and cloud runtimes.

### 2. The hosted cloud layer still carries the old multi-provider VM abstraction

The active managed-cloud spec is E2B-only for this phase, but the hosted code still keeps the layer-one VM abstraction alive:

- `../superturtle-web/src/features/cloud/providers/contracts.ts:3` defines generic GCP/Azure/AWS VM provider contracts, SSH targets, and teleport target resolution.
- `../superturtle-web/src/features/cloud/providers/registry.ts:74` registers GCP, Azure, and AWS adapters as first-class managed providers.

That abstraction is now outside the active design and will continue to pull the codebase toward provider-neutral VM semantics unless it is isolated from the managed-cloud flow.

### 3. Managed status does not report webhook ownership or ownership loss

The spec requires hosted status to report provisioning state, webhook ownership, runtime metadata, and health. The current status controller is thinner than that:

- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:34` returns only `instance`, the latest `provisioning_job`, and recent `audit_log`.
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:184` maps instance fields that are useful for lifecycle, but it does not expose a first-class ownership block, the configured Telegram bot identity, or current webhook verification state.
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts:161` verifies Telegram takeover during configuration, but there is no follow-up reconciliation path if the webhook is moved away later.

Today the hosted control plane can set the webhook, but it cannot clearly report "managed currently owns this bot" versus "ownership was lost and needs repair" from the public status surfaces.

### 4. Telegram setup stores a successful cutover, but not enough hosted authority metadata

`configureManagedTelegramBot()` already does the right critical preflight work:

- validates the current webhook and requires takeover confirmation when the bot points elsewhere
- seeds sandbox files and provider credentials
- starts the runtime and waits for `/readyz`
- verifies the final webhook target before marking the instance ready

That is good, but it still leaves an authority gap:

- the success path only records the final `webhook_url`, webhook secret, bot identity, and timestamps in `managed_instances`
- there is no explicit persisted ownership state, last ownership verification time, or "lost ownership" transition
- the audit log entry only records `telegram.configured`, not takeover intent/result metadata that would help future repair flows

The onboarding path is ahead of the status model, but it still does not give the hosted control plane a durable ownership state machine.

### 5. The narrow sandbox public surface is configured, not enforced from hosted code

The onboarding controller writes webhook/health/readiness env vars and disables the dashboard:

- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts` sets `TELEGRAM_TRANSPORT=webhook`, `TELEGRAM_WEBHOOK_REGISTER=false`, `TELEGRAM_WEBHOOK_HEALTH_PATH`, `TELEGRAM_WEBHOOK_READY_PATH`, and `DASHBOARD_ENABLED=false`.

That aligns with the spec direction, but the hosted repo does not currently enforce or test that the managed runtime exposes only:

- the Telegram webhook path
- `GET /healthz`
- `GET /readyz`

There is no hosted-side verification that other HTTP paths return `404`, and no audit-visible signal that the runtime template/package still satisfies that boundary.

## Recommended First Implementation Slice

The first follow-up change should remove the strongest local-authoritative contracts from managed mode:

1. Retire `getTeleportTarget()` and stop returning machine credentials or teleport-style sandbox connection details from managed cloud.
2. Stop minting or depending on `machine_token_id` / `machine_auth_token_hash` for managed lifecycle.
3. Remove or hard-disable the managed machine register/heartbeat routes and the runtime-lease routes for managed cloud ownership.

This is the highest-leverage slice because it makes the hosted backend the only lifecycle authority before tackling the remaining status, ownership-repair, and public-surface work.
