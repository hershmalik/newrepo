import { runScan } from './scan.js';
import { runLiveMonitor } from './live/monitor.js';
import { startServer } from './server.js';

const cmd = process.argv[2];
const flags = new Set(process.argv.slice(3));

switch (cmd) {
  case 'scan':
    runScan({ push: flags.has('--push') }).catch(fail);
    break;
  case 'live':
    runLiveMonitor().catch(fail);
    break;
  case 'serve':
    startServer();
    break;
  default:
    console.log(`nfl-longshots — injury-driven NFL longshot prop finder

Usage:
  npm run scan        Pregame scan: ranked longshot singles + parlays for the week
  npm run scan:push   Same, and push the top picks to your phone (ntfy)
  npm run live        Live in-game injury monitor with instant backup-prop alerts
  npm run serve       Web dashboard on http://localhost:${process.env.PORT || 3000}

Setup: see SETUP.md (you need an ODDS_API_KEY in .env)`);
}

function fail(e) {
  console.error(e.message);
  process.exit(1);
}
