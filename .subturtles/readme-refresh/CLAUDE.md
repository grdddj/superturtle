# Current task
Refresh the root README dashboard section so it mentions conductor visibility and durable wakeups/inbox delivery.

# End goal with specs
README.md in repository root reflects current behavior: durable conductor state, wakeups/inbox delivery, dashboard observability, and current loop/driver support. Text must stay concise, technically correct, and aligned with shipped behavior.

# Roadmap (Completed)
- Reviewed current README structure and identified stale sections.
- Collected current conductor/dashboard baseline from repo instructions.

# Roadmap (Upcoming)
- Update architecture and SubTurtles sections to include conductor durability model.
- Update dashboard section with operational observability scope.
- Verify terminology consistency with current code and docs.
- Run a quick markdown sanity pass and summarize changes.

# Backlog
- [x] Audit README for stale references
- [x] Update SubTurtles section for conductor lifecycle state
- [ ] Update dashboard section to mention conductor visibility and wakeups/inbox <- current
- [ ] Update architecture bullets to match current runtime ownership
- [ ] Verify loop type and driver descriptions
- [ ] Produce concise change summary for meta agent
