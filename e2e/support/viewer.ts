import { expect, type Browser, type BrowserContext, type Page, type TestInfo } from '@playwright/test';
import { PORTS } from '../../playwright.config';

/** The fixture is a ten-minute test pattern; positions below that are safe. */
export const VIDEO = `http://localhost:${PORTS.media}/clock.webm`;
export const VIDEO_DURATION = 600;

export interface PlayerState {
    readonly t: number;
    readonly paused: boolean;
    readonly ready: boolean;
    readonly muted: boolean;
    readonly src: string;
}

export interface ViewerOptions {
    /**
     * One-way delay on every frame between this viewer and the backend, both
     * directions. Localhost is ~0; a real room is tens to hundreds of ms.
     */
    readonly networkLatencyMs?: number;
    /**
     * How wrong this viewer's estimate of the shared clock is, in ms;
     * negative means behind. Applied to the backend's answers to clock-sync
     * requests, so the app's own clock adapter adopts it. Firebase's
     * `.info/serverTimeOffset` is computed without round-trip compensation,
     * so in production every client is off by roughly its one-way latency —
     * and in a different direction from the next one.
     */
    readonly clockErrorMs?: number;
    /**
     * Every media request this viewer makes is held for this long before it
     * goes out: a slow connection, so seeking and starting playback buffer
     * the way they do against a real CDN instead of instantly from localhost.
     */
    readonly mediaLatencyMs?: number;
}

/** A unique room per test, valid as a `RoomId`. */
export const roomFor = (info: TestInfo): string =>
    `e2e-${info.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30)}-${Date.now().toString(36)}`;

/**
 * One person in a room: their own browser context, so their own storage and
 * participant id. Everything they do goes through the UI they would use —
 * the source field, vidstack's play button and time slider — never through
 * the app's internals, because the bugs live exactly in the gap between the
 * two.
 */
export class Viewer {
    private constructor(
        readonly name: string,
        readonly context: BrowserContext,
        readonly page: Page,
    ) {}

    static async join(browser: Browser, room: string, name: string, options: ViewerOptions = {}): Promise<Viewer> {
        const context = await browser.newContext();
        const page = await context.newPage();
        if (options.mediaLatencyMs) {
            const delay = options.mediaLatencyMs;
            await page.route(`http://localhost:${PORTS.media}/**`, async (route) => {
                await new Promise((resolve) => setTimeout(resolve, delay));
                await route.continue().catch(() => undefined);
            });
        }
        const viewer = new Viewer(name, context, page);
        await viewer.interceptBackend(options);
        await page.goto(`/#${room}`);
        await expect(page.locator('input[placeholder="Video URL"]')).toBeVisible();
        return viewer;
    }

    /** Playhead writes the backend pushed to this viewer, newest last, with when they arrived. */
    readonly playheadPushes: { readonly at: number; readonly by: string; readonly paused: boolean; readonly stamp: number }[] = [];

    /** Every playhead frame in either direction, for diagnosing a failure. */
    readonly wire: string[] = [];

    /** Source writes the backend pushed to this viewer: what the room was told to watch, in order. */
    readonly sourcePushes: string[] = [];

