import { test, expect, type Browser, type TestInfo } from '@playwright/test';
import { Viewer, VIDEO, expectInSync, roomFor, type ViewerOptions } from './support/viewer';

/**
 * The same room, under the conditions production actually has and localhost
 * does not: frames take time to arrive, and no two clients agree exactly on
 * what time it is.
 *
 * Firebase's `.info/serverTimeOffset` is taken from a server timestamp with no
 * round-trip compensation, so each client's clock is off by about its own
 * one-way latency — tens to hundreds of milliseconds, in either direction. The
 * room orders every play, pause and seek by those clocks.
 */

const room = async (browser: Browser, info: TestInfo, alice: ViewerOptions, bob: ViewerOptions) => {
    const id = roomFor(info);
    const a = await Viewer.join(browser, id, 'alice', alice);
    const b = await Viewer.join(browser, id, 'bob', bob);
    await a.pasteSource(VIDEO);
    await a.waitUntilReady();
    await b.waitUntilReady();
    await expectInSync([a, b], { paused: true, near: 0, holdMs: 0 });
    return { alice: a, bob: b, both: [a, b] as const };
};

test('a pause by a viewer whose clock runs behind is not lost', async ({ browser }, info) => {
    // Alice pressed play, so she restates the running playhead every few
    // seconds. Bob's clock is behind; he pauses right after one of those
    // restatements reaches him.
    const { alice, bob, both } = await room(browser, info,
        { networkLatencyMs: 40, clockErrorMs: 0 },
        { networkLatencyMs: 40, clockErrorMs: -1_500 });
    await alice.play();
    await expectInSync(both, { paused: false, holdMs: 0 });

    const before = bob.playheadPushes.length;
    await expect.poll(() => bob.playheadPushes.slice(before).some((p) => p.by !== 'bob' && !p.paused),
        { timeout: 20_000, message: 'alice never restated the playhead' }).toBe(true);

    await bob.pause();
    await expectInSync(both, { paused: true, tolerance: 0.75, holdMs: 12_000 });
});

test('a scrub by a viewer whose clock runs behind is not lost', async ({ browser }, info) => {
    const { alice, bob, both } = await room(browser, info,
        { networkLatencyMs: 40, clockErrorMs: 0 },
        { networkLatencyMs: 40, clockErrorMs: -1_500 });
    await alice.play();
    await expectInSync(both, { paused: false, holdMs: 0 });

    const before = bob.playheadPushes.length;
    await expect.poll(() => bob.playheadPushes.slice(before).some((p) => p.by !== 'bob' && !p.paused),
        { timeout: 20_000 }).toBe(true);

    await bob.clickTimeline(400);
    // While playing, a clock that is 1.5s wrong projects the shared position
    // 1.5s wrong too: agreement is bounded by clock agreement. What must not
    // happen is the scrub being dropped (Alice stays at ~20) or undone.
    await expectInSync(both, { paused: false, atLeast: 397, tolerance: 2, holdMs: 12_000 });
});

test('quick alternating play, pause and scrub converge with real latency and skew', async ({ browser }, info) => {
    const { alice, bob, both } = await room(browser, info,
        { networkLatencyMs: 70, clockErrorMs: 250 },
        { networkLatencyMs: 90, clockErrorMs: -300 });
    let seed = 11;
    const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

    for (let step = 0; step < 16; step++) {
        const actor = random() < 0.5 ? alice : bob;
        const { paused } = await actor.state();
        let expectPaused = paused;
        let target: number | undefined;
        if (random() < 0.55) {
            if (paused) await actor.play();
            else await actor.pause();
            expectPaused = !paused;
        } else {
            target = Math.round(30 + random() * 500);
            await actor.clickTimeline(target);
        }
        await expectInSync(both, {
            paused: expectPaused,
            ...(target !== undefined ? { atLeast: target - 1 } : {}),
            tolerance: 1,
            holdMs: 1_500,
        }).catch((error: Error) => {
            throw new Error(`step ${step}: ${actor.name} ${target !== undefined ? `jumped to ${target}` : expectPaused ? 'paused' : 'played'}\n${error.message}`);
        });
        // Sometimes act again before anything had time to settle.
        await actor.page.waitForTimeout(Math.round(random() * 2_500));
    }
});
