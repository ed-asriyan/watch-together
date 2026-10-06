import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end: real browsers, real player, real backend process — no Firebase.
 *
 * Three servers are started for the run:
 *  - the local backend (`backend/local`), the stand-in for Firebase;
 *  - a static media host for `e2e/fixtures`, with Range support;
 *  - the Vite dev server, built against the local backend.
 *
 * Each viewer in a test is a separate browser context, so it has its own
 * storage and therefore its own participant id — two genuinely different
 * people, which two tabs of one context are not.
 *
 * Runs serially by default: these tests measure synchronization in wall-clock
 * time, and parallel workers competing for CPU make a decoder lag that has
 * nothing to do with the code under test.
 */
export const PORTS = {
    backend: Number(process.env['E2E_BACKEND_PORT'] ?? 18787),
    media: Number(process.env['E2E_MEDIA_PORT'] ?? 18788),
    app: Number(process.env['E2E_APP_PORT'] ?? 15173),
};

const reuse = !process.env['CI'];

export default defineConfig({
    testDir: 'e2e',
    timeout: 120_000,
    expect: { timeout: 10_000 },
    fullyParallel: false,
    workers: Number(process.env['E2E_WORKERS'] ?? 1),
    retries: 0,
    forbidOnly: Boolean(process.env['CI']),
    reporter: process.env['CI'] ? [['list'], ['html', { open: 'never' }]] : [['list']],
    use: {
        baseURL: `http://localhost:${PORTS.app}`,
        viewport: { width: 1280, height: 720 },
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        launchOptions: { args: ['--mute-audio'] },
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } }],
    webServer: [
        {
            command: 'npx tsx backend/local/main.ts --quiet',
            env: { LOCAL_BACKEND_PORT: String(PORTS.backend), LOCAL_BACKEND_HOST: '127.0.0.1' },
            url: `http://127.0.0.1:${PORTS.backend}/`,
            reuseExistingServer: reuse,
        },
        {
            command: 'node e2e/support/media-server.mjs',
            env: { MEDIA_PORT: String(PORTS.media) },
            url: `http://127.0.0.1:${PORTS.media}/health`,
            reuseExistingServer: reuse,
        },
        {
            command: `npx vite dev --port ${PORTS.app} --strictPort`,
            env: { VITE_LOCAL_BACKEND_URL: `ws://localhost:${PORTS.backend}` },
            url: `http://localhost:${PORTS.app}`,
            reuseExistingServer: reuse,
        },
    ],
});
