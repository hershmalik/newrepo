# Daily Founder Brief

A scheduled Claude routine that delivers a daily email brief with two parts:

1. **Strategy & market intel** — a Stratechery-style analytical blurb on big tech
   and AI market shifts, a watchlist on vertical-AI startups (Vanta, Harvey,
   Legora, and peers), and a podcast/reading recommendation when one is worth
   the time.
2. **Technical architecture lesson** — one concept per day from
   [`curriculum.md`](./curriculum.md): the concept, a layman's analogy,
   the trade-offs, and a self-test question.

## How it works

- A Claude Code Remote routine fires daily at **12:00 UTC** (8:00 AM EDT /
  7:00 AM EST) into the persistent Claude session that manages this routine.
- The session researches the day's news via web search, computes the day's
  curriculum topic from the date (days since 2026-07-20, modulo topic count),
  and writes the full brief.
- The brief is delivered as a **Slack DM** to Hersh, split into two messages
  (Strategy & Market, then the Architecture Lesson).
- The routine's full prompt lives in [`prompt.md`](./prompt.md) for reference.
- Delivery history: the routine originally used a fresh-session-per-day design
  with push/email completion notifications, but the emails never arrived, so
  on 2026-07-20 it was rebound to the persistent session with direct Slack
  delivery.

## Changing it

- **Reorder or edit lessons**: edit `curriculum.md` on this branch — the routine
  reads it fresh each morning. Keep the numbering contiguous.
- **Change schedule, pause, or delete**: ask Claude in any session in this
  environment to update or delete the routine (it's managed via the
  claude-code-remote trigger tools), or manage it from the Claude Code web UI.
- **Change the brief's content or format**: ask Claude to update the routine's
  prompt, and mirror the change into `prompt.md` so this repo stays the source
  of truth.
