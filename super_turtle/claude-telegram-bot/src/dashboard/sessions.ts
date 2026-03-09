import { WORKING_DIR } from "../config";
import {
  type DriverProcessState,
  getSessionObservabilityProvider,
  getSessionObservabilityProviders,
} from "../session-observability";
import type { RecentMessage, SavedSession } from "../types";
import type {
  DashboardOverviewResponse,
  SessionDetailResponse,
  SessionDriver,
  SessionListItem,
  SessionListResponse,
  SessionMessageView,
  SessionMetaView,
  SessionTurnView,
  SessionTurnsResponse,
} from "../dashboard-types";
import { buildDashboardOverviewResponse } from "./data";

type SessionSnapshot = {
  row: SessionListItem;
  messages: SessionMessageView[];
  meta: SessionMetaView;
};

const DASHBOARD_OVERVIEW_CACHE_TTL_MS = 1200;

const dashboardOverviewCache: {
  value: DashboardOverviewResponse | null;
  expiresAt: number;
  promise: Promise<DashboardOverviewResponse> | null;
} = {
  value: null,
  expiresAt: 0,
  promise: null,
};

const SESSION_STATUS_ORDER: Record<SessionListItem["status"], number> = {
  "active-running": 0,
  "active-idle": 1,
  saved: 2,
};

export function resetDashboardSessionCachesForTests(): void {
  dashboardOverviewCache.value = null;
  dashboardOverviewCache.expiresAt = 0;
  dashboardOverviewCache.promise = null;
}

function buildSessionKey(driver: SessionDriver, sessionId: string): string {
  return `${driver}:${sessionId}`;
}

export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || sessionId.length > 256) return false;
  if (sessionId.includes("/") || sessionId.includes("\\")) return false;
  return true;
}

function mapRecentMessages(recentMessages?: RecentMessage[], preview?: string): SessionMessageView[] {
  if (recentMessages && recentMessages.length > 0) {
    return recentMessages.map((msg) => ({
      role: msg.role,
      text: msg.text,
      timestamp: msg.timestamp,
      charCount: msg.text.length,
    }));
  }

  if (!preview) return [];
  const lines = preview
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 2);

  const synthetic: SessionMessageView[] = [];
  for (const line of lines) {
    if (line.startsWith("You: ")) {
      const text = line.slice(5).trim();
      synthetic.push({
        role: "user",
        text,
        timestamp: "",
        charCount: text.length,
      });
    } else if (line.startsWith("Assistant: ")) {
      const text = line.slice(11).trim();
      synthetic.push({
        role: "assistant",
        text,
        timestamp: "",
        charCount: text.length,
      });
    }
  }
  return synthetic;
}

function buildMessagePreview(messages: SessionMessageView[], fallback?: string | null): string | null {
  if (messages.length === 0) return fallback || null;
  const first = messages[0]!;
  const second = messages[1];
  const left = `${first.role === "user" ? "You" : "Assistant"}: ${first.text}`;
  const right = second
    ? `\n${second.role === "user" ? "You" : "Assistant"}: ${second.text}`
    : "";
  const combined = `${left}${right}`;
  return combined.length > 280 ? `${combined.slice(0, 277)}...` : combined;
}

function upsertSavedSession(
  snapshots: Map<string, SessionSnapshot>,
  driver: SessionDriver,
  saved: SavedSession
): void {
  if (!validateSessionId(saved.session_id)) return;

  const messages = mapRecentMessages(saved.recentMessages, saved.preview);
  const key = buildSessionKey(driver, saved.session_id);
  const provider = getSessionObservabilityProvider(driver);
  snapshots.set(key, {
    row: {
      id: key,
      driver,
      sessionId: saved.session_id,
      title: saved.title || `${driver} session`,
      savedAt: saved.saved_at || null,
      lastActivity: null,
      status: "saved",
      messageCount: messages.length,
      workingDir: saved.working_dir || null,
      preview: buildMessagePreview(messages, saved.preview || null),
    },
    messages,
    meta: provider.getDefaultMeta(),
  });
}

function sortSessionRows(rows: SessionListItem[]): SessionListItem[] {
  return [...rows].sort((a, b) => {
    const rankDiff = SESSION_STATUS_ORDER[a.status] - SESSION_STATUS_ORDER[b.status];
    if (rankDiff !== 0) return rankDiff;
    const left = Date.parse(a.lastActivity || a.savedAt || "") || 0;
    const right = Date.parse(b.lastActivity || b.savedAt || "") || 0;
    if (left !== right) return right - left;
    return a.title.localeCompare(b.title);
  });
}

function getDriverProcessStates(): DriverProcessState[] {
  return getSessionObservabilityProviders().map((provider) => provider.getDriverProcessState());
}

