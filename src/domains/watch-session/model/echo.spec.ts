import { describe, expect, it } from 'vitest';
import { hasSettled, isEcho, type IssuedCorrection, type PlayerObservation } from './echo';
import { DEFAULT_SYNC_POLICY } from './sync-policy';
import { T0, at, sec } from '../../../../test-support/builders';

const P = DEFAULT_SYNC_POLICY;

const issued = (correction: IssuedCorrection['correction'], atMs = T0): IssuedCorrection =>
    ({ correction, issuedAt: atMs, seq: 1 });

const seeked = (position: number): PlayerObservation => ({ type: 'seeked', position: sec(position) });

describe('isEcho', () => {
    it('is false when no correction is outstanding', () => {
        expect(isEcho(seeked(100), null, T0, P)).toBe(false);
    });

    it('recognises the seek we just asked for', () => {
        expect(isEcho(seeked(100), issued({ kind: 'seek', to: sec(100) }), at(50), P)).toBe(true);
    });

    it('tolerates the element landing a keyframe away', () => {
        const nearby = P.echoPositionTolerance / 2;
        expect(isEcho(seeked(100 + nearby), issued({ kind: 'seek', to: sec(100) }), at(50), P)).toBe(true);
    });

    it('does NOT absorb a user seek that happens to follow ours', () => {
        expect(isEcho(seeked(400), issued({ kind: 'seek', to: sec(100) }), at(50), P)).toBe(false);
    });

    it('stops absorbing once the suppression window closes', () => {
        const late = at(P.echoSuppressionWindow + 1);
        expect(isEcho(seeked(100), issued({ kind: 'seek', to: sec(100) }), late, P)).toBe(false);
    });

    it('matches a pause to the halt that caused it', () => {
        const observation: PlayerObservation = { type: 'paused', position: sec(100) };
        expect(isEcho(observation, issued({ kind: 'halt', at: sec(100) }), at(50), P)).toBe(true);
    });

    it('matches a play to the resume that caused it', () => {
        const observation: PlayerObservation = { type: 'played', position: sec(100) };
        expect(isEcho(observation, issued({ kind: 'resume', from: sec(100) }), at(50), P)).toBe(true);
    });

    it('does not cross-match a pause against a resume', () => {
        const observation: PlayerObservation = { type: 'paused', position: sec(100) };
        expect(isEcho(observation, issued({ kind: 'resume', from: sec(100) }), at(50), P)).toBe(false);
    });

    it('never treats ordinary progress as an echo', () => {
        const observation: PlayerObservation = { type: 'progress', position: sec(100) };
        expect(isEcho(observation, issued({ kind: 'seek', to: sec(100) }), at(50), P)).toBe(false);
    });

    it('a nudge produces no echo to absorb', () => {
        const nudge = { kind: 'nudge' as const, rate: 1.05, until: at(2_000) };
        expect(isEcho(seeked(100), issued(nudge), at(50), P)).toBe(false);
    });
});

describe('hasSettled', () => {
    it('is false inside the window', () => {
        expect(hasSettled(issued({ kind: 'seek', to: sec(1) }), at(10), P)).toBe(false);
    });

    it('is true once the window closes, echo or no echo', () => {
        // A correction the element silently ignored must not suppress real user
        // events forever.
        expect(hasSettled(issued({ kind: 'seek', to: sec(1) }), at(P.echoSuppressionWindow + 1), P)).toBe(true);
    });
});
