import { beforeEach, describe, expect, it } from 'vitest';
import { createRoomReplica, type RoomReplica } from './room-replica';
import { DEFAULT_SYNC_POLICY, type SyncPolicy } from './sync-policy';
import type { Decision, PublishIntent } from './decision';
import type { Correction } from './reconcile';
import type { Nickname } from './ids';
import {
    ALICE, BOB, CAROL, ROOM, T0, at, intent, observed, sec, source, stamped,
} from '../../../../test-support/builders';

/**
 * DESYNCHRONIZATION SCENARIOS.
 *
 * The rest of the suite pins down each rule on its own. This file is about the
 * rules meeting each other: a local playhead and an incoming one disagreeing, a
 * player that is still buffering, updates arriving late, out of order, twice,
 * or from a peer whose clock is wrong. It is the code the whole refactor exists
 * to make testable, so it gets its own file.
 */

const P = DEFAULT_SYNC_POLICY;
const HARD_MS = P.hardSeekThreshold * 1000;

const make = (policy: SyncPolicy = P): RoomReplica => createRoomReplica({
    roomId: ROOM,
    self: ALICE,
    nickname: 'alice' as Nickname,
    policy,
    now: T0,
});

const writes = <K extends PublishIntent['kind']>(decision: Decision, kind: K) =>
    decision.publish.filter((p): p is Extract<PublishIntent, { kind: K }> => p.kind === kind);

const seekTarget = (correction: Correction): number => {
    expect(correction.kind).toBe('seek');
    return (correction as Extract<Correction, { kind: 'seek' }>).to;
};

describe('desync: the local playhead disagrees with an incoming one', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('seeks to where the room WILL be, not to the number it received', () => {
        // The single most important case. The intent was stamped 4 seconds ago
        // and says 100. By the time it arrives the room is at 104. Seeking to
        // 100 would leave this client permanently behind by the network latency,
        // and every subsequent correction would do it again.
        replica.observePlayer(observed({ position: sec(0), paused: false }), at(3_900));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(100), paused: false }, T0, BOB),
            at(4_000),
        );
        expect(seekTarget(decision.correct)).toBeCloseTo(104, 6);
    });

    it('leaves a player that is already tracking the room alone', () => {
        replica.observePlayer(observed({ position: sec(104), paused: false }), at(3_900));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(100), paused: false }, T0, BOB),
            at(4_000),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('accepts an intent that is OLD but still correct', () => {
        // An intent stamped ten minutes ago saying "playing from 0" projects to
        // 600s now, and that is exactly right. Age alone is not divergence —
        // only the projection is.
        replica.observePlayer(observed({ position: sec(600), paused: false }), at(600_000 - 100));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(0), paused: false }, T0, BOB),
            at(600_000),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('does not correct a divergence exactly at the threshold', () => {
        // The boundary is a decision, not an accident: strictly greater than.
        // Without this test an implementation can flip it and nothing notices.
        replica.observePlayer(observed({ position: sec(100) }), at(0));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(100 + P.hardSeekThreshold), paused: true }, T0, BOB),
            T0,
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('corrects a divergence just past the threshold', () => {
        replica.observePlayer(observed({ position: sec(100) }), at(0));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(100 + P.hardSeekThreshold + 0.01), paused: true }, T0, BOB),
            T0,
        );
        expect(decision.correct.kind).toBe('seek');
    });

    it('a remote pause carries its own position — the two cannot interleave', () => {
        // The legacy failure: `paused` and `currentTime` were separate LWW
        // registers with separate stamps, so a fresh pause could be applied
        // against a stale position. One value makes that unrepresentable, and
        // this test is what says so.
        replica.observePlayer(observed({ position: sec(500), paused: false }), at(1_900));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(42), paused: true }, at(2_000), BOB),
            at(2_000),
        );
        expect(decision.correct).toEqual({ kind: 'halt', at: 42 });
    });
});

