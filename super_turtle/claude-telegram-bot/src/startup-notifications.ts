import type { DriverId } from "./drivers/types";

export const STARTUP_NOTIFICATION_OPENERS = [
  "Listening for messages.",
  "Polling is live.",
  "Runtime is healthy.",
  "Control link is up.",
  "Session restored.",
  "Ready for commands.",
  "Systems look good.",
  "Standing by.",
  "Bot loop is live.",
  "Telegram link is active.",
  "Driver loaded cleanly.",
  "All checks passed.",
  "Ready for the next task.",
  "Console is steady.",
  "The shell is warm.",
  "Work queue is clear.",
  "New boot, same turtle.",
  "Online and reachable.",
  "The line is open.",
  "Ready to continue.",
  "Fresh process, ready to work.",
  "Back in service.",
  "Monitoring started.",
  "Everything is up.",
  "Start sequence complete.",
  "Ready on this repo.",
  "Tools are loaded.",
  "Status is green.",
  "Awaiting input.",
  "Ready on the wire.",
] as const;

function getDriverLabel(driver: DriverId | string): string {
  return driver === "codex" ? "Codex" : "Claude";
}

export function pickStartupNotificationOpener(randomValue = Math.random()): string {
  const normalized = Number.isFinite(randomValue) ? randomValue : 0;
  const index = Math.max(
    0,
    Math.min(
      STARTUP_NOTIFICATION_OPENERS.length - 1,
      Math.floor(normalized * STARTUP_NOTIFICATION_OPENERS.length)
    )
  );
  return STARTUP_NOTIFICATION_OPENERS[index]!;
}

export function buildStartupNotificationMessage(options: {
  projectName: string;
  driver: DriverId | string;
  randomValue?: number;
}): string {
  const opener = pickStartupNotificationOpener(options.randomValue);
  return `🐢 Turtle process started in /${options.projectName}. Driver: ${getDriverLabel(options.driver)}. ${opener}`;
}
