#!/usr/bin/env node
/**
 * `npm run dev:local` — the app with no Firebase at all.
 *
 * Starts the local backend and the Vite dev server together, pointed at each
 * other, and stops both on Ctrl-C. Open the printed URL in two browsers (or two
 * profiles, or a phone on the same network) and they share rooms for real.
 *
 * Two TABS of one browser share `localStorage`, hence one participant id, so
 * use two browsers/profiles or an incognito window to get two participants.
 */
import { spawn } from 'node:child_process';

const port = process.env.LOCAL_BACKEND_PORT ?? '8787';
const children = [];

const run = (command, args, env = {}) => {
    const child = spawn(command, args, {
        stdio: 'inherit',
        env: { ...process.env, ...env },
        shell: process.platform === 'win32',
    });
    child.on('exit', (code) => {
        children.forEach((other) => other !== child && other.kill('SIGTERM'));
        process.exit(code ?? 0);
    });
    children.push(child);
};

run('npx', ['tsx', 'backend/local/main.ts'], { LOCAL_BACKEND_PORT: port });
run('npx', ['vite', 'dev', '--host'], {
    // `auto`: whichever host served the page, so LAN devices find it too.
    VITE_LOCAL_BACKEND_URL: port === '8787' ? 'auto' : `ws://localhost:${port}`,
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => children.forEach((child) => child.kill(signal)));
}
