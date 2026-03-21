const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { resolve } = require("path");
const { spawn, spawnSync } = require("child_process");
const { once } = require("events");

const REPO_ROOT = resolve(__dirname, "..", "..");
const COMMANDS_PATH = resolve(REPO_ROOT, "super_turtle", "subturtle", "lib", "commands.sh");
const SUBTURTLE_DIR = resolve(REPO_ROOT, "super_turtle", "subturtle");

function resolveRealPython() {
  const result = spawnSync("python3", ["-c", "import sys; print(sys.executable)"], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
  assert.strictEqual(result.status, 0, result.stderr || "failed to resolve python3");
  return result.stdout.trim();
}

function writeWrapper(wrapperPath) {
  fs.writeFileSync(
    wrapperPath,
    `#!/usr/bin/env node
const fs = require("fs");
const os = require("os");
const { spawnSync } = require("child_process");
const { resolve } = require("path");

const stdin = fs.readFileSync(0, "utf-8");
const args = process.argv.slice(2);
const realPython = process.env.SUPERTURTLE_REAL_PYTHON;

if (!realPython) {
  console.error("SUPERTURTLE_REAL_PYTHON is required");
  process.exit(1);
}

let script = stdin;
if (process.env.SUPERTURTLE_TEST_CRON_RACE_DIR && stdin.includes("failed to generate unique cron job id")) {
  script = stdin.replace(
    "existing_ids = {",
    [
      "import os as _race_os",
      "import time as _race_time",
      "from pathlib import Path as _RacePath",
      "",
      "def _race_barrier():",
      "    barrier_dir = _RacePath(_race_os.environ[\\"SUPERTURTLE_TEST_CRON_RACE_DIR\\"])",
      "    barrier_dir.mkdir(parents=True, exist_ok=True)",
      "    worker_name = _race_os.environ[\\"SUPERTURTLE_TEST_CRON_RACE_NAME\\"]",
      "    (barrier_dir / f\\"{worker_name}.ready\\").write_text(\\"ready\\", encoding=\\"utf-8\\")",
      "    deadline = _race_time.time() + 10",
      "    while _race_time.time() < deadline:",
      "        if len(list(barrier_dir.glob(\\"*.ready\\"))) >= 2:",
      "            return",
      "        _race_time.sleep(0.01)",
      "    raise RuntimeError(\\"timed out waiting for cron race barrier\\")",
      "",
      "_race_barrier()",
      "",
      "existing_ids = {",
    ].join("\\n")
  );
}

const tempScriptPath = resolve(os.tmpdir(), \`superturtle-python-wrapper-\${process.pid}-\${Date.now()}.py\`);
fs.writeFileSync(tempScriptPath, script, "utf-8");

const forwardedArgs = args[0] === "-" ? [tempScriptPath, ...args.slice(1)] : args;
const result = spawnSync(realPython, forwardedArgs, {
  cwd: process.cwd(),
  env: process.env,
  encoding: "utf-8",
});

fs.rmSync(tempScriptPath, { force: true });
if (typeof result.stdout === "string" && result.stdout.length > 0) {
  process.stdout.write(result.stdout);
}
if (typeof result.stderr === "string" && result.stderr.length > 0) {
  process.stderr.write(result.stderr);
}
if (result.error) {
  console.error(result.error.stack || result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
`,
    "utf-8"
  );
  fs.chmodSync(wrapperPath, 0o755);
}

async function runRegisterSpawnCronJob(name, env) {
  const script = `
set -euo pipefail
SCRIPT_DIR=${JSON.stringify(SUBTURTLE_DIR)}
CRON_JOBS_FILE=$1
PYTHON=python3
source ${JSON.stringify(COMMANDS_PATH)}
register_spawn_cron_job "$2" 60000
`;
  const child = spawn("bash", ["-lc", script, "bash", env.CRON_JOBS_FILE, name], {
    cwd: REPO_ROOT,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString("utf-8");
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf-8");
  });

  const [code, signal] = await once(child, "close");
  assert.strictEqual(signal, null, `unexpected signal from ${name}: ${signal || "none"}\n${stderr}`);
  assert.strictEqual(code, 0, `register_spawn_cron_job failed for ${name}:\n${stderr}`);
  assert.ok(stdout.trim().length > 0, `expected cron job id output for ${name}`);
}

async function main() {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-subturtle-cron-race-")));
  const fakeBinDir = resolve(tmpDir, "bin");
  const barrierDir = resolve(tmpDir, "barrier");
  const cronJobsPath = resolve(tmpDir, "cron-jobs.json");
  fs.mkdirSync(fakeBinDir, { recursive: true });
  fs.mkdirSync(barrierDir, { recursive: true });
  fs.writeFileSync(cronJobsPath, "[]\n", "utf-8");

  const wrapperPath = resolve(fakeBinDir, "python3");
  writeWrapper(wrapperPath);

  const realPython = resolveRealPython();
  const baseEnv = {
    ...process.env,
    PATH: `${fakeBinDir}:${process.env.PATH || ""}`,
    SUPERTURTLE_REAL_PYTHON: realPython,
    SUPERTURTLE_TEST_CRON_RACE_DIR: barrierDir,
    CRON_JOBS_FILE: cronJobsPath,
  };

  try {
    await Promise.all([
      runRegisterSpawnCronJob("worker-a", {
        ...baseEnv,
        SUPERTURTLE_TEST_CRON_RACE_NAME: "worker-a",
      }),
      runRegisterSpawnCronJob("worker-b", {
        ...baseEnv,
        SUPERTURTLE_TEST_CRON_RACE_NAME: "worker-b",
      }),
    ]);

    const jobs = JSON.parse(fs.readFileSync(cronJobsPath, "utf-8"));
    assert.ok(Array.isArray(jobs), "expected cron-jobs.json to remain a JSON array");
    assert.strictEqual(
      jobs.length,
      2,
      `expected the locked cron mutation helper to preserve both registrations, got ${jobs.length}`
    );
    const workerNames = jobs
      .map((job) => (job && typeof job.worker_name === "string" ? job.worker_name : null))
      .filter(Boolean)
      .sort();
    assert.deepStrictEqual(workerNames, ["worker-a", "worker-b"]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
