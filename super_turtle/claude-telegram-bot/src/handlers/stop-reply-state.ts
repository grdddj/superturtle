const stopReplyHandledChats = new Set<number>();
const recentStopReplyExpiryByChat = new Map<number, number>();
const STOP_REPLY_DEDUPE_WINDOW_MS = 2_000;

export function consumeHandledStopReply(chatId: number | undefined): boolean {
  if (chatId == null || !stopReplyHandledChats.has(chatId)) {
    return false;
  }
  stopReplyHandledChats.delete(chatId);
  return true;
}

export function markStopReplyHandled(chatId: number): void {
  stopReplyHandledChats.add(chatId);
}

export function hasRecentStopReply(chatId: number, now = Date.now()): boolean {
  const expiresAt = recentStopReplyExpiryByChat.get(chatId);
  if (typeof expiresAt !== "number") {
    return false;
  }
  if (expiresAt <= now) {
    recentStopReplyExpiryByChat.delete(chatId);
    return false;
  }
  return true;
}

export function markRecentStopReply(chatId: number, now = Date.now()): void {
  recentStopReplyExpiryByChat.set(chatId, now + STOP_REPLY_DEDUPE_WINDOW_MS);
}
