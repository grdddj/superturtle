# Current task
Check whether the rewritten file still matches how this repo expects root CLAUDE.md to be used.

# End goal with specs
Produce a code-review style assessment of the current uncommitted CLAUDE.md diff against HEAD on main. Focus on bugs, workflow regressions, broken assumptions, and missing details that would affect humans or turtles using this repo. Do not make code changes unless a follow-up task explicitly asks for fixes. Ground findings in the actual diff and repository conventions.

# Roadmap (Completed)
- Review request received from the Telegram meta agent.
- Review mode selected as yolo-codex.

# Roadmap (Upcoming)
- Inspect the current git diff for CLAUDE.md.
- Compare the new file contents against existing repo conventions and references.
- Report findings with severity and actionable reasoning.

# Backlog
- [x] Inspect the uncommitted CLAUDE.md diff against HEAD.
- [ ] Check whether the rewritten file still matches how this repo expects root CLAUDE.md to be used. <- current
- [ ] Validate referenced paths, commands, and migration guidance against the current repository.
- [ ] Identify missing critical context that the previous file provided and the new file removes.
- [ ] Summarize review findings in the worker state/output with clear severity ordering.
