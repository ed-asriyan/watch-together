import { test, expect, type Browser, type TestInfo } from '@playwright/test';
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

test('a segmented source over a slow link plays steadily instead of stopping every second', async ({ browser }, info) => {
    // The shape of an embedded YouTube: the player holds only a few seconds
    // ahead, so every start and every seek costs a round trip. A sync loop
    // that seeks toward a target it then lands behind turns each correction
    // into a visible stop.
    const id = roomFor(info);
    const alice = await Viewer.join(browser, id, 'alice', { mediaLatencyMs: 800 });
    const bob = await Viewer.join(browser, id, 'bob', { mediaLatencyMs: 800 });
    await alice.pasteSource(`${VIDEO}?chunk=4096`);
    // Reading the metadata alone takes several round trips at this latency.
    await alice.waitUntilReady(60_000);
    await bob.waitUntilReady(60_000);

    await alice.play();
    await expectInSync([alice, bob], { paused: false, tolerance: 1.5, holdMs: 0, timeout: 20_000 });
    await alice.page.waitForTimeout(5_000);

    const seeks = async () => Promise.all([alice, bob].map((v) => v.page.evaluate(() => {
        const w = window as unknown as { __seeks?: number };
        if (w.__seeks === undefined) {
            w.__seeks = 0;
            document.querySelector('media-player')!.addEventListener('seeking', () => { w.__seeks! += 1; });
        }
        return w.__seeks;
    })));
    await seeks();
    await expectInSync([alice, bob], { paused: false, tolerance: 1.5, holdMs: 20_000 });
    const [aliceSeeks, bobSeeks] = await seeks();
    expect(aliceSeeks, 'alice kept seeking').toBeLessThanOrEqual(1);
    expect(bobSeeks, 'bob kept seeking').toBeLessThanOrEqual(1);
});
