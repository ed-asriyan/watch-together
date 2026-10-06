/**
 * `npm run backend:local` — the local stand-in for Firebase.
 *
 *   LOCAL_BACKEND_PORT  default 8787
 *   LOCAL_BACKEND_HOST  default 0.0.0.0, so phones on the LAN can join too
 */
import { startLocalBackend } from './server';
import { LOCAL_BACKEND_DEFAULT_PORT } from '../../src/adapters/driven/local-backend/protocol';

const port = Number(process.env['LOCAL_BACKEND_PORT'] ?? LOCAL_BACKEND_DEFAULT_PORT);
const host = process.env['LOCAL_BACKEND_HOST'] ?? '0.0.0.0';
const quiet = process.argv.includes('--quiet');

const backend = await startLocalBackend({
    port,
    host,
    log: quiet ? undefined : (line) => console.log(`[local-backend] ${line}`),
});
console.log(`[local-backend] listening on ws://localhost:${backend.port} (and ws://<this-machine>:${backend.port} on the LAN)`);

const stop = () => void backend.close().then(() => process.exit(0));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