async function buildSessionSnapshotsForProviders(
  providers: ReturnType<typeof getSessionObservabilityProviders>
): Promise<Map<string, SessionSnapshot>> {
  const snapshots = new Map<string, SessionSnapshot>();
  const driverStates = new Map(
    providers.map((provider) =>
      [provider.driver, provider.getDriverProcessState()] satisfies [SessionDriver, DriverProcessState]
    )
  );

  for (const provider of providers) {
    for (const saved of await provider.listTrackedSessions()) {
      upsertSavedSession(snapshots, provider.driver, saved);
    }

    const activeSession = provider.getActiveSessionSnapshot();
    if (!activeSession || !validateSessionId(activeSession.session_id)) {
      continue;
    }

    const key = buildSessionKey(provider.driver, activeSession.session_id);
    const existing = snapshots.get(key);
    const messages = mapRecentMessages(
      activeSession.recentMessages,
      activeSession.preview || existing?.row.preview || undefined
    );
    const isRunning = driverStates.get(provider.driver)?.runningState.isRunning || false;

    snapshots.set(key, {
      row: {
        id: key,
        driver: provider.driver,
        sessionId: activeSession.session_id,
        title: activeSession.title || existing?.row.title || `Active ${provider.driver} session`,
        savedAt: activeSession.saved_at || existing?.row.savedAt || null,
        lastActivity: activeSession.saved_at || existing?.row.lastActivity || null,
        status: isRunning ? "active-running" : "active-idle",
        messageCount: messages.length,
        workingDir: activeSession.working_dir || WORKING_DIR,
        preview: buildMessagePreview(messages, activeSession.preview || existing?.row.preview || null),
      },
      messages,
      meta: provider.getActiveMeta(isRunning),
    });
  }

  return snapshots;
}

async function buildSessionSnapshots(): Promise<Map<string, SessionSnapshot>> {
  return buildSessionSnapshotsForProviders(getSessionObservabilityProviders());
}

export async function buildSessionListResponse(): Promise<SessionListResponse> {
  const snapshots = await buildSessionSnapshots();
  const sessions = sortSessionRows(Array.from(snapshots.values()).map((snapshot) => snapshot.row));
  return {
    generatedAt: new Date().toISOString(),
    sessions,
  };
}

export async function buildSessionDetail(
  driver: SessionDriver,
  sessionId: string
): Promise<SessionDetailResponse | null> {
  if (!validateSessionId(sessionId)) return null;
  const provider = getSessionObservabilityProvider(driver);
  const key = buildSessionKey(driver, sessionId);
  const snapshot = (await buildSessionSnapshotsForProviders([provider])).get(key);
  if (!snapshot) return null;
  const savedSession: SavedSession = {
    session_id: snapshot.row.sessionId,
    saved_at: snapshot.row.savedAt || "",
    working_dir: snapshot.row.workingDir || WORKING_DIR,
    title: snapshot.row.title,
    ...(snapshot.row.preview ? { preview: snapshot.row.preview } : {}),
    ...(snapshot.messages.length > 0
      ? {
          recentMessages: snapshot.messages.map((message) => ({
            role: message.role,
            text: message.text,
            timestamp: message.timestamp,
          })),
        }
      : {}),
  };
  const activeSession = provider.getActiveSessionSnapshot();
  const history = await provider.loadDisplayHistory(
    sessionId,
    savedSession,
    activeSession && activeSession.session_id === sessionId ? activeSession : null
  );
  const messages =
    history && history.messages.length > 0
      ? history.messages.map((message) => ({
          role: message.role,
          text: message.text,
          timestamp: message.timestamp,
          charCount: message.text.length,
        }))
      : snapshot.messages;

  return {
    generatedAt: new Date().toISOString(),
    session: snapshot.row,
    messages,
    meta: snapshot.meta,
    history,
  };
}

export async function buildSessionTurns(
  driver: SessionDriver,
  sessionId: string,
  limit = 200
): Promise<SessionTurnsResponse | null> {
  const detail = await buildSessionDetail(driver, sessionId);
  if (!detail) return null;
  const provider = getSessionObservabilityProvider(driver);

  const turns: SessionTurnView[] = provider.listTurns(sessionId, limit).map((entry) => ({
    id: entry.id,
    driver: entry.driver,
    source: entry.source,
    sessionId: entry.sessionId,
    userId: entry.userId,
    username: entry.username,
    chatId: entry.chatId,
    model: entry.model,
    effort: entry.effort,
    originalMessage: entry.originalMessage,
    effectivePrompt: entry.effectivePrompt,
    injectedArtifacts: entry.injectedArtifacts || [],
    response: entry.response,
    error: entry.error,
    status: entry.status,
    startedAt: entry.startedAt,
    completedAt: entry.completedAt,
    elapsedMs: entry.elapsedMs,
    usage: entry.usage as Record<string, unknown> | null,
    injections: entry.injections,
    context: entry.context,
  }));

  return {
    generatedAt: new Date().toISOString(),
    session: detail.session,
    turns,
  };
}

export async function getDashboardOverviewResponse(): Promise<DashboardOverviewResponse> {
  const now = Date.now();
  if (dashboardOverviewCache.value && dashboardOverviewCache.expiresAt > now) {
    return dashboardOverviewCache.value;
  }
  if (dashboardOverviewCache.promise) {
    return dashboardOverviewCache.promise;
  }

  const promise = buildDashboardOverviewResponse(buildSessionListResponse)
    .then((value) => {
      dashboardOverviewCache.value = value;
      dashboardOverviewCache.expiresAt = Date.now() + DASHBOARD_OVERVIEW_CACHE_TTL_MS;
      return value;
    })
    .finally(() => {
      dashboardOverviewCache.promise = null;
    });

  dashboardOverviewCache.promise = promise;
  return promise;
}
