import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
    child, get, getDatabase, onDisconnect, onValue, ref, remove, runTransaction, set, update,
    type Database, type DatabaseReference,
} from 'firebase/database';
import type { RoomGatewayPort, RoomSession } from '../../../domains/watch-session/ports/outbound/room-gateway';
import type { RemoteRoomListener } from '../../../domains/watch-session/ports/inbound/remote-room-listener';
import type { ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { Unsubscribe } from '../../../domains/watch-session/model/shared/observable';
import type { RoomDto } from './schema';
import {
    isHalfDeliveredPlayhead, readActivities, readPlayhead, readPresences, readSource,
    readWatchedMinutes, writeActivity, writePlayhead, writePresence, writeSource,
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

        /** Several room nodes committed as one indivisible change. */
        const writeAll = async (values: Record<string, unknown>): Promise<void> => {
            if (closed) {
                listener.onRemoteError({ kind: 'disconnected', message: 'session is closed' });
                return;
            }
            try {
                await update(room, values);
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

        // `currentTime` and `paused` are two nodes holding ONE value, so the
        // join has to see both halves of the same write or it invents an
        // intent nobody had — see `isHalfDeliveredPlayhead` for what that cost.
        //
        // Two things make that impossible here. The raw nodes are mirrored as
        // their events arrive and joined from the mirror, instead of being
        // re-read with `get()` — an asynchronous round trip whose answer
        // routinely predated the event that triggered it, and two wasted
        // server reads per playhead change besides. And a join that would
        // fabricate is skipped; the sibling's event, which the database always
        // sends because `updatedAt` changes on both nodes, joins it properly a
        // moment later.
        //
        // Joining on a microtask rather than inline is what makes that skip
        // rare: a local write raises both child events in one synchronous
        // batch, so waiting out the batch sees the pair whole. Only updates
        // from ANOTHER client arrive as separate frames.
        let lastTime = initial.currentTime;
        let lastPaused = initial.paused;
        let joinScheduled = false;

        const joinPlayhead = () => {
            if (joinScheduled) return;
            joinScheduled = true;
            queueMicrotask(() => {
                joinScheduled = false;
                if (closed) return;
                const pair: RoomDto = { currentTime: lastTime, paused: lastPaused };
                if (isHalfDeliveredPlayhead(pair)) return;
                const intent = readPlayhead(pair);
                if (intent) listener.onPlayheadChanged(intent);
            });
        };

        watch('currentTime', (value) => {
            lastTime = (value ?? undefined) as RoomDto['currentTime'];
            joinPlayhead();
        });
        watch('paused', (value) => {
            lastPaused = (value ?? undefined) as RoomDto['paused'];
            joinPlayhead();
        });
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
                // ONE multi-location update, never two independent writes.
                // Firebase commits it atomically, so no reader — here or on
                // another client — can ever observe the position of this write
                // beside the paused flag of the last one. Two `set()` calls
                // guaranteed that window existed on every play, pause and seek.
                await writeAll({ currentTime: dto.currentTime, paused: dto.paused });
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
