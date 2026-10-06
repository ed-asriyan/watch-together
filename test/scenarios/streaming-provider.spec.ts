import { beforeEach, describe, expect, it } from 'vitest';
import { createWatchSession, type WatchSession } from '../../src/domains/watch-session/ports';
import { createRoomReplica } from '../../src/domains/watch-session/model/room-replica';
import { DEFAULT_SYNC_POLICY } from '../../src/domains/watch-session/model/sync-policy';
import type { Nickname, ParticipantId, RoomId } from '../../src/domains/watch-session/model/ids';
import type { Seconds } from '../../src/domains/watch-session/model/shared/time';
import { InMemoryRoomGateway } from '../../src/adapters/driven/memory/room-gateway';
import { CryptoIdGenerator } from '../../src/adapters/driven/browser/id-generator';
import { FakeClock } from '../../test-support/fakes/clock';
import { FakeScheduler } from '../../test-support/fakes/scheduler';
import { FakeResolver } from '../../test-support/fakes/resolver';
import { StreamingPlayer, type StreamingBehaviour } from '../../test-support/fakes/streaming-player';
import { CallLog } from '../../test-support/call-log';
import { spyErrors, spyLocation, spyProfiles, spyTelemetry, profile } from '../../test-support/spies';
import { T0, dur } from '../../test-support/builders';

/**
 * TWO CLIENTS ON AN EMBEDDED STREAMING PROVIDER.
 *
 * Reported against a YouTube video: press play, and it plays, stops, plays,
 * stops. A `<video>` on a local file never showed it, because there a seek is
 * free. Here every start and every seek buffers for a while, and the position
 * the element reports is refreshed only once a second — so every correction
 * the room issues costs time that then has to be made up again.
 *
 * The question each test asks is the same: once the room has settled, does it
 * STAY settled, or does it keep correcting itself, each correction being one
 * more visible stop?
 */

const ROOM = 'youtube-night' as RoomId;

const YOUTUBE_LIKE: StreamingBehaviour = {
    startupMs: 1_200,
    seekCostMs: 1_200,
    reportEveryMs: 1_000,
    rateStep: 0.25,
};

interface Client {
    readonly session: WatchSession;
    readonly player: StreamingPlayer;
}

describe('an embedded streaming provider', () => {
    let gateway: InMemoryRoomGateway;
    let clock: FakeClock;
    let scheduler: FakeScheduler;

    const join = async (name: string, behaviour: StreamingBehaviour = YOUTUBE_LIKE): Promise<Client> => {
        const log = new CallLog();
        const player = new StreamingPlayer(clock, behaviour);
        const session = createWatchSession({
            gateway,
            player,
            resolver: new FakeResolver(),
            clock,
            scheduler,
            profiles: spyProfiles(log, profile({ participantId: name as ParticipantId, nickname: name as Nickname })),
            ids: new CryptoIdGenerator(),
            telemetry: spyTelemetry(log),
            errors: spyErrors(log),
            location: spyLocation(log, ROOM),
            replicas: { create: createRoomReplica },
            policy: DEFAULT_SYNC_POLICY,
        });
        await session.resume();
        return { session, player };
    };

    const wait = async (seconds: number): Promise<void> => {
        // In quarter-second steps, standing in for the adapter's 4Hz progress
        // events, which are what the coordinator reacts to between ticks.
        for (let i = 0; i < seconds * 4; i++) {
            scheduler.advance(dur(250));
            await new Promise((resolve) => setTimeout(resolve, 0));
        }
    };

    const room = async () => {
        const alice = await join('alice');
        const bob = await join('bob');
        await alice.session.setSourceFromUserInput('https://www.youtube.com/watch?v=vgqG3ITMv1Q');
        await wait(2);
        return { alice, bob };
    };

    /** Seeks each element made during the next `seconds`. */
    const seeksOver = async (seconds: number, clients: readonly Client[]): Promise<number[]> => {
        const before = clients.map((c) => c.player.seeks);
        await wait(seconds);
        return clients.map((c, i) => c.player.seeks - before[i]!);
    };

    beforeEach(() => {
        clock = new FakeClock(T0);
        scheduler = new FakeScheduler(clock);
        gateway = new InMemoryRoomGateway(() => clock.now());
    });

    it('settles after play, instead of seeking itself into a stop every second or two', async () => {
        const { alice, bob } = await room();
        alice.player.userPresses('play');
        await wait(20);

        const [aliceSeeks, bobSeeks] = await seeksOver(60, [alice, bob]);

        expect(aliceSeeks, 'the one who pressed play kept correcting against its own anchor').toBe(0);
        expect(bobSeeks, 'the follower kept chasing the room').toBeLessThanOrEqual(1);
        expect(alice.player.observe().paused).toBe(false);
        expect(bob.player.observe().paused).toBe(false);
        expect(Math.abs(alice.player.actualPosition() - bob.player.actualPosition())).toBeLessThan(1.5);
    });

    it('stays paused after a pause, and settles again after the next play', async () => {
        const { alice, bob } = await room();
        alice.player.userPresses('play');
        await wait(20);

        bob.player.userPresses('pause');
        await wait(5);
        const [pausedSeeks] = await seeksOver(20, [alice]);
        expect(alice.player.observe().paused).toBe(true);
        expect(bob.player.observe().paused).toBe(true);
        expect(pausedSeeks).toBe(0);

        bob.player.userPresses('play');
        await wait(20);
        const [aliceSeeks, bobSeeks] = await seeksOver(60, [alice, bob]);
        expect(aliceSeeks).toBeLessThanOrEqual(1);
        expect(bobSeeks).toBe(0);
        expect(Math.abs(alice.player.actualPosition() - bob.player.actualPosition())).toBeLessThan(1.5);
    });

    it('a follower whose every seek costs more than the tolerance still converges', async () => {
        const alice = await join('alice', { ...YOUTUBE_LIKE, seekCostMs: 300, startupMs: 300 });
        const bob = await join('bob', { ...YOUTUBE_LIKE, seekCostMs: 2_500 });
        await alice.session.setSourceFromUserInput('https://www.youtube.com/watch?v=vgqG3ITMv1Q');
        await wait(2);
        alice.player.userPresses('play');
        await wait(30);

        const [bobSeeks] = await seeksOver(60, [bob]);
        expect(bobSeeks).toBeLessThanOrEqual(1);
        expect(Math.abs(alice.player.actualPosition() - bob.player.actualPosition())).toBeLessThan(1.5);
    });

    it('keeps working when nothing is slow (the model reduces to a plain element)', async () => {
        const plain = { startupMs: 0, seekCostMs: 0, reportEveryMs: 250, rateStep: 0.01 };
        const alice = await join('alice', plain);
        const bob = await join('bob', plain);
        await alice.session.setSourceFromUserInput('https://example.com/film.mp4');
        await wait(2);
        alice.player.userPresses('play');
        await wait(10);
        bob.player.userSeeks(120 as Seconds);
        await wait(5);
        expect(alice.player.actualPosition()).toBeGreaterThan(120);
        expect(Math.abs(alice.player.actualPosition() - bob.player.actualPosition())).toBeLessThan(1);
    });
});
