import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { CronJob } from "./cron";

type CronDeferredQueueModule = typeof import("./cron-deferred-queue");

let enqueueDeferredCronJobMock: ReturnType<typeof mock>;
let isCronJobQueuedMock: ReturnType<typeof mock>;

async function loadCronDeferredQueueModule(): Promise<CronDeferredQueueModule> {
  return import(`./cron-deferred-queue.ts?test=${Date.now()}-${Math.random()}`);
}

function makeJob(overrides: Partial<CronJob> = {}): CronJob {
  return {
    id: "cron-1",
    prompt: "run report",
    type: "one-shot",
    interval_ms: null,
    fire_at: 5000,
    created_at: "2026-03-10T00:00:00.000Z",
    ...overrides,
  };
}

beforeEach(() => {
  enqueueDeferredCronJobMock = mock(() => true);
  isCronJobQueuedMock = mock(() => false);

  mock.module("./deferred-queue", () => ({
    enqueueDeferredCronJob: (chatId: number, job: unknown) =>
      enqueueDeferredCronJobMock(chatId, job),
    isCronJobQueued: (chatId: number, jobId: string) =>
      isCronJobQueuedMock(chatId, jobId),
  }));
});

afterEach(() => {
  mock.restore();
});

describe("enqueueBusyDeferredCronJob", () => {
  it("enqueues a due non-silent job once and tracks its job id", async () => {
    let queueHasJob = false;
    enqueueDeferredCronJobMock = mock(() => {
      queueHasJob = true;
      return true;
    });
    isCronJobQueuedMock = mock(() => queueHasJob);

    const module = await loadCronDeferredQueueModule();
    const queuedDueJobIds = new Set<string>();
    const job = makeJob({
      id: "cron-busy",
      type: "recurring",
      job_kind: "subturtle_supervision",
      worker_name: "worker-a",
      supervision_mode: "silent",
    });

    expect(module.enqueueBusyDeferredCronJob(44, job, queuedDueJobIds, 1234)).toBe(true);
    expect(module.enqueueBusyDeferredCronJob(44, job, queuedDueJobIds, 5678)).toBe(false);

    expect(enqueueDeferredCronJobMock).toHaveBeenCalledTimes(1);
    expect(enqueueDeferredCronJobMock).toHaveBeenCalledWith(44, {
      jobId: "cron-busy",
      jobType: "recurring",
      jobKind: "subturtle_supervision",
      workerName: "worker-a",
      supervisionMode: "silent",
      prompt: "run report",
      silent: false,
      scheduledFor: 5000,
      enqueuedAt: 1234,
    });
    expect(queuedDueJobIds.has("cron-busy")).toBe(true);
  });

  it("recovers from a stale local tracking entry when the queue no longer has the job", async () => {
    const module = await loadCronDeferredQueueModule();
    const queuedDueJobIds = new Set<string>(["cron-stale"]);
    const job = makeJob({ id: "cron-stale" });

    expect(module.enqueueBusyDeferredCronJob(55, job, queuedDueJobIds, 2000)).toBe(true);

    expect(isCronJobQueuedMock).toHaveBeenCalledWith(55, "cron-stale");
    expect(enqueueDeferredCronJobMock).toHaveBeenCalledTimes(1);
    expect(queuedDueJobIds.has("cron-stale")).toBe(true);
  });
});

describe("pruneQueuedDueCronJobIds", () => {
  it("drops tracked job ids that are no longer due and no longer queued", async () => {
    const module = await loadCronDeferredQueueModule();
    const queuedDueJobIds = new Set<string>(["done-job", "still-due", "still-queued"]);
    isCronJobQueuedMock = mock((_chatId: number, jobId: string) => jobId === "still-queued");

    module.pruneQueuedDueCronJobIds(77, new Set(["still-due"]), queuedDueJobIds);

    expect(queuedDueJobIds).toEqual(new Set(["still-due", "still-queued"]));
  });
});
