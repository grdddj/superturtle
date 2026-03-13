import { isStopIntent } from "./utils";

export interface SequentializationDecisionInput {
  text?: string | null;
  hasVoice?: boolean;
  hasCallbackQuery?: boolean;
  chatId?: number | string | null;
  isBusy?: boolean;
  isBareCommand?: (text: string) => boolean;
}

export function getSequentializationKey(
  input: SequentializationDecisionInput
): string | undefined {
  const text = typeof input.text === "string" ? input.text : null;
  const isBareCommand = input.isBareCommand || (() => false);

  if (text?.startsWith("/")) {
    return undefined;
  }
  if (text && isBareCommand(text)) {
    return undefined;
  }
  if (text?.startsWith("!")) {
    return undefined;
  }
  if (text && isStopIntent(text)) {
    return undefined;
  }
  if (input.hasVoice) {
    return undefined;
  }
  if (input.hasCallbackQuery) {
    return undefined;
  }
  if (text && input.isBusy) {
    return undefined;
  }
  if (input.chatId == null) {
    return undefined;
  }
  return String(input.chatId);
}
