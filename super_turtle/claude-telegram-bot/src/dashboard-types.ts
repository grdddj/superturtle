/**
 * Shared types for the Super Turtle Dashboard API.
 */

import type { ListedSubTurtle } from "./handlers/commands";

// ── Existing dashboard views ─────────────────────────────────────────

export type TurtleView = ListedSubTurtle & {
  elapsed: string;
};

export type ProcessView = {
  id: string;
  kind: "driver" | "subturtle" | "background";
  label: string;
  status: "running" | "idle" | "queued";
  pid: string;
  elapsed: string;
  detail: string;
};

export type DeferredChatView = {
  chatId: number;
  size: number;
  oldestAgeSec: number;
  newestAgeSec: number;
  preview: string[];
};

export type SubturtleLaneView = {
  name: string;
  status: string;
  type: string;
  elapsed: string;
  task: string;
  backlogDone: number;
  backlogTotal: number;
  backlogCurrent: string;
  progressPct: number;
};

export type CronJobView = {
  id: string;
  type: "one-shot" | "recurring";
  promptPreview: string;
  fireInMs: number;
  chatId: number;
};

export type DashboardState = {
  generatedAt: string;
  turtles: TurtleView[];
  processes: ProcessView[];
  lanes: SubturtleLaneView[];
  deferredQueue: {
    totalChats: number;
    totalMessages: number;
    chats: DeferredChatView[];
  };
  background: {
    runActive: boolean;
    runPreempted: boolean;
    supervisionQueue: number;
  };
  cronJobs: CronJobView[];
};

// ── New API response types (Phase 1) ────────────────────────────────

export type SubturtleListResponse = {
  generatedAt: string;
  lanes: SubturtleLaneView[];
};

export type SubturtleDetailResponse = {
  generatedAt: string;
  name: string;
  lane: SubturtleLaneView;
  turtle: TurtleView;
};

export type CronListResponse = {
  generatedAt: string;
  jobs: CronJobView[];
};

export type SessionResponse = {
  generatedAt: string;
  claude: {
    isRunning: boolean;
    currentTool: string;
    lastTool: string;
    elapsed: string;
  };
  codex: {
    isRunning: boolean;
    isActive: boolean;
    elapsed: string;
  };
};

export type ContextResponse = {
  generatedAt: string;
  claudeMdPath: string;
  claudeMdExists: boolean;
  metaPromptPath: string;
  metaPromptExists: boolean;
};

export type LogsResponse = {
  generatedAt: string;
  lines: string[];
  totalScanned: number;
  levelFilter: string | null;
};

export type UsageResponse = {
  generatedAt: string;
  driverModel: string;
  effortLevel: string;
};

export type ProcessListResponse = {
  generatedAt: string;
  processes: ProcessView[];
};

export type QueueResponse = {
  generatedAt: string;
  totalChats: number;
  totalMessages: number;
  chats: DeferredChatView[];
};

export type GitResponse = {
  generatedAt: string;
  branch: string;
  commitHash: string;
  commitMessage: string;
  dirty: boolean;
};

export type RunsResponse = {
  generatedAt: string;
  background: {
    runActive: boolean;
    runPreempted: boolean;
    supervisionQueue: number;
  };
};
