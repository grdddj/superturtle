# Current task
Write `done.flag` with `ok`.

# End goal with specs
- Produce a harmless smoke-test artifact set under `/tmp/st-codex-test-a/`.
- Required files:
- `/tmp/st-codex-test-a/alpha-summary.txt` with:
- a header line `SubTurtle alpha smoke test`
- the current local timestamp
- the first 10 entries from `ls -1 /tmp` or fewer if less exist
- a closing line that says the task completed
- `/tmp/st-codex-test-a/commands.log` listing the commands you ran, one per line
- `/tmp/st-codex-test-a/done.flag` containing exactly `ok`
- Do not modify files outside `/tmp/st-codex-test-a/`.
- Stop after verifying the three files exist and contain sensible content.

# Roadmap (Completed)
- Task was decomposed and assigned a dedicated `/tmp` output directory.

# Roadmap (Upcoming)
- Create the directory and write the summary, command log, and done flag.

# Backlog
- [x] Confirm the exact output directory and filenames.
- [x] Create `/tmp/st-codex-test-a/` and seed `commands.log`.
- [x] Capture the first 10 `/tmp` entries for the summary file.
- [x] Write `alpha-summary.txt` with the required header, timestamp, and completion line.
- [ ] Write `done.flag` with `ok`. <- current
- [ ] Verify all three files exist and stop.
