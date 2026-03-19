import { describe, expect, it } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { isRelevantSubturtleBoardEventType } = await import("./subturtle-board-service");

describe("subturtle board service", () => {
  it("treats worker lifecycle and checkpoint events as board-relevant", () => {
    expect(isRelevantSubturtleBoardEventType("worker.started")).toBe(true);
    expect(isRelevantSubturtleBoardEventType("worker.checkpoint")).toBe(true);
    expect(isRelevantSubturtleBoardEventType("worker.archived")).toBe(true);
    expect(isRelevantSubturtleBoardEventType("worker.cleanup_verified")).toBe(true);
    expect(isRelevantSubturtleBoardEventType("worker.completed")).toBe(true);
    expect(isRelevantSubturtleBoardEventType("worker.notification_sent")).toBe(false);
    expect(isRelevantSubturtleBoardEventType("worker.supervision_checked")).toBe(false);
  });
});
