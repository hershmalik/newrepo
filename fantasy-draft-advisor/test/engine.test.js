/* Minimal engine sanity tests: node test/engine.test.js */
const fs = require("fs");
const path = require("path");
const Engine = require("../public/engine.js");

let failures = 0;
function assert(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
}

// Load sample rankings with the same parsing rules as the front end (simplified: no quoted fields in sample).
const csv = fs.readFileSync(path.join(__dirname, "..", "data", "sample-rankings.csv"), "utf8");
const lines = csv.trim().split("\n").slice(1);
const rankings = lines.map((l) => {
  const [rank, player, pos, team, tier, adp, bye] = l.split(",");
  return { rank: +rank, player, pos, team, tier: +tier, adp: +adp, bye: +bye };
});

console.log("snake draft math");
assert(Engine.pickOwner(1, 12) === 1, "pick 1 belongs to team 1");
assert(Engine.pickOwner(12, 12) === 12, "pick 12 belongs to team 12");
assert(Engine.pickOwner(13, 12) === 12, "pick 13 belongs to team 12 (snake turn)");
assert(Engine.pickOwner(24, 12) === 1, "pick 24 belongs to team 1");
const mine = Engine.myPicks(12, 12);
assert(mine[0] === 12 && mine[1] === 13 && mine[2] === 36 && mine[3] === 37, "slot 12 picks are 12,13,36,37…");

console.log("recommendations at pick 12 (slot 12 of 12, empty roster)");
const drafted = new Set(rankings.slice(0, 11).map((p) => p.player)); // picks 1-11 gone
const state = { teams: 12, mySlot: 12, currentOverall: 12, drafted, myRoster: [] };
const result = Engine.recommend(rankings, state);
assert(result.recommendations.length > 0, "returns recommendations");
assert(result.nextPick === 13, "next pick after 12 is 13 at the turn");
const top = result.recommendations[0];
assert(["RB", "WR"].includes(top.pos), `top pick is RB/WR, got ${top.player} (${top.pos})`);
assert(top.reasons.length > 0, "top pick has reasons");
const qbRec = result.recommendations.find((r) => r.pos === "QB");
assert(!qbRec, "no QB recommended in round 1");

console.log("hero RB: after elite RB, dead-zone RBs get faded in round 3-5");
const henry = rankings.find((p) => p.player === "Derrick Henry");
const drafted2 = new Set(rankings.slice(0, 35).map((p) => p.player));
drafted2.delete("Josh Jacobs"); // tier-3 RB left on board in the dead zone
const state2 = { teams: 12, mySlot: 12, currentOverall: 37, drafted: drafted2, myRoster: [henry] };
const r2 = Engine.recommend(rankings, state2, 10);
const jacobs = r2.recommendations.find((r) => r.player === "Josh Jacobs");
const wrAbove = r2.recommendations.filter((r) => r.pos === "WR" && (!jacobs || r.score > jacobs.score));
assert(wrAbove.length >= 1, "at least one WR scores above the dead-zone RB after an elite RB anchor");

console.log(failures === 0 ? "\nAll tests passed." : `\n${failures} test(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
