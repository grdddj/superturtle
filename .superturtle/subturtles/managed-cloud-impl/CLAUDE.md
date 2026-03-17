# Current task
Remove or isolate remaining assumptions in `../superturtle-web` that managed cloud depends on local-PC state, following the findings in `super_turtle/docs/reviews/review-managed-cloud-hosted-audit-2026-03-17.md`.

Progress note: managed onboarding now writes sandbox-local `.superturtle/managed-runtime.json`, so template/runtime metadata no longer depends solely on the local-style `.superturtle/project.json` contract.

# End goal with specs
- Implement the hosted managed cloud plane in `../superturtle-web` to match `super_turtle/docs/managed-cloud-plane-spec.md`.
- Keep managed mode cloud-only for this phase: no dependency on the user's local PC, no repo sync, and no local-auth-copy assumption.
- Keep the sandbox public surface limited to the Telegram webhook plus `/healthz` and `/readyz`; do not add public control endpoints.
- Keep the hosted control plane authoritative for sandbox lifecycle, webhook ownership, credentials, and status.
- Keep managed mode on the same published `superturtle` npm package/runtime artifact as BYO E2B and `/teleport`.
- Update tests and docs for any behavioral changes that are implemented.

# Roadmap (Completed)
- Managed-cloud product/runtime spec written in `../superturtle-web/super_turtle/docs/managed-cloud-plane-spec.md`.
- Hosted repo source-of-truth pointers updated to the new managed-cloud spec.
- Current repo and hosted repo state committed before worker handoff.

# Roadmap (Upcoming)
- Audit current hosted control-plane and onboarding code against the new spec and list the first concrete gaps.
- Implement the highest-leverage cloud-only and ownership/security fixes first.
- Update tests and any status/reporting surfaces touched by the implementation.
- Leave a clear summary of what was changed and what remains.

# Backlog
- [x] Audit `../superturtle-web/src/features/cloud/controllers/` and related hosted runtime code against the new managed-cloud spec
- [x] Implement the first managed-cloud code changes needed for hosted-authoritative lifecycle and ownership
- [ ] Remove or isolate assumptions that managed mode depends on local-PC state <- current
- [ ] Enforce or document the narrow sandbox public-surface model in hosted code and tests
- [ ] Update managed status/reporting surfaces to match the cloud-only hosted model
- [ ] Add or update tests for provisioning, takeover confirmation, and managed status semantics
