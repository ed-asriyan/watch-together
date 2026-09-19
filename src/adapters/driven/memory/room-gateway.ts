import type { RoomGatewayPort, RoomSession } from '../../../domains/watch-session/ports/outbound/room-gateway';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';
import { RoomStore, type RoomMutation } from './room-store';

interface Subscriber {
    readonly listener: RemoteRoomListener;
    readonly self: ParticipantId;
    open: boolean;
    disconnectArmed: boolean;
}

/**
 * The remote store, in memory.
 *
 * Not a mock: a real implementation of the same contract, used for tests, for
 * development with no credentials, and for driving two clients in one process.
 * It and `FirebaseRoomGateway` pass the same suite, which is the claim the port
 * exists to support.
 *
 * `relay` is the seam the cross-tab variant uses: every accepted mutation is
 * handed to it, and mutations arriving from elsewhere come back through
 * {@link receive}.
 */
export class InMemoryRoomGateway implements RoomGatewayPort {
    protected readonly rooms = new Map<RoomId, RoomStore>();
    private readonly subscribers = new Map<RoomId, Set<Subscriber>>();

    constructor(protected readonly now: () => EpochMs = () => Date.now() as EpochMs) {}

    async open(params: {
        readonly roomId: RoomId;
        readonly self: ParticipantId;
        readonly listener: RemoteRoomListener;
    }): Promise<RoomSession> {
        const { roomId, self, listener } = params;
        const store = this.store(roomId);
        const subscriber: Subscriber = { listener, self, open: true, disconnectArmed: false };
        this.subscribersOf(roomId).add(subscriber);

        await this.onOpened(roomId);

        listener.onSnapshot(store.snapshot());
        listener.onConnectionChanged({ status: 'online' });

        const write = async (mutation: RoomMutation): Promise<void> => {
            if (!subscriber.open) {
                listener.onRemoteError({ kind: 'disconnected', message: 'session is closed' });
                return;
            }
            this.commit(roomId, mutation);
        };

        return {
            publishPlayhead: (intent) => write({ kind: 'playhead', intent }),
            publishSource: (source) => write({ kind: 'source', source }),
            publishPresence: (presence) => write({ kind: 'presence', presence }),
            appendActivity: (activity) => write({ kind: 'activity', activity }),
            retractActivities: (ids) => write({ kind: 'retract', ids }),
            recordWatchedMinutes: (delta) => write({ kind: 'watchTime', participant: self, delta }),
            armDisconnectCleanup: async () => {
                subscriber.disconnectArmed = true;
            },
            close: async () => {
                if (!subscriber.open) return;
                subscriber.open = false;
                this.subscribersOf(roomId).delete(subscriber);
                if (subscriber.disconnectArmed) this.commit(roomId, { kind: 'depart', participant: self });
                else this.fanOut(roomId);
            },
        };
    }

    /** Apply locally, tell everyone here, and let a subclass relay it further. */
    protected commit(roomId: RoomId, mutation: RoomMutation): void {
        this.store(roomId).apply(mutation, this.now);
        this.fanOut(roomId);
        this.relay(roomId, mutation);
    }

    /** A mutation that happened somewhere else. */
    protected receive(roomId: RoomId, mutation: RoomMutation): void {
        this.store(roomId).apply(mutation, this.now);
        this.fanOut(roomId);
    }

    protected relay(_roomId: RoomId, _mutation: RoomMutation): void {}

    protected async onOpened(_roomId: RoomId): Promise<void> {}

    protected store(roomId: RoomId): RoomStore {
        const existing = this.rooms.get(roomId);
        if (existing) return existing;
        const created = new RoomStore(roomId);
        this.rooms.set(roomId, created);
        return created;
    }

    private subscribersOf(roomId: RoomId): Set<Subscriber> {
        const existing = this.subscribers.get(roomId);
        if (existing) return existing;
        const created = new Set<Subscriber>();
        this.subscribers.set(roomId, created);
        return created;
    }

    protected fanOut(roomId: RoomId): void {
        const store = this.store(roomId);
        for (const subscriber of [...this.subscribersOf(roomId)]) {
            if (!subscriber.open) continue;
            if (store.playhead) subscriber.listener.onPlayheadChanged(store.playhead);
            if (store.source) subscriber.listener.onSourceChanged(store.source);
            subscriber.listener.onPresenceChanged([...store.presences.values()]);
            subscriber.listener.onActivityChanged([...store.activities.values()]);
        }
    }
}
