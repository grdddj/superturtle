import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  parseCompletedBacklogItems,
  processSilentSubturtleSupervision,
  processPendingConductorWakeups,
} from "./conductor-supervisor";

const tempDirs: string[] = [];

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function makeStateDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "conductor-supervisor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseCompletedBacklogItems", () => {
  it("extracts checked backlog items and strips current markers", () => {
    const content = `
# Current task

Ship the feature

# Backlog
- [x] Implement API
- [x] Wire UI <- current
- [ ] Follow-up cleanup
`;

    expect(parseCompletedBacklogItems(content)).toEqual([
      "Implement API",
      "Wire UI",
    ]);
  });
});

describe("processPendingConductorWakeups", () => {
  it("reconciles completion wakeups directly from canonical state", async () => {
    const baseDir = makeStateDir();
    const stateDir = join(baseDir, ".superturtle", "state");
    const archiveWorkspace = join(baseDir, ".subturtles", ".archive", "worker-done");
    mkdirSync(join(stateDir, "workers"), { recursive: true });
    mkdirSync(join(stateDir, "wakeups"), { recursive: true });
    mkdirSync(archiveWorkspace, { recursive: true });

    writeFileSync(
      join(archiveWorkspace, "CLAUDE.md"),
      `# Current task

Ship the shipped thing

# Backlog
- [x] Implement API
- [x] Ship UI
- [ ] Follow-up cleanup
`,
      "utf-8"
    );

    writeJson(join(stateDir, "workers", "worker-done.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-done",
      run_id: "run-done",
      lifecycle_state: "archived",
      workspace: archiveWorkspace,
      cron_job_id: "cron-done",
      current_task: "Ship the shipped thing",
      metadata: {},
    });
    writeJson(join(stateDir, "wakeups", "wake-done.json"), {
      kind: "wakeup",
      schema_version: 1,
      id: "wake-done",
      worker_name: "worker-done",
      run_id: "run-done",
      category: "notable",
      delivery_state: "pending",
      summary: "worker done",
      created_at: "2026-03-08T00:00:00Z",
      updated_at: "2026-03-08T00:00:00Z",
      delivery: { attempts: 0 },
      payload: { kind: "completion_requested" },
      metadata: {},
    });

    const jobs = [{ id: "cron-done" }];
    const sentMessages: Array<{ chatId: number; text: string }> = [];

    const result = await processPendingConductorWakeups({
      stateDir,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (chatId, text) => {
        sentMessages.push({ chatId, text });
      },
      isWorkerRunning: () => false,
      nowIso: () => "2026-03-08T01:00:00Z",
    });

    expect(result.sent).toBe(1);
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.text).toContain("🎉 Finished: worker-done");
    expect(sentMessages[0]?.text).toContain("✓ Implement API");
    expect(sentMessages[0]?.text).toContain("✓ Ship UI");
    expect(jobs).toHaveLength(0);

    const updatedWakeup = JSON.parse(
      readFileSync(join(stateDir, "wakeups", "wake-done.json"), "utf-8")
    );
    expect(updatedWakeup.delivery_state).toBe("sent");

    const updatedWorker = JSON.parse(
      readFileSync(join(stateDir, "workers", "worker-done.json"), "utf-8")
    );
    expect(updatedWorker.lifecycle_state).toBe("archived");
    expect(updatedWorker.metadata.supervisor.resolved_terminal_state).toBe("completed");

    const inboxItem = JSON.parse(
      readFileSync(join(stateDir, "inbox", "inbox_wake-done.json"), "utf-8")
    );
    expect(inboxItem.delivery_state).toBe("pending");
    expect(inboxItem.chat_id).toBe(123);
    expect(inboxItem.title).toContain("worker-done completed");

    const events = readFileSync(join(stateDir, "events.jsonl"), "utf-8");
    expect(events).toContain('"event_type":"worker.cron_removed"');
    expect(events).toContain('"event_type":"worker.cleanup_verified"');
    expect(events).toContain('"event_type":"worker.completed"');
    expect(events).toContain('"event_type":"worker.inbox_enqueued"');
    expect(events).toContain('"event_type":"worker.notification_sent"');
  });

  it("reconciles fatal worker wakeups into a failed state", async () => {
    const baseDir = makeStateDir();
    const stateDir = join(baseDir, ".superturtle", "state");
    const workspace = join(baseDir, ".subturtles", "worker-failed");
    mkdirSync(join(stateDir, "workers"), { recursive: true });
    mkdirSync(join(stateDir, "wakeups"), { recursive: true });
    mkdirSync(workspace, { recursive: true });

    writeFileSync(
      join(workspace, "CLAUDE.md"),
      `# Current task

Recover from a bad crash <- current
`,
      "utf-8"
    );

    writeJson(join(stateDir, "workers", "worker-failed.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-failed",
      run_id: "run-failed",
      lifecycle_state: "failure_pending",
      workspace,
      cron_job_id: "cron-failed",
      current_task: "Recover from a bad crash",
      stop_reason: "fatal_error",
      metadata: {},
    });
    writeJson(join(stateDir, "wakeups", "wake-failed.json"), {
      kind: "wakeup",
      schema_version: 1,
      id: "wake-failed",
      worker_name: "worker-failed",
      run_id: "run-failed",
      category: "critical",
      delivery_state: "pending",
      summary: "worker failed",
      created_at: "2026-03-08T00:00:00Z",
      updated_at: "2026-03-08T00:00:00Z",
      delivery: { attempts: 0 },
      payload: { kind: "fatal_error", message: "boom" },
      metadata: {},
    });

    const jobs = [{ id: "cron-failed" }];
    const sentMessages: string[] = [];

    const result = await processPendingConductorWakeups({
      stateDir,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (_chatId, text) => {
        sentMessages.push(text);
      },
      isWorkerRunning: () => false,
      nowIso: () => "2026-03-08T02:00:00Z",
    });

    expect(result.sent).toBe(1);
    expect(sentMessages[0]).toContain("❌ SubTurtle worker-failed failed.");
    expect(sentMessages[0]).toContain("Error: boom");

    const updatedWorker = JSON.parse(
      readFileSync(join(stateDir, "workers", "worker-failed.json"), "utf-8")
    );
    expect(updatedWorker.lifecycle_state).toBe("failed");
    expect(updatedWorker.metadata.supervisor.resolved_terminal_state).toBe("failed");

    const updatedWakeup = JSON.parse(
      readFileSync(join(stateDir, "wakeups", "wake-failed.json"), "utf-8")
    );
    expect(updatedWakeup.delivery_state).toBe("sent");

    const inboxItem = JSON.parse(
      readFileSync(join(stateDir, "inbox", "inbox_wake-failed.json"), "utf-8")
    );
    expect(inboxItem.title).toContain("worker-failed failed");
    expect(inboxItem.text).toContain("Error: boom");

    const events = readFileSync(join(stateDir, "events.jsonl"), "utf-8");
    expect(events).toContain('"event_type":"worker.failed"');
    expect(events).toContain('"event_type":"worker.inbox_enqueued"');
    expect(events).toContain('"event_type":"worker.notification_sent"');
  });
});