    /**
     * Every frame to and from the backend passes through here: to apply the
     * network conditions above, and to let a test see what arrived and when.
     */
    private async interceptBackend(options: ViewerOptions): Promise<void> {
        const latency = options.networkLatencyMs ?? 0;
        const clockError = options.clockErrorMs ?? 0;
        const later = (run: () => void) => (latency ? setTimeout(run, latency) : run());

        await this.page.routeWebSocket((url) => url.port === String(PORTS.backend), (client) => {
            const server = client.connectToServer();
            client.onMessage((message) => {
                try {
                    const parsed = JSON.parse(String(message));
                    if (parsed.t === 'mutate' && parsed.mutation?.kind === 'playhead') {
                        const { intent } = parsed.mutation;
                        this.wire.push(`${Date.now() % 100_000} -> ${intent.value.paused ? 'pause' : 'play'} @${intent.value.position.toFixed(2)} at=${intent.at % 100_000} anchor=${(intent.anchoredAt ?? intent.at) % 100_000} by=${intent.by.slice(0, 4)}`);
                    }
                } catch {
                    // not JSON
                }
                later(() => server.send(message));
            });
            server.onMessage((message) => {
                let frame = message;
                try {
                    const parsed = JSON.parse(String(message));
                    if (parsed.t === 'ack' && typeof parsed.serverTime === 'number') {
                        frame = JSON.stringify({ ...parsed, serverTime: parsed.serverTime + clockError });
                    }
                    if (parsed.t === 'mutation' && parsed.mutation?.kind === 'source') {
                        const locator = String(parsed.mutation.source?.value?.locator ?? '');
                        later(() => this.sourcePushes.push(locator));
                    }
                    if (parsed.t === 'mutation' && parsed.mutation?.kind === 'playhead') {
                        const { intent } = parsed.mutation;
                        this.wire.push(`${Date.now() % 100_000} <- ${intent.value.paused ? 'pause' : 'play'} @${intent.value.position.toFixed(2)} at=${intent.at % 100_000} anchor=${(intent.anchoredAt ?? intent.at) % 100_000} by=${intent.by.slice(0, 4)}`);
                        later(() => this.playheadPushes.push({
                            at: Date.now(), by: intent.by, paused: intent.value.paused, stamp: intent.at,
                        }));
                    }
                } catch {
                    // not JSON: pass through untouched
                }
                later(() => client.send(frame));
            });
            client.onClose(() => server.close());
            server.onClose(() => client.close());
        });
    }

    // ---- what a person does -------------------------------------------------

    /** Paste a link into the source field and confirm it. */
    async pasteSource(url: string): Promise<void> {
        const field = this.page.locator('input[placeholder="Video URL"]');
        await field.fill(url);
        await field.press('Enter');
    }

    /** Type a link one key at a time, the way somebody without a clipboard does. */
    async typeSource(url: string, delayMs = 40): Promise<void> {
        const field = this.page.locator('input[placeholder="Video URL"]');
        await field.click();
        await field.pressSequentially(url, { delay: delayMs });
        await field.press('Enter');
    }

    async waitUntilReady(timeout = 10_000): Promise<void> {
        await expect.poll(async () => (await this.state()).ready, { message: `${this.name}: player ready`, timeout }).toBe(true);
    }

    /** The play/pause button in vidstack's control bar. */
    async play(): Promise<void> {
        await this.revealControls();
        if (!(await this.state()).paused) throw new Error(`${this.name} is already playing`);
        await this.page.locator('media-play-button').click();
    }

    async pause(): Promise<void> {
        await this.revealControls();
        if ((await this.state()).paused) throw new Error(`${this.name} is already paused`);
        await this.page.locator('media-play-button').click();
    }

    /** Click the timeline at `seconds`. */
    async clickTimeline(seconds: number): Promise<void> {
        await this.revealControls();
        const slider = this.page.locator('media-time-slider');
        const box = await slider.boundingBox();
        if (!box) throw new Error('no time slider');
        await slider.click({ position: { x: (box.width * seconds) / VIDEO_DURATION, y: box.height / 2 } });
    }

    /** Grab the slider handle where it is and drag it to `seconds`. */
    async scrubTo(seconds: number): Promise<void> {
        await this.revealControls();
        const box = await this.page.locator('media-time-slider').boundingBox();
        if (!box) throw new Error('no time slider');
        const y = box.y + box.height / 2;
        const xAt = (s: number) => box.x + (box.width * s) / VIDEO_DURATION;
        await this.page.mouse.move(xAt((await this.state()).t), y);
        await this.page.mouse.down();
        await this.page.mouse.move(xAt(seconds), y, { steps: 12 });
        await this.page.mouse.up();
    }

    async unmute(): Promise<void> {
        await this.revealControls();
        if (!(await this.state()).muted) return;
        await this.page.locator('media-mute-button').click();
    }

    async leave(): Promise<void> {
        await this.context.close();
    }

    // ---- what a person sees -------------------------------------------------

