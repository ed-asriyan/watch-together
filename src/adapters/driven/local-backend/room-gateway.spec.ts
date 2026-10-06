import { afterEach, describe, expect, it } from 'vitest';
import { roomGatewayContract } from '../../../domains/watch-session/ports/outbound/__contracts__/room-gateway.contract';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { Presence } from '../../../domains/watch-session/model/participant';
import type { PlayheadIntent } from '../../../domains/watch-session/model/playhead';
import type { ConnectionState } from '../../../domains/watch-session/model/connection';
import { startLocalBackend, type LocalBackend } from '../../../../backend/local/server';
import { ALICE, BOB, ROOM, T0, at, intent, presence, sec } from '../../../../test-support/builders';
import { LocalBackendConnection } from './connection';
import { LocalBackendRoomGateway } from './room-gateway';
import { LocalBackendClock } from './clock';

const backends: LocalBackend[] = [];
const connections: LocalBackendConnection[] = [];

const backend = async (now: () => number = () => T0): Promise<LocalBackend> => {
    const started = await startLocalBackend({ now });
    backends.push(started);
    return started;
};

const connect = (url: string): LocalBackendConnection => {
    const connection = new LocalBackendConnection(url);
    connections.push(connection);
    return connection;
};

afterEach(async () => {
    connections.splice(0).forEach((connection) => connection.close());
    await Promise.all(backends.splice(0).map((started) => started.close()));
});

// The same suite the in-memory gateway passes — one definition of correct.
roomGatewayContract('local backend', async () => new LocalBackendRoomGateway(connect((await backend()).url)));

/** Polls, because two connections are two sockets with no ordering between them. */
const eventually = async (check: () => void, timeoutMs = 2_000): Promise<void> => {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
        try {
            check();
            return;
        } catch (error) {
            if (Date.now() > deadline) throw error;
            await new Promise((resolve) => setTimeout(resolve, 10));
        }
    }
};

const recorder = () => {
    const seen = {
        playheads: [] as PlayheadIntent[],
        presences: [] as (readonly Presence[])[],
        connections: [] as ConnectionState[],
        snapshots: 0,
    };
    const listener: RemoteRoomListener = {
        onSnapshot: () => { seen.snapshots += 1; },
        onPlayheadChanged: (value) => seen.playheads.push(value),
        onSourceChanged: () => undefined,
        onPresenceChanged: (value) => seen.presences.push(value),
        onActivityChanged: () => undefined,
        onConnectionChanged: (value) => seen.connections.push(value),
        onRemoteError: () => undefined,
    };
    return { seen, listener };
};

describe('local backend, across separate connections', () => {
    it('delivers a write to a client on another connection', async () => {
        const server = await backend();
        const alice = await new LocalBackendRoomGateway(connect(server.url))
            .open({ roomId: ROOM, self: ALICE, listener: recorder().listener });
        const bob = recorder();
        await new LocalBackendRoomGateway(connect(server.url)).open({ roomId: ROOM, self: BOB, listener: bob.listener });

        await alice.publishPlayhead(intent({ position: sec(42), paused: false }, at(1_000), ALICE));

        await eventually(() => expect(bob.seen.playheads.at(-1)?.value.position).toBe(42));
    });

    it('runs the armed cleanup when a socket drops without closing the room', async () => {
        const server = await backend();
        const aliceConnection = connect(server.url);
        const alice = await new LocalBackendRoomGateway(aliceConnection)
            .open({ roomId: ROOM, self: ALICE, listener: recorder().listener });
        await alice.armDisconnectCleanup();
        await alice.publishPresence(presence(ALICE, at(1_000), 'alice'));

        const bob = recorder();
        await new LocalBackendRoomGateway(connect(server.url)).open({ roomId: ROOM, self: BOB, listener: bob.listener });

        aliceConnection.close();

        await eventually(() => expect(bob.seen.presences.at(-1)?.some((p) => p.participantId === ALICE)).toBe(false));
    });

    it('reports offline when the backend goes away and resubscribes when it is back', async () => {
        let server = await backend();
        const port = server.port;
        const alice = recorder();
        await new LocalBackendRoomGateway(connect(server.url)).open({ roomId: ROOM, self: ALICE, listener: alice.listener });
        expect(alice.seen.snapshots).toBe(1);

        await server.close();
        backends.splice(backends.indexOf(server), 1);
        await eventually(() => expect(alice.seen.connections.at(-1)?.status).toBe('offline'));

        server = await startLocalBackend({ port, now: () => T0 });
        backends.push(server);

        await eventually(() => expect(alice.seen.snapshots).toBe(2), 8_000);
        expect(alice.seen.connections.at(-1)?.status).toBe('online');
    }, 15_000);
});

describe('LocalBackendClock', () => {
    it('adopts the server clock, rounded to whole milliseconds', async () => {
        const skew = 123_456.7;
        const server = await backend(() => Date.now() + skew);
        const clock = new LocalBackendClock(connect(server.url));
        const levels: string[] = [];
        clock.confidence.subscribe((level) => levels.push(level));

        await clock.sync();

        const offset = clock.now() - Date.now();
        expect(Number.isInteger(clock.now())).toBe(true);
        expect(Math.abs(offset - skew)).toBeLessThan(50);
        expect(levels.at(-1)).toBe('synced');
    });

    it('reports unsynced, not an exception, when there is no backend', async () => {
        const clock = new LocalBackendClock(connect('ws://127.0.0.1:1'));
        const levels: string[] = [];
        clock.confidence.subscribe((level) => levels.push(level));
        // The connect timeout is 5s; the clock must give up, not hang.
        await clock.sync();
        expect(levels.at(-1)).toBe('unsynced');
    }, 10_000);
});
