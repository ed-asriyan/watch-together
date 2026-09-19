import { describe, expect, it } from 'vitest';
import {
    isHalfDeliveredPlayhead, readActivities, readPlayhead, readSource,
    writeActivity, writePlayhead, writeSource,
} from './mappers';
import { supersedes } from '../../../domains/watch-session/model/shared/stamped';
import { classify } from '../media/classify';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { Stamped } from '../../../domains/watch-session/model/shared/stamped';
import { ALICE, T0, activity, at, intent, sec } from '../../../../test-support/builders';

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

    it('stamps both nodes identically, which is what tells a split write from a lone one', () => {
        const dto = writePlayhead(intent({ position: sec(7), paused: false }, T0, ALICE));
        expect(dto.currentTime.updatedAt).toBe(dto.paused.updatedAt);
        expect(dto.currentTime.by).toBe(dto.paused.by);
    });
});

/**
 * THE HALF-DELIVERED PAIR.
 *
 * `currentTime` and `paused` are one value in two nodes and there is a
 * listener on each, so a write that sets both arrives as two events. What the
 * room holds between them is the reason a client could paste a link, press
 * play, and sit frozen at zero while everybody else watched on.
 */
describe('half-delivered playhead', () => {
    const playing = writePlayhead(intent({ position: sec(30), paused: false }, at(10_000), ALICE));
    const wasPaused = writePlayhead(intent({ position: sec(0), paused: true }, T0, ALICE)).paused;

    it('is what the join would fabricate: a position and a paused flag from different writes', () => {
        const hybrid = readPlayhead({ currentTime: playing.currentTime, paused: wasPaused })!;

        // Nobody wrote this. The position comes from the new write, the paused
        // flag from the old one — and it carries the NEW timestamp.
        expect(hybrid.value).toEqual({ position: 30, paused: true, rate: 1 });
        expect(hybrid.at).toBe(at(10_000));
    });

    it('would outrank the truth for good, because `true` ranks above `false`', () => {
        const hybrid = readPlayhead({ currentTime: playing.currentTime, paused: wasPaused })!;
        const truth = readPlayhead({ currentTime: playing.currentTime, paused: playing.paused })!;

        // Same time, same author: the merge falls through to the value, and
        // the fabricated pause wins. Applying the hybrid first therefore
        // discards the real intent permanently — no later event repairs it.
        expect(supersedes(hybrid, truth)).toBe(true);
        expect(supersedes(truth, hybrid)).toBe(false);
    });

    it('is detected while the other half is still in flight', () => {
        expect(isHalfDeliveredPlayhead({ currentTime: playing.currentTime, paused: wasPaused })).toBe(true);
    });

    it('is detected whichever half arrives first', () => {
        const wasAt = writePlayhead(intent({ position: sec(0), paused: true }, T0, ALICE)).currentTime;
        expect(isHalfDeliveredPlayhead({ currentTime: wasAt, paused: playing.paused })).toBe(true);
    });

    it('is not claimed once both halves are in', () => {
        expect(isHalfDeliveredPlayhead({ currentTime: playing.currentTime, paused: playing.paused })).toBe(false);
    });

    it('is not claimed for a legacy client, which really does write one node alone', () => {
        // `legacy/stores/room/index.ts:62` pauses a stale room by writing
        // `paused` and nothing else. No author tag, and the mismatch is real.
        const legacyPause = { value: true, updatedAt: 1_700_000_020 };
        expect(isHalfDeliveredPlayhead({ currentTime: playing.currentTime, paused: legacyPause })).toBe(false);
        expect(readPlayhead({ currentTime: playing.currentTime, paused: legacyPause })?.value.paused).toBe(true);
    });

    it('is not claimed when a node is simply absent', () => {
        expect(isHalfDeliveredPlayhead({ currentTime: playing.currentTime })).toBe(false);
        expect(isHalfDeliveredPlayhead({ paused: playing.paused })).toBe(false);
        expect(isHalfDeliveredPlayhead({})).toBe(false);
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