    async state(): Promise<PlayerState> {
        return this.page.evaluate(() => {
            const player = document.querySelector('media-player') as (HTMLElement & {
                currentTime: number; paused: boolean; muted: boolean; src: unknown;
                state: { canPlay: boolean; duration: number };
            }) | null;
            if (!player) return { t: 0, paused: true, ready: false, muted: true, src: '' };
            return {
                t: Number(player.currentTime) || 0,
                paused: Boolean(player.paused),
                ready: Boolean(player.state?.canPlay) && Number(player.state?.duration) > 0,
                muted: Boolean(player.muted),
                src: String(player.src ?? ''),
            };
        });
    }

    /**
     * The page opens scrolled down to the room controls, with the player
     * behind them. A person scrolls up and moves the mouse over the video to
     * bring vidstack's control bar back.
     */
    private async revealControls(): Promise<void> {
        await this.page.evaluate(() => window.scrollTo(0, 0));
        await this.page.mouse.move(600, 380);
        await this.page.mouse.move(640, 400, { steps: 3 });
        await expect(this.page.locator('media-player')).toHaveAttribute('data-controls', '');
    }
}

export interface Expected {
    readonly paused: boolean;
    /** Where everyone should be (now), within `tolerance`. Omit to only check agreement. */
    readonly near?: number;
    /** Lower bound — "did not snap back to before the scrub". */
    readonly atLeast?: number;
    /** Max spread between viewers, and max distance from `near`. Seconds. */
    readonly tolerance?: number;
    readonly timeout?: number;
    /**
     * Once agreed, the room must STAY agreed for this long. A sync that
     * converges and is then yanked back by a stale correction is the failure
     * mode these tests exist to catch.
     */
    readonly holdMs?: number;
}

const sample = async (viewers: readonly Viewer[]) =>
    Promise.all(viewers.map(async (viewer) => ({ name: viewer.name, ...(await viewer.state()) })));

const describe = (states: Awaited<ReturnType<typeof sample>>) =>
    states.map((s) => `${s.name}: ${s.t.toFixed(2)}s ${s.paused ? 'paused' : 'playing'}`).join(', ');

/** The last playhead frames each viewer sent (->) and received (<-): what to read first when a room splits. */
const wireOf = (viewers: readonly Viewer[]) =>
    viewers.map((viewer) => `  ${viewer.name}'s wire:\n    ${viewer.wire.slice(-10).join('\n    ') || '(nothing)'}`).join('\n');

const problemWith = (states: Awaited<ReturnType<typeof sample>>, expected: Expected): string | null => {
    const tolerance = expected.tolerance ?? 1;
    for (const s of states) {
        if (!s.ready) return `${s.name} is not ready`;
        if (s.paused !== expected.paused) return `${s.name} is ${s.paused ? 'paused' : 'playing'}`;
        if (expected.near !== undefined && Math.abs(s.t - expected.near) > tolerance) {
            return `${s.name} is at ${s.t.toFixed(2)}, expected ~${expected.near}`;
        }
        if (expected.atLeast !== undefined && s.t < expected.atLeast) {
            return `${s.name} is at ${s.t.toFixed(2)}, expected at least ${expected.atLeast}`;
        }
    }
    const times = states.map((s) => s.t);
    const spread = Math.max(...times) - Math.min(...times);
    if (spread > tolerance) return `spread ${spread.toFixed(2)}s > ${tolerance}s`;
    return null;
};

/** Everyone converges on the expected state, and stays there. */
export const expectInSync = async (viewers: readonly Viewer[], expected: Expected): Promise<void> => {
    let last = '';
    await expect.poll(async () => {
        const states = await sample(viewers);
        last = describe(states);
        return problemWith(states, expected);
    }, { timeout: expected.timeout ?? 10_000, message: `room did not converge on ${JSON.stringify(expected)}` })
        .toBeNull()
        .catch((error: Error) => {
            throw new Error(`${error.message}\n  last seen: ${last}\n${wireOf(viewers)}`);
        });

    const hold = expected.holdMs ?? 2_500;
    const until = Date.now() + hold;
    while (Date.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const states = await sample(viewers);
        // Playing positions move on; the hold checks agreement and state, not `near`.
        const problem = problemWith(states, { ...expected, near: undefined, atLeast: undefined });
        if (problem) throw new Error(`room converged, then fell apart: ${problem}\n  seen: ${describe(states)}\n${wireOf(viewers)}`);
    }
};
