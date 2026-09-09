import test from 'node:test';
import assert from 'node:assert/strict';
import {
  americanToDecimal,
  decimalToAmerican,
  combineAmerican,
  normalizeName,
} from '../src/util.js';
import { unavailability, buildSituations, nextMenUp } from '../src/engine/elevation.js';
import { scoreCandidate } from '../src/engine/scoring.js';

test('odds math round-trips', () => {
  assert.equal(americanToDecimal(100), 2);
  assert.equal(americanToDecimal(-200), 1.5);
  assert.equal(decimalToAmerican(2.5), 150);
  assert.equal(decimalToAmerican(1.5), -200);
  // +500 and +1500 parlay: 6.0 * 16.0 = 96.0 decimal => +9500
  assert.equal(combineAmerican([500, 1500]), 9500);
});

test('name normalization matches book vs ESPN spellings', () => {
  assert.equal(normalizeName('Marvin Harrison Jr.'), 'marvin harrison');
  assert.equal(normalizeName("Ja'Marr Chase"), 'ja marr chase');
  assert.equal(normalizeName('AMON-RA ST. BROWN'), 'amon ra st brown');
});

test('injury status maps to miss probability', () => {
  assert.equal(unavailability('Out'), 1);
  assert.equal(unavailability('Injured Reserve'), 1);
  assert.equal(unavailability('Doubtful'), 0.85);
  assert.equal(unavailability('Questionable'), 0.4);
  assert.equal(unavailability('Active'), 0);
});

function fixtureSituation() {
  const teams = [{ id: '1', abbrev: 'HOU', name: 'Houston Texans' }];
  const rosters = {
    1: {
      a1: { id: 'a1', name: 'Star One', position: 'WR', experienceYears: 5 },
      a2: { id: 'a2', name: 'Star Two', position: 'WR', experienceYears: 4 },
      a3: { id: 'a3', name: 'Star Three', position: 'WR', experienceYears: 3 },
      a4: { id: 'a4', name: 'Backup Guy', position: 'WR', experienceYears: 1 },
    },
  };
  const depthCharts = {
    1: {
      wr: [
        { rank: 1, athleteId: 'a1' },
        { rank: 2, athleteId: 'a2' },
        { rank: 3, athleteId: 'a3' },
        { rank: 4, athleteId: 'a4' },
      ],
    },
  };
  const injuries = [
    {
      teamId: '1',
      teamName: 'Houston Texans',
      injuries: [
        { athleteId: 'a1', name: 'Star One', status: 'Out', comment: '' },
        { athleteId: 'a2', name: 'Star Two', status: 'Injured Reserve', comment: '' },
      ],
    },
  ];
  return buildSituations({ teams, rosters, depthCharts, injuries });
}

test('backup behind two injured starters is fully elevated', () => {
  const sit = fixtureSituation()['1'];
  const room = sit.rooms.wr;
  const backup = room.players.find((p) => p.name === 'Backup Guy');
  assert.equal(backup.elevation, 2);
  assert.ok(room.roomInjuryLoad >= 2);
});

test('scoring rewards the Texans-WR scenario', () => {
  const sit = fixtureSituation()['1'];
  const room = sit.rooms.wr;
  const backup = room.players.find((p) => p.name === 'Backup Guy');
  const { score, reasons } = scoreCandidate(
    { market: 'player_tds_over', point: 1.5, price: 9000, book: 'DK' },
    { player: backup, room, pos: 'wr', teamAbbrev: 'HOU', oppAbbrev: 'CAR', knowledge: { weakPassDefenses: ['CAR'] } }
  );
  // 2 outs above (+90), decimated room (+20), weak pass D (+15),
  // signature 2+TD play (+10), target odds band (+10)
  assert.ok(score >= 100, `expected >=100, got ${score}: ${reasons.join('; ')}`);
});

test('players off the active roster are unavailable, practice squad excluded', () => {
  const teams = [{ id: '1', abbrev: 'SEA', name: 'Seattle Seahawks' }];
  const rosters = {
    1: {
      a1: { id: 'a1', name: 'Real Starter', position: 'WR', experienceYears: 4, rosterStatus: 'Active' },
      a2: { id: 'a2', name: 'Cut Guy', position: 'WR', experienceYears: 3, rosterStatus: 'Day-To-Day' },
      a3: { id: 'a3', name: 'Real Backup', position: 'WR', experienceYears: 2, rosterStatus: 'Active' },
      a4: { id: 'a4', name: 'Squad Guy', position: 'WR', experienceYears: 0, rosterStatus: 'Practice Squad' },
    },
  };
  const depthCharts = {
    1: {
      wr: [
        { rank: 1, athleteId: 'a1' },
        { rank: 2, athleteId: 'a2' },
        { rank: 3, athleteId: 'a3' },
        { rank: 4, athleteId: 'a4' },
      ],
    },
  };
  const sit = buildSituations({ teams, rosters, depthCharts, injuries: [] })['1'];
  const room = sit.rooms.wr;
  assert.ok(!room.players.some((p) => p.name === 'Squad Guy'), 'practice squad excluded');
  const cut = room.players.find((p) => p.name === 'Cut Guy');
  assert.equal(cut.missProb, 1, 'non-Active roster status means unavailable');
  const backup = room.players.find((p) => p.name === 'Real Backup');
  assert.equal(backup.elevation, 1, 'players below a cut guy are elevated');
  const starter = room.players.find((p) => p.name === 'Real Starter');
  assert.deepEqual(nextMenUp(room, starter, 2).map((p) => p.name), ['Real Backup'], 'cut players are never the next man up');
});

test('nextMenUp skips injured players', () => {
  const sit = fixtureSituation()['1'];
  const room = sit.rooms.wr;
  const starter = room.players.find((p) => p.name === 'Star Three');
  const next = nextMenUp(room, starter, 2);
  assert.deepEqual(next.map((p) => p.name), ['Backup Guy']);
});
