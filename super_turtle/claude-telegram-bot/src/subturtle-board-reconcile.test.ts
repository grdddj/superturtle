import { afterEach, describe, expect, it, mock } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";

async function loadModule() {
  return import(`./subturtle-board-reconcile.ts?test=${Date.now()}-${Math.random()}`);
}

afterEach(() => {
  mock.restore();
});

describe("reconcileLiveSubturtleBoardNow", () => {
  it("forces an immediate pinned board refresh for the first allowed user", async () => {
    const syncLiveSubturtleBoard = mock(async () => ({
      status: "updated" as const,
      messageId: 42,
      view: { kind: "board" as const },
    }));

    mock.module("./config", () => ({
      ALLOWED_USERS: [456],
    }));
    mock.module("./bot", () => ({
      bot: { api: { source: "default" } },
    }));
    mock.module("./logger", () => ({
      botLog: {
        info: () => {},
        error: () => {},
      },
    }));
    mock.module("./handlers/commands", () => ({
      syncLiveSubturtleBoard,
    }));

    const { reconcileLiveSubturtleBoardNow } = await loadModule();
    const api = { source: "override" } as any;
    const result = await reconcileLiveSubturtleBoardNow({ api, reason: "spawn:test-worker" });

    expect(syncLiveSubturtleBoard).toHaveBeenCalledTimes(1);
    expect(syncLiveSubturtleBoard).toHaveBeenCalledWith(api, 456, {
      force: true,
      pin: true,
      disableNotification: true,
    });
    expect(result).toEqual({
      status: "updated",
      messageId: 42,
      view: { kind: "board" },
    });
  });

  it("skips reconciliation when there is no allowed chat", async () => {
    const syncLiveSubturtleBoard = mock(async () => ({
      status: "updated" as const,
      messageId: 42,
      view: { kind: "board" as const },
    }));

    mock.module("./config", () => ({
      ALLOWED_USERS: [],
    }));
    mock.module("./bot", () => ({
      bot: { api: { source: "default" } },
    }));
    mock.module("./logger", () => ({
      botLog: {
        info: () => {},
        error: () => {},
      },
    }));
    mock.module("./handlers/commands", () => ({
      syncLiveSubturtleBoard,
    }));

    const { reconcileLiveSubturtleBoardNow } = await loadModule();
    const result = await reconcileLiveSubturtleBoardNow({ reason: "stop:test-worker" });

    expect(syncLiveSubturtleBoard).not.toHaveBeenCalled();
    expect(result).toBeNull();
  });
});
