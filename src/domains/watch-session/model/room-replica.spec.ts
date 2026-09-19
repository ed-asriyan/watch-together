import { beforeEach, describe, expect, it } from 'vitest';
import { createRoomReplica, type RoomReplica } from './room-replica';
import { DEFAULT_SYNC_POLICY, type SyncPolicy } from './sync-policy';
import type { Decision, PublishIntent } from './decision';
import type { Nickname } from './ids';
import {
    ALICE, BOB, ROOM, T0, activity, at, intent, observed, presence, sec, source, stamped,
} from '../../../../test-support/builders';

const P = DEFAULT_SYNC_POLICY;

const make = (policy: SyncPolicy = P): RoomReplica => createRoomReplica({
    roomId: ROOM,
    self: ALICE,
    nickname: 'alice' as Nickname,
    policy,
    now: T0,
});

const published = <K extends PublishIntent['kind']>(decision: Decision, kind: K) =>
    decision.publish.filter((p): p is Extract<PublishIntent, { kind: K }> => p.kind === kind);

const eventTypes = (decision: Decision) => decision.events.map((e) => e.type);

describe('RoomReplica', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    describe('local playback commands', () => {
        it('publishes paused and position as ONE value (I2)', () => {
            const decision = replica.requestPause(sec(412.3), at(1_000));
            const writes = published(decision, 'playhead');
            expect(writes).toHaveLength(1);
            expect(writes[0]!.intent.value).toMatchObject({ position: 412.3, paused: true });
        });

        it('stamps with the reading it was given, never a clock it read (I1)', () => {
            const decision = replica.requestPause(sec(10), at(7_777));
            expect(published(decision, 'playhead')[0]!.intent.at).toBe(at(7_777));
            expect(published(decision, 'playhead')[0]!.intent.by).toBe(ALICE);
        });

        it('emits a local PlaybackPaused event', () => {
            const decision = replica.requestPause(sec(10), at(1_000));
            expect(eventTypes(decision)).toContain('PlaybackPaused');
            const event = decision.events.find((e) => e.type === 'PlaybackPaused');
            expect(event).toMatchObject({ local: true, by: ALICE });
        });

        it('publishes a seek and a play the same way', () => {
            expect(published(replica.requestSeek(sec(90), at(1_000)), 'playhead')).toHaveLength(1);
            expect(published(replica.requestPlay(sec(90), at(2_000)), 'playhead')).toHaveLength(1);
        });

        it('does not ask the local player to do what it just did itself', () => {
            // The command came FROM the player. Correcting it back would be a
            // round trip to nowhere.
            expect(replica.requestPause(sec(10), at(1_000)).correct).toEqual({ kind: 'none' });
        });
    });

    describe('remote updates', () => {
        it('applies a newer remote intent', () => {
            replica.requestPause(sec(10), at(1_000));
            const decision = replica.applyRemotePlayhead(
                intent({ position: sec(200), paused: false }, at(2_000), BOB),
                at(2_100),
            );
            expect(eventTypes(decision)).toContain('PlaybackStarted');
        });

        it('discards an older remote intent instead of applying it (I3)', () => {
            replica.requestSeek(sec(500), at(5_000));
            const decision = replica.applyRemotePlayhead(
                intent({ position: sec(0), paused: true }, at(1_000), BOB),
                at(5_100),
            );
            expect(decision.publish).toHaveLength(0);
            expect(decision.correct).toEqual({ kind: 'none' });
            expect(decision.events).toHaveLength(0);
        });

        it('never republishes what it just received — no write amplification', () => {
            const decision = replica.applyRemotePlayhead(
                intent({ position: sec(30), paused: false }, at(1_000), BOB),
                at(1_100),
            );
            expect(published(decision, 'playhead')).toHaveLength(0);
        });

        it('corrects the local player toward a newer remote intent', () => {
            replica.observePlayer(observed({ position: sec(0), paused: false }), at(900));
            const decision = replica.applyRemotePlayhead(
                intent({ position: sec(300), paused: false }, at(1_000), BOB),
                at(1_000),
            );
            expect(decision.correct.kind).toBe('seek');
        });
    });

    describe('echo suppression (I5)', () => {
        it('does not publish a player event it caused itself', () => {
            replica.observePlayer(observed({ position: sec(0), paused: false, ready: true }), at(900));
            const remote = replica.applyRemotePlayhead(
                intent({ position: sec(300), paused: false }, at(1_000), BOB),
                at(1_000),
            );
            expect(remote.correct.kind).toBe('seek');

            // The element now reports the seek we asked for.
            const echo = replica.observePlayer(
                observed({ position: sec(300), paused: false }),
                at(1_050),
            );
            expect(echo.publish).toHaveLength(0);
        });

        it('DOES publish a genuine user action after the window closes', () => {
            replica.observePlayer(observed({ position: sec(0), paused: false }), at(900));
            replica.applyRemotePlayhead(
                intent({ position: sec(300), paused: false }, at(1_000), BOB),
                at(1_000),
            );
            const later = at(1_000 + P.echoSuppressionWindow + 5_000);
            const real = replica.observePlayer(observed({ position: sec(20), paused: true }), later);
            expect(published(real, 'playhead').length).toBeGreaterThan(0);
        });

        it('issues at most one correction per decision (I4)', () => {
            replica.observePlayer(observed({ position: sec(0), paused: false }), at(900));
            const decision = replica.applyRemotePlayhead(
                intent({ position: sec(300), paused: false }, at(1_000), BOB),
                at(1_000),
            );
            expect(decision.correct).toBeDefined();
            expect(Array.isArray(decision.correct)).toBe(false);
        });
    });

    describe('source and feed', () => {
        it('publishes a selected source and resets the playhead to zero', () => {
            const decision = replica.selectSource(source(), at(1_000));
            expect(published(decision, 'source')).toHaveLength(1);
            expect(published(decision, 'playhead')[0]?.intent.value.position).toBe(0);
        });

        it('publishes a chat message with the id it was given', () => {
            const decision = replica.postChat('a1' as never, 'hello', at(1_000));
            const writes = published(decision, 'activity');
            expect(writes[0]!.activity).toMatchObject({ id: 'a1', author: ALICE, at: at(1_000) });
            expect(writes[0]!.activity.body).toEqual({ kind: 'chat', text: 'hello' });
        });

        it('ignores an empty chat message', () => {
            expect(replica.postChat('a1' as never, '   ', at(1_000)).publish).toHaveLength(0);
        });

        it('publishes a reaction as a reaction, not as chat', () => {
            const decision = replica.throwReaction('r1' as never, '🔥', at(1_000));
            expect(published(decision, 'activity')[0]!.activity.body).toEqual({ kind: 'reaction', emoji: '🔥' });
        });
    });

    describe('tick', () => {
        it('restates presence on the heartbeat interval', () => {
            const decision = replica.tick(at(P.presenceHeartbeat * 1000));
            expect(published(decision, 'presence')).toHaveLength(1);
        });

        it('retracts expired feed items (I7)', () => {
            replica.applyRemoteActivity([activity('old', T0), activity('new', at(9_000))], at(9_100));
            const decision = replica.tick(at(P.activityTtl * 1000 + 1_000));
            expect(published(decision, 'retract')[0]?.ids).toContain('old');
            expect(published(decision, 'retract')[0]?.ids).not.toContain('new');
        });

        it('force-pauses playback that has been running but silent too long', () => {
            replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, T0, BOB), at(100));
            const decision = replica.tick(at(P.stalePlaybackTimeout * 1000 + 1_000));
            expect(eventTypes(decision)).toContain('PlaybackStalled');
            expect(published(decision, 'playhead')[0]?.intent.value.paused).toBe(true);
        });

        it('does not force-pause playback that is already paused', () => {
            const decision = replica.tick(at(P.stalePlaybackTimeout * 1000 + 1_000));
            expect(eventTypes(decision)).not.toContain('PlaybackStalled');
        });

        it('restates its own running playhead, from what the element is doing', () => {
            // Regression. No decoder advances at exactly one second per second,
            // so a projection anchored once when play was pressed drifts away
            // from reality for everybody — including the person driving, who
            // then corrects against their own stale stamp.
            replica.requestPlay(sec(0), at(1_000));
            replica.observePlayer(observed({ position: sec(40), paused: false }), at(41_000));

            const decision = replica.tick(at(41_000));
            const restated = published(decision, 'playhead')[0]?.intent;
            expect(restated?.value.position).toBe(40);
            expect(restated?.at).toBe(at(41_000));
        });

        it('does not restate a playhead somebody else is driving', () => {
            // If every client restated it, the room would fight over the anchor.
            replica.applyRemotePlayhead(intent({ position: sec(0), paused: false }, at(1_000), BOB), at(1_100));
            replica.observePlayer(observed({ position: sec(40), paused: false }), at(41_000));

            expect(published(replica.tick(at(41_000)), 'playhead')).toHaveLength(0);
        });

        it('does not restate before the heartbeat is due', () => {
            replica.requestPlay(sec(0), at(1_000));
            replica.observePlayer(observed({ position: sec(2), paused: false }), at(3_000));
            expect(published(replica.tick(at(3_000)), 'playhead')).toHaveLength(0);
        });

        it('accrues watch time only while the playhead actually advances (I8)', () => {
            replica.applyRemotePlayhead(intent({ position: sec(0), paused: true }, T0, BOB), at(100));
            const idle = replica.tick(at(P.watchTimeGranularity * 1000 + 1_000));
            expect(published(idle, 'watchTime')).toHaveLength(0);
        });
    });

    describe('joining', () => {
        it('announces the join once, however many snapshots arrive', () => {
            // Regression. A gateway may deliver a snapshot more than once — a
            // reconnect re-reads the room — and joining does not happen twice.
            const empty = {
                createdAt: null, playhead: null, source: null,
                presences: [], activities: [], watchedMinutes: 0,
            };
            const first = replica.applyRemoteSnapshot(empty, at(1_000));
            const second = replica.applyRemoteSnapshot(empty, at(2_000));
            expect(eventTypes(first)).toContain('RoomJoined');
            expect(eventTypes(second)).not.toContain('RoomJoined');
        });
    });

    describe('the feed', () => {
        it('posts a system notice as a notice, not as chat text', () => {
            const decision = replica.postNotice('n1' as never, { type: 'pickedLocalFile' }, at(1_000));
            expect(published(decision, 'activity')[0]!.activity.body)
                .toEqual({ kind: 'notice', notice: { type: 'pickedLocalFile' } });
        });

        it('keeps a notice structured rather than pre-rendered', () => {
            // Legacy sent `MessageType.seek` with the position stringified into
            // the message text, so the reader had to parse it back and the
            // wording was fixed at the sender.
            const decision = replica.postNotice('n2' as never, { type: 'seeked', to: sec(750) }, at(1_000));
            const body = published(decision, 'activity')[0]!.activity.body;
            expect(body).toMatchObject({ notice: { type: 'seeked', to: 750 } });
        });

        it('keeps an activity authored by someone no longer present', () => {
            // Legacy's message renderer fell back to `me.name` when the author
            // was not in the presence list, so a message from someone who had
            // just timed out was attributed to YOU.
            replica.applyRemoteActivity([activity('m1', at(1_000), { kind: 'chat', text: 'hi' }, BOB)], at(1_100));
            replica.applyRemotePresence([presence(ALICE, at(1_100))], at(1_100));

            const item = replica.snapshot(at(1_100)).liveActivities.find((a) => a.id === 'm1');
            expect(item?.author).toBe(BOB);
            expect(item?.author).not.toBe(ALICE);
        });

        it('presents the feed oldest first', () => {
            replica.applyRemoteActivity([
                activity('later', at(3_000)),
                activity('earlier', at(1_000)),
                activity('middle', at(2_000)),
            ], at(3_100));
            expect(replica.snapshot(at(3_100)).liveActivities.map((a) => a.id))
                .toEqual(['earlier', 'middle', 'later']);
        });
    });

    describe('presence', () => {
        it('republishes presence immediately on rename', () => {
            // Legacy subscribed the presence job to the `me` store for exactly
            // this: waiting up to a full heartbeat to show a new name is a
            // visibly broken rename.
            const decision = replica.rename('newname' as Nickname, at(1_000));
            expect(published(decision, 'presence')[0]!.presence.nickname).toBe('newname');
        });

        it('reports a participant joining and leaving', () => {
            const joined = replica.applyRemotePresence(
                [presence(ALICE, at(1_000)), presence(BOB, at(1_000), 'bob')],
                at(1_100),
            );
            expect(eventTypes(joined)).toContain('ParticipantJoined');

            const later = at(1_000 + P.presenceTimeout * 1000 + 1_000);
            const left = replica.applyRemotePresence([presence(ALICE, later)], later);
            expect(eventTypes(left)).toContain('ParticipantLeft');
        });
    });

    describe('clock confidence (I9)', () => {
        it('refuses to publish while the clock is unsynchronized', () => {
            const strict = make({ ...P, requireClockSync: true });
            strict.applyClockConfidence('unsynced', at(500));
            const decision = strict.requestPause(sec(10), at(1_000));
            expect(decision.publish).toHaveLength(0);
        });

        it('says so rather than failing silently', () => {
            const strict = make({ ...P, requireClockSync: true });
            const decision = strict.applyClockConfidence('unsynced', at(500));
            expect(eventTypes(decision)).toContain('ConnectionChanged');
            expect(strict.snapshot(at(600)).connection.status).toBe('degraded');
        });

        it('publishes normally once the clock is trusted again', () => {
            const strict = make({ ...P, requireClockSync: true });
            strict.applyClockConfidence('unsynced', at(500));
            strict.applyClockConfidence('synced', at(600));
            expect(strict.requestPause(sec(10), at(1_000)).publish.length).toBeGreaterThan(0);
        });

        it('a lax policy publishes regardless — that is legacy behaviour', () => {
            const lax = make({ ...P, requireClockSync: false });
            lax.applyClockConfidence('unsynced', at(500));
            expect(lax.requestPause(sec(10), at(1_000)).publish.length).toBeGreaterThan(0);
        });
    });

    describe('snapshot', () => {
        it('derives who is online from the reading it is given (I6)', () => {
            replica.applyRemotePresence(
                [presence(ALICE, at(1_000)), presence(BOB, at(1_000), 'bob')],
                at(1_000),
            );
            expect(replica.snapshot(at(1_100)).others).toHaveLength(1);
            expect(replica.snapshot(at(1_000 + P.presenceTimeout * 1000 + 1)).others).toHaveLength(0);
        });

        it('derives the projected position rather than storing it', () => {
            replica.applyRemotePlayhead(intent({ position: sec(100), paused: false }, T0, BOB), at(100));
            expect(replica.snapshot(at(5_000)).projectedPosition).toBeCloseTo(105, 6);
            expect(replica.snapshot(at(10_000)).projectedPosition).toBeCloseTo(110, 6);
        });

        it('never reports self among the others', () => {
            replica.applyRemotePresence([presence(ALICE, at(1_000))], at(1_100));
            const snapshot = replica.snapshot(at(1_100));
            expect(snapshot.self.id).toBe(ALICE);
            expect(snapshot.others.map((p) => p.id)).not.toContain(ALICE);
        });
    });

    describe('purity', () => {
        it('returns the same decision for the same inputs', () => {
            const a = make().requestPause(sec(10), at(1_000));
            const b = make().requestPause(sec(10), at(1_000));
            expect(a).toEqual(b);
        });

        it('a snapshot at a fixed reading does not change on its own', () => {
            replica.applyRemotePlayhead(intent({ position: sec(10), paused: false }, T0, BOB), at(100));
            expect(replica.snapshot(at(3_000))).toEqual(replica.snapshot(at(3_000)));
        });
    });
});
