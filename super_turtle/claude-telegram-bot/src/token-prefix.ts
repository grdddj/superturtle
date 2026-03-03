// Leaf module: no internal imports.
// Purpose: avoid circular deps between config/logger while keeping a single source of truth.

const IS_TEST_ENV =
  (process.env.NODE_ENV || "").toLowerCase() === "test" ||
  typeof process.env.BUN_TEST !== "undefined";

const TELEGRAM_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN || (IS_TEST_ENV ? "test-token" : "");

export const TOKEN_PREFIX = TELEGRAM_TOKEN.split(":")[0] || "default";

