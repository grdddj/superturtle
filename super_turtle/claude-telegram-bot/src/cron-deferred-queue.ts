import type { CronJob } from "./cron";
import { enqueueDeferredCronJob, isCronJobQueued } from "./deferred-queue";

type DeferredEligibleCronJob = Pick<
  CronJob,
  | "id"
  | "type"
  | "prompt"
  | "silent"
  | "fire_at"
  | "job_kind"
  | "worker_name"
  | "supervision_mode"
>;

export function enqueueBusyDeferredCronJob(
  chatId: number,
  job: DeferredEligibleCronJob,
  queuedDueJobIds: Set<string>,
  now = Date.now()
): boolean {
  if (queuedDueJobIds.has(job.id) && !isCronJobQueued(chatId, job.id)) {
    queuedDueJobIds.delete(job.id);
  }

  if (queuedDueJobIds.has(job.id) || isCronJobQueued(chatId, job.id)) {
    return false;
  }

  const enqueued = enqueueDeferredCronJob(chatId, {
    jobId: job.id,
    jobType: job.type,
    jobKind: job.job_kind,
    workerName: job.worker_name,
    supervisionMode: job.supervision_mode,
    prompt: job.prompt,
    silent: job.silent === true,
    scheduledFor: job.fire_at,
    enqueuedAt: now,
  });

  if (enqueued) {
    queuedDueJobIds.add(job.id);
  }

  return enqueued;
}

export function pruneQueuedDueCronJobIds(
  chatId: number,
  dueJobIds: ReadonlySet<string>,
  queuedDueJobIds: Set<string>
): void {
  for (const jobId of queuedDueJobIds) {
    if (!dueJobIds.has(jobId) && !isCronJobQueued(chatId, jobId)) {
      queuedDueJobIds.delete(jobId);
    }
  }
}
