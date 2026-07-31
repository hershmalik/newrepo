/* UI wiring for the draft advisor. Engine logic lives in engine.js. */

const state = {
  rankings: [],
  teams: 12,
  mySlot: 12,
  rounds: 16,
  currentOverall: 1,
  drafted: new Set(),
  myRoster: [],
  log: [], // { player, mine }
  posFilter: "ALL",
  search: "",
};

const $ = (id) => document.getElementById(id);

// ---- rankings loading -------------------------------------------------------

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (name) => header.indexOf(name);
  const players = [];
  for (let i = 1; i < lines.length; i++) {
    // handle quoted fields containing commas
    const cells = lines[i].match(/("([^"]*)"|[^,]*)(,|$)/g)?.map((c) =>
      c.replace(/,$/, "").replace(/^"|"$/g, "").trim()
    ) ?? lines[i].split(",");
    if (!cells[idx("player")]) continue;
    players.push({
      rank: Number(cells[idx("rank")]) || i,
      player: cells[idx("player")],
      pos: (cells[idx("pos")] || "").toUpperCase(),
      team: cells[idx("team")] || "",
      tier: Number(cells[idx("tier")]) || Math.ceil((Number(cells[idx("rank")]) || i) / 12),
      adp: idx("adp") >= 0 && cells[idx("adp")] !== "" ? Number(cells[idx("adp")]) : undefined,
      bye: idx("bye") >= 0 ? Number(cells[idx("bye")]) : undefined,
    });
  }
  players.sort((a, b) => a.rank - b.rank);
  return players;
}

function setRankings(players, label) {
  state.rankings = players;
  $("rankings-status").textContent = `${players.length} players loaded (${label})`;
}

$("csv-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  setRankings(parseCSV(await file.text()), file.name);
  render();
});

$("load-sample").addEventListener("click", async () => {
  const res = await fetch("/data/sample-rankings.csv");
  setRankings(parseCSV(await res.text()), "sample — replace with Ron's sheet");
  render();
});

// ---- draft control ----------------------------------------------------------

$("start-draft").addEventListener("click", () => {
  if (!state.rankings.length) {
    alert("Load rankings first (or click 'Use sample rankings').");
    return;
  }
  state.teams = Number($("teams").value);
  state.mySlot = Number($("myslot").value);
  state.rounds = Number($("rounds").value);
  state.currentOverall = 1;
  state.drafted = new Set();
  state.myRoster = [];
  state.log = [];
  $("draft-board").classList.remove("hidden");
  render();
});

function draftPlayer(name, mine) {
  const p = state.rankings.find((x) => x.player === name);
  if (!p || state.drafted.has(name)) return;
  state.drafted.add(name);
  if (mine) state.myRoster.push(p);
  state.log.push({ player: p, mine, overall: state.currentOverall });
  state.currentOverall++;
  render();
}

$("undo").addEventListener("click", () => {
  const last = state.log.pop();
  if (!last) return;
  state.drafted.delete(last.player.player);
  if (last.mine) state.myRoster = state.myRoster.filter((p) => p.player !== last.player.player);
  state.currentOverall--;
  render();
});

// ---- filters -----------------------------------------------------------------

document.querySelectorAll(".pos-btn").forEach((btn) =>
  btn.addEventListener("click", () => {
    document.querySelectorAll(".pos-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.posFilter = btn.dataset.pos;
    renderPlayers();
  })
);

$("search").addEventListener("input", (e) => {
  state.search = e.target.value.toLowerCase();
  renderPlayers();
});

// ---- AI advice -----------------------------------------------------------------

$("ai-advice").addEventListener("click", async () => {
  const out = $("ai-output");
  out.classList.remove("hidden");
  out.textContent = "Thinking like Ron…";
  const result = Engine.recommend(state.rankings, engineState(), 8);
  try {
    const res = await fetch("/api/ai-advice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draft: {
          teams: state.teams,
          mySlot: state.mySlot,
          round: result.round,
          currentOverall: state.currentOverall,
          nextPick: result.nextPick,
          myRoster: state.myRoster.map((p) => `${p.player} (${p.pos}, tier ${p.tier})`),
          topAvailable: state.rankings
            .filter((p) => !state.drafted.has(p.player))
            .slice(0, 25)
            .map((p) => `#${p.rank} ${p.player} ${p.pos} ${p.team} tier ${p.tier} adp ${p.adp ?? "?"}`),
          engineTopPicks: result.recommendations
            .slice(0, 4)
            .map((r) => `${r.player} (score ${r.score}): ${r.reasons.join("; ")}`),
        },
      }),
    });
    const data = await res.json();
    out.textContent = data.error ? `⚠️ ${data.error}` : data.advice;
  } catch (err) {
    out.textContent = `⚠️ AI advice unavailable: ${err.message}`;
  }
});

