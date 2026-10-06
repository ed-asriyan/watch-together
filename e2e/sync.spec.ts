import { test, expect } from '@playwright/test';
import { Viewer, VIDEO, expectInSync, roomFor } from './support/viewer';

/**
 * Two people, one room, one film. Every action goes through the controls a
 * person would use; every assertion is about what each of them actually sees.
 */

const room = async (browser: import('@playwright/test').Browser, info: import('@playwright/test').TestInfo,
    options: { aliceLatencyMs?: number; bobLatencyMs?: number } = {}) => {
    const id = roomFor(info);
    const alice = await Viewer.join(browser, id, 'alice', { mediaLatencyMs: options.aliceLatencyMs });
    const bob = await Viewer.join(browser, id, 'bob', { mediaLatencyMs: options.bobLatencyMs });
    await alice.pasteSource(VIDEO);
    await alice.waitUntilReady();
    await bob.waitUntilReady();
    await expectInSync([alice, bob], { paused: true, near: 0, holdMs: 0 });
    return { alice, bob, both: [alice, bob] as const };
};

test.describe('two viewers stay together', () => {
    test('a play by one starts the other', async ({ browser }, info) => {
        const { alice, both } = await room(browser, info);
        await alice.play();
        await expectInSync(both, { paused: false });
    });

    test('a pause by either stops both on the same frame', async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info);
        await alice.play();
        await expectInSync(both, { paused: false });

        await bob.pause();
        await expectInSync(both, { paused: true, tolerance: 0.5 });

        await bob.play();
        await expectInSync(both, { paused: false });

        await alice.pause();
        await expectInSync(both, { paused: true, tolerance: 0.5 });
    });

    test('a scrub by either, forwards or back, takes the other along', async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info);
        await alice.play();
        await expectInSync(both, { paused: false });

        await alice.scrubTo(300);
        await expectInSync(both, { paused: false, atLeast: 299 });

        await bob.scrubTo(120);
        await expectInSync(both, { paused: false, near: 121, tolerance: 2.5 });

        await bob.clickTimeline(450);
        await expectInSync(both, { paused: false, atLeast: 449 });
    });

    test('a scrub while paused moves the other without starting it', async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info);
        await bob.scrubTo(200);
        await expectInSync(both, { paused: true, near: 200, tolerance: 1 });

        await alice.clickTimeline(60);
        await expectInSync(both, { paused: true, near: 60, tolerance: 1 });
    });

    test('a viewer joining mid-film lands where the room is', async ({ browser }, info) => {
        const { alice, bob } = await room(browser, info);
        await alice.play();
        await alice.clickTimeline(240);
        await expectInSync([alice, bob], { paused: false, atLeast: 239 });

        const carol = await Viewer.join(browser, (new URL(alice.page.url())).hash.slice(1), 'carol');
        await carol.waitUntilReady();
        await expectInSync([alice, bob, carol], { paused: false, atLeast: 240 });
    });

    test('pressing buttons on both sides in quick succession always converges', async ({ browser }, info) => {
        // The reported "sometimes it does not sync": alternating play, pause
        // and scrubs between two people, with the next action coming before
        // the room has necessarily settled from the last one.
        const { alice, bob, both } = await room(browser, info);
        let seed = 7;
        const random = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);

        for (let step = 0; step < 14; step++) {
            const actor = step % 2 === 0 ? alice : bob;
            const { paused } = await actor.state();
            const choice = random();
            let expectPaused = paused;
            let target: number | undefined;
            if (choice < 0.5) {
                if (paused) await actor.play();
                else await actor.pause();
                expectPaused = !paused;
            } else {
                target = Math.round(30 + random() * 500);
                await actor.scrubTo(target);
            }
            await expectInSync(both, {
                paused: expectPaused,
                ...(target !== undefined ? { atLeast: target - 1 } : {}),
                tolerance: 1,
                holdMs: 1_500,
            }).catch((error: Error) => {
                throw new Error(`step ${step}: ${actor.name} ${target !== undefined ? `scrubbed to ${target}` : expectPaused ? 'paused' : 'played'}\n${error.message}`);
            });
        }
    });
});

test.describe('on a slow connection', () => {
    // 1.5s per media request: every seek and every start has to buffer, the
    // way it does against a real CDN and unlike localhost, where it is instant.
    const LATENCY = 1_500;

    test('a scrub by the viewer who has to buffer is published, not snapped back', async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info, { bobLatencyMs: LATENCY });
        await alice.play();
        // Only "both are playing": the slow viewer may still be catching up.
        await expectInSync(both, { paused: false, tolerance: 2, holdMs: 0, timeout: 15_000 });

        await bob.scrubTo(320);
        await expectInSync(both, { paused: false, atLeast: 319, tolerance: 1.5, timeout: 15_000 });

        await bob.scrubTo(90);
        await expectInSync(both, { paused: false, near: 92, tolerance: 4, timeout: 15_000 });
    });

    test('a pause by the viewer who is buffering is published, not resumed', async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info, { bobLatencyMs: LATENCY });
        await alice.play();
        // Only "both are playing": the slow viewer may still be catching up.
        await expectInSync(both, { paused: false, tolerance: 2, holdMs: 0, timeout: 15_000 });

        // Scrub somewhere unbuffered and pause straight away, mid-buffering.
        await bob.clickTimeline(400);
        await bob.pause();
        await expectInSync(both, { paused: true, atLeast: 399, tolerance: 1, timeout: 15_000 });
    });

    test('a play that has to buffer first is published', async ({ browser }, info) => {
        const { alice, bob, both } = await room(browser, info, { aliceLatencyMs: LATENCY });
        await bob.clickTimeline(500);
        await expectInSync(both, { paused: true, near: 500, timeout: 15_000 });

        await alice.play();
        await expectInSync(both, { paused: false, atLeast: 500, tolerance: 1.5, timeout: 15_000 });
    });
});

test.describe('the room outlives its driver', () => {
    test('the others keep watching when the person who pressed play leaves', async ({ browser }, info) => {
        test.slow();
        const { alice, bob } = await room(browser, info);
        await alice.play();
        await expectInSync([alice, bob], { paused: false });

        await alice.leave();
        // The stale-playback guard fires after 60s of silence. Somebody still
        // watching is not silence.
        await bob.page.waitForTimeout(75_000);
        expect((await bob.state()).paused, 'bob was paused by the room after alice left').toBe(false);
    });
});

test.describe('controls that are not playback', () => {
    test('unmuting sticks', async ({ browser }, info) => {
        const { alice } = await room(browser, info);
        await alice.play();
        await alice.unmute();
        await expect.poll(async () => (await alice.state()).muted).toBe(false);
        await alice.page.waitForTimeout(3_000);
        expect((await alice.state()).muted, 'the player muted itself again').toBe(false);
    });

    test('typing a link publishes the link, not every keystroke of it', async ({ browser }, info) => {
        // Every keystroke used to be published: each prefix that parsed as a
        // URL ("http://l", "http://lo", …) became the room's source, reset
        // everyone's playhead to 0 and sent every other viewer off to load it.
        const id = roomFor(info);
        const alice = await Viewer.join(browser, id, 'alice');
        const bob = await Viewer.join(browser, id, 'bob');

        await alice.typeSource(VIDEO);
        await bob.waitUntilReady();
        await expect.poll(() => bob.sourcePushes.at(-1)).toBe(VIDEO);

        expect(bob.sourcePushes, 'the room was told to watch partial links').toEqual([VIDEO]);
    });
});
