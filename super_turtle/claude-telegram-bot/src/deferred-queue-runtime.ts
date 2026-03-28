import type { Context } from "grammy";
import { advanceRecurringJob, removeJob } from "./cron";
import {
  dequeueNextDeferredItem,
  getDeferredQueueSize,
  isDeferredCronJob,
  isDeferredMessage,
  isDrainSuppressed,
  type DeferredMessage,
} from "./deferred-queue-state";
import { eventLog } from "./logger";

async function loadStreamingModule() {
  return import("./handlers/streaming");
}

async function loadQueueRuntimeDeps() {
  const [{ session }, { auditLog, generateRequestId, startTypingIndicator }, driverRouting] =
    await Promise.all([
      import("./session"),
      import("./utils"),
      import("./handlers/driver-routing"),
    ]);

  return {
    session,
    auditLog,
    generateRequestId,
    startTypingIndicator,
    isAnyDriverRunning: driverRouting.isAnyDriverRunning,
    runMessageWithActiveDriver: driverRouting.runMessageWithActiveDriver,
  };
}

async function loadCronExecutionModule() {
  return import("./cron-execution");
}

const drainingChats = new Set<number>();

export function makeDrainItemNotifier(
  ctx: Context,
  chatId: number
): (msg: DeferredMessage) => Promise<void> {
  return async (msg: DeferredMessage): Promise<void> => {
    const preview = msg.text.replace(/\s+/g, " ").trim();
    const truncated = preview.length > 40 ? `${preview.slice(0, 40)}…` : preview;
    const notice = await ctx.reply(
      truncated ? `💬 Processing queued message…\n${truncated}` : "💬 Processing queued message…"
    );
    const { getStreamingState } = await loadStreamingModule();
    const state = getStreamingState(chatId);
    if (state) {
      state.toolMessages.push(notice);
    }
  };
}

export async function drainDeferredQueue(
  ctx: Context,
  chatId: number,
  onDrainItem?: (msg: DeferredMessage) => Promise<void>
): Promise<void> {
  const {
    auditLog,
    generateRequestId,
    isAnyDriverRunning,
    runMessageWithActiveDriver,
    session,
    startTypingIndicator,
  } = await loadQueueRuntimeDeps();

  if (isDrainSuppressed(chatId) || drainingChats.has(chatId) || isAnyDriverRunning()) {
    return;
  }

  drainingChats.add(chatId);
  try {
    while (!isAnyDriverRunning() && !isDrainSuppressed(chatId)) {
      const next = dequeueNextDeferredItem(chatId);
      if (!next) {
        break;
      }

      if (isDeferredMessage(next)) {
        const stopProcessing = session.startProcessing();
        const typing = startTypingIndicator(ctx);
        session.typingController = typing;
        const requestId = generateRequestId("queue");

        try {
          eventLog.info({
            event: "deferred_queue.processing_start",
            requestId,
            chatId,
            userId: next.userId,
            source: next.source,
            queueRemaining: getDeferredQueueSize(chatId),
          });
          const { StreamingState, createStatusCallback } = await loadStreamingModule();
          const state = new StreamingState();
          const statusCallback = createStatusCallback(ctx, state);
          try {
            await onDrainItem?.(next);
          } catch {
            // Ignore notification failures
          }
          const response = await runMessageWithActiveDriver({
            message: next.text,
            source: next.source === "voice" ? "queue_voice" : "queue_text",
            username: next.username,
            userId: next.userId,
            chatId: next.chatId,
            ctx,
            statusCallback,
          });

          await auditLog(
            next.userId,
            next.username,
            next.source === "voice" ? "VOICE_QUEUED" : "TEXT_QUEUED",
            next.text,
            response,
            { request_id: requestId, chat_id: chatId, source: next.source }
          );
          eventLog.info({
            event: "deferred_queue.processing_done",
            requestId,
            chatId,
            userId: next.userId,
            source: next.source,
            queueRemaining: getDeferredQueueSize(chatId),
          });
        } catch (error) {
          eventLog.error({
            event: "deferred_queue.processing_error",
            requestId,
            chatId,
            userId: next.userId,
            source: next.source,
            error: String(error).slice(0, 200),
          });
          const message = String(error).toLowerCase();
          if (!message.includes("abort") && !message.includes("cancel")) {
            await ctx.reply(`❌ Error: ${String(error).slice(0, 200)}`);
          }
          break;
        } finally {
          stopProcessing();
          typing.stop();
          session.typingController = null;
        }
        continue;
      }

      if (!isDeferredCronJob(next)) {
        continue;
      }

      const requestId = generateRequestId("queue-cron");

      try {
        eventLog.info({
          event: "deferred_queue.cron_processing_start",
          requestId,
          chatId,
          cronJobId: next.jobId,
          cronJobType: next.jobType,
          queueRemaining: getDeferredQueueSize(chatId),
        });
        const advancedOrRemoved =
          next.jobType === "recurring"
            ? advanceRecurringJob(next.jobId)
            : removeJob(next.jobId);
        if (!advancedOrRemoved) {
          eventLog.warn({
            event: "deferred_queue.cron_missing",
            requestId,
            chatId,
            cronJobId: next.jobId,
            cronJobType: next.jobType,
          });
          continue;
        }
        const { executeNonSilentCronJob } = await loadCronExecutionModule();
        await executeNonSilentCronJob(
          {
            id: next.jobId,
            prompt: next.prompt,
          },
          {
            chatId: next.chatId,
            userId: next.chatId,
          }
        );
        eventLog.info({
          event: "deferred_queue.cron_processing_done",
          requestId,
          chatId,
          cronJobId: next.jobId,
          cronJobType: next.jobType,
          queueRemaining: getDeferredQueueSize(chatId),
        });
      } catch (error) {
        eventLog.error({
          event: "deferred_queue.cron_processing_error",
          requestId,
          chatId,
          cronJobId: next.jobId,
          cronJobType: next.jobType,
          error: String(error).slice(0, 200),
        });
        const message = String(error).toLowerCase();
        if (!message.includes("abort") && !message.includes("cancel")) {
          await ctx.reply(`❌ Error: ${String(error).slice(0, 200)}`);
        }
        break;
      }
    }
  } finally {
    drainingChats.delete(chatId);
  }
}
