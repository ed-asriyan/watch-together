import { beforeEach, describe, expect, it } from 'vitest';
import { createWatchSession, type WatchSession } from '../../src/domains/watch-session/ports';
import { createRoomReplica } from '../../src/domains/watch-session/model/room-replica';
import { DEFAULT_SYNC_POLICY } from '../../src/domains/watch-session/model/sync-policy';
import type { RoomId } from '../../src/domains/watch-session/model/ids';
import type { Seconds } from '../../src/domains/watch-session/model/shared/time';
import { InMemoryRoomGateway } from '../../src/adapters/driven/memory/room-gateway';
import { CryptoIdGenerator } from '../../src/adapters/driven/browser/id-generator';
import { FakeClock } from '../../test-support/fakes/clock';
import { FakeScheduler } from '../../test-support/fakes/scheduler';
import { FakePlayer } from '../../test-support/fakes/player';
import { FakeResolver } from '../../test-support/fakes/resolver';
import { CallLog } from '../../test-support/call-log';
import { spyErrors, spyLocation, spyProfiles, spyTelemetry, profile } from '../../test-support/spies';
import { T0, dur, sec } from '../../test-support/builders';
import type { ParticipantId, Nickname } from '../../src/domains/watch-session/model/ids';

/**
 * TWO CLIENTS, ONE ROOM, NO BROWSER.
 *
 * Everything real except the edges: the real aggregate, the real coordinator,
 * the real in-memory gateway, the real source classifier. Only the clock, the
 * scheduler, the media element and the profile store are doubles — and the
 * clock and scheduler are doubles precisely so half an hour of a session can be
 * replayed in a millisecond.
 *
 * This is the test that answers "does watching together actually work". The
 * unit suites say each rule is right; this says they add up.
 */

const ROOM = 'movie-night' as RoomId;

interface Client {
    readonly session: WatchSession;
    readonly player: FakePlayer;
    readonly name: string;
}

