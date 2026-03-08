# Dashboard Visual Review

Ordered by severity.

## High

### 1. Session detail can silently drop assistant debug data
- File path: `super_turtle/claude-telegram-bot/src/dashboard.ts`
- Approximate lines: `1655-1880`, `2453-2467`
- Issue: the `/dashboard/sessions/:driver/:sessionId` page is currently rendering the conversation without the assistant-side `Debug details` block in the existing turn-log-backed test case.
- Why it matters: this is an observability regression on a page whose main value is prompt/usage/error inspection. The current branch already fails the existing `renders conversation-first layout with injected context message` test because that block disappears.
- Concrete fix: trace why `buildSessionTurns()` can return an empty turn list for that route, then either make the route render from the resolved turn data consistently or fall back to `detail.history` only when the debug payload is preserved. Keep the existing dashboard test green as the regression check.

## Medium

### 2. Session labels are now double-truncated, which makes sessions harder to distinguish
- File path: `super_turtle/claude-telegram-bot/src/dashboard.ts`
- Approximate lines: `805-835`, `1215-1240`
- Issue: the sessions table now truncates both the title in JavaScript (`maxTitleChars = 44`) and the rendered link in CSS (`text-overflow: ellipsis`), while also shortening the session id to eight characters.
- Why it matters: on an observability dashboard, operators often need to distinguish between similarly named sessions quickly. With both title and id shortened and no tooltip/full secondary line, multiple rows can become visually indistinguishable.
- Concrete fix: keep layout control in CSS only, preserve the full title via `title`/`aria-label` or a muted secondary line, and avoid truncating the session id unless there is another full-fidelity affordance.

### 3. The new lane cards do not adapt cleanly to narrow viewports
- File path: `super_turtle/claude-telegram-bot/src/dashboard.ts`
- Approximate lines: `877-900`, `958-965`, `1287-1313`
- Issue: `.lane-head` stays a single-row flex layout, `.lane-meta` is forced to `white-space: nowrap`, and `.lane-current` is single-line ellipsized even after the dashboard stacks to one column below `1100px`.
- Why it matters: the new “race lane” presentation is supposed to improve scannability, but on phone-sized widths it hides the most important state strings first: status, elapsed time, and current backlog item.
- Concrete fix: add a small-screen rule that stacks the header, allows `.lane-meta` to wrap, and lets `.lane-current` use at least two lines before truncation.

## Low

### 4. Milestone rendering scales linearly with backlog length and will degrade for long checklists
- File path: `super_turtle/claude-telegram-bot/src/dashboard.ts`
- Approximate lines: `920-942`, `1288-1297`
- Issue: the lane track creates one `.lane-milestone` element per backlog item and spaces them across a fixed-width rail.
- Why it matters: larger backlogs will either collapse into unreadable dots or create avoidable DOM work, which makes the visual metaphor fragile compared with the previous text summary.
- Concrete fix: cap the displayed milestones, bucket them, or replace them with a simpler progress bar plus numeric label (`done/total`).

## Verification

- `bun test ./src/dashboard.test.ts`
- Result: `82 pass, 1 fail`
- Failing test: `GET /dashboard/sessions/:driver/:sessionId > renders conversation-first layout with injected context message`
