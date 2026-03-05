## Current Task
Check idempotency across repeated retries and stale sessions.

## End Goal with Specs
Create `.subturtles/review-text-retry/review-notes.md` with ranked findings about retry safety, ask-user prompt preservation, cleanup side effects, and interaction with streaming state.

## Backlog
- [x] Inspect `handleText()` error/retry flow and compare old vs new cleanup behavior
- [x] Verify whether `cleanupToolMessages()` deletes messages that should persist (e.g. ask-user prompt)
- [ ] Check idempotency across repeated retries and stale sessions <- current
- [ ] Write findings with file/line references in `review-notes.md`
- [ ] Commit review notes

## Notes
Review-only task focused on correctness and UX regressions.
