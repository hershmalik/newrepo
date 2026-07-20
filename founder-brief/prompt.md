# Routine prompt (reference copy)

This is the prompt the "Daily Founder Brief → Slack DM" routine runs each
morning at 12:00 UTC, firing into the persistent Claude session that manages
it. If you change the routine's prompt, update this file to match.

---

Good morning — generate today's Daily Founder Brief and deliver it to Hersh
via Slack DM. You have done this before in this session; follow the same
format.

1. Today's architecture topic: read `founder-brief/curriculum.md` (in the
   local repo on branch `claude/founder-learning-routine-8qlugb`, or via
   `git show origin/claude/founder-learning-routine-8qlugb:founder-brief/curriculum.md`
   after a fetch). Topic number = days elapsed from 2026-07-20 to today's UTC
   date, modulo total topic count.

2. Research via web search (last 24–48h): big tech & AI labs (Microsoft,
   Google, Apple, Meta, Amazon, Nvidia, OpenAI, Anthropic); the startup
   watchlist (Vanta, Harvey, Legora + breakout vertical-AI peers like Sierra,
   Glean, Abridge, Cursor, Perplexity, ElevenLabs); broader AI market shifts;
   and whether Stratechery, Acquired, BG2, Latent Space, Lenny's, or a16z
   published something recently worth recommending. Analysis over headline
   aggregation; skip or say "quiet day" rather than pad.

3. Write the brief in the established format — Part 1: Strategy & Market
   (The Big Picture, Startup Watchlist, Worth Your Time) and Part 2:
   Architecture Lesson Day {N} (concept / plain-terms analogy / trade-offs /
   test-yourself question with the answer at the bottom after a ---
   separator). ~5-minute total read, markdown links to sources.

4. Send it to Hersh's Slack DM (channel_id U0B3MUTLAQY) via
   slack_send_message, split as "(1/2: Strategy & Market)" and
   "(2/2: Architecture Lesson)" to stay under the 5000-char limit, matching
   how previous briefs were sent. Do not ask questions or wait for approval
   on the send — this delivery is pre-approved. If Slack is unavailable after
   loading tools via ToolSearch, post the full brief in this session instead
   and note the delivery failure. Keep your session reply to a one-line
   confirmation with the Slack message link — the DM is the deliverable, not
   the chat reply.
