import type { CronJob, CronJobKind, CronSupervisionMode } from "./cron";

export interface DeferredMessage {
  kind: "user_message";
  text: string;
  userId: number;
  username: string;
  chatId: number;
  source: "voice" | "text";
  enqueuedAt: number;
}

export type DeferredMessageInput = Omit<DeferredMessage, "kind">;

export interface DeferredCronJob {
  kind: "cron_job";
  chatId: number;
  jobId: string;
  jobType: CronJob["type"];
  jobKind?: CronJobKind;
  workerName?: string;
  supervisionMode?: CronSupervisionMode;
  prompt: string;
  silent: boolean;
  scheduledFor: number;
  enqueuedAt: number;
}

export type DeferredCronJobInput = Omit<DeferredCronJob, "kind" | "chatId">;

export type DeferredQueueItem = DeferredMessage | DeferredCronJob;

function toDeferredMessage(item: DeferredMessageInput): DeferredMessage {
  return {
    kind: "user_message",
    ...item,
  };
}

function toDeferredCronJob(chatId: number, job: DeferredCronJobInput): DeferredCronJob {
  return {
    kind: "cron_job",
    chatId,
    ...job,
  };
}

export function isDeferredMessage(item: DeferredQueueItem): item is DeferredMessage {
  return item.kind === "user_message";
}

export function isDeferredCronJob(item: DeferredQueueItem): item is DeferredCronJob {
  return item.kind === "cron_job";
}

const MAX_USER_MESSAGES_PER_CHAT = 10;
const MAX_CRON_ITEMS_PER_CHAT = 10;
const DEDUPE_WINDOW_MS = 5000;

interface DeferredQueueGlobalState {
  queues: Map<number, DeferredQueueItem[]>;
  drainSuppressedChats: Set<number>;
}

const DEFERRED_QUEUE_GLOBAL_KEY =
  "__superTurtleDeferredQueueState__" as keyof typeof globalThis;

function getDeferredQueueGlobalState(): DeferredQueueGlobalState {
  const existing = globalThis[DEFERRED_QUEUE_GLOBAL_KEY] as
    | DeferredQueueGlobalState
    | undefined;
  if (existing) {
    return existing;
  }

  const created: DeferredQueueGlobalState = {
    queues: new Map<number, DeferredQueueItem[]>(),
    drainSuppressedChats: new Set<number>(),
  };
  (globalThis as Record<string, unknown>)[DEFERRED_QUEUE_GLOBAL_KEY] = created;
  return created;
}

const { queues, drainSuppressedChats } = getDeferredQueueGlobalState();

export function clearDeferredQueue(chatId: number): number {
  const queue = queues.get(chatId);
  const count = queue?.length ?? 0;
  queues.delete(chatId);
  return count;
}

function countItemsByKind(
  queue: ReadonlyArray<DeferredQueueItem>,
  kind: DeferredQueueItem["kind"]
): number {
  return queue.reduce((count, item) => count + (item.kind === kind ? 1 : 0), 0);
}

function trimOldestItemOfKind(
  queue: DeferredQueueItem[],
  kind: DeferredQueueItem["kind"]
): DeferredQueueItem | undefined {
  const index = queue.findIndex((item) => item.kind === kind);
  if (index === -1) {
    return undefined;
  }

  const [trimmed] = queue.splice(index, 1);
  return trimmed;
}

export function suppressDrain(chatId: number): void {
  drainSuppressedChats.add(chatId);
}

export function unsuppressDrain(chatId: number): void {
  drainSuppressedChats.delete(chatId);
}

export function isDrainSuppressed(chatId: number): boolean {
  return drainSuppressedChats.has(chatId);
}

export function enqueueDeferredMessage(item: DeferredMessageInput): number {
  const normalized = toDeferredMessage(item);
  const queue = queues.get(normalized.chatId) || [];
  const last = queue[queue.length - 1];
  if (
    last &&
    isDeferredMessage(last) &&
    last.text.trim() === item.text.trim() &&
    normalized.enqueuedAt - last.enqueuedAt <= DEDUPE_WINDOW_MS
  ) {
    queues.set(normalized.chatId, queue);
    return queue.length;
  }

  queue.push(normalized);
  const trimmed = countItemsByKind(queue, "user_message") - MAX_USER_MESSAGES_PER_CHAT;
  for (let i = 0; i < trimmed; i++) {
    trimOldestItemOfKind(queue, "user_message");
  }

  queues.set(normalized.chatId, queue);
  return queue.length;
}

export function enqueueDeferredCronJob(
  chatId: number,
  job: DeferredCronJobInput
): boolean {
  const queue = queues.get(chatId) || [];
  const normalized = toDeferredCronJob(chatId, job);

  if (normalized.jobType === "recurring") {
    const existingIndex = queue.findIndex(
      (item) =>
        item.kind === "cron_job" &&
        item.jobType === "recurring" &&
        item.jobId === normalized.jobId
    );
    if (existingIndex !== -1) {
      const existing = queue[existingIndex];
      if (existing && isDeferredCronJob(existing)) {
        queue[existingIndex] = {
          ...existing,
          ...normalized,
          scheduledFor: Math.max(existing.scheduledFor, normalized.scheduledFor),
        };
        queues.set(chatId, queue);
        return false;
      }
    }
  }

  queue.push(normalized);
  const trimmed = countItemsByKind(queue, "cron_job") - MAX_CRON_ITEMS_PER_CHAT;
  for (let i = 0; i < trimmed; i++) {
    trimOldestItemOfKind(queue, "cron_job");
  }

  queues.set(chatId, queue);
  return true;
}

export function isCronJobQueued(chatId: number, jobId: string): boolean {
  const queue = queues.get(chatId);
  if (!queue || queue.length === 0) {
    return false;
  }

  return queue.some((item) => item.kind === "cron_job" && item.jobId === jobId);
}

export function dequeueDeferredMessage(chatId: number): DeferredMessage | undefined {
  const queue = queues.get(chatId);
  if (!queue || queue.length === 0) {
    return undefined;
  }

  const nextIndex = queue.findIndex(isDeferredMessage);
  if (nextIndex === -1) {
    return undefined;
  }

  const next = queue[nextIndex];
  if (!next || !isDeferredMessage(next)) {
    return undefined;
  }

  queue.splice(nextIndex, 1);
  if (queue.length === 0) {
    queues.delete(chatId);
  } else {
    queues.set(chatId, queue);
  }
  return next;
}

export function dequeueNextDeferredItem(chatId: number): DeferredQueueItem | undefined {
  const queue = queues.get(chatId);
  if (!queue || queue.length === 0) {
    return undefined;
  }

  const nextIndex = queue.findIndex(isDeferredMessage);
  const resolvedIndex = nextIndex === -1 ? 0 : nextIndex;
  const next = queue[resolvedIndex];
  if (!next) {
    return undefined;
  }

  queue.splice(resolvedIndex, 1);
  if (queue.length === 0) {
    queues.delete(chatId);
  } else {
    queues.set(chatId, queue);
  }
  return next;
}

export function getDeferredQueueSize(chatId: number): number {
  return queues.get(chatId)?.length || 0;
}

export function getAllDeferredQueues(): Map<number, ReadonlyArray<DeferredQueueItem>> {
  return new Map(
    Array.from(queues.entries()).map(([chatId, items]) => [chatId, [...items]])
  );
}
