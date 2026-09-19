import { beforeEach, describe, expect, it } from 'vitest';
import { createRoomReplica, type RoomReplica } from './room-replica';
import { DEFAULT_SYNC_POLICY } from './sync-policy';
import type { Decision, PublishIntent } from './decision';
import type { Nickname } from './ids';
import { ALICE, BOB, ROOM, T0, activity, at, presence } from '../../../../test-support/builders';

/**
 * THE EPHEMERAL FEED, END TO END.
 *
 * Chat and reactions travel the same path — publish, arrive, notify, expire —
 * but differ in what the room is supposed to do with them. Chat is read;
 * reactions are watched and forgotten. Both vanish on their own, with nobody
 * holding an expiry flag.
 */
const P = DEFAULT_SYNC_POLICY;
const TTL_MS = P.activityTtl * 1000;

const make = (): RoomReplica => createRoomReplica({
    roomId: ROOM,
    self: ALICE,
    nickname: 'alice' as Nickname,
    policy: P,
    now: T0,
});

const writes = <K extends PublishIntent['kind']>(decision: Decision, kind: K) =>
    decision.publish.filter((p): p is Extract<PublishIntent, { kind: K }> => p.kind === kind);

const types = (decision: Decision) => decision.events.map((e) => e.type);

describe('chat: sending', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('publishes exactly one activity, and nothing else', () => {
        const decision = replica.postChat('m1' as never, 'hello', at(1_000));
        expect(decision.publish).toHaveLength(1);
        expect(writes(decision, 'activity')[0]!.activity.body).toEqual({ kind: 'chat', text: 'hello' });
    });

    it('announces it locally so the UI can render it before the round trip', () => {
        // Without a local event the sender watches their own message appear
        // only once the store echoes it back.
        const decision = replica.postChat('m1' as never, 'hello', at(1_000));
        expect(types(decision)).toContain('ChatPosted');
    });

    it('attributes it to this client and stamps it with the reading given', () => {
        const posted = writes(replica.postChat('m1' as never, 'hi', at(4_242)), 'activity')[0]!.activity;
        expect(posted).toMatchObject({ id: 'm1', author: ALICE, at: at(4_242) });
    });

    it('trims the text rather than shipping the user\'s stray whitespace', () => {
        const posted = writes(replica.postChat('m1' as never, '  hi  ', at(1_000)), 'activity')[0]!.activity;
        expect(posted.body).toEqual({ kind: 'chat', text: 'hi' });
    });

    it('does nothing at all for an empty message', () => {
        const decision = replica.postChat('m1' as never, '   ', at(1_000));
        expect(decision.publish).toHaveLength(0);
        expect(decision.events).toHaveLength(0);
    });

    it('shows the sender their own message immediately', () => {
        replica.postChat('m1' as never, 'hello', at(1_000));
        expect(replica.snapshot(at(1_100)).liveActivities.map((a) => a.id)).toContain('m1');
    });
});

describe('chat: receiving', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('raises an event so the UI learns about it', () => {
        const decision = replica.applyRemoteActivity(
            [activity('m1', at(1_000), { kind: 'chat', text: 'hi' }, BOB)],
            at(1_100),
        );
        expect(types(decision)).toContain('ChatPosted');
    });

    it('does not republish what it received', () => {
        const decision = replica.applyRemoteActivity(
            [activity('m1', at(1_000), { kind: 'chat', text: 'hi' }, BOB)],
            at(1_100),
        );
        expect(decision.publish).toHaveLength(0);
    });

    it('raises nothing for a message it already knows about', () => {
        const feed = [activity('m1', at(1_000), { kind: 'chat', text: 'hi' }, BOB)];
        replica.applyRemoteActivity(feed, at(1_100));
        expect(replica.applyRemoteActivity(feed, at(1_200)).events).toHaveLength(0);
    });

    it('raises one event per NEW message when several arrive together', () => {
        replica.applyRemoteActivity([activity('m1', at(1_000), { kind: 'chat', text: 'a' }, BOB)], at(1_100));
        const decision = replica.applyRemoteActivity([
            activity('m1', at(1_000), { kind: 'chat', text: 'a' }, BOB),
            activity('m2', at(1_050), { kind: 'chat', text: 'b' }, BOB),
        ], at(1_200));
        expect(types(decision).filter((t) => t === 'ChatPosted')).toHaveLength(1);
    });

    it('does not raise an event for a message that is already too old to show', () => {
        const decision = replica.applyRemoteActivity(
            [activity('ancient', T0, { kind: 'chat', text: 'hi' }, BOB)],
            at(TTL_MS + 5_000),
        );
        expect(types(decision)).not.toContain('ChatPosted');
    });

    it('does not raise an event for our own message coming back', () => {
        const posted = writes(replica.postChat('m1' as never, 'hi', at(1_000)), 'activity')[0]!.activity;
        const echoed = replica.applyRemoteActivity([posted], at(1_100));
        expect(echoed.events).toHaveLength(0);
    });
});

