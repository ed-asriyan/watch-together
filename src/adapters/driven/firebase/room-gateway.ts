import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    child, get, getDatabase, onDisconnect, onValue, ref, remove, runTransaction, set,
    type Database, type DatabaseReference,
} from 'firebase/database';
import type { RoomGatewayPort, RoomSession } from '../../../domains/watch-session/ports/outbound/room-gateway';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { Unsubscribe } from '../../../domains/watch-session/model/shared/observable';
import type { RoomDto } from './schema';
import {
    readActivities, readPlayhead, readPresences, readSource, readWatchedMinutes,
    toLegacySeconds, writeActivity, writePlayhead, writePresence, writeSource,
} from './mappers';

/**
 * The Realtime Database behind the port.
 *
 * Differences from the transport it replaces, all of them deliberate:
 *  - listeners are attached ONCE per session and torn down in `close()`. Legacy
 *    registered `onValue` inside a Svelte store's start function, so every
 *    `get(store)` attached and detached a listener — three per analytics event.
 *  - every write is awaited and a rejection is reported. Legacy called `set()`
 *    and ignored the result, so a failed write diverged silently forever.
 *  - disconnect cleanup is real, so a closed laptop stops haunting the room.
 */
export class FirebaseRoomGateway implements RoomGatewayPort {
    private readonly database: Database;

    constructor(
        app: FirebaseApp,
        private readonly classify: (raw: string) => MediaSourceRef | null,
        private readonly now: () => number = () => Date.now(),
    ) {
        this.database = getDatabase(app);
    }

    static fromConfig(
        config: Record<string, string>,
        classify: (raw: string) => MediaSourceRef | null,
    ): FirebaseRoomGateway {
        return new FirebaseRoomGateway(initializeApp(config), classify);
    }

    async open(params: {
        readonly roomId: RoomId;
        readonly self: ParticipantId;
        readonly listener: RemoteRoomListener;
    }): Promise<RoomSession> {
        const { roomId, self, listener } = params;
        const room = child(ref(this.database), `room/${roomId}`);
        const mine = child(room, `users/${self}`);

        let closed = false;
        const stops: Unsubscribe[] = [];

        const fail = (kind: 'write-rejected' | 'read-failed', error: unknown) => {
            listener.onRemoteError({
                kind: String(error).includes('permission') ? 'permission-denied' : kind,
                message: error instanceof Error ? error.message : String(error),
                cause: error,
            });
        };

        const write = async (target: DatabaseReference, value: unknown): Promise<void> => {
            if (closed) {
                listener.onRemoteError({ kind: 'disconnected', message: 'session is closed' });
                return;
            }
            try {
                await set(target, value);
            } catch (error) {
                fail('write-rejected', error);
                throw error;
            }
        };

        // One read, then one listener per subtree, for the life of the session.
        let initial: RoomDto = {};
        try {
            initial = ((await get(room)).val() ?? {}) as RoomDto;
        } catch (error) {
            fail('read-failed', error);
        }

        listener.onSnapshot({
            createdAt: initial.createdAt ? (initial.createdAt * 1000) as never : null,
            playhead: readPlayhead(initial),
            source: readSource(initial, this.classify),
            presences: readPresences(initial),
            activities: readActivities(initial),
            watchedMinutes: readWatchedMinutes(initial),
        });

        const watch = (path: string, run: (value: unknown) => void) => {
            stops.push(onValue(child(room, path), (snap) => run(snap.val()), (error) => fail('read-failed', error)));
        };

        // `currentTime` and `paused` are two nodes but one value, so either one
        // changing re-reads both and republishes the joined intent.
        const playheadChanged = async () => {
            const [time, paused] = await Promise.all([get(child(room, 'currentTime')), get(child(room, 'paused'))]);
            const intent = readPlayhead({ currentTime: time.val(), paused: paused.val() });
            if (intent) listener.onPlayheadChanged(intent);
        };
        watch('currentTime', () => void playheadChanged());
        watch('paused', () => void playheadChanged());
        watch('url', (value) => {
            const source = readSource({ url: value as RoomDto['url'] }, this.classify);
            if (source) listener.onSourceChanged(source);
        });
        watch('users', (value) => listener.onPresenceChanged(readPresences({ users: value as RoomDto['users'] })));
        watch('messages', (value) => listener.onActivityChanged(readActivities({ messages: value as RoomDto['messages'] })));

        stops.push(onValue(child(ref(this.database), '.info/connected'), (snap) => {
            listener.onConnectionChanged(snap.val() === true ? { status: 'online' } : { status: 'offline' });
        }));

        const stamp = async () => {
            // Written once, never moved: the scheduled cleanup prunes by it.
            if (initial.createdAt) return;
            await runTransaction(child(room, 'createdAt'), (existing) => existing ?? this.now() / 1000);
            initial = { ...initial, createdAt: this.now() / 1000 };
        };

        return {
            async publishPlayhead(intent) {
                await stamp();
                const dto = writePlayhead(intent);
                await Promise.all([
                    write(child(room, 'currentTime'), dto.currentTime),
                    write(child(room, 'paused'), dto.paused),
                ]);
            },
            async publishSource(source) {
                await stamp();
                await write(child(room, 'url'), writeSource(source));
            },
            async publishPresence(presence) {
                await stamp();
                await write(mine, writePresence(presence));
            },
            async appendActivity(activity) {
                await stamp();
                await write(child(room, `messages/${activity.id}`), writeActivity(activity));
            },
            async retractActivities(ids) {
                await Promise.all(ids.map(async (id) => {
                    try {
                        await remove(child(room, `messages/${id}`));
                    } catch {
                        // Another client swept the same item first. Normal.
                    }
                }));
            },
            async recordWatchedMinutes(delta) {
                await runTransaction(
                    child(room, `minutesWatched/${self}`),
                    (existing: number | null) => (existing ?? 0) + delta,
                );
            },
            async armDisconnectCleanup() {
                // MUST be queued before the first presence write: a connection
                // lost between the two leaves a permanent ghost participant.
                await onDisconnect(mine).remove();
            },
            async close() {
                if (closed) return;
                closed = true;
                stops.forEach((stop) => stop());
                stops.length = 0;
                try {
                    await onDisconnect(mine).cancel();
                    await remove(mine);
                } catch {
                    // Leaving anyway; the presence TTL is the backstop.
                }
            },
        };
    }
}
