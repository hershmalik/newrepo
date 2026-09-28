import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { runScan } from './scan.js';

export function startServer() {
  const app = express();
  app.use(express.static(path.join(config.rootDir, 'public')));

  let scanning = false;

  app.get('/api/picks', (req, res) => {
    const p = path.join(config.dataDir, 'latest.json');
    if (!fs.existsSync(p)) return res.json({ singles: [], parlays: [], generatedAt: null });
    res.type('json').send(fs.readFileSync(p, 'utf8'));
  });

  app.post('/api/scan', (req, res) => {
    if (scanning) return res.status(409).json({ error: 'scan already running' });
    scanning = true;
    runScan({})
      .catch((e) => console.error(e.message))
      .finally(() => {
        scanning = false;
      });
    res.json({ started: true });
  });

  app.get('/api/status', (req, res) => res.json({ scanning }));

  app.listen(config.port, () => {
    console.log(`Dashboard: http://localhost:${config.port}`);
  });
}
