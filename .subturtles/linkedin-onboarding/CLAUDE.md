## Current Task
All onboarding backlog items are complete.

## End Goal with Specs
- After OAuth, if current user has no `username`, show a one-page onboarding screen.
- Fields: username (real-time availability), displayName, title, location.
- Save all fields in a single mutation.
- On success, onboarding disappears.

## Backlog
- [x] Add mutation in `linkedin-demo/src/convex/users.ts` to set username/displayName/title/location for current user (validate username available).
- [x] Add query `isUsernameAvailable` usage on frontend for live validation.
- [x] Create onboarding component + hook into `linkedin-demo/src/App.js` to show only once.
- [x] Commit: `add first-login onboarding`

## Notes
- Use existing `api.users.isUsernameAvailable` and `ensureUsername` if present.
- Block submission if username taken or invalid.
- `completeOnboarding` mutation is implemented in `linkedin-demo/src/convex/onboarding.ts` to keep this change isolated from unrelated `users.ts` in-flight edits.

## Loop Control
STOP