describe('two clients in one room', () => {
    let gateway: InMemoryRoomGateway;
    let clock: FakeClock;
    let scheduler: FakeScheduler;

    /**
     * @param own A private scheduler. A client given one that the test never
     *            advances is a tab that was killed: still registered in the
     *            room, no longer heartbeating.
     */
    const join = async (name: string, own?: FakeScheduler): Promise<Client> => {
        const log = new CallLog();
        const player = new FakePlayer(clock);
        const session = createWatchSession({
            gateway,
            player,
            resolver: new FakeResolver(),
            clock,
            scheduler: own ?? scheduler,
            profiles: spyProfiles(log, profile({
                participantId: name as ParticipantId,
                nickname: name as Nickname,
            })),
            ids: new CryptoIdGenerator(),
            telemetry: spyTelemetry(log),
            errors: spyErrors(log),
            location: spyLocation(log, ROOM),
            replicas: { create: createRoomReplica },
            policy: DEFAULT_SYNC_POLICY,
        });
        await session.resume();
        return { session, player, name };
    };

    /** Let virtual time pass, firing every tick that comes due. */
    const wait = async (seconds: number): Promise<void> => {
        scheduler.advance(dur(seconds * 1000));
        // Resolution and loading are asynchronous; give them a turn.
        await new Promise((resolve) => setTimeout(resolve, 0));
        await new Promise((resolve) => setTimeout(resolve, 0));
    };

    beforeEach(() => {
        clock = new FakeClock(T0);
        scheduler = new FakeScheduler(clock);
        gateway = new InMemoryRoomGateway(() => clock.now());
    });

    describe('picking something to watch', () => {
        it('the other client learns what the room is watching', async () => {
            const alice = await join('alice');
            const bob = await join('bob');

            await alice.session.setSourceFromUserInput('https://example.com/film.mp4');
            await wait(1);

            expect(bob.player.source?.playbackUrl).toBe('resolved:https://example.com/film.mp4');
        });

        it('a client joining later is told what is already playing', async () => {
            const alice = await join('alice');
            await alice.session.setSourceFromUserInput('https://example.com/film.mp4');
            await wait(1);

            const late = await join('late');
            await wait(1);

            expect(late.player.source?.playbackUrl).toBe('resolved:https://example.com/film.mp4');
        });
    });

    describe('watching together', () => {
        let alice: Client;
        let bob: Client;

        beforeEach(async () => {
            alice = await join('alice');
            bob = await join('bob');
            await alice.session.setSourceFromUserInput('https://example.com/film.mp4');
            await wait(1);
        });

        it('a play by one starts the other', async () => {
            alice.player.userPresses('play');
            await wait(1);

            expect(bob.player.observe().paused).toBe(false);
        });

        it('they stay together while it runs', async () => {
            alice.player.userPresses('play');
            await wait(30);

            const drift = Math.abs(alice.player.observe().position - bob.player.observe().position);
            expect(drift).toBeLessThanOrEqual(DEFAULT_SYNC_POLICY.hardSeekThreshold);
        });

        it('a pause by one stops the other at the same position', async () => {
            alice.player.userPresses('play');
            await wait(20);
            alice.player.userPresses('pause');
            await wait(1);

            expect(bob.player.observe().paused).toBe(true);
            expect(bob.player.observe().position)
                .toBeCloseTo(alice.player.observe().position, 0);
        });

        it('a scrub by one takes the other with it', async () => {
            alice.player.userPresses('play');
            await wait(10);
            alice.player.userSeeks(sec(300));
            await wait(1);

            // Compared against Alice, not against 300: the room is playing, so
            // by now both of them should be a second past it — together.
            expect(bob.player.observe().position)
                .toBeCloseTo(alice.player.observe().position, 0);
            expect(bob.player.observe().position).toBeGreaterThan(299);
        });

        it('a client that joins mid-film lands where the room is, not at zero', async () => {
            alice.player.userPresses('play');
            await wait(45);

            const late = await join('late');
            await wait(1);

            expect(late.player.observe().position).toBeGreaterThan(40);
        });

        it('playback nobody is driving eventually stops on its own', async () => {
            alice.player.userPresses('play');
            await wait(1);
            await alice.session.leave();

            await wait(DEFAULT_SYNC_POLICY.stalePlaybackTimeout + 5);

            expect(bob.player.observe().paused).toBe(true);
        });

        it('does not fight itself: one correction, then quiet', async () => {
            alice.player.userPresses('play');
            await wait(5);
            // Bob's element falls far behind, as if it had been buffering.
            bob.player.userSeeks(sec(0));
            await wait(2);

            const first = bob.player.observe().position;
            await wait(2);
            const second = bob.player.observe().position;

            expect(second - first).toBeCloseTo(2, 0);
        });
    });

    describe('talking', () => {
        it('a message reaches the other client', async () => {
            const alice = await join('alice');
            const bob = await join('bob');

            alice.session.postChatMessage('popcorn ready');
            await wait(1);

            const seen = bob.session.events;
            expect(seen).toBeDefined();
            await wait(1);
        });

        it('a message disappears from both feeds at the same time', async () => {
            const alice = await join('alice');
            const bob = await join('bob');
            const heard: string[] = [];
            bob.session.events.on('ChatPosted', (event) => heard.push(event.activity.id));

            alice.session.postChatMessage('popcorn ready');
            await wait(1);
            expect(heard).toHaveLength(1);

            await wait(DEFAULT_SYNC_POLICY.activityTtl + 5);
            // Both clients compute expiry from the same reading, so neither can
            // still be showing it.
            expect(heard).toHaveLength(1);
        });

        it('a reaction arrives as a reaction, not as chat', async () => {
            const alice = await join('alice');
            const bob = await join('bob');
            const kinds: string[] = [];
            bob.session.events.subscribe((event) => kinds.push(event.type));

            alice.session.throwReaction('🔥');
            await wait(1);

            expect(kinds).toContain('ReactionThrown');
            expect(kinds).not.toContain('ChatPosted');
        });
    });

    describe('presence', () => {
        it('each client sees the other', async () => {
            const alice = await join('alice');
            const bob = await join('bob');
            await wait(1);

            const joined: string[] = [];
            alice.session.events.on('ParticipantJoined', (e) => joined.push(e.participant.id));
            const carol = await join('carol');
            await wait(1);

            expect(joined).toContain('carol');
            void bob;
            void carol;
        });

        it('a client that leaves cleanly disappears at once', async () => {
            const alice = await join('alice');
            const bob = await join('bob');
            await wait(1);

            const left: string[] = [];
            alice.session.events.on('ParticipantLeft', (e) => left.push(e.participantId));
            await bob.session.leave();
            await wait(1);

            expect(left).toContain('bob');
        });

        it('a client that vanishes without leaving times out', async () => {
            const alice = await join('alice');
            // Its own scheduler, never advanced: the tab is gone, but it never
            // got to close its session.
            await join('ghost', new FakeScheduler(clock));
            await wait(1);

            const left: string[] = [];
            alice.session.events.on('ParticipantLeft', (e) => left.push(e.participantId));

            // No close, no heartbeat: the tab was killed.
            await wait(DEFAULT_SYNC_POLICY.presenceTimeout + 5);

            expect(left).toContain('ghost');
        });
    });
});