describe('chat: expiry', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
        replica.applyRemoteActivity([activity('m1', at(1_000), { kind: 'chat', text: 'hi' }, BOB)], at(1_100));
    });

    it('is visible while it is young', () => {
        expect(replica.snapshot(at(1_000 + TTL_MS - 1)).liveActivities.map((a) => a.id)).toContain('m1');
    });

    it('disappears on its own once the lifetime passes, with nobody acting', () => {
        // No tick, no sweep, no retraction — just a later reading. Expiry is
        // computed, so two clients can never disagree about what is on screen.
        expect(replica.snapshot(at(1_000 + TTL_MS + 1)).liveActivities.map((a) => a.id)).not.toContain('m1');
    });

    it('is retracted from the store by the sweep', () => {
        const decision = replica.tick(at(1_000 + TTL_MS + 1_000));
        expect(writes(decision, 'retract')[0]?.ids).toContain('m1');
    });

    it('reports its expiry once, not on every tick', () => {
        replica.tick(at(1_000 + TTL_MS + 1_000));
        const again = replica.tick(at(1_000 + TTL_MS + 4_000));
        expect(writes(again, 'retract').flatMap((w) => w.ids)).not.toContain('m1');
    });
});

describe('reactions', () => {
    let replica: RoomReplica;
    beforeEach(() => {
        replica = make();
    });

    it('publishes and announces, same as chat', () => {
        const decision = replica.throwReaction('r1' as never, '🔥', at(1_000));
        expect(writes(decision, 'activity')[0]!.activity.body).toEqual({ kind: 'reaction', emoji: '🔥' });
        expect(types(decision)).toContain('ReactionThrown');
    });

    it('raises ReactionThrown, never ChatPosted', () => {
        // The UI animates one and reads the other; conflating them puts flying
        // emoji in the message list.
        const decision = replica.applyRemoteActivity(
            [activity('r1', at(1_000), { kind: 'reaction', emoji: '🔥' }, BOB)],
            at(1_100),
        );
        expect(types(decision)).toContain('ReactionThrown');
        expect(types(decision)).not.toContain('ChatPosted');
    });

    it('is fire and forget — nothing accumulates', () => {
        // Legacy kept reactions in the same map as chat and they piled up until
        // the sweep ran. Nothing should hold a reaction after its lifetime.
        for (let i = 0; i < 50; i++) {
            replica.throwReaction(`r${i}` as never, '🔥', at(i * 10));
        }
        expect(replica.snapshot(at(TTL_MS + 10_000)).liveActivities).toHaveLength(0);
    });

    it('several identical reactions each count — they are not deduplicated', () => {
        replica.applyRemoteActivity([
            activity('r1', at(1_000), { kind: 'reaction', emoji: '🔥' }, BOB),
            activity('r2', at(1_010), { kind: 'reaction', emoji: '🔥' }, ALICE),
        ], at(1_100));
        expect(replica.snapshot(at(1_100)).liveActivities).toHaveLength(2);
    });

    it('expires exactly like chat', () => {
        replica.applyRemoteActivity(
            [activity('r1', at(1_000), { kind: 'reaction', emoji: '🔥' }, BOB)],
            at(1_100),
        );
        expect(replica.snapshot(at(1_000 + TTL_MS + 1)).liveActivities).toHaveLength(0);
    });
});

describe('the feed does not interfere with playback', () => {
    it('a chat message corrects nothing and publishes no playhead', () => {
        const replica = make();
        const decision = replica.postChat('m1' as never, 'hi', at(1_000));
        expect(decision.correct).toEqual({ kind: 'none' });
        expect(writes(decision, 'playhead')).toHaveLength(0);
    });

    it('an incoming reaction corrects nothing', () => {
        const replica = make();
        const decision = replica.applyRemoteActivity(
            [activity('r1', at(1_000), { kind: 'reaction', emoji: '🔥' }, BOB)],
            at(1_100),
        );
        expect(decision.correct).toEqual({ kind: 'none' });
    });

    it('presence churn does not touch the feed', () => {
        const replica = make();
        replica.applyRemoteActivity([activity('m1', at(1_000), { kind: 'chat', text: 'hi' }, BOB)], at(1_100));
        replica.applyRemotePresence([presence(ALICE, at(1_200))], at(1_200));
        expect(replica.snapshot(at(1_200)).liveActivities.map((a) => a.id)).toContain('m1');
    });
});
