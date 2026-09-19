import type { RoomGatewayPort, RoomSession } from '../../../domains/watch-session/ports/outbound/room-gateway';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { RemoteRoomState } from '../../../domains/watch-session/model/room-replica';
import type { ActivityId, ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { PlayheadIntent } from '../../../domains/watch-session/model/playhead';
import type { Presence } from '../../../domains/watch-session/model/participant';
import type { Activity } from '../../../domains/watch-session/model/activity';
import type { Stamped } from '../../../domains/watch-session/model/shared/stamped';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';

interface Room {
    createdAt: EpochMs | null;
    playhead: PlayheadIntent | null;
    source: Stamped<MediaSourceRef | null> | null;
    presences: Map<ParticipantId, Presence>;
    activities: Map<ActivityId, Activity>;
    watched: Map<ParticipantId, number>;
    subscribers: Set<Subscriber>;
}

interface Subscriber {
    readonly self: ParticipantId;
    readonly listener: RemoteRoomListener;
    open: boolean;
    disconnectArmed: boolean;
}

/**
 * The remote store, in memory.
 *
 * Not a mock: it is a real implementation of the same contract, used for tests,
 * for offline development, and for driving two clients in one process. If this
 * and `FirebaseRoomGateway` both pass `roomGatewayContract`, the backend is
 * genuinely swappable — that claim is the reason the port exists.
 */
export class InMemoryRoomGateway implements RoomGatewayPort {
    private readonly rooms = new Map<RoomId, Room>();

    constructor(private readonly now: () => EpochMs = () => Date.now() as EpochMs) {}

    async open(params: {
        readonly roomId: RoomId;
        readonly self: ParticipantId;
        readonly listener: RemoteRoomListener;
    }): Promise<RoomSession> {
        const room = this.room(params.roomId);
        const subscriber: Subscriber = {
            self: params.self,
            listener: params.listener,
            open: true,
            disconnectArmed: false,
        };
        room.subscribers.add(subscriber);

        params.listener.onSnapshot(snapshotOf(room, params.self));
        params.listener.onConnectionChanged({ status: 'online' });

        const guard = async <T>(write: () => T): Promise<void> => {
            if (!subscriber.open) {
                params.listener.onRemoteError({ kind: 'disconnected', message: 'session is closed' });
                return;
            }
            write();
            this.fanOut(room);
        };

        return {
            publishPlayhead: (intent) => guard(() => {
                // First write creates the room; the timestamp never moves after
                // that, because the cleanup job prunes by it.
                room.createdAt ??= this.now();
                room.playhead = intent;
            }),
            publishSource: (source) => guard(() => {
                room.createdAt ??= this.now();
                room.source = source;
            }),
            publishPresence: (presence) => guard(() => {
                room.createdAt ??= this.now();
                room.presences.set(presence.participantId, presence);
            }),
            appendActivity: (activity) => guard(() => {
                room.createdAt ??= this.now();
                room.activities.set(activity.id, activity);
            }),
            retractActivities: (ids) => guard(() => {
                ids.forEach((id) => room.activities.delete(id));
            }),
            recordWatchedMinutes: (delta) => guard(() => {
                room.createdAt ??= this.now();
                room.watched.set(params.self, (room.watched.get(params.self) ?? 0) + delta);
            }),
            armDisconnectCleanup: async () => {
                subscriber.disconnectArmed = true;
            },
            close: async () => {
                if (!subscriber.open) return;
                subscriber.open = false;
                room.subscribers.delete(subscriber);
                if (subscriber.disconnectArmed) room.presences.delete(params.self);
                this.fanOut(room);
            },
        };
    }

    private room(id: RoomId): Room {
        const existing = this.rooms.get(id);
        if (existing) return existing;
        const created: Room = {
            createdAt: null,
            playhead: null,
            source: null,
            presences: new Map(),
            activities: new Map(),
            watched: new Map(),
            subscribers: new Set(),
        };
        this.rooms.set(id, created);
        return created;
    }

    private fanOut(room: Room): void {
        for (const subscriber of [...room.subscribers]) {
            if (!subscriber.open) continue;
            if (room.playhead) subscriber.listener.onPlayheadChanged(room.playhead);
            if (room.source) subscriber.listener.onSourceChanged(room.source);
            subscriber.listener.onPresenceChanged([...room.presences.values()]);
            subscriber.listener.onActivityChanged([...room.activities.values()]);
        }
    }
}

/**
 * Watch time is kept PER PARTICIPANT, because that is what the operational
 * stats export reads, but reported to the domain as the ROOM total: a client
 * has no use for another viewer's counter, and the room total is the number
 * that means something.
 */
const snapshotOf = (room: Room, self: ParticipantId): RemoteRoomState => {
    void self;
    let watchedMinutes = 0;
    for (const minutes of room.watched.values()) watchedMinutes += minutes;
    return {
        createdAt: room.createdAt,
        playhead: room.playhead,
        source: room.source,
        presences: [...room.presences.values()],
        activities: [...room.activities.values()],
        watchedMinutes,
    };
};
