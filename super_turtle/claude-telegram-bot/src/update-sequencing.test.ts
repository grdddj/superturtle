import { describe, expect, it } from "bun:test";
import { getSequentializationKey } from "./update-sequencing";

describe("getSequentializationKey", () => {
  it("sequentializes idle text messages per chat", () => {
    expect(
      getSequentializationKey({
        text: "build this",
        chatId: 123,
        isBusy: false,
      })
    ).toBe("123");
  });

  it("bypasses sequentialization for busy text messages so they can visibly queue", () => {
    expect(
      getSequentializationKey({
        text: "second request",
        chatId: 123,
        isBusy: true,
      })
    ).toBeUndefined();
  });

  it("always bypasses stop intents and voice updates", () => {
    expect(
      getSequentializationKey({
        text: "stop",
        chatId: 123,
        isBusy: false,
      })
    ).toBeUndefined();

    expect(
      getSequentializationKey({
        chatId: 123,
        hasVoice: true,
        isBusy: true,
      })
    ).toBeUndefined();
  });
});
