import { config } from './config.js';

// Send a push notification via ntfy.sh (free, no account; the phone app
// subscribes to the topic name). Always echoes to the console too.
export async function notify({ title, message, priority = 'default', tags = [] }) {
  console.log(`\n[ALERT] ${title}\n${message}\n`);
  if (!config.ntfyTopic) return false;
  try {
    const res = await fetch(`${config.ntfyServer}/${config.ntfyTopic}`, {
      method: 'POST',
      body: message,
      headers: {
        Title: title,
        Priority: priority,
        Tags: tags.join(','),
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error(`ntfy push failed: HTTP ${res.status}`);
    return res.ok;
  } catch (e) {
    console.error(`ntfy push failed: ${e.message}`);
    return false;
  }
}
