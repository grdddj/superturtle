const assert = require("assert");

const { __test__ } = require("../bin/superturtle.js");

(() => {
  assert.strictEqual(
    __test__.getKeepAwakeCommand("darwin", (commandName) => commandName === "caffeinate"),
    "caffeinate -s"
  );
  assert.strictEqual(
    __test__.getKeepAwakeCommand("linux", (commandName) => commandName === "systemd-inhibit"),
    "systemd-inhibit --what=idle --who=superturtle --why='Bot running' --mode=block"
  );
  assert.strictEqual(__test__.getKeepAwakeCommand("darwin", () => false), "");

  const serviceCommand = __test__.buildServiceCommand({
    cwd: "/tmp/project",
    logPath: "/tmp/superturtle-loop.log",
    restartOnCrash: "1",
    keepAwakeCommand: "caffeinate -s",
  });

  assert.match(serviceCommand, /export CLAUDE_WORKING_DIR="\/tmp\/project"/);
  assert.match(serviceCommand, /export SUPERTURTLE_RESTART_ON_CRASH="1"/);
  assert.match(serviceCommand, /exec caffeinate -s \.\/run-loop\.sh 2>&1 \| tee -a "\/tmp\/superturtle-loop\.log"/);
})();