describe("processSilentSubturtleSupervision", () => {
  it("emits deterministic milestone wakeups without removing recurring cron", async () => {
    const baseDir = makeStateDir();
    const stateDir = join(baseDir, ".superturtle", "state");
    const workspace = join(baseDir, ".subturtles", "worker-milestone");
    mkdirSync(join(stateDir, "workers"), { recursive: true });
    mkdirSync(join(stateDir, "wakeups"), { recursive: true });
    mkdirSync(workspace, { recursive: true });

    writeFileSync(
      join(workspace, "CLAUDE.md"),
      `# Current task

Ship milestone worker

# Backlog
- [x] Seed workspace
- [ ] Ship milestone
`,
      "utf-8"
    );

    writeJson(join(stateDir, "workers", "worker-milestone.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-milestone",
      run_id: "run-milestone",
      lifecycle_state: "running",
      workspace,
      cron_job_id: "cron-milestone",
      current_task: "Ship milestone worker",
      checkpoint: {
        iteration: 1,
        head_sha: "abc123",
        recorded_at: "2026-03-08T00:00:00Z",
      },
      metadata: {},
    });

    const jobs = [{ id: "cron-milestone" }];
    const sentMessages: string[] = [];

    const baseline = await processSilentSubturtleSupervision({
      stateDir,
      workerName: "worker-milestone",
      chatId: 123,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (_chatId, text) => {
        sentMessages.push(text);
      },
      isWorkerRunning: () => true,
      nowIso: () => "2026-03-08T01:00:00Z",
    });

    expect(baseline.createdWakeups).toBe(0);
    expect(sentMessages).toHaveLength(0);
    expect(jobs).toHaveLength(1);

    writeFileSync(
      join(workspace, "CLAUDE.md"),
      `# Current task

Ship milestone worker

# Backlog
- [x] Seed workspace
- [x] Ship milestone
`,
      "utf-8"
    );
    writeJson(join(stateDir, "workers", "worker-milestone.json"), {
      ...JSON.parse(readFileSync(join(stateDir, "workers", "worker-milestone.json"), "utf-8")),
      checkpoint: {
        iteration: 2,
        head_sha: "def456",
        recorded_at: "2026-03-08T02:00:00Z",
      },
    });

    const result = await processSilentSubturtleSupervision({
      stateDir,
      workerName: "worker-milestone",
      chatId: 123,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (_chatId, text) => {
        sentMessages.push(text);
      },
      isWorkerRunning: () => true,
      nowIso: () => "2026-03-08T02:05:00Z",
    });

    expect(result.createdWakeups).toBe(1);
    expect(result.sent).toBe(1);
    expect(sentMessages.at(-1)).toContain("🚀 SubTurtle worker-milestone reached a milestone.");
    expect(sentMessages.at(-1)).toContain("✓ Ship milestone");
    expect(jobs).toHaveLength(1);

    const updatedWorker = JSON.parse(
      readFileSync(join(stateDir, "workers", "worker-milestone.json"), "utf-8")
    );
    expect(updatedWorker.metadata.supervisor.last_notified_backlog_done).toBe(2);

    const inboxFiles = readdirSync(join(stateDir, "inbox"));
    expect(inboxFiles).toHaveLength(1);
    const inboxItem = JSON.parse(
      readFileSync(join(stateDir, "inbox", inboxFiles[0]!), "utf-8")
    );
    expect(inboxItem.category).toBe("milestone_reached");
    expect(inboxItem.title).toContain("worker-milestone milestone");
    expect(inboxItem.text).toContain("Milestone items: Ship milestone");

    const events = readFileSync(join(stateDir, "events.jsonl"), "utf-8");
    expect(events).toContain('"event_type":"worker.milestone_reached"');
    expect(events).toContain('"event_type":"worker.inbox_enqueued"');
    expect(events).toContain('"event_type":"worker.notification_sent"');
    expect(events).not.toContain('"event_type":"worker.cron_removed"');
    expect(events).not.toContain('"event_type":"worker.cleanup_verified"');
  });

  it("emits deterministic stuck wakeups after repeated no-progress checks", async () => {
    const baseDir = makeStateDir();
    const stateDir = join(baseDir, ".superturtle", "state");
    const workspace = join(baseDir, ".subturtles", "worker-stuck");
    mkdirSync(join(stateDir, "workers"), { recursive: true });
    mkdirSync(join(stateDir, "wakeups"), { recursive: true });
    mkdirSync(workspace, { recursive: true });

    writeFileSync(
      join(workspace, "CLAUDE.md"),
      `# Current task

Diagnose no-progress worker

# Backlog
- [ ] Figure out why nothing changes
`,
      "utf-8"
    );

    writeJson(join(stateDir, "workers", "worker-stuck.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-stuck",
      run_id: "run-stuck",
      lifecycle_state: "running",
      workspace,
      cron_job_id: "cron-stuck",
      current_task: "Diagnose no-progress worker",
      checkpoint: {
        iteration: 4,
        head_sha: "abc123",
        recorded_at: "2026-03-08T00:00:00Z",
      },
      metadata: {},
    });

    const jobs = [{ id: "cron-stuck" }];
    const sentMessages: string[] = [];
    const commonOptions = {
      stateDir,
      workerName: "worker-stuck",
      chatId: 123,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id: string) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (_chatId: number, text: string) => {
        sentMessages.push(text);
      },
      isWorkerRunning: () => true,
    };

    const first = await processSilentSubturtleSupervision({
      ...commonOptions,
      nowIso: () => "2026-03-08T01:00:00Z",
    });
    const second = await processSilentSubturtleSupervision({
      ...commonOptions,
      nowIso: () => "2026-03-08T02:00:00Z",
    });
    const third = await processSilentSubturtleSupervision({
      ...commonOptions,
      nowIso: () => "2026-03-08T03:00:00Z",
    });

    expect(first.createdWakeups).toBe(0);
    expect(second.createdWakeups).toBe(0);
    expect(third.createdWakeups).toBe(1);
    expect(third.sent).toBe(1);
    expect(sentMessages.at(-1)).toContain("⚠️ SubTurtle worker-stuck looks stuck.");
    expect(jobs).toHaveLength(1);

    const updatedWorker = JSON.parse(
      readFileSync(join(stateDir, "workers", "worker-stuck.json"), "utf-8")
    );
    expect(updatedWorker.metadata.supervisor.last_stuck_signature).toBeDefined();

    const inboxFiles = readdirSync(join(stateDir, "inbox"));
    expect(inboxFiles).toHaveLength(1);
    const inboxItem = JSON.parse(
      readFileSync(join(stateDir, "inbox", inboxFiles[0]!), "utf-8")
    );
    expect(inboxItem.category).toBe("worker_stuck");
    expect(inboxItem.title).toContain("worker-stuck stuck");
    expect(inboxItem.text).toContain("No meaningful progress across 2 silent checks.");

    const events = readFileSync(join(stateDir, "events.jsonl"), "utf-8");
    expect(events).toContain('"event_type":"worker.stuck_detected"');
    expect(events).toContain('"event_type":"worker.inbox_enqueued"');
    expect(events).toContain('"event_type":"worker.notification_sent"');
    expect(events).not.toContain('"event_type":"worker.cron_removed"');
    expect(events).not.toContain('"event_type":"worker.cleanup_verified"');
  });
});