// ---- rendering ------------------------------------------------------------------

function engineState() {
  return {
    teams: state.teams,
    mySlot: state.mySlot,
    currentOverall: state.currentOverall,
    drafted: state.drafted,
    myRoster: state.myRoster,
  };
}

function render() {
  renderStatus();
  renderRecommendations();
  renderPlayers();
  renderRoster();
}

function renderStatus() {
  if (!state.rankings.length) return;
  const round = Math.ceil(state.currentOverall / state.teams);
  const owner = Engine.pickOwner(state.currentOverall, state.teams);
  const meOnClock = owner === state.mySlot;
  $("draft-status").textContent =
    `Round ${round} · Pick ${state.currentOverall} overall · ` +
    (meOnClock ? "🚨 YOU ARE ON THE CLOCK" : `Team ${owner} on the clock`);
  const mine = Engine.myPicks(state.teams, state.mySlot, state.rounds).filter(
    (p) => p >= state.currentOverall
  );
  $("my-picks-schedule").textContent = `Your upcoming picks: ${mine.slice(0, 5).join(", ")}…`;
}

function renderRecommendations() {
  if (!state.rankings.length) return;
  const result = Engine.recommend(state.rankings, engineState());
  $("pick-context").textContent =
    ` — pick ${result.currentOverall}, next turn at ${result.nextPick} (${result.picksUntilNext} away)`;
  $("recommendations").innerHTML = result.recommendations
    .map(
      (r, i) => `
      <div class="rec-card ${i === 0 ? "top" : ""}">
        <div class="rec-head">
          <span class="rec-name">${i === 0 ? "⭐ " : ""}${r.player}
            <span class="pos-${r.pos}">${r.pos}</span>
            <span class="p-meta">${r.team} · #${r.rank} · T${r.tier}</span>
          </span>
          <span class="rec-score">${r.score}</span>
          <button class="take" data-player="${escapeAttr(r.player)}">Draft</button>
        </div>
        <ul class="rec-reasons">${r.reasons.map((x) => `<li>${x}</li>`).join("")}</ul>
      </div>`
    )
    .join("");
  $("recommendations").querySelectorAll(".take").forEach((b) =>
    b.addEventListener("click", () => draftPlayer(b.dataset.player, true))
  );
}

function renderPlayers() {
  if (!state.rankings.length) return;
  const rows = state.rankings
    .filter((p) => !state.drafted.has(p.player))
    .filter((p) => state.posFilter === "ALL" || p.pos === state.posFilter)
    .filter((p) => !state.search || p.player.toLowerCase().includes(state.search))
    .slice(0, 80)
    .map(
      (p) => `
      <div class="player-row">
        <span class="p-rank">${p.rank}</span>
        <span><b>${p.player}</b> <span class="p-meta">${p.team}${p.bye ? " · bye " + p.bye : ""}</span></span>
        <span class="pos-${p.pos}">${p.pos} <span class="p-tier">T${p.tier}</span></span>
        <span class="p-meta">${p.adp ?? ""}</span>
        <span>
          <button class="btn-gone" data-player="${escapeAttr(p.player)}" data-mine="0">Gone</button>
          <button class="btn-mine" data-player="${escapeAttr(p.player)}" data-mine="1">Mine</button>
        </span>
      </div>`
    )
    .join("");
  $("player-list").innerHTML = rows;
  $("player-list").querySelectorAll("button").forEach((b) =>
    b.addEventListener("click", () => draftPlayer(b.dataset.player, b.dataset.mine === "1"))
  );
}

function renderRoster() {
  $("my-roster").innerHTML = state.myRoster
    .map((p, i) => `<li>${i + 1}. <b>${p.player}</b> <span class="pos-${p.pos}">${p.pos}</span> <span class="p-meta">${p.team} T${p.tier}</span></li>`)
    .join("");
  $("pick-log").innerHTML = state.log
    .slice(-10)
    .reverse()
    .map((l) => `<li>#${l.overall} ${l.player.player} (${l.player.pos})${l.mine ? " — YOU" : ""}</li>`)
    .join("");
}

function escapeAttr(s) {
  return s.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
