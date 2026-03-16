import { afterEach, describe, expect, it, mock } from "bun:test";

type ReplyRecord = {
  text: string;
};

function makeCtx(messageText: string) {
  const replies: ReplyRecord[] = [];
  const edits: ReplyRecord[] = [];
  const setMyCommandsCalls: Array<Array<{ command: string; description: string }>> = [];
  return {
    ctx: {
      from: { id: 123 },
      chat: { id: 456 },
      message: { text: messageText },
      api: {
        async deleteMessage() {},
        async editMessageText(_chatId: number, _messageId: number, text: string) {
          edits.push({ text });
        },
        async setMyCommands(commands: Array<{ command: string; description: string }>) {
          setMyCommandsCalls.push(commands);
        },
      },
      reply: async (text: string) => {
        replies.push({ text });
        return {
          chat: { id: 456 },
          message_id: replies.length,
        };
      },
    },
    replies,
    edits,
    setMyCommandsCalls,
  };
}

async function loadCommandsModuleForRole(
  role: "local" | "teleport-remote",
  teleportOverrides: Record<string, unknown>
) {
  const actualConfig = await import("../config");
  mock.module("../config", () => ({
    ...actualConfig,
    ALLOWED_USERS: [123],
    SUPERTURTLE_RUNTIME_ROLE: role,
  }));

  mock.module("../teleport", () => ({
    TELEPORT_CONTROL_MESSAGE:
      "This remote teleport runtime is control-only. Use /home to return Telegram ownership to your PC.",
    TELEPORT_REMOTE_ALLOWED_COMMANDS: new Set([
      "home",
      "status",
      "looplogs",
      "pinologs",
      "debug",
      "restart",
    ]),
    loadTeleportStateForCurrentProject: () => null,
    recentlyReturnedHome: () => false,
    reconcileTeleportOwnershipForCurrentProject: async () => null,
    launchTeleportRuntimeForCurrentProject: async (options: { onProgress?: (event: { stage: string }) => unknown }) => {
      await options.onProgress?.({ stage: "connecting_sandbox" });
      await options.onProgress?.({ stage: "packing_project" });
      await options.onProgress?.({ stage: "uploading_project" });
      await options.onProgress?.({ stage: "unpacking_project" });
      await options.onProgress?.({ stage: "waiting_ready" });
      return {
        sandboxId: "sbx_123",
        webhookUrl: "https://example.test/telegram/webhook/demo",
      };
    },
    activateTeleportOwnershipForCurrentProject: async (options: { onProgress?: (event: { stage: string }) => unknown }) => {
      await options.onProgress?.({ stage: "switching_telegram" });
      await options.onProgress?.({ stage: "verifying_cutover" });
      return {
        state: {
          sandboxId: "sbx_123",
          webhookUrl: "https://example.test/telegram/webhook/demo",
        },
      };
    },
    releaseTeleportOwnershipForCurrentProject: async (options: { onProgress?: (event: { stage: string }) => unknown }) => {
      await options.onProgress?.({ stage: "releasing_telegram" });
      await options.onProgress?.({ stage: "verifying_release" });
      return {
        state: null,
      };
    },
    pauseTeleportSandboxForCurrentProject: async (options: { onProgress?: (event: { stage: string }) => unknown }) => {
      await options.onProgress?.({ stage: "pausing_remote" });
      await options.onProgress?.({ stage: "done" });
      return {
        sandboxId: "sbx_123",
        webhookUrl: "https://example.test/telegram/webhook/demo",
      };
    },
    ...teleportOverrides,
  }));

  return import(`./commands.ts?teleport-test=${role}-${Date.now()}-${Math.random()}`);
}

afterEach(() => {
  mock.restore();
});

describe("teleport commands", () => {
  it("launches remote ownership from the local runtime with a single live status card", async () => {
    const { handleTeleport } = await loadCommandsModuleForRole("local", {});
    const { ctx, replies, edits, setMyCommandsCalls } = makeCtx("/teleport");

    await handleTeleport(ctx as never);

    expect(replies).toEqual([
      { text: "🌀 Teleporting to E2B\n• Preparing teleport" },
    ]);
    expect(edits.some((reply) => reply.text.includes("Connecting to your E2B sandbox"))).toBe(true);
    expect(edits.some((reply) => reply.text.includes("Packing local project files"))).toBe(true);
    expect(edits.some((reply) => reply.text.includes("Uploading project files to E2B"))).toBe(true);
    expect(edits.some((reply) => reply.text.includes("Unpacking project files in E2B"))).toBe(true);
    expect(edits.some((reply) => reply.text.includes("Switching Telegram to the remote turtle"))).toBe(true);
    expect(edits.at(-1)?.text).toBe(
      "✅ Teleported to E2B.\nTelegram is now routed to the remote turtle."
    );
    expect(edits.at(-1)?.text.includes("Webhook:")).toBe(false);
    expect(setMyCommandsCalls.at(-1)?.map((entry) => entry.command)).toContain("home");
  });

  it("returns an already-remote message when teleport is called from E2B", async () => {
    const { handleTeleport } = await loadCommandsModuleForRole("teleport-remote", {});
    const { ctx, replies } = makeCtx("/teleport");

    await handleTeleport(ctx as never);

    expect(replies).toEqual([
      { text: "ℹ️ Already running in E2B webhook mode. Use /home to return ownership to your PC." },
    ]);
  });

  it("releases webhook ownership from the remote runtime with a single live status card", async () => {
    const pauseCalls: string[] = [];
    const { handleHome } = await loadCommandsModuleForRole("teleport-remote", {
      pauseTeleportSandboxForCurrentProject: async (options: { onProgress?: (event: { stage: string }) => unknown }) => {
        pauseCalls.push("pause");
        await options.onProgress?.({ stage: "pausing_remote" });
        await options.onProgress?.({ stage: "done" });
        return {
          sandboxId: "sbx_123",
          webhookUrl: "https://example.test/telegram/webhook/demo",
        };
      },
    });
    const { ctx, replies, edits, setMyCommandsCalls } = makeCtx("/home");

    await handleHome(ctx as never);

    expect(replies).toEqual([
      { text: "🏠 Returning home\n• Releasing Telegram ownership" },
    ]);
    expect(edits.some((reply) => reply.text.includes("Pausing the remote sandbox"))).toBe(true);
    expect(edits.at(-1)?.text).toBe(
      "✅ Back on your PC.\nTelegram is now routed to the local turtle."
    );
    expect(setMyCommandsCalls.at(-1)?.map((entry) => entry.command)).toContain("teleport");
    expect(pauseCalls).toEqual(["pause"]);
  });

  it("reports that local runtime is already home", async () => {
    const { handleHome } = await loadCommandsModuleForRole("local", {});
    const { ctx, replies } = makeCtx("/home");

    await handleHome(ctx as never);

    expect(replies).toEqual([
      { text: "ℹ️ This turtle is already local. Use /teleport to move Telegram ownership to E2B." },
    ]);
  });

  it("silently ignores a duplicate local /home right after remote return", async () => {
    const { handleHome } = await loadCommandsModuleForRole("local", {
      recentlyReturnedHome: () => true,
      loadTeleportStateForCurrentProject: () => ({
        ownerMode: "local",
        updatedAt: new Date().toISOString(),
      }),
    });
    const { ctx, replies } = makeCtx("/home");

    await handleHome(ctx as never);

    expect(replies).toEqual([]);
  });
});
