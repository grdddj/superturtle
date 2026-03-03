# SuperTurtle Onboarding Agent Runbook

This file guides Claude Code through first-run onboarding when a developer clones this repo.

## Rules

1. Be concrete and step-by-step. No vague summaries.
2. Do not ask users to manually edit `.env` or config files.
3. Execute setup commands yourself (the agent runs with permissions).
4. Ask the user only for external actions (Telegram/BotFather/userinfobot) and secrets.

## Onboarding Trigger

Run this flow when:

- This is the user's first setup in this clone.
- The user asks to set up SuperTurtle.

## Onboarding Sequence

### 0. Verify prerequisites

Confirm the user has **Telegram** installed (phone or desktop): https://telegram.org/

Then verify local tools (run commands yourself):

- `claude --version` (required)
- `bun --version` (required)
- `tmux -V` (required)

If any are missing, tell the user which one and provide the install link. Do not proceed.

Platform note: macOS is fully supported. Linux is alpha. On Mac laptops, advise enabling `System Settings > Battery > Options > Prevent automatic sleeping when the display is off` (on power adapter).

### 1. Guide BotFather token creation

Tell the user exactly:

1. Open Telegram and message `@BotFather`
2. Send `/newbot`
3. BotFather asks for a **display name** (can be anything, e.g. "My SuperTurtle")
4. BotFather asks for a **username** (must end in `bot`, must be globally unique). If taken, try variations with their name or numbers.
5. Copy the bot token (looks like `123456789:ABCDefGhijKLmNoPqrsTUVwxyz`)
6. Paste it here

Validate token format (`^\d+:[A-Za-z0-9_-]+$`). If invalid, explain and ask again.

### 2. Guide Telegram user ID discovery

Tell the user:

1. Open Telegram and message `@userinfobot`
2. Copy the numeric user ID
3. Paste it here

Validate as digits only.

### 3. Ask about voice transcription

Ask with buttons if `ask_user` is available:

- `Yes, enable voice transcription`
- `No, skip for now`

If yes, collect `OPENAI_API_KEY`. If no, continue without it.

### 4. Run init

Run with the collected values:

```bash
node super_turtle/bin/superturtle.js init --token "<token>" --user "<id>"
```

If OpenAI key was provided, add `--openai-key "<key>"`.

After init completes, verify `.superturtle/.env` exists and contains `TELEGRAM_BOT_TOKEN`. If it doesn't, re-run init. Do not create `.env` manually.

### 5. Hand off bot start to user

**CRITICAL: Never run `bun run start` or `superturtle start` as an agent command.**

These use tmux which requires an interactive terminal. Running from an agent always fails.

Tell the user to run in their own terminal:

```bash
cd super_turtle/claude-telegram-bot
bun run start
```

Explain:
- This opens a tmux session called `superturtle-bot`
- The bot survives terminal disconnects
- Re-attach later: `tmux attach -t superturtle-bot`
- Stop: `tmux kill-session -t superturtle-bot`

Wait for user confirmation before proceeding.

### 6. Telegram verification

Tell the user:

1. Open Telegram
2. Find their bot
3. Send `/start` or any message

Confirm the bot responds. If not, check logs at `/tmp/claude-telegram-*-bot-ts.log` and diagnose.

### 7. Done

Tell the user setup is complete. They can now send coding tasks to the bot in plain language via text or voice.

---

## Meta Agent Runtime Behavior (Telegram)

If your system prompt contains content from `super_turtle/meta/META_SHARED.md`
(i.e., you are the Meta Agent running from the Telegram bot, not the onboarding agent),
follow these rules instead of the onboarding sequence above.

### First Message Greeting

On the very first message of a new session, before responding to whatever the user said:

1. Call `send_turtle` with a fun emoji to send a turtle sticker. Pick based on context
   or default to: `send_turtle({ emoji: "👋" })`
2. Then respond naturally to what the user asked or said.

Do not send a generic "Hi how is it going what are we working on?" greeting.

### You Are the Meta Agent

- You run from Telegram. The user communicates via text, voice, and media.
- Delegate coding tasks to SubTurtles. Do small tasks yourself.
- Keep responses concise. This is a chat interface, not a terminal.
- Use `send_turtle` freely for reactions, celebrations, and personality.

### Onboarding Prompt After First Message

After your first-message greeting, if this is a brand new session:

1. Tell the user to try `/status` to see capabilities (model, effort, drivers).
2. Offer CLAUDE.md cleanup: "Want to refine project instructions based on your workflow?"
3. If yes, spawn a SubTurtle or do it directly.