describe('desync: the player is not in a state to be corrected', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('does not correct a player that is still loading', () => {
        replica.observePlayer(observed({ position: sec(0), paused: true, ready: false }), at(900));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(300), paused: false }, at(1_000), BOB),
            at(1_000),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('applies the correction once the player becomes ready', () => {
        // The intent must be REMEMBERED, not dropped. Otherwise a client that
        // joins mid-film sits at zero until someone touches the controls.
        replica.observePlayer(observed({ position: sec(0), paused: true, ready: false }), at(900));
        replica.applyRemotePlayhead(
            intent({ position: sec(300), paused: false }, at(1_000), BOB),
            at(1_000),
        );

        const ready = replica.observePlayer(
            observed({ position: sec(0), paused: false, ready: true }),
            at(2_000),
        );
        expect(seekTarget(ready.correct)).toBeCloseTo(301, 6);
    });

    it('does not correct while buffering, however far behind it falls', () => {
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        const decision = replica.observePlayer(
            observed({ position: sec(10), paused: false, stalled: true }),
            at(120_000),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('issues ONE correction when buffering clears, not a storm', () => {
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        replica.observePlayer(observed({ position: sec(10), paused: false, stalled: true }), at(60_000));

        const recovered = replica.observePlayer(
            observed({ position: sec(10), paused: false, stalled: false }),
            at(60_100),
        );
        expect(recovered.correct.kind).toBe('seek');
        expect(recovered.publish).toHaveLength(0);
    });

    it('never publishes a position observed while buffering', () => {
        // A stalled player reports a frozen position. Publishing it would tell
        // the whole room to rewind to where this one client got stuck.
        replica.applyRemotePlayhead(intent({ position: sec(500), paused: false }, T0, BOB), at(100));
        const decision = replica.observePlayer(
            observed({ position: sec(12), paused: false, stalled: true }),
            at(30_000),
        );
        expect(writes(decision, 'playhead')).toHaveLength(0);
    });
});

describe('desync: late, duplicated and out-of-order delivery', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('ignores an intent stamped before the one already held', () => {
        replica.applyRemotePlayhead(intent({ position: sec(500), paused: false }, at(5_000), BOB), at(5_100));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(0), paused: true }, at(1_000), CAROL),
            at(5_200),
        );
        expect(decision.publish).toHaveLength(0);
        expect(decision.correct).toEqual({ kind: 'none' });
        expect(decision.events).toHaveLength(0);
    });

    it('ignores an intent older than one this client published itself', () => {
        replica.requestSeek(sec(500), at(5_000));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(0), paused: true }, at(4_000), BOB),
            at(5_100),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('treats our own write coming back from the store as a no-op', () => {
        // The gateway echoes every write to every subscriber, including the
        // author. Reacting to it would produce an event per write and, worse,
        // a correction toward a value the player is already at.
        const local = replica.requestSeek(sec(120), at(3_000));
        const published = writes(local, 'playhead')[0]!.intent;

        const echoed = replica.applyRemotePlayhead(published, at(3_200));
        expect(echoed.events).toHaveLength(0);
        expect(echoed.publish).toHaveLength(0);
        expect(echoed.correct).toEqual({ kind: 'none' });
    });

    it('a duplicate delivery of the same intent changes nothing', () => {
        const remote = intent({ position: sec(80), paused: false }, at(2_000), BOB);
        replica.applyRemotePlayhead(remote, at(2_100));
        const again = replica.applyRemotePlayhead(remote, at(2_200));
        expect(again.events).toHaveLength(0);
        expect(again.publish).toHaveLength(0);
    });

    it('ends on the newest intent whatever order the two arrive in', () => {
        const older = intent({ position: sec(10), paused: true }, at(1_000), BOB);
        const newer = intent({ position: sec(90), paused: false }, at(2_000), CAROL);

        const forwards = make();
        forwards.applyRemotePlayhead(older, at(3_000));
        forwards.applyRemotePlayhead(newer, at(3_000));

        const backwards = make();
        backwards.applyRemotePlayhead(newer, at(3_000));
        backwards.applyRemotePlayhead(older, at(3_000));

        expect(forwards.snapshot(at(3_000)).playhead).toEqual(backwards.snapshot(at(3_000)).playhead);
        expect(forwards.snapshot(at(3_000)).playhead.value.position).toBe(90);
    });

    it('two peers writing in the same millisecond converge on one value', () => {
        const fromBob = intent({ position: sec(10), paused: false }, at(4_000), BOB);
        const fromCarol = intent({ position: sec(20), paused: false }, at(4_000), CAROL);

        const one = make();
        one.applyRemotePlayhead(fromBob, at(4_100));
        one.applyRemotePlayhead(fromCarol, at(4_100));

        const other = make();
        other.applyRemotePlayhead(fromCarol, at(4_100));
        other.applyRemotePlayhead(fromBob, at(4_100));

        expect(one.snapshot(at(4_100)).playhead).toEqual(other.snapshot(at(4_100)).playhead);
    });
});

