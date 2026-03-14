# VM Teleport Reference

This document is the safe handoff for the current `feat/teleport` branch.

It intentionally does not store:

- hostnames
- SSH keys or key paths
- cloud session contents
- Claude/Codex tokens

Use it as a reference when rebuilding a sensible VM-backed managed teleport on `dev`.

Current `dev` direction:

- VM-backed teleport remains the preferred runtime direction
- transfer scope is now repo-bound, not machine-bound
- see `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md` for the active transfer contract

## What This Branch Already Proved

- Manual local -> remote Linux VM teleport works via `super_turtle/scripts/teleport-manual.sh`
- Semantic handoff export/import already exists in `super_turtle/state/teleport_handoff.py`
- The hosted control-plane path can resolve a managed teleport target and runtime lease state
- The branch also contains prototype file-based managed transport code that can be reused as reference, even if E2B is no longer the v1 direction

## Auth Model We Used

### Hosted control-plane auth

Local machine login is done with:

```bash
superturtle login
superturtle whoami
```

Important details:

- the CLI opens the hosted browser login flow
- the linked session is stored locally at `~/.config/superturtle/cloud-session.json` by default
- that session file must never be committed

Useful verification:

```bash
superturtle whoami
superturtle cloud status
```

### Claude auth

There were two workable paths:

1. Preferred operator path for a VM:
   - log into Claude on the VM directly with `claude setup-token`
   - store the resulting token in the project env file as `CLAUDE_CODE_OAUTH_TOKEN`

2. Existing remote-login path:
   - the VM is already logged into `claude`
   - teleport reuses that remote auth state

Relevant locations:

- local project env: `.superturtle/.env`
- runtime discovery logic: `super_turtle/bin/superturtle.js`
- operator runbook: `super_turtle/docs/MANUAL_TELEPORT_RUNBOOK.md`

Do not commit `.superturtle/.env`.

### Codex auth

Two practical paths worked:

1. Preferred operator path for a VM:
   - run `codex login --device-auth` on the VM over SSH

2. Fast headless path:
   - copy local `~/.codex/auth.json` to the VM

Do not commit `~/.codex/auth.json`.

## How To Discover The Current Managed VM Target

Do not hardcode the Azure VM hostname in git.

Instead, resolve it locally from the linked control-plane session:

```bash
cd /Users/Richard.Mladek/Documents/projects/agentic

node - <<'NODE'
const { readSession, fetchTeleportTarget } = require("./super_turtle/bin/cloud.js");

(async () => {
  const session = readSession(process.env);
  if (!session?.access_token) {
    throw new Error("Not logged in. Run `superturtle login` first.");
  }
  const result = await fetchTeleportTarget(session, process.env);
  console.log(JSON.stringify({
    ssh_target: result.data.ssh_target,
    remote_root: result.data.remote_root,
    instance: result.data.instance,
  }, null, 2));
})().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
NODE
```

That prints the live SSH target and remote repo root locally without storing them in the repo.

If the current Azure VM is still only represented in local SSH config, use your local `~/.ssh/config` alias or your local operator notes instead of putting the host in git.

## How To Connect To The VM

Once you have the live target locally:

```bash
ssh <user>@<host>
```

or, if you use a local SSH alias:

```bash
ssh <alias>
```

Then on the VM:

```bash
cd <remote_root>
bun super_turtle/bin/superturtle.js status
```

Useful operator actions:

```bash
cd <remote_root>
bun super_turtle/bin/superturtle.js start
bun super_turtle/bin/superturtle.js stop
bun super_turtle/bin/superturtle.js status
```

## How The Working VM Teleport Was Driven

Dry run:

```bash
./super_turtle/scripts/teleport-manual.sh <user>@<host> <remote_root> --identity ~/.ssh/<key_name> --dry-run
```

Live cutover:

```bash
./super_turtle/scripts/teleport-manual.sh <user>@<host> <remote_root> --identity ~/.ssh/<key_name>
```

What mattered:

- local bot had to be idle
- remote Linux host needed `git`, `rsync`, `tmux`, `python3`, `bun`, and the active driver CLI
- Claude/Codex auth had to exist on the destination or be seeded intentionally
- the effective transfer scope was the repo being teleported, not the whole machine

## How To Interpret This On `dev`

This reference branch predates the stricter repo-bound transfer contract now chosen for `dev`.

When reusing ideas from this branch:

- treat `<remote_root>` as the remote clone path for the bound Git repo
- do not infer sync scope from an arbitrary shell working directory
- do not sync anything outside the bound repo
- keep runtime continuity in the explicit handoff bundle, not in generic folder mirroring

The active contract for `dev` is documented in:

- `super_turtle/docs/REPO_BOUND_TELEPORT_SPEC.md`

Full operator details are in:

- `super_turtle/docs/MANUAL_TELEPORT_RUNBOOK.md`

## Safe Local-Only Notes

If you need to remember the exact live Azure hostname, SSH alias, remote root, or key path, store that in a local ignored file such as:

```text
.superturtle/local-vm-teleport-notes.md
```

That path stays outside git because `.superturtle/` is ignored.

Recommended contents for that local-only file:

- current SSH alias
- current `ssh_target`
- current `remote_root`
- which key or SSH config stanza to use
- last verified date
- whether Claude auth is token-based or already logged in remotely
- whether Codex auth is device-auth or copied cache

## Recommended Reuse On `dev`

When rebuilding VM teleport on `dev`, keep these pieces:

- `super_turtle/scripts/teleport-manual.sh` as the behavioral reference
- `super_turtle/state/teleport_handoff.py` as the continuity primitive
- hosted login/session flow in `super_turtle/bin/cloud.js`
- hosted runtime lease semantics already built into `superturtle start`
- the VM operator model of "one remote repo path per bot/project"

Treat these as reference only, not final architecture:

- E2B-specific transport helpers
- sandbox lifecycle assumptions
- any wake/resume logic that depends on sandbox-native traffic behavior
- any interpretation of teleport as machine-wide sync instead of repo-bound sync
