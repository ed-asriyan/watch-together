// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { VidstackMediaPlayer } from './media-player';
import type { ResolvedMedia } from '../../../domains/watch-session/ports/outbound/media-resolver';
import type { Seconds } from '../../../domains/watch-session/model/shared/time';
import { source } from '../../../../test-support/builders';

const media: ResolvedMedia = { ref: source(), playbackUrl: 'https://cdn/x.mp4', via: 'direct' };

/** The smallest stand-in for the custom element this adapter drives. */
const fakeElement = (play: () => Promise<void>) => {
    const element = document.createElement('div') as unknown as HTMLElement & {
        muted: boolean;
        paused: boolean;
        currentTime: number;
        playbackRate: number;
        src: string;
        state: { duration: number };
        play: () => Promise<void>;
        pause: () => Promise<void>;
    };
    element.muted = false;
    element.paused = true;
    element.currentTime = 0;
    element.playbackRate = 1;
    element.state = { duration: 0 };
    element.play = play;
    element.pause = async () => undefined;
    return element;
};

describe('VidstackMediaPlayer', () => {
    it('starts muted, because a resume can arrive without a user gesture', () => {
        const player = new VidstackMediaPlayer();
        const element = fakeElement(async () => undefined);
        player.mount(element);
        expect(element.muted).toBe(true);
    });

    it('retries muted when the browser refuses audible playback', async () => {
        // The realistic failure: somebody ELSE pressed play, so this client has
        // no gesture to spend. A muted picture beats one viewer silently
        // stranded while the room watches on.
        const play = vi.fn()
            .mockRejectedValueOnce(new DOMException('gesture required', 'NotAllowedError'))
            .mockResolvedValueOnce(undefined);
        const player = new VidstackMediaPlayer();
        const element = fakeElement(play as () => Promise<void>);
        player.mount(element);
        element.muted = false;

        await player.play();

        expect(play).toHaveBeenCalledTimes(2);
        expect(element.muted).toBe(true);
    });

    it('reports position and paused state synchronously', async () => {
        const player = new VidstackMediaPlayer();
        const element = fakeElement(async () => undefined);
        player.mount(element);
        await player.load(media);
        element.currentTime = 42;
        element.state = { duration: 600 };

        expect(player.observe()).toMatchObject({ position: 42, paused: true });
    });

    it('hands the element the resolved URL, never a raw source', async () => {
        const player = new VidstackMediaPlayer();
        const element = fakeElement(async () => undefined);
        player.mount(element);
        await player.load(media);
        expect(element.src).toBe('https://cdn/x.mp4');
    });

    it('seeking moves the element', () => {
        const player = new VidstackMediaPlayer();
        const element = fakeElement(async () => undefined);
        player.mount(element);
        player.seekTo(30 as Seconds);
        expect(element.currentTime).toBe(30);
    });

    it('stops reporting once unmounted', () => {
        const player = new VidstackMediaPlayer();
        const element = fakeElement(async () => undefined);
        const listener = { onSeeked: vi.fn() } as never;
        player.attach(listener);
        player.mount(element);
        player.unmount();
        element.dispatchEvent(new Event('seeked'));
        expect(player.observe().ready).toBe(false);
    });
});
