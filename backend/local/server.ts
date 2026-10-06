import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomStore } from '../../src/adapters/driven/memory/room-store';
import type { ClientMessage, ServerMessage } from '../../src/adapters/driven/local-backend/protocol';
import type { RoomId, ParticipantId } from '../../src/domains/watch-session/model/ids';
import type { EpochMs } from '../../src/domains/watch-session/model/shared/time';

export interface LocalBackendOptions {
    /** 0 picks a free port. */
    readonly port?: number;
    readonly host?: string;
    /** The server's clock. Injectable so contract tests can pin `createdAt`. */
    readonly now?: () => number;
    readonly log?: (line: string) => void;
}

export interface LocalBackend {
    readonly port: number;
    /** `ws://host:port` — what `VITE_LOCAL_BACKEND_URL` should be set to. */
    readonly url: string;
    close(): Promise<void>;
}

/** What one connection has open: room -> participants -> disconnect cleanup armed. */
type Subscriptions = Map<RoomId, Map<ParticipantId, { armed: boolean }>>;

/**
 * The local backend: rooms in memory, shared over WebSockets.
 *
 * A stand-in for Firebase Realtime Database for local development and
 * end-to-end tests. It is deliberately as dumb as the real thing — it stores
 * whatever it is sent and fans it out, with no conflict resolution of its own:
 * the last write to arrive is what a joining client is shown, exactly as with
 * RTDB, and ordering by stamp is the clients' job (`mergeLww`). A backend that
 * was smarter than production would hide the bugs end-to-end tests exist to
 * find.
 *
 * Mutations are applied to the in-memory gateway's `RoomStore`, so a write
 * means the same thing here, in the in-memory gateway and in the cross-tab one.
 *
 * HTTP on the same port:
 *   GET /           health check
 *   GET /rooms/:id  the room's current state as JSON, for debugging and tests
 */
export const startLocalBackend = async (options: LocalBackendOptions = {}): Promise<LocalBackend> => {
    const now = (options.now ?? Date.now) as () => EpochMs;
    const log = options.log ?? (() => undefined);

    const rooms = new Map<RoomId, RoomStore>();
    const subscribers = new Map<RoomId, Set<WebSocket>>();
    const subscriptionsOf = new Map<WebSocket, Subscriptions>();

    const store = (roomId: RoomId): RoomStore => {
        let room = rooms.get(roomId);
        if (!room) {
            room = new RoomStore(roomId);
            rooms.set(roomId, room);
        }
        return room;
    };

    const send = (socket: WebSocket, message: ServerMessage): void => {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
    };

    const broadcast = (roomId: RoomId, message: ServerMessage): void => {
        subscribers.get(roomId)?.forEach((socket) => send(socket, message));
    };

    const depart = (roomId: RoomId, participant: ParticipantId): void => {
        const mutation = { kind: 'depart', participant } as const;
        store(roomId).apply(mutation, now);
        broadcast(roomId, { t: 'mutation', room: roomId, mutation });
    };

    const unsubscribe = (socket: WebSocket, roomId: RoomId, self: ParticipantId): void => {
        const mine = subscriptionsOf.get(socket)?.get(roomId);
        const entry = mine?.get(self);
        if (!mine || !entry) return;
        mine.delete(self);
        if (mine.size === 0) {
            subscriptionsOf.get(socket)?.delete(roomId);
            subscribers.get(roomId)?.delete(socket);
        }
        if (entry.armed) depart(roomId, self);
    };

    const handle = (socket: WebSocket, message: ClientMessage): void => {
        const ack = (extra: Omit<Extract<ServerMessage, { t: 'ack' }>, 't' | 'req'> = {}) =>
            send(socket, { t: 'ack', req: message.req, ...extra });

        switch (message.t) {
            case 'time':
                ack({ serverTime: now() });
                return;
            case 'open': {
                const roomId = message.room as RoomId;
                const mine = subscriptionsOf.get(socket)!;
                if (!mine.has(roomId)) mine.set(roomId, new Map());
                mine.get(roomId)!.set(message.self as ParticipantId, { armed: false });
                if (!subscribers.has(roomId)) subscribers.set(roomId, new Set());
                subscribers.get(roomId)!.add(socket);
                ack({ snapshot: store(roomId).snapshot() });
                log(`open  ${roomId} by ${message.self}`);
                return;
            }
            case 'arm': {
                const entry = subscriptionsOf.get(socket)?.get(message.room as RoomId)?.get(message.self as ParticipantId);
                if (entry) entry.armed = true;
                ack();
                return;
            }
            case 'close':
                unsubscribe(socket, message.room as RoomId, message.self as ParticipantId);
                ack();
                log(`close ${message.room} by ${message.self}`);
                return;
            case 'mutate': {
                const roomId = message.room as RoomId;
                store(roomId).apply(message.mutation, now);
                // Pushed to everyone — the writer included — BEFORE the ack, so
                // over the writer's ordered socket it has seen its own write by
                // the time the write resolves.
                broadcast(roomId, { t: 'mutation', room: roomId, mutation: message.mutation });
                ack();
                return;
            }
        }
    };

    const http = createServer((request: IncomingMessage, response: ServerResponse) => {
        const match = /^\/rooms\/([^/?#]+)/.exec(request.url ?? '');
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Content-Type', 'application/json');
        if (match) {
            const room = rooms.get(decodeURIComponent(match[1]!) as RoomId);
            response.writeHead(room ? 200 : 404);
            response.end(JSON.stringify(room ? room.snapshot() : null));
            return;
        }
        response.writeHead(200);
        response.end(JSON.stringify({ ok: true, rooms: rooms.size }));
    });

    const wss = new WebSocketServer({ server: http });
    wss.on('connection', (socket) => {
        subscriptionsOf.set(socket, new Map());
        socket.on('message', (data) => {
            let message: ClientMessage;
            try {
                message = JSON.parse(String(data)) as ClientMessage;
            } catch {
                return;
            }
            try {
                handle(socket, message);
            } catch (error) {
                send(socket, { t: 'ack', req: message.req, error: String(error) });
            }
        });
        socket.on('close', () => {
            // An abrupt disconnect: run every cleanup that was armed, exactly
            // as RTDB runs `onDisconnect().remove()`.
            const mine = subscriptionsOf.get(socket);
            subscriptionsOf.delete(socket);
            for (const [roomId, participants] of mine ?? []) {
                subscribers.get(roomId)?.delete(socket);
                for (const [self, { armed }] of participants) if (armed) depart(roomId, self);
            }
        });
    });

    await new Promise<void>((resolve) => http.listen(options.port ?? 0, options.host ?? '127.0.0.1', resolve));
    const { port } = http.address() as AddressInfo;
    const host = options.host && options.host !== '0.0.0.0' ? options.host : 'localhost';

    return {
        port,
        url: `ws://${host}:${port}`,
        close: () => new Promise<void>((resolve) => {
            wss.clients.forEach((client) => client.terminate());
            wss.close(() => http.close(() => resolve()));
        }),
    };
};
