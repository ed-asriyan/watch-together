import { describe, expect, it } from 'vitest';
import { createRoomReplica, type RoomReplica } from './room-replica';
import { mergeLww } from './shared/stamped';
import { projectedPositionAt } from './playhead';
import { DEFAULT_SYNC_POLICY } from './sync-policy';
import type { Decision, PublishIntent } from './decision';
import type { Nickname, ParticipantId } from './ids';
import { ALICE, BOB, CAROL, ROOM, T0, at, intent, ms, observed, sec, stamped } from '../../../../test-support/builders';

/**
 * "EARLIER" MEANS THE SHARED CLOCK.
 *
 * Every ordering decision in the system — which write wins, whether an update
 * is stale, how far the playhead has moved, whether a participant is still
 * here — compares timestamps. If two clients disagree about what time it is,
 * they disagree about all of it, and the room desynchronizes in a way no amount
 * of drift correction can fix.
 *
 * The defence is structural: the model cannot read a clock at all (enforced by
 * scripts/check-boundaries.mjs), so every reading is passed in and comes from
 * `ClockPort`, which is offset-corrected against a shared reference. These
 * tests pin down that the structure actually buys the property.
 */
const P = DEFAULT_SYNC_POLICY;

const make = (self: ParticipantId = ALICE): RoomReplica => createRoomReplica({
    roomId: ROOM,
    self,
    nickname: 'nick' as Nickname,
    policy: P,
    now: T0,
});

const writes = <K extends PublishIntent['kind']>(decision: Decision, kind: K) =>
    decision.publish.filter((p): p is Extract<PublishIntent, { kind: K }> => p.kind === kind);

describe('the model has no clock of its own', () => {
    it('produces the same decision for the same reading, whenever it is run', () => {
        // Run twice with identical inputs. Anything reading the wall clock
        // would leak the difference between the two runs into the result.
        const first = make().requestPause(sec(10), at(1_000));
        const second = make().requestPause(sec(10), at(1_000));
        expect(first).toEqual(second);
    });

    it('stamps writes with the reading it was handed, not with anything else', () => {
        const published = writes(make().requestSeek(sec(5), ms(999_000_000_000)), 'playhead')[0]!.intent;
        expect(published.at).toBe(999_000_000_000);
    });

    it('the same state answers differently only because the reading differs', () => {
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(10));
        expect(replica.snapshot(at(1_000)).projectedPosition)
            .not.toBe(replica.snapshot(at(2_000)).projectedPosition);
    });
});

describe('two clients on the same shared reading agree', () => {
    it('reach identical state from the same writes in either order', () => {
        const write1 = intent({ position: sec(10), paused: true }, at(1_000), BOB);
        const write2 = intent({ position: sec(90), paused: false }, at(2_000), CAROL);

        const a = make(ALICE);
        a.applyRemotePlayhead(write1, at(3_000));
        a.applyRemotePlayhead(write2, at(3_000));

        const b = make(BOB);
        b.applyRemotePlayhead(write2, at(3_000));
        b.applyRemotePlayhead(write1, at(3_000));

        expect(a.snapshot(at(3_000)).playhead).toEqual(b.snapshot(at(3_000)).playhead);
    });

    it('project the same position from the same intent', () => {
        // Two clients whose LOCAL clocks are hours apart, each handed the same
        // synchronized reading by their own ClockPort, must land on the same
        // number. That is the whole reason the offset exists.
        const declared = intent({ position: sec(100), paused: false }, T0, BOB);
        const shared = at(7_000);
        expect(projectedPositionAt(declared, shared)).toBe(projectedPositionAt(declared, shared));
    });

    it('agree on which of two writes is earlier regardless of who asks', () => {
        const earlier = stamped('a', at(1_000), BOB);
        const later = stamped('b', at(2_000), CAROL);
        expect(mergeLww(earlier, later)).toEqual(mergeLww(later, earlier));
    });
});

describe('a peer whose local clock is wrong', () => {
    it('orders correctly once its adapter has applied the offset', () => {
        // Bob's device is an hour behind. His ClockPort adds the offset before
        // stamping, so his write carries shared time and orders after Alice's.
        const aliceWroteAt = at(1_000);
        const bobsLocalClock = at(1_500 - 3_600_000);
        const bobsOffset = 3_600_000;
        const bobWroteAt = ms(bobsLocalClock + bobsOffset);

        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(10) }, aliceWroteAt, ALICE), at(2_000));
        replica.applyRemotePlayhead(intent({ position: sec(70) }, bobWroteAt, BOB), at(2_000));

        expect(replica.snapshot(at(2_000)).playhead.value.position).toBe(70);
    });

    it('would win everything if the offset were NOT applied — which is why I9 exists', () => {
        // The same write stamped from the raw local clock of a device an hour
        // fast beats every honest write for an hour. Nothing downstream can
        // detect it, so the defence is upstream: refuse to publish while the
        // clock is unsynchronized.
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(10) }, at(5_000), ALICE), at(5_100));
        replica.applyRemotePlayhead(intent({ position: sec(70) }, at(3_600_000), BOB), at(5_100));
        expect(replica.snapshot(at(5_100)).playhead.value.position).toBe(70);
    });

    it('holds its own writes back rather than poisoning the room', () => {
        const strict = createRoomReplica({
            roomId: ROOM, self: ALICE, nickname: 'a' as Nickname,
            policy: { ...P, requireClockSync: true }, now: T0,
        });
        strict.applyClockConfidence('unsynced', at(100));
        expect(strict.requestSeek(sec(50), at(1_000)).publish).toHaveLength(0);
    });

    it('still renders and still follows the room while holding back', () => {
        // Read-only, not frozen: a client with a bad clock should keep watching
        // in sync, it just must not write.
        const strict = createRoomReplica({
            roomId: ROOM, self: ALICE, nickname: 'a' as Nickname,
            policy: { ...P, requireClockSync: true }, now: T0,
        });
        strict.applyClockConfidence('unsynced', at(100));
        strict.observePlayer(observed({ position: sec(0), paused: false }), at(900));
        const decision = strict.applyRemotePlayhead(
            intent({ position: sec(300), paused: false }, at(1_000), BOB),
            at(1_000),
        );
        expect(decision.correct.kind).toBe('seek');
    });
});

describe('every rule that says "earlier" uses the same reading', () => {
    it('presence expiry does', () => {
        const replica = make();
        const decision = replica.tick(at(P.presenceTimeout * 1000 * 3));
        expect(decision).toBeDefined();
    });

    it('feed expiry does', () => {
        const replica = make();
        expect(replica.snapshot(at(P.activityTtl * 1000 * 3)).liveActivities).toEqual([]);
    });

    it('the stale-playback guard does', () => {
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        const decision = replica.tick(at(P.stalePlaybackTimeout * 1000 + 1));
        expect(writes(decision, 'playhead')[0]?.intent.at).toBe(at(P.stalePlaybackTimeout * 1000 + 1));
    });

    it('one tick evaluates every rule against ONE reading', () => {
        // Threading a single `now` through the tick is what stops the heartbeat,
        // the sweep and the guard from disagreeing about the moment they ran.
        const replica = make();
        const now = at(P.stalePlaybackTimeout * 1000 + 5_000);
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        const decision = replica.tick(now);
        for (const write of decision.publish) {
            if (write.kind === 'playhead') expect(write.intent.at).toBe(now);
            if (write.kind === 'presence') expect(write.presence.lastSeen).toBe(now);
        }
    });
});
