import { test, type Browser, type TestInfo } from '@playwright/test';
import { Viewer, VIDEO, expectInSync, roomFor, type ViewerOptions } from './support/viewer';

/**
 * Reported: open a video in two browsers, play, pause in one of them — and
 * the room oscillates, a second playing, a second paused, for ever, as if the
 * two kept stopping and restarting each other.
 *
 * Each case holds the result for 15 seconds: a loop with a one-second period
 * cannot hide in that.
 */
const HOLD = 15_000;

const room = async (browser: Browser, info: TestInfo, alice: ViewerOptions, bob: ViewerOptions) => {
    const id = roomFor(info);
    const a = await Viewer.join(browser, id, 'alice', alice);
    const b = await Viewer.join(browser, id, 'bob', bob);
    await a.pasteSource(VIDEO);
    await a.waitUntilReady();
    await b.waitUntilReady();
    return { alice: a, bob: b, both: [a, b] as const };
};

const conditions: Record<string, [ViewerOptions, ViewerOptions]> = {
    'on localhost': [{}, {}],
    'with slow media on both sides': [{ mediaLatencyMs: 1_200 }, { mediaLatencyMs: 1_200 }],
    'with real latency and clock skew': [
        { networkLatencyMs: 60, clockErrorMs: 200 },
        { networkLatencyMs: 80, clockErrorMs: -250 },
    ],
    'with all of it at once': [
        { networkLatencyMs: 60, clockErrorMs: 200, mediaLatencyMs: 1_200 },
        { networkLatencyMs: 80, clockErrorMs: -250, mediaLatencyMs: 1_200 },
    ],
};

for (const [label, [aliceOptions, bobOptions]] of Object.entries(conditions)) {
    test(`play in one browser, pause in the other, and it stays paused — ${label}`, async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info, aliceOptions, bobOptions);

        await alice.play();
        await expectInSync(both, { paused: false, tolerance: 1.5, holdMs: 0, timeout: 20_000 });
        await alice.page.waitForTimeout(4_000);

        await bob.pause();
        await expectInSync(both, { paused: true, tolerance: 0.75, holdMs: HOLD, timeout: 20_000 });

        await bob.play();
        await expectInSync(both, { paused: false, tolerance: 1.5, holdMs: HOLD, timeout: 20_000 });

        await alice.pause();
        await expectInSync(both, { paused: true, tolerance: 0.75, holdMs: HOLD, timeout: 20_000 });
    });
}
