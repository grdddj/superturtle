"use strict";

const fs = require("fs");
const os = require("os");
const { dirname, join, resolve } = require("path");
const crypto = require("crypto");

const POC_STATE_RELATIVE_PATH = join(".superturtle", "e2b-webhook-poc.json");
const PROJECT_CONFIG_RELATIVE_PATH = join(".superturtle", "project.json");
const PROJECT_ENV_RELATIVE_PATH = join(".superturtle", ".env");
const DEFAULT_PORT = 3000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_HEALTH_PATH = "/healthz";
const DEFAULT_REMOTE_HOME = "/home/user";
const DEFAULT_LOG_PATH = "/tmp/superturtle-e2b-bot.log";
const DEFAULT_PID_PATH = "/tmp/superturtle-e2b-bot.pid";
const DEFAULT_ARCHIVE_PATH = "/tmp/superturtle-e2b-project.tgz";

function normalizeExistingPath(path) {
  try {
    return fs.realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function findUpwards(startDir, relativePath) {
  let current = normalizeExistingPath(startDir);
  while (true) {
    const candidate = resolve(current, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function findGitRoot(startDir) {
  let current = normalizeExistingPath(startDir);
  while (true) {
    const gitPath = resolve(current, ".git");
    if (fs.existsSync(gitPath)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function getBoundProjectRoot(startDir) {
  const configPath = findUpwards(startDir, PROJECT_CONFIG_RELATIVE_PATH);
  if (configPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (parsed && typeof parsed.repo_root === "string" && parsed.repo_root.trim()) {
        return normalizeExistingPath(parsed.repo_root.trim());
      }
    } catch {}
    return dirname(dirname(configPath));
  }

  const envPath = findUpwards(startDir, PROJECT_ENV_RELATIVE_PATH);
  if (envPath) {
    return dirname(dirname(envPath));
  }

  const gitRoot = findGitRoot(startDir);
  if (gitRoot) {
    return gitRoot;
  }

  return normalizeExistingPath(startDir);
}

function getStateFilePath(projectRoot) {
  return resolve(projectRoot, POC_STATE_RELATIVE_PATH);
}

function loadPocState(projectRoot) {
  const statePath = getStateFilePath(projectRoot);
  if (!fs.existsSync(statePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(statePath, "utf-8"));
}

function savePocState(projectRoot, state) {
  const statePath = getStateFilePath(projectRoot);
  fs.mkdirSync(dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
  return statePath;
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadProjectEnv(projectRoot) {
  const envPath = resolve(projectRoot, PROJECT_ENV_RELATIVE_PATH);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing project env file at ${envPath}. Run 'superturtle init' first.`);
  }
  return parseDotEnv(fs.readFileSync(envPath, "utf-8"));
}

function randomToken(length = 24) {
  return crypto.randomBytes(length).toString("hex");
}

function normalizePath(pathname) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.replace(/\/{2,}/g, "/");
}

function buildPocConfig(projectRoot, options = {}, existingState = null) {
  const repoName = projectRoot.split("/").filter(Boolean).pop() || "project";
  const port = Number.parseInt(String(options.port || existingState?.port || DEFAULT_PORT), 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port ${String(options.port || existingState?.port || DEFAULT_PORT)}.`);
  }

  const timeoutMs = Number.parseInt(
    String(options.timeoutMs || existingState?.timeoutMs || DEFAULT_TIMEOUT_MS),
    10
  );
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid timeoutMs ${String(options.timeoutMs || existingState?.timeoutMs || DEFAULT_TIMEOUT_MS)}.`);
  }

  const healthPath = normalizePath(
    options.healthPath || existingState?.healthPath || DEFAULT_HEALTH_PATH
  );
  const remoteRoot = options.remoteRoot || existingState?.remoteRoot || `${DEFAULT_REMOTE_HOME}/${repoName}`;
  const remoteBotDir = `${remoteRoot}/super_turtle/claude-telegram-bot`;
  const webhookSecret = options.webhookSecret || existingState?.webhookSecret || randomToken(16);
  const webhookPath = normalizePath(
    options.webhookPath ||
      existingState?.webhookPath ||
      `/telegram/webhook/${randomToken(8)}`
  );
  const logPath = options.logPath || existingState?.logPath || DEFAULT_LOG_PATH;
  const pidPath = options.pidPath || existingState?.pidPath || DEFAULT_PID_PATH;
  const archivePath = options.archivePath || existingState?.archivePath || DEFAULT_ARCHIVE_PATH;

  return {
    port,
    timeoutMs,
    healthPath,
    remoteRoot,
    remoteBotDir,
    webhookSecret,
    webhookPath,
    logPath,
    pidPath,
    archivePath,
  };
}

function buildWebhookUrl(host, webhookPath) {
  return `https://${host}${normalizePath(webhookPath)}`;
}

function buildHealthUrl(host, healthPath) {
  return `https://${host}${normalizePath(healthPath)}`;
}

function buildRemoteEnv(projectEnv, remoteRoot, webhookUrl, webhookSecret, port, healthPath) {
  const env = {
    ...projectEnv,
    CLAUDE_WORKING_DIR: remoteRoot,
    TELEGRAM_TRANSPORT: "webhook",
    TELEGRAM_WEBHOOK_POC_MODE: "true",
    TELEGRAM_WEBHOOK_URL: webhookUrl,
    TELEGRAM_WEBHOOK_SECRET: webhookSecret,
    TELEGRAM_WEBHOOK_HEALTH_PATH: healthPath,
    PORT: String(port),
    TURTLE_GREETINGS: "false",
  };

  const requiredKeys = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USERS"];
  for (const key of requiredKeys) {
    if (!env[key] || !String(env[key]).trim()) {
      throw new Error(`Missing required env ${key} in project config.`);
    }
  }

  return env;
}

function buildStateRecord(projectRoot, sandboxId, host, config) {
  return {
    version: 1,
    repoRoot: projectRoot,
    sandboxId,
    host,
    port: config.port,
    timeoutMs: config.timeoutMs,
    remoteRoot: config.remoteRoot,
    remoteBotDir: config.remoteBotDir,
    webhookPath: config.webhookPath,
    webhookSecret: config.webhookSecret,
    webhookUrl: buildWebhookUrl(host, config.webhookPath),
    healthPath: config.healthPath,
    healthUrl: buildHealthUrl(host, config.healthPath),
    logPath: config.logPath,
    pidPath: config.pidPath,
    archivePath: config.archivePath,
    updatedAt: new Date().toISOString(),
  };
}

function formatStateSummary(state) {
  const lines = [
    `Sandbox: ${state.sandboxId}`,
    `Webhook URL: ${state.webhookUrl}`,
    `Health URL: ${state.healthUrl}`,
    `Remote root: ${state.remoteRoot}`,
    `Remote bot dir: ${state.remoteBotDir}`,
    `Remote log: ${state.logPath}`,
  ];
  if (state.updatedAt) {
    lines.push(`Updated: ${state.updatedAt}`);
  }
  return lines.join("\n");
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildRemoteBootstrapCommand(config) {
  const bunInstallSnippet =
    "if ! command -v bun >/dev/null 2>&1; then " +
    "curl -fsSL https://bun.sh/install | bash >/tmp/superturtle-e2b-bun-install.log 2>&1; " +
    "fi; " +
    "export PATH=\"$HOME/.bun/bin:$PATH\"";

  return [
    "set -euo pipefail",
    bunInstallSnippet,
    `rm -rf ${shellEscape(config.remoteRoot)}`,
    `mkdir -p ${shellEscape(config.remoteRoot)}`,
    `tar -xzf ${shellEscape(config.archivePath)} -C ${shellEscape(config.remoteRoot)}`,
    `mkdir -p ${shellEscape(`${config.remoteRoot}/.superturtle`)}`,
    `cd ${shellEscape(config.remoteBotDir)}`,
    "bun install --frozen-lockfile || bun install",
  ].join(" && ");
}

function buildRemoteStartCommand(config) {
  return [
    "set -euo pipefail",
    "export PATH=\"$HOME/.bun/bin:$PATH\"",
    `cd ${shellEscape(config.remoteBotDir)}`,
    `if [ -f ${shellEscape(config.pidPath)} ]; then kill "$(cat ${shellEscape(config.pidPath)})" >/dev/null 2>&1 || true; rm -f ${shellEscape(config.pidPath)}; fi`,
    `: > ${shellEscape(config.logPath)}`,
    `echo $$ > ${shellEscape(config.pidPath)}`,
    `exec bun run src/index.ts >> ${shellEscape(config.logPath)} 2>&1`,
  ].join(" && ");
}

module.exports = {
  DEFAULT_ARCHIVE_PATH,
  DEFAULT_HEALTH_PATH,
  DEFAULT_LOG_PATH,
  DEFAULT_PORT,
  DEFAULT_PID_PATH,
  DEFAULT_TIMEOUT_MS,
  buildHealthUrl,
  buildRemoteBootstrapCommand,
  buildPocConfig,
  buildRemoteEnv,
  buildRemoteStartCommand,
  buildStateRecord,
  buildWebhookUrl,
  formatStateSummary,
  getBoundProjectRoot,
  getStateFilePath,
  loadPocState,
  loadProjectEnv,
  parseDotEnv,
  savePocState,
};
