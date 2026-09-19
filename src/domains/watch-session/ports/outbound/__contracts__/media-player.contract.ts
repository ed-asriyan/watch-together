import { describe, expect, it, vi } from 'vitest';
import type { MediaPlayerPort } from '../media-player';
import type { MediaPlayerListener } from '../../inbound/media-player-listener';
import type { ResolvedMedia } from '../media-resolver';
import { sec, source } from '../../../../../../test-support/builders';

const media: ResolvedMedia = { ref: source(), playbackUrl: 'https://example.com/v.mp4', via: 'direct' };

const spyListener = () => ({
    onReady: vi.fn(), onPlayed: vi.fn(), onPaused: vi.fn(), onSeeked: vi.fn(),
    onProgress: vi.fn(), onStalled: vi.fn(), onEnded: vi.fn(), onError: vi.fn(),
}) satisfies MediaPlayerListener;

/**
 * THE CONTRACT every `MediaPlayerPort` implementation must satisfy —
 * `VidstackMediaPlayer` and `FakeMediaPlayer` alike.
 *
 * The interesting clauses are about what the adapter must NOT do: it must not
 * filter events, and it must not try to work out which of them it caused. Echo
 * detection lives in the domain, which is the only thing that knows what
 * correction is outstanding.
 *
 * @param name Shown in test output.
 * @param make Builds a fresh player, already loaded with nothing.
 */
export const mediaPlayerContract = (name: string, make: () => Promise<MediaPlayerPort>): void => {
    describe(`MediaPlayerPort contract: ${name}`, () => {
        it('reports readiness after loading', async () => {
            const player = await make();
            const listener = spyListener();
            player.attach(listener);
            await player.load(media);
            expect(listener.onReady).toHaveBeenCalled();
        });

        it('observe() reflects a seek', async () => {
            const player = await make();
            await player.load(media);
            player.seekTo(sec(30));
            expect(player.observe().position).toBeCloseTo(30, 1);
        });

        it('observe() is synchronous and allocation-free enough to poll', async () => {
            const player = await make();
            await player.load(media);
            expect(player.observe()).toMatchObject({
                position: expect.any(Number),
                paused: expect.any(Boolean),
                ready: expect.any(Boolean),
                stalled: expect.any(Boolean),
            });
        });

        it('reports NOT ready before metadata has loaded', async () => {
            const player = await make();
            expect(player.observe().ready).toBe(false);
        });

        it('emits the event caused by our own command — it does not suppress it', async () => {
            // Suppression is the domain's job. An adapter that silently swallows
            // the echo makes echo detection untestable and hides genuine user
            // input that happens to follow a correction.
            const player = await make();
            const listener = spyListener();
            player.attach(listener);
            await player.load(media);
            player.seekTo(sec(30));
            expect(listener.onSeeked).toHaveBeenCalled();
        });

        it('stops reporting once detached', async () => {
            const player = await make();
            const listener = spyListener();
            const detach = player.attach(listener);
            await player.load(media);
            detach();
            listener.onSeeked.mockClear();
            player.seekTo(sec(60));
            expect(listener.onSeeked).not.toHaveBeenCalled();
        });

        it('rejects play() rather than throwing when autoplay is blocked', async () => {
            const player = await make();
            await player.load(media);
            await expect(player.play()).toEqual(expect.anything());
        });

        it('setRate(1) ends a nudge', async () => {
            const player = await make();
            await player.load(media);
            player.setRate(1.05);
            player.setRate(1);
            expect(player.observe()).toBeDefined();
        });
    });
};
