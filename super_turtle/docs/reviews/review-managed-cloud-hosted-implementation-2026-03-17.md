# Managed Cloud Hosted Implementation Review - 2026-03-17

## Scope Map

This pass only mapped the hosted managed-cloud commit stack and the highest-risk review surfaces. Findings are still pending.

Reviewed commits in `../superturtle-web`:

- `e50a020` Disable deprecated managed cloud ownership surfaces
- `1e9a345` Persist managed runtime manifest for hosted onboarding
- `fa2bffc` Report managed Telegram ownership in cloud status
- `5954bce` Repair managed Telegram webhook ownership
- `8845d93` Lock managed sandbox public surface contract
- `a92b92f` Clarify managed cloud sign-in flow wording
- `8ba07c2` Add managed cloud onboarding and status tests

## Highest-Risk Files

1. Ownership and lifecycle status

   Start with `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:34-183`.
   This is the main hosted status and resume entry point. It now folds live Telegram ownership checks into status, auto-triggers repair during resume, gates repair deduplication through provisioning jobs, and maps the public status payload.

2. Live Telegram ownership checks

   Review `../superturtle-web/src/features/cloud/controllers/managed-telegram-ownership.ts:24-87`.
   This code decrypts the stored bot token and reaches out to Telegram on the status path. The key risks are stale or missing ownership state, error handling that could hide a broken control plane, and any mismatch between `expected_webhook_url` and the actual sandbox host.

3. Ownership repair flow

   Review `../superturtle-web/src/features/cloud/controllers/managed-telegram-repair.ts:90-252` together with `../superturtle-web/src/app/v1/cli/cloud/instance/repair/route.ts:1-47`.
   This is the most operationally sensitive path in the stack: it can resume or recreate an E2B sandbox, rewrite runtime files, reinstall provider credentials, restart the runtime, move the Telegram webhook, and mutate persisted health and audit state.

4. Onboarding and webhook takeover flow

   Review `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts:168-330`.
   The critical areas are takeover confirmation, stale-webhook checks, ordering of side effects, runtime bootstrap diagnostics, and the persisted managed-instance fields written after success.

5. Sandbox lifecycle and entitlement authority

   Review `../superturtle-web/src/features/cloud/controllers/managed-control-plane.ts:26-100` and `../superturtle-web/src/features/cloud/controllers/managed-control-plane.ts:142-182`.
   This is where hosted mode provisions or resumes the E2B sandbox, derives the sandbox host, updates managed-instance health fields, and enforces managed entitlement checks.

6. Runtime contract files written into the sandbox

   Review `../superturtle-web/src/features/cloud/controllers/managed-runtime-manifest.ts:19-53` and `../superturtle-web/src/features/cloud/controllers/managed-public-surface.ts:26-96`.
   These define the remote runtime metadata and the narrow public HTTP surface contract that onboarding and repair both depend on.

7. Deprecated surface shutdown

   Review `../superturtle-web/src/features/cloud/controllers/managed-surface-disabled.ts:1-24` plus the disabled routes under `../superturtle-web/src/app/v1/cli/teleport/target/route.ts`, `../superturtle-web/src/app/v1/machine/register/route.ts`, `../superturtle-web/src/app/v1/machine/heartbeat/route.ts`, and `../superturtle-web/src/app/v1/cli/runtime/lease/*`.
   These are lower complexity than the ownership flows, but they are security-sensitive because they retire the old machine-owned control surfaces.

## Test Inventory Added In This Stack

- `../superturtle-web/src/features/cloud/controllers/managed-runtime.test.ts`
  Covers hosted status payload shape, provisioning-job selection, and ownership snapshots.
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.test.ts`
  Covers provisioning-step reporting plus webhook takeover confirmation and stale-confirmation rejection.
- `../superturtle-web/src/features/cloud/controllers/managed-telegram-ownership.test.ts`
  Covers managed, external, missing, not-configured, and lookup-failure ownership states.
- `../superturtle-web/src/features/cloud/controllers/managed-telegram-repair.test.ts`
  Covers repair-on-drift, no-op repair when ownership is already correct, and provider-credential expiry on auth failure.
- `../superturtle-web/src/features/cloud/controllers/managed-runtime-manifest.test.ts`
  Covers manifest contents and version extraction.
- `../superturtle-web/src/features/cloud/controllers/managed-public-surface.test.ts`
  Covers endpoint derivation and env-contract generation.
- `../superturtle-web/src/features/cloud/controllers/managed-surface-disabled.test.ts`
  Covers the 410 disabled-surface responses for retired machine and lease endpoints.

## Review Order For Next Passes

1. `managed-runtime.ts` + `managed-telegram-ownership.ts` + `managed-telegram-repair.ts`
2. `managed-onboarding.ts` + `managed-public-surface.ts` + `managed-runtime-manifest.ts`
3. Disabled routes and the changed test files
