import { describe, expect, it } from 'vitest';
import { heartbeatDue, isOnline, onlineOnly, staleIds } from './presence-policy';
import { DEFAULT_SYNC_POLICY } from './sync-policy';
import { ALICE, BOB, CAROL, T0, at, presence } from '../../../../test-support/builders';

const P = DEFAULT_SYNC_POLICY;
const TIMEOUT_MS = P.presenceTimeout * 1000;

describe('isOnline', () => {
    it('counts a participant seen just now', () => {
        expect(isOnline(presence(ALICE, T0), T0, P)).toBe(true);
    });

    it('drops one last seen beyond the timeout', () => {
        expect(isOnline(presence(ALICE, T0), at(TIMEOUT_MS + 1), P)).toBe(false);
    });

    it('keeps one still inside the timeout', () => {
        expect(isOnline(presence(ALICE, T0), at(TIMEOUT_MS - 1), P)).toBe(true);
    });

    it('is evaluated against the CURRENT reading, every time', () => {
        // The legacy bug, encoded. `bound-users.ts:32` captured `now()` outside
        // its subscription callback, so the cut-off froze at subscribe time and
        // a disconnected participant stayed "online" indefinitely. There is no
        // way to express that here — `now` is an argument — and this test says
        // so out loud.
        const stale = presence(ALICE, T0);
        expect(isOnline(stale, T0, P)).toBe(true);
        expect(isOnline(stale, at(TIMEOUT_MS * 10), P)).toBe(false);
    });
});

describe('onlineOnly / staleIds', () => {
    const all = [
        presence(ALICE, at(TIMEOUT_MS - 1)),
        presence(BOB, T0),
        presence(CAROL, at(TIMEOUT_MS - 1)),
    ];
    const now = at(TIMEOUT_MS + 500);

    it('keeps exactly the participants still inside the timeout', () => {
        expect(onlineOnly(all, now, P).map((p) => p.participantId)).toEqual([ALICE, CAROL]);
    });

    it('reports exactly the ones it dropped — one rule, not two copies of it', () => {
        // Legacy filtered with `onlineTimeout = 13` and swept with a hardcoded
        // `10`, so the two answers disagreed by three seconds.
        expect([...staleIds(all, now, P)]).toEqual([BOB]);
    });

    it('online and stale partition the set', () => {
        const online = onlineOnly(all, now, P).map((p) => p.participantId);
        const stale = staleIds(all, now, P);
        expect([...online, ...stale].sort()).toEqual(all.map((p) => p.participantId).sort());
    });

    it('handles an empty room', () => {
        expect(onlineOnly([], now, P)).toEqual([]);
        expect(staleIds([], now, P)).toEqual([]);
    });
});

describe('heartbeatDue', () => {
    it('is due when presence has never been published', () => {
        expect(heartbeatDue(null, T0, P)).toBe(true);
    });

    it('is not due before the interval elapses', () => {
        expect(heartbeatDue(T0, at(P.presenceHeartbeat * 1000 - 1), P)).toBe(false);
    });

    it('is due once the interval elapses', () => {
        expect(heartbeatDue(T0, at(P.presenceHeartbeat * 1000), P)).toBe(true);
    });
});
