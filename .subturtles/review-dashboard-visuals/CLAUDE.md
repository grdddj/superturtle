# SubTurtle Task: Dashboard Visual Review

You are reviewing visual changes in `super_turtle/claude-telegram-bot/src/dashboard.ts`.

## Goal
Perform a strict code review of recent visual/UI changes.

## Scope
- Main dashboard (`/dashboard`)
- Session detail page
- SubTurtle detail page
- Process detail page
- Job detail page

## Review focus
1. Readability and visual hierarchy
2. Consistency of design system/colors/typography across pages
3. Responsiveness and layout behavior on narrow viewports
4. Accessibility basics (contrast, semantics, keyboard/focus usability)
5. Regressions in rendering logic or unsafe HTML patterns
6. Maintainability of CSS/inline template approach

## Output format
Return prioritized findings ordered by severity:
- critical
- high
- medium
- low

For each finding include:
- file path
- approximate line(s)
- issue
- why it matters
- concrete fix

If no major issues, explicitly say so and list residual risks.

## Status
Review complete. Findings are recorded in `review.md`.

## Verification
- `bun test ./src/dashboard.test.ts`
- Result: `82 pass, 1 fail`
- Failing test: `GET /dashboard/sessions/:driver/:sessionId > renders conversation-first layout with injected context message`

## Loop Control
STOP
