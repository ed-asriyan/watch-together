import { describe, expect, it } from 'vitest';
import { readSource, writeSource, readPlayhead, writePlayhead, readActivities, writeActivity } from './mappers';
import { classify } from '../media/classify';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { Stamped } from '../../../domains/watch-session/model/shared/stamped';
import { ALICE, T0, activity, intent, sec } from '../../../../test-support/builders';

/**
 * ROUND TRIPS.
 *
 * Everything the room agrees on goes out through a mapper and comes back
 * through its opposite. A value that does not survive that trip looks exactly
 * like "the other client never sent it" — which is precisely how this was
 * first reported.
 */
const stampedSource = (ref: MediaSourceRef | null): Stamped<MediaSourceRef | null> =>
    ({ value: ref, at: T0, by: ALICE });

describe('source round trip', () => {
    it.each([
        'https://example.com/film.mp4',
        'https://example.com/stream.m3u8',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'https://youtu.be/dQw4w9WgXcQ',
        'https://vimeo.com/123456',
        'magnet:?xt=urn:btih:deadbeef',
    ])('survives being written and read back: %s', (raw) => {
        const original = classify(raw);
        expect(original).not.toBeNull();

        const read = readSource({ url: writeSource(stampedSource(original)) }, classify);

        expect(read?.value).toEqual(original);
    });

    it('keeps the stamp, or LWW loses its authority', () => {
        const original = classify('https://example.com/film.mp4')!;
        const read = readSource({ url: writeSource(stampedSource(original)) }, classify);
        expect(read).toMatchObject({ at: T0, by: ALICE });
    });

    it('carries a cleared source through as cleared', () => {
        const read = readSource({ url: writeSource(stampedSource(null)) }, classify);
        expect(read?.value).toBeNull();
    });

    it('still reads what a legacy client wrote — a raw URL with no author', () => {
        const read = readSource({ url: { value: 'https://example.com/old.mp4', updatedAt: 1_700_000 } }, classify);
        expect(read?.value).toMatchObject({ kind: 'direct' });
    });
});

describe('playhead round trip', () => {
    it('survives, position, paused, rate and stamp together', () => {
        const original = intent({ position: sec(123.5), paused: false, rate: 1 }, T0, ALICE);
        const dto = writePlayhead(original);
        const read = readPlayhead({ currentTime: dto.currentTime, paused: dto.paused });
        expect(read).toEqual(original);
    });

    it('survives a paused playhead', () => {
        const original = intent({ position: sec(7), paused: true, rate: 1 }, T0, ALICE);
        const dto = writePlayhead(original);
        expect(readPlayhead({ currentTime: dto.currentTime, paused: dto.paused })).toEqual(original);
    });
});

describe('activity round trip', () => {
    it('survives a chat message', () => {
        const original = activity('m1', T0, { kind: 'chat', text: 'hello' }, ALICE);
        const read = readActivities({ messages: { m1: writeActivity(original) } });
        expect(read[0]).toEqual(original);
    });

    it('survives a reaction', () => {
        const original = activity('r1', T0, { kind: 'reaction', emoji: '🔥' }, ALICE);
        const read = readActivities({ messages: { r1: writeActivity(original) } });
        expect(read[0]).toEqual(original);
    });

    it('survives a notice', () => {
        const original = activity('n1', T0, { kind: 'notice', notice: { type: 'seeked', to: sec(90) } }, ALICE);
        const read = readActivities({ messages: { n1: writeActivity(original) } });
        expect(read[0]).toEqual(original);
    });
});
