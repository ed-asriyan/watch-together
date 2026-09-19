import { describe, expect, it } from 'vitest';
import { isAdvancing, projectedPositionAt, silentFor } from './playhead';
import { T0, at, intent, sec } from '../../../../test-support/builders';

describe('projectedPositionAt', () => {
    it('does not move while paused, however much time passes', () => {
        const paused = intent({ position: sec(100), paused: true });
        expect(projectedPositionAt(paused, T0)).toBe(100);
        expect(projectedPositionAt(paused, at(60_000))).toBe(100);
    });

    it('advances one second per second while playing', () => {
        const playing = intent({ position: sec(100), paused: false });
        expect(projectedPositionAt(playing, at(5_000))).toBeCloseTo(105, 6);
    });

    it('advances by the declared rate', () => {
        const fast = intent({ position: sec(100), paused: false, rate: 1.5 });
        expect(projectedPositionAt(fast, at(10_000))).toBeCloseTo(115, 6);
    });

    it('returns the declared position at the instant it was declared', () => {
        const playing = intent({ position: sec(42), paused: false });
        expect(projectedPositionAt(playing, T0)).toBeCloseTo(42, 6);
    });

    it('never projects backwards for a reading older than the stamp', () => {
        // Clock skew can hand us a `now` before `at`. Extrapolating backwards
        // would make a peer seek into the past for no reason.
        const playing = intent({ position: sec(100), paused: false }, at(10_000));
        expect(projectedPositionAt(playing, T0)).toBeGreaterThanOrEqual(100);
    });
});

describe('silentFor', () => {
    it('measures how long the intent has gone unrestated', () => {
        expect(silentFor(intent({}, T0), at(30_000))).toBeCloseTo(30, 6);
    });

    it('is zero at the moment of declaration', () => {
        expect(silentFor(intent({}, T0), T0)).toBeCloseTo(0, 6);
    });
});

describe('isAdvancing', () => {
    it('is false while paused', () => {
        expect(isAdvancing(intent({ paused: true }))).toBe(false);
    });

    it('is true while playing', () => {
        expect(isAdvancing(intent({ paused: false }))).toBe(true);
    });

    it('is false at rate zero, even when not paused', () => {
        expect(isAdvancing(intent({ paused: false, rate: 0 }))).toBe(false);
    });
});
