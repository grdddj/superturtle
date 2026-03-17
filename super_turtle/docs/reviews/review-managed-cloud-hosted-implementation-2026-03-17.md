# Review: Managed Cloud Hosted Implementation

Status: In progress. This pass covered lifecycle, ownership, status, onboarding, repair, and public-surface handling in the managed control-plane/runtime flow.

## Scope Covered

Reviewed commits in `../superturtle-web`:

- `e50a020` Disable deprecated managed cloud ownership surfaces
- `1e9a345` Persist managed runtime manifest for hosted onboarding
- `fa2bffc` Report managed Telegram ownership in cloud status
- `5954bce` Repair managed Telegram webhook ownership
- `8845d93` Lock managed sandbox public surface contract
- `a92b92f` Clarify managed cloud sign-in flow wording
- `8ba07c2` Add managed cloud onboarding and status tests

Primary files reviewed in this pass:

- `../superturtle-web/src/features/cloud/controllers/managed-control-plane.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-public-surface.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-telegram-ownership.ts`
- `../superturtle-web/src/features/cloud/controllers/managed-telegram-repair.ts`
- `../superturtle-web/src/features/cloud/components/managed-telegram-setup-flow.tsx`

## Findings

### High: `/v1/cli/cloud/instance/repair` can overlap an active provision or resume job

`repairManagedInstance()` always calls `repairManagedInstanceInternal()`, which loads the active job across `provision`, `resume`, and `repair` kinds, but only deduplicates when the active job itself is `repair`. That means a manual repair request can run concurrently with an in-flight provision or resume and both paths can mutate the same `managed_instances` row, connect/create sandboxes, and write conflicting job/audit state.

References:
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:168`
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:268`
- `../superturtle-web/src/features/cloud/controllers/managed-runtime.ts:286`

Why it matters:
- A concurrent `repair` can race the normal lifecycle worker and leave the instance pointing at the wrong sandbox or with misleading `health_status` / `provisioning_job` output.
- The current tests only cover `getManagedCloudStatus()` and do not exercise `repairManagedInstance()` against an already-running non-repair job.

### High: any `Sandbox.connect()` failure silently provisions a replacement sandbox

`connectOrCreateSandbox()` catches every error from `Sandbox.connect(existingSandboxId)` and falls through to `Sandbox.create(...)` without distinguishing "sandbox not found" from transient E2B/API failures. The new repair path calls this helper before deciding whether ownership repair is needed, so a temporary reconnect failure can create a second sandbox, repoint Telegram to it, and orphan the original runtime.

References:
- `../superturtle-web/src/features/cloud/controllers/managed-control-plane.ts:142`
- `../superturtle-web/src/features/cloud/controllers/managed-telegram-repair.ts:108`

Why it matters:
- This can duplicate billable sandboxes and split runtime state across two environments.
- Because the fallback is silent, operators only see the final repaired host, not the reconnect failure that triggered an unintended reprovision.

### High: initial Telegram setup cuts over the webhook before the managed runtime proves it is ready

`configureManagedTelegramBot()` still calls `setTelegramWebhook()` before `startManagedRuntime()` and `waitForReady()`. The catch path even reports that "The Telegram webhook was already moved to this sandbox" when readiness fails. By contrast, the newer repair flow uses the safer order of `startManagedRuntime()` -> `waitForReady()` -> `setTelegramWebhook()`, so first-time onboarding remains the riskier path.

References:
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts:245`
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts:260`
- `../superturtle-web/src/features/cloud/controllers/managed-telegram-repair.ts:213`

Why it matters:
- A first-time setup or takeover can strand Telegram updates on a sandbox that never reaches readiness, taking the bot offline until an operator manually repairs or restores the old webhook.
- The onboarding tests only cover takeover confirmation and stale confirmation rejection; they do not exercise the failure path after `setTelegramWebhook()` to catch this regression.

### Medium: Telegram preflight/configure resumes or provisions the sandbox before input validation, and the UI triggers both paths for one setup attempt

Both `preflightManagedTelegramBot()` and `configureManagedTelegramBot()` call `provisionManagedSandboxInstance()` before trimming and validating `botToken` / `allowedUserId`. That helper immediately inserts a provisioning job and may create or resume the E2B sandbox. The client flow then calls `/api/managed/telegram/preflight` and `/api/managed/telegram/configure` back-to-back for a single "Configure bot" submit, so a normal no-takeover flow performs the lifecycle path twice before Telegram is actually configured.

References:
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts:177`
- `../superturtle-web/src/features/cloud/controllers/managed-onboarding.ts:303`
- `../superturtle-web/src/features/cloud/controllers/managed-control-plane.ts:26`
- `../superturtle-web/src/features/cloud/components/managed-telegram-setup-flow.tsx:44`
- `../superturtle-web/src/features/cloud/components/managed-telegram-setup-flow.tsx:88`

Why it matters:
- Empty or malformed bot submissions can still create or resume a billable sandbox and append misleading `provisioning_jobs` / audit history before the user sees a validation error.
- A successful setup attempt pays the latency and side effects of two resume/provision cycles, which makes the onboarding timeline noisier and harder to reason about operationally.
- The current onboarding tests do not verify that invalid input short-circuits before provisioning or that the end-to-end Telegram setup path only resumes once.
