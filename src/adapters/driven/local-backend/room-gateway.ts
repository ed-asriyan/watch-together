import type { RoomGatewayPort, RoomSession } from '../../../domains/watch-session/ports/outbound/room-gateway';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';
import type { RemoteRoomState } from '../../../domains/watch-session/model/room-replica';
import { RoomStore, type RoomMutation } from '../memory/room-store';
import type { LocalBackendConnection } from './connection';

interface OpenSession {
    readonly roomId: RoomId;
    readonly self: ParticipantId;
    readonly listener: RemoteRoomListener;
    open: boolean;
    armed: boolean;
}

interface Mirror {
    store: RoomStore;
    readonly sessions: Set<OpenSession>;
}

/**
 * The room store behind `npm run backend:local`, over a WebSocket.
 *
 * A real backend rather than a fake: a separate process that any number of
 * browsers — other profiles, other machines on the LAN, Playwright contexts —
 * can share, so local development and end-to-end tests need no Firebase
 * project at all. It satisfies the same `RoomGatewayPort` contract as the
 * Firebase and in-memory gateways (`room-gateway.spec.ts`).
 *
 * The client keeps a mirror of each open room, fed by the snapshot and then by
 * the mutations the server pushes, so it can hand listeners the full presence
 * and activity lists the port promises while the wire carries only deltas.
 * Each push notifies only the listener method its mutation concerns.
 */
export class LocalBackendRoomGateway implements RoomGatewayPort {
    private readonly mirrors = new Map<RoomId, Mirror>();

    constructor(private readonly connection: LocalBackendConnection) {
        connection.onPush(({ room, mutation }) => this.onPush(room as RoomId, mutation));
        connection.onStatus((online) => {
            if (online) return;
            this.everySession((session) => session.listener.onConnectionChanged({ status: 'offline' }));
        });
        connection.onReconnected(() => {
            this.everySession((session) => void this.subscribe(session).catch(() => undefined));
        });
    }

    async open(params: {
        readonly roomId: RoomId;
        readonly self: ParticipantId;
        readonly listener: RemoteRoomListener;
    }): Promise<RoomSession> {
        const session: OpenSession = { ...params, open: true, armed: false };
        await this.subscribe(session);
        this.mirrorOf(session.roomId).sessions.add(session);

        const { roomId, self, listener } = session;
        const mutate = async (mutation: RoomMutation): Promise<void> => {
            if (!session.open) {
                listener.onRemoteError({ kind: 'disconnected', message: 'session is closed' });
                return;
            }
            try {
                await this.connection.request({ t: 'mutate', room: roomId, self, mutation });
            } catch (error) {
                listener.onRemoteError({
                    kind: 'write-rejected',
                    message: error instanceof Error ? error.message : String(error),
                    cause: error,
                });
                throw error;
            }
        };

        return {
            publishPlayhead: (intent) => mutate({ kind: 'playhead', intent }),
            publishSource: (source) => mutate({ kind: 'source', source }),
            publishPresence: (presence) => mutate({ kind: 'presence', presence }),
            appendActivity: (activity) => mutate({ kind: 'activity', activity }),
            retractActivities: (ids) => mutate({ kind: 'retract', ids }),
            recordWatchedMinutes: (delta) => mutate({ kind: 'watchTime', participant: self, delta }),
            armDisconnectCleanup: async () => {
                session.armed = true;
                await this.connection.request({ t: 'arm', room: roomId, self });
            },
            close: async () => {
                if (!session.open) return;
                session.open = false;
                const mirror = this.mirrors.get(roomId);
                mirror?.sessions.delete(session);
                if (mirror && mirror.sessions.size === 0) this.mirrors.delete(roomId);
                await this.connection.request({ t: 'close', room: roomId, self }).catch(() => undefined);
            },
        };
    }

    /** Open (or re-open after a reconnect) and deliver the snapshot. */
    private async subscribe(session: OpenSession): Promise<void> {
        const ack = await this.connection.request({ t: 'open', room: session.roomId, self: session.self });
        if (!session.open) return;
        const snapshot = ack.snapshot as RemoteRoomState;
        this.mirrorOf(session.roomId).store = mirrorFrom(session.roomId, snapshot);
        if (session.armed) await this.connection.request({ t: 'arm', room: session.roomId, self: session.self });
        session.listener.onSnapshot(snapshot);
        session.listener.onConnectionChanged({ status: 'online' });
    }

    private onPush(roomId: RoomId, mutation: RoomMutation): void {
        const mirror = this.mirrors.get(roomId);
        if (!mirror) return;
        mirror.store.apply(mutation, () => 0 as EpochMs);
        const { store } = mirror;
        for (const session of [...mirror.sessions]) {
            if (!session.open) continue;
            const { listener } = session;
            switch (mutation.kind) {
                case 'playhead':
                    listener.onPlayheadChanged(mutation.intent);
                    break;
                case 'source':
                    listener.onSourceChanged(mutation.source);
                    break;
                case 'presence':
                case 'depart':
                    listener.onPresenceChanged([...store.presences.values()]);
                    break;
                case 'activity':
                case 'retract':
                    listener.onActivityChanged([...store.activities.values()]);
                    break;
                case 'watchTime':
                    break;
            }
        }
    }

    private mirrorOf(roomId: RoomId): Mirror {
        const existing = this.mirrors.get(roomId);
        if (existing) return existing;
        const created: Mirror = { store: new RoomStore(roomId), sessions: new Set() };
        this.mirrors.set(roomId, created);
        return created;
    }

    private everySession(run: (session: OpenSession) => void): void {
        for (const mirror of this.mirrors.values()) {
            for (const session of mirror.sessions) if (session.open) run(session);
        }
    }
}

const mirrorFrom = (roomId: RoomId, snapshot: RemoteRoomState): RoomStore => {
    const store = new RoomStore(roomId);
    store.adopt(snapshot);
    return store;
};
