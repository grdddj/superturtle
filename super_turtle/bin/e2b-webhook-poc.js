#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const { basename, resolve } = require("path");
const { spawnSync } = require("child_process");
const {
  buildHealthUrl,
  buildPocConfig,
  buildRemoteBootstrapCommand,
  buildRemoteEnv,
  buildRemoteStartCommand,
  buildStateRecord,
  buildWebhookUrl,
  formatStateSummary,
  getBoundProjectRoot,
  loadPocState,
  loadProjectEnv,
  savePocState,
} = require("./e2b-webhook-poc-lib.js");

async function importSandbox() {
  try {
    return await import("@e2b/code-interpreter");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load the E2B SDK (${message}). Run 'cd super_turtle && bun install' first.`
    );
  }
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "help";
  const options = {};

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = "true";
    }
  }

  return { command, options };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value.trim();
}

function projectRootFromOptions(options) {
  return getBoundProjectRoot(options.cwd || process.cwd());
}

function createArchiveBuffer(projectRoot) {
  const tarArgs = [
    "-czf",
    "-",
    "--exclude=.git",
    "--exclude=.env",
    "--exclude=node_modules",
    "--exclude=.venv",
    "--exclude=.subturtles",
    "--exclude=.superturtle",
    "--exclude=*.log",
    ".",
  ];

  const proc = spawnSync("tar", tarArgs, {
    cwd: projectRoot,
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
    env: {
      ...process.env,
      COPYFILE_DISABLE: "1",
    },
  });

  if (proc.error) {
    throw new Error(`Failed to create project archive: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    const stderr = proc.stderr ? proc.stderr.toString("utf-8") : "";
    throw new Error(`Failed to create project archive: ${stderr.trim() || "tar exited non-zero."}`);
  }

  return proc.stdout;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }
  return payload;
}

async function setTelegramWebhook(botToken, webhookUrl, webhookSecret, options = {}) {
  const endpoint = `https://api.telegram.org/bot${botToken}/setWebhook`;
  return fetchJson(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      drop_pending_updates: Boolean(options.dropPendingUpdates),
    }),
  });
}

async function deleteTelegramWebhook(botToken, options = {}) {
  const endpoint = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
  return fetchJson(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      drop_pending_updates: Boolean(options.dropPendingUpdates),
    }),
  });
}

async function getTelegramWebhookInfo(botToken) {
  const endpoint = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
  return fetchJson(endpoint, { method: "GET" });
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return true;
      }
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    `Timed out waiting for sandbox health at ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function lookupSandboxInfo(Sandbox, sandboxId) {
  const paginator = await Sandbox.list();
  while (paginator.hasNext) {
    const items = await paginator.nextItems();
    const match = items.find((item) => item.sandboxId === sandboxId);
    if (match) {
      return match;
    }
  }
  return null;
}

function printHelp() {
  console.log(`Usage: node super_turtle/bin/e2b-webhook-poc.js <command> [options]

Commands:
  launch            Create or reuse one sandbox, sync repo, and start the bot
  status            Show local POC state, sandbox state, health, and Telegram webhook info
  pause             Pause the sandbox
  resume            Resume the sandbox with Sandbox.connect()
  set-webhook       Register Telegram webhook to the saved sandbox URL
  delete-webhook    Delete Telegram webhook
  logs              Print the last N lines from the remote bot log

Common options:
  --sandbox-id <id>           Reuse an existing sandbox
  --port <port>               Remote bot port (default: 3000)
  --timeout-ms <ms>           Sandbox timeout before auto-pause
  --remote-root <path>        Remote project root (default: /home/user/<repo>)
  --webhook-path <path>       Telegram webhook path inside the sandbox
  --webhook-secret <secret>   Telegram webhook secret token
  --drop-pending-updates      Apply Telegram drop_pending_updates when changing webhook
  --lines <n>                 Number of log lines for logs (default: 50)
