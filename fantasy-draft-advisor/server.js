const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/data", express.static(path.join(__dirname, "data")));

const methodology = fs.readFileSync(
  path.join(__dirname, "knowledge", "ron-stewart-methodology.md"),
  "utf8"
);

// Optional AI advisor — requires ANTHROPIC_API_KEY. The rules engine in the
// browser works without it, so the app is fully usable offline on draft day.
let anthropic = null;
try {
  const Anthropic = require("@anthropic-ai/sdk");
  if (process.env.ANTHROPIC_API_KEY) anthropic = new Anthropic();
} catch {
  // SDK not installed — AI endpoint will report it below.
}

const SYSTEM_PROMPT = `You are a live fantasy football draft advisor whose entire strategy is
Ron Stewart's methodology (YouTube @ronstewart_). You answer DURING a live draft, so be fast
and decisive: name ONE recommended pick, one backup, and 2-4 sentences of "why" grounded in
tier scarcity, value vs ADP, and the Hero RB build plan. Reference what the pick sets up for
the drafter's NEXT pick. No hedging, no long lists.

Ron Stewart's methodology:
${methodology}`;

app.post("/api/ai-advice", async (req, res) => {
  if (!anthropic) {
    return res.json({
      error:
        "AI advice is not configured. Run `npm install` and set ANTHROPIC_API_KEY, then restart. " +
        "The built-in rules engine still works without it.",
    });
  }
  const { draft } = req.body || {};
  if (!draft) return res.status(400).json({ error: "Missing draft state" });

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      thinking: { type: "adaptive" },
      output_config: { effort: "low" }, // draft clock is ticking — speed over depth
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content:
            `Live draft state:\n` +
            `- League: ${draft.teams} teams, I pick from slot ${draft.mySlot}\n` +
            `- On the clock: round ${draft.round}, pick ${draft.currentOverall} overall; my next pick after this is ${draft.nextPick}\n` +
            `- My roster so far: ${draft.myRoster.length ? draft.myRoster.join(", ") : "(empty)"}\n` +
            `- Best available (from Ron's rankings):\n${draft.topAvailable.join("\n")}\n` +
            `- The rules engine's current top suggestions:\n${draft.engineTopPicks.join("\n")}\n\n` +
            `Who should I take right now, and why?`,
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return res.json({ error: "The model declined to answer this request." });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    res.json({ advice: text });
  } catch (err) {
    res.json({ error: `AI request failed: ${err.message}` });
  }
});

const { registerYahooRoutes } = require("./yahoo/yahooClient");
registerYahooRoutes(app);

app.listen(PORT, () => {
  console.log(`\n🏈 Ron Stewart Draft Advisor running at http://localhost:${PORT}`);
  console.log(
    anthropic
      ? "   AI advisor: enabled (ANTHROPIC_API_KEY found)"
      : "   AI advisor: disabled (set ANTHROPIC_API_KEY to enable — rules engine works regardless)"
  );
});
