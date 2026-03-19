import { describe, expect, it } from "bun:test";
import {
  STARTUP_NOTIFICATION_OPENERS,
  buildStartupNotificationMessage,
  pickStartupNotificationOpener,
} from "./startup-notifications";

describe("startup notifications", () => {
  it("keeps a pool of 30 startup openers", () => {
    expect(STARTUP_NOTIFICATION_OPENERS).toHaveLength(30);
  });

  it("formats a concise startup message for Codex", () => {
    expect(
      buildStartupNotificationMessage({
        projectName: "agentic",
        driver: "codex",
        randomValue: 0,
      })
    ).toBe("🐢 Turtle process started in /agentic. Driver: Codex. Listening for messages.");
  });

  it("formats a concise startup message for Claude", () => {
    expect(
      buildStartupNotificationMessage({
        projectName: "agentic",
        driver: "claude",
        randomValue: 0.9999,
      })
    ).toBe("🐢 Turtle process started in /agentic. Driver: Claude. Ready on the wire.");
  });

  it("clamps opener selection when the random value is out of range", () => {
    expect(pickStartupNotificationOpener(-1)).toBe("Listening for messages.");
    expect(pickStartupNotificationOpener(2)).toBe("Ready on the wire.");
  });
});
