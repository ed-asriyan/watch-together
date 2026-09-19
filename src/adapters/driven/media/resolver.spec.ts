import { describe, expect, it } from 'vitest';
import { classify, providerPath } from './classify';

/**
 * The store holds what the user pasted; the player wants a provider path. The
 * conversion happens at playback time, and only there — deriving it earlier is
 * what made a pasted YouTube link vanish for everybody else in the room.
 */
describe('provider paths', () => {
    it.each([
        ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'youtube/dQw4w9WgXcQ'],
        ['https://youtu.be/dQw4w9WgXcQ', 'youtube/dQw4w9WgXcQ'],
        ['https://vimeo.com/123456', 'vimeo/123456'],
    ])('%s plays as %s', (raw, expected) => {
        expect(providerPath(classify(raw)!)).toBe(expected);
    });

    it.each([
        'https://example.com/film.mp4',
        'https://example.com/stream.m3u8',
        'magnet:?xt=urn:btih:deadbeef',
    ])('leaves %s alone', (raw) => {
        expect(providerPath(classify(raw)!)).toBeNull();
    });

    it('keeps the raw input as the locator, so it can be read back', () => {
        const raw = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
        expect(classify(raw)?.locator).toBe(raw);
        expect(classify(classify(raw)!.locator)).toEqual(classify(raw));
    });
});
