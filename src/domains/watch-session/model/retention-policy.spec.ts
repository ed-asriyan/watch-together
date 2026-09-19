import { describe, expect, it } from 'vitest';
import { expiredIds, isExpired, liveOnly, sweepDue } from './retention-policy';
import { DEFAULT_SYNC_POLICY } from './sync-policy';
import { T0, activity, at } from '../../../../test-support/builders';

const P = DEFAULT_SYNC_POLICY;
const TTL_MS = P.activityTtl * 1000;

describe('isExpired', () => {
    it('keeps an item just posted', () => {
        expect(isExpired(activity('m1', T0), T0, P)).toBe(false);
    });

    it('keeps an item inside its lifetime', () => {
        expect(isExpired(activity('m1', T0), at(TTL_MS - 1), P)).toBe(false);
    });

    it('drops an item past its lifetime', () => {
        expect(isExpired(activity('m1', T0), at(TTL_MS + 1), P)).toBe(true);
    });

    it('is computed from the timestamp, never stored', () => {
        // Two replicas evaluating the same item at the same reading must agree.
        // Storing an expiry flag would let them disagree about what is visible.
        const item = activity('m1', T0);
        const now = at(TTL_MS + 1);
        expect(isExpired(item, now, P)).toBe(isExpired({ ...item }, now, P));
    });
});

describe('liveOnly / expiredIds', () => {
    const all = [
        activity('old', T0),
        activity('fresh', at(TTL_MS)),
        activity('older', at(-1_000)),
    ];
    const now = at(TTL_MS + 500);

    it('keeps only the unexpired items', () => {
        expect(liveOnly(all, now, P).map((a) => a.id)).toEqual(['fresh']);
    });

    it('reports exactly the ids to retract remotely', () => {
        expect([...expiredIds(all, now, P)].sort()).toEqual(['old', 'older']);
    });

    it('live and expired partition the feed', () => {
        const live = liveOnly(all, now, P).map((a) => a.id);
        const gone = expiredIds(all, now, P);
        expect([...live, ...gone].sort()).toEqual(all.map((a) => a.id).sort());
    });
});

describe('sweepDue', () => {
    it('is due when nothing has been swept yet', () => {
        expect(sweepDue(null, T0, P)).toBe(true);
    });

    it('is not due before the interval elapses', () => {
        expect(sweepDue(T0, at(P.activitySweepInterval * 1000 - 1), P)).toBe(false);
    });

    it('is due once the interval elapses', () => {
        expect(sweepDue(T0, at(P.activitySweepInterval * 1000), P)).toBe(true);
    });
});
