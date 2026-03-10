# Current task
Backlog complete. Stop the loop.

# End goal with specs
A design doc (written into this CLAUDE.md under a ## Design section inside Backlog) that specifies how to make non-silent cron jobs use the existing deferred queue system (or a similar pattern) so they are executed once the driver becomes idle, instead of being silently skipped. The design must cover:
1. How the existing deferred queue works (read `src/deferred-queue.ts` and `src/deferred-queue.drain.test.ts`)
2. What currently happens to non-silent cron jobs when the driver is busy (read the cron timer in `src/index.ts` lines 500-800)
3. The proposed change: queue cron jobs when driver is busy, drain when idle
4. Edge cases: what if multiple cron jobs pile up? Max queue size? Priority vs user messages? One-shot vs recurring handling?
5. Whether to reuse the existing deferred queue or create a cron-specific queue
Key files: `src/deferred-queue.ts`, `src/index.ts` (lines 500-800), `src/handlers/text.ts`, `src/deferred-queue.drain.test.ts`.
The cron timer currently checks `isAnyDriverRunning()` and skips non-silent jobs. One-shot jobs are REMOVED before execution so if skipped they're gone forever. Recurring jobs are ADVANCED so they try again next interval. User messages always preempt background cron runs.

# Roadmap (Completed)
- Identified the problem: non-silent cron jobs silently dropped when driver busy

# Roadmap (Upcoming)
- Design the cron job queuing solution

# Backlog
- [x] Read `src/deferred-queue.ts` to understand the existing queuing pattern
- [x] Read `src/deferred-queue.drain.test.ts` to understand queue drain behavior
- [x] Read `src/index.ts` lines 500-800 to understand the current cron timer and the skip logic
- [x] Read `src/handlers/text.ts` to understand how user messages enqueue into the deferred queue
- [x] Write the design into this CLAUDE.md under ## Design with sections for current behavior, proposed behavior, edge cases, and implementation plan
- [x] Mark all backlog items complete and stop

## Design

### Current behavior

The existing deferred queue in `src/deferred-queue.ts` is a per-chat in-memory FIFO used for user text and voice messages. It has three important properties:

- It only accepts user-originated items with `{ text, userId, username, chatId, source, enqueuedAt }`.
- It dedupes only against the most recent queued item when trimmed text matches within 5 seconds.
- It hard-caps each chat queue at 10 items by dropping the oldest item.

Drain behavior is also already well-defined and covered by `src/deferred-queue.drain.test.ts`:

- `drainDeferredQueue()` refuses to run if a driver is active, a drain is already running for the chat, or drain is suppressed.
- When it does run, it drains FIFO, calls `runMessageWithActiveDriver()`, audits each processed item, and stops on the first non-cancellation error.
- Text and voice handlers call `drainDeferredQueue()` in their `finally` blocks, so queued user work runs after the foreground interaction finishes.
- Stop suppresses and clears the queue for the chat so stale queued user work does not resume after `/stop`.

The cron timer in `src/index.ts` behaves differently for non-silent cron jobs:

- It checks `isAnyDriverRunning()` before each due job and skips non-silent jobs for that tick when the driver is busy.
- It removes one-shot jobs or advances recurring jobs before execution starts, so later preemption/cancellation can still cause the current occurrence to be lost.
- Non-silent cron jobs run as background work with `beginBackgroundRun()` / `endBackgroundRun()`, but there is no deferred queue equivalent for them.
- User text already preempts background work in `src/handlers/text.ts` by calling `preemptBackgroundRunForUserPriority()` and, if needed, enqueuing the user message in the deferred queue.

Result: user messages have durable in-memory waiting behavior, while non-silent cron jobs only have "run now or skip" behavior.

### Proposed behavior

Reuse the existing deferred queue mechanism, but generalize it from "deferred user messages" into a single deferred work queue with typed items:

- `kind: "user_message"` for the current text/voice behavior.
- `kind: "cron_job"` for non-silent cron executions.

Each deferred cron item should carry the cron metadata needed to execute or coalesce safely:

- `jobId`
- `jobType` (`one-shot` or `recurring`)
- `prompt`
- `chatId`
- `userId`
- `enqueuedAt`
- `scheduledFor`

The cron timer change should be:

- If a due non-silent cron job finds the driver busy, enqueue a deferred `cron_job` item instead of silently continuing.
- Do not remove/advance the cron record at enqueue time. Mark it as "queued locally" in memory by `jobId` so the same due job is not enqueued again on every 10-second tick.
- Remove the one-shot job or advance the recurring job only when the deferred cron item actually begins execution.
- Drain deferred cron items through the same idle gate as user messages: only when no driver is active and no drain is already running for the chat.

The drain policy should preserve current user-first behavior:

- When a chat drain runs, always process all queued `user_message` items before any queued `cron_job` items for that chat.
- A new user message should still preempt an active background cron run.
- A queued cron job should never jump ahead of a queued user message.

This is not a separate cron queue in practice. It is one queueing subsystem with item kinds and per-kind execution rules.

### Edge cases

- Multiple recurring cron ticks while busy: coalesce by `jobId`, not by prompt text. Keep at most one queued occurrence per recurring job. Update its `scheduledFor` to the most recent due time if needed.
- Multiple one-shot cron jobs while busy: allow multiple queued items, because each job ID is distinct work that should run once.
- Max queue size: keep the existing per-chat cap of 10 for user messages, but do not apply the same blind drop-oldest rule to cron items. Instead:
  - Reserve user capacity first.
  - Add a separate cron cap per chat, for example 10 queued cron items.
  - If the cron cap is hit, reject new recurring occurrences first and log that they were coalesced/dropped; reject one-shot cron jobs only with an explicit operator-visible warning.
- Priority: user messages remain highest priority. Silent supervision and bot-message-only cron paths stay outside this queue because they already have separate semantics.
- Process restarts: this queue is currently in-memory just like the existing deferred queue. That is acceptable for matching current user-message behavior, but it should be called out explicitly as non-durable. If durability becomes required later, the generalized queue shape will be easier to persist than a cron-only side path.
- Cancellation after dequeue: if a queued cron item is dequeued, then preempted before model execution starts, it should be requeued at the front once, rather than lost. This is the case that currently burns one-shot jobs after early removal.
- Notifications: cron drains should send a short operator notice such as "Running queued scheduled job..." analogous to `makeDrainItemNotifier()`, but distinct from user-message wording.

### Implementation plan

1. Refactor `src/deferred-queue.ts` from `DeferredMessage` into a small discriminated union such as `DeferredQueueItem = DeferredUserMessage | DeferredCronJob`.
2. Keep the existing user-message API as thin wrappers so text/voice behavior does not change, but add cron-specific helpers:
   - `enqueueDeferredCronJob(...)`
   - `isCronJobQueued(jobId)`
   - `makeDrainCronNotifier(...)`
3. Update the drain loop so it can execute either item kind:
   - user items still call `runMessageWithActiveDriver()` and audit as today
   - cron items call the same non-silent cron execution path currently in `src/index.ts`
4. In `src/index.ts`, when a due non-silent cron job sees `isAnyDriverRunning()`, enqueue it instead of skipping it.
5. When a deferred cron item actually starts, then perform the current remove/advance logic for the underlying cron record.
6. Trigger drains from both existing user handlers and the cron timer idle path, so queued cron work can start even if no later user message arrives.
7. Add tests for:
   - busy driver causes non-silent cron enqueue instead of skip
   - queued cron drains once driver becomes idle
   - user messages drain before queued cron jobs
   - recurring jobs coalesce by `jobId`
   - one-shot cron jobs are not lost on pre-start preemption

## Loop Control
STOP