`);
}

async function launch(options) {
  const projectRoot = projectRootFromOptions(options);
  const projectEnv = loadProjectEnv(projectRoot);
  const existingState = loadPocState(projectRoot);
  const config = buildPocConfig(projectRoot, {
    port: options.port,
    timeoutMs: options["timeout-ms"],
    remoteRoot: options["remote-root"],
    webhookPath: options["webhook-path"],
    webhookSecret: options["webhook-secret"],
    healthPath: options["health-path"],
  }, existingState);
  const archiveBuffer = createArchiveBuffer(projectRoot);
  const { Sandbox } = await importSandbox();

  const sandboxId = options["sandbox-id"] || existingState?.sandboxId || null;
  const sandbox = sandboxId
    ? await Sandbox.connect(sandboxId, { timeoutMs: config.timeoutMs })
    : await Sandbox.create({
        timeoutMs: config.timeoutMs,
        lifecycle: {
          onTimeout: "pause",
          autoResume: true,
        },
      });

  const host = sandbox.getHost(config.port);
  const webhookUrl = buildWebhookUrl(host, config.webhookPath);
  const healthUrl = buildHealthUrl(host, config.healthPath);
  const remoteEnv = buildRemoteEnv(
    projectEnv,
    config.remoteRoot,
    webhookUrl,
    config.webhookSecret,
    config.port,
    config.healthPath
  );

  await sandbox.files.write(config.archivePath, archiveBuffer);
  await sandbox.commands.run(buildRemoteBootstrapCommand(config), {
    envs: remoteEnv,
    timeoutMs: 10 * 60 * 1000,
  });
  await sandbox.commands.run(buildRemoteStartCommand(config), {
    envs: remoteEnv,
    background: true,
    timeoutMs: 10 * 60 * 1000,
  });
  await waitForHealth(healthUrl, 90 * 1000);

  const state = buildStateRecord(projectRoot, sandbox.sandboxId, host, config);
  savePocState(projectRoot, state);

  console.log(formatStateSummary(state));
  console.log(`Health check passed: ${healthUrl}`);
}

async function status(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error(`No local E2B webhook POC state found at ${resolve(projectRoot, ".superturtle", "e2b-webhook-poc.json")}.`);
  }

  const projectEnv = loadProjectEnv(projectRoot);
  const { Sandbox } = await importSandbox();
  const info = await lookupSandboxInfo(Sandbox, state.sandboxId);

  console.log(formatStateSummary(state));
  console.log(`Sandbox state: ${info?.state || "unknown"}`);

  if (info?.state === "paused") {
    console.log("Health: skipped while paused");
  } else {
    try {
      await waitForHealth(state.healthUrl, 5 * 1000);
      console.log("Health: ok");
    } catch (error) {
      console.log(`Health: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const webhookInfo = await getTelegramWebhookInfo(projectEnv.TELEGRAM_BOT_TOKEN);
  if (webhookInfo?.result) {
    console.log(`Telegram webhook URL: ${webhookInfo.result.url || "<unset>"}`);
    console.log(`Telegram pending updates: ${String(webhookInfo.result.pending_update_count || 0)}`);
    if (webhookInfo.result.last_error_message) {
      console.log(`Telegram last error: ${webhookInfo.result.last_error_message}`);
    }
  }
}

async function pauseSandbox(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error("No local E2B webhook POC state file found.");
  }

  const { Sandbox } = await importSandbox();
  const info = await lookupSandboxInfo(Sandbox, state.sandboxId);
  if (info?.state === "paused") {
    console.log(`Sandbox already paused: ${state.sandboxId}`);
    return;
  }

  const sandbox = await Sandbox.connect(state.sandboxId, { timeoutMs: state.timeoutMs || 60_000 });
  await sandbox.pause();
  console.log(`Paused sandbox: ${state.sandboxId}`);
}

async function resumeSandbox(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error("No local E2B webhook POC state file found.");
  }

  const { Sandbox } = await importSandbox();
  await Sandbox.connect(state.sandboxId, { timeoutMs: state.timeoutMs || 60_000 });
  await waitForHealth(state.healthUrl, 90 * 1000);
  console.log(`Resumed sandbox: ${state.sandboxId}`);
}

async function setWebhook(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error("No local E2B webhook POC state file found.");
  }
  const projectEnv = loadProjectEnv(projectRoot);
  await setTelegramWebhook(projectEnv.TELEGRAM_BOT_TOKEN, state.webhookUrl, state.webhookSecret, {
    dropPendingUpdates: options["drop-pending-updates"] === "true",
  });
  console.log(`Set Telegram webhook: ${state.webhookUrl}`);
}

async function deleteWebhook(options) {
  const projectRoot = projectRootFromOptions(options);
  const projectEnv = loadProjectEnv(projectRoot);
  await deleteTelegramWebhook(projectEnv.TELEGRAM_BOT_TOKEN, {
    dropPendingUpdates: options["drop-pending-updates"] === "true",
  });
  console.log("Deleted Telegram webhook");
}

async function logs(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error("No local E2B webhook POC state file found.");
  }
  const lines = Number.parseInt(String(options.lines || 50), 10);
  if (!Number.isInteger(lines) || lines <= 0) {
    throw new Error(`Invalid --lines value: ${String(options.lines || 50)}`);
  }

  const { Sandbox } = await importSandbox();
  const sandbox = await Sandbox.connect(state.sandboxId, { timeoutMs: state.timeoutMs || 60_000 });
  const result = await sandbox.commands.run(`tail -n ${lines} ${JSON.stringify(state.logPath)}`, {
    timeoutMs: 30_000,
  });
  process.stdout.write(result.stdout || "");
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv);

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  requireEnv("E2B_API_KEY");

  switch (command) {
    case "launch":
      await launch(options);
      return;
    case "status":
      await status(options);
      return;
    case "pause":
      await pauseSandbox(options);
      return;
    case "resume":
      await resumeSandbox(options);
      return;
    case "set-webhook":
      await setWebhook(options);
      return;
    case "delete-webhook":
      await deleteWebhook(options);
      return;
    case "logs":
      await logs(options);
      return;
    default:
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