describe('desync: the source changes underneath the playhead', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('resets the playhead when the room switches video', () => {
        replica.applyRemotePlayhead(intent({ position: sec(900), paused: false }, at(1_000), BOB), at(1_100));
        const decision = replica.applyRemoteSource(
            stamped(source({ locator: 'https://example.com/other.mp4' }), at(2_000), BOB),
            at(2_100),
        );
        expect(decision.events.map((e) => e.type)).toContain('SourceChanged');
        expect(replica.snapshot(at(2_100)).projectedPosition).toBe(0);
    });

    it('does not correct playback position against the OLD video', () => {
        // Between the source change and the new media being ready, the element
        // still reports the previous film's position. Correcting on that would
        // seek the new video to a timestamp that means nothing in it.
        replica.applyRemotePlayhead(intent({ position: sec(900), paused: false }, at(1_000), BOB), at(1_100));
        replica.applyRemoteSource(stamped(source({ locator: 'https://example.com/other.mp4' }), at(2_000), BOB), at(2_100));

        const decision = replica.observePlayer(
            observed({ position: sec(905), paused: false, ready: false }),
            at(2_200),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('ignores a stale source and does NOT reset the playhead for it', () => {
        replica.selectSource(source({ locator: 'https://example.com/current.mp4' }), at(5_000));
        replica.applyRemotePlayhead(intent({ position: sec(300), paused: false }, at(6_000), BOB), at(6_100));

        const decision = replica.applyRemoteSource(
            stamped(source({ locator: 'https://example.com/ancient.mp4' }), at(1_000), CAROL),
            at(6_200),
        );
        expect(decision.events).toHaveLength(0);
        expect(replica.snapshot(at(6_200)).source?.locator).toBe('https://example.com/current.mp4');
        expect(replica.snapshot(at(6_200)).projectedPosition).toBeGreaterThan(0);
    });

    it('handles the source being cleared remotely', () => {
        replica.selectSource(source(), at(1_000));
        const decision = replica.applyRemoteSource(stamped(null, at(2_000), BOB), at(2_100));
        expect(decision.events.map((e) => e.type)).toContain('SourceChanged');
        expect(replica.snapshot(at(2_100)).source).toBeNull();
    });

    it('a local pick beats a stale remote pick that arrives after it', () => {
        replica.selectSource(source({ locator: 'https://example.com/mine.mp4' }), at(9_000));
        replica.applyRemoteSource(stamped(source({ locator: 'https://example.com/theirs.mp4' }), at(8_000), BOB), at(9_100));
        expect(replica.snapshot(at(9_100)).source?.locator).toBe('https://example.com/mine.mp4');
    });
});

describe('desync: a peer whose clock is wrong', () => {
    it('does not extrapolate backwards from an intent stamped in the future', () => {
        // A peer five seconds fast stamps "playing from 100" at now+5s.
        // Projecting with a negative elapsed time would produce 95 and yank
        // everyone backwards.
        const replica = make();
        replica.observePlayer(observed({ position: sec(100), paused: false }), at(0));
        const decision = replica.applyRemotePlayhead(
            intent({ position: sec(100), paused: false }, at(5_000), BOB),
            T0,
        );
        if (decision.correct.kind === 'seek') {
            expect(decision.correct.to).toBeGreaterThanOrEqual(100);
        } else {
            expect(decision.correct).toEqual({ kind: 'none' });
        }
    });

    it('a future-stamped intent still wins the merge — LWW is LWW', () => {
        // Deliberately NOT special-cased. Rejecting future stamps would make
        // the merge non-deterministic across replicas, which is worse than the
        // skew itself. The defence is I9: refuse to PUBLISH with a bad clock.
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(10) }, at(1_000), BOB), at(1_100));
        replica.applyRemotePlayhead(intent({ position: sec(70) }, at(999_000), CAROL), at(1_200));
        expect(replica.snapshot(at(1_300)).playhead.value.position).toBe(70);
    });
});

describe('desync: nothing has been heard for a long time', () => {
    it('force-pauses playback that has run silently past the timeout', () => {
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        const decision = replica.tick(at(P.stalePlaybackTimeout * 1000 + 1_000));
        expect(writes(decision, 'playhead')[0]?.intent.value.paused).toBe(true);
    });

    it('force-pauses at the projected position, not back at the last one heard', () => {
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        const silence = P.stalePlaybackTimeout * 1000 + 1_000;
        const paused = writes(replica.tick(at(silence)), 'playhead')[0]?.intent.value.position;
        expect(paused).toBeCloseTo(silence / 1000, 0);
    });

    it('a fresh remote update restarts the silence timer', () => {
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
        const half = (P.stalePlaybackTimeout * 1000) / 2;
        replica.applyRemotePlayhead(intent({ position: sec(30), paused: false }, at(half), BOB), at(half + 100));

        const decision = replica.tick(at(half + P.stalePlaybackTimeout * 1000 - 1_000));
        expect(decision.events.map((e) => e.type)).not.toContain('PlaybackStalled');
    });

    it('does not force-pause a room that is simply paused', () => {
        const replica = make();
        replica.applyRemotePlayhead(intent({ position: sec(0), paused: true }, T0, BOB), at(100));
        const decision = replica.tick(at(P.stalePlaybackTimeout * 1000 * 10));
        expect(writes(decision, 'playhead')).toHaveLength(0);
    });
});

describe('desync: the correction loop terminates', () => {
    it('a remote update, its correction and the resulting echo settle in one round', () => {
        // The whole failure mode in one test: remote intent -> we seek -> the
        // element reports the seek -> that must NOT become a new publish, and
        // must NOT trigger another correction.
        const replica = make();
        replica.observePlayer(observed({ position: sec(0), paused: false }), at(900));

        const remote = replica.applyRemotePlayhead(
            intent({ position: sec(300), paused: false }, at(1_000), BOB),
            at(1_000),
        );
        const target = seekTarget(remote.correct);

        const echo = replica.observePlayer(
            observed({ position: sec(target), paused: false }),
            at(1_050),
        );
        expect(echo.publish).toHaveLength(0);
        expect(echo.correct).toEqual({ kind: 'none' });

        const settled = replica.observePlayer(
            observed({ position: sec(target + 0.05), paused: false }),
            at(1_100),
        );
        expect(settled.correct).toEqual({ kind: 'none' });
    });
});
