import type { Stamped } from '../../../domain/shared/stamped';
import type { ActivityId, ParticipantId, RoomId } from '../../../domain/room/ids';
import type { MediaSourceRef } from '../../../domain/room/media-source';
import type { PlayheadIntent } from '../../../domain/room/playhead';
import type { Presence } from '../../../domain/room/participant';
import type { Activity } from '../../../domain/room/activity';
import type { RemoteRoomListener } from '../inbound/remote-room-listener';

/**
 * DRIVEN PORT — the Remote Synchronized Store.
 *
 * The most important port in the system: the one a second implementation is
 * wanted for. Implementations: `FirebaseRoomGateway`, `InMemoryRoomGateway`
 * (tests, offline dev), later `SupabaseRoomGateway` / `WsRoomGateway`.
 *
 * Rules this port exists to enforce:
 *  - it speaks DOMAIN TYPES ONLY. No `DatabaseReference`, no snapshot, no path
 *    strings. Wire mapping lives in the adapter's anti-corruption layer;
 *  - every write returns a Promise and is awaited, so a rejection surfaces as
 *    `onRemoteError` + a degraded connection instead of silent divergence
 *    (legacy `bound-store.ts:27` calls Firebase `set()` and ignores the result);
 *  - one subscription per session, torn down in `close()` — not attached and
 *    detached per `get()` as the legacy stores do.
 *
 * Every implementation must pass the shared contract suite (§12.2).
 */
export interface RoomGatewayPort {
    /**
     * Opens the room: performs the initial read, delivers it via
     * `listener.onSnapshot`, then streams incremental updates.
     */
    open(params: {
        readonly roomId: RoomId;
        readonly self: ParticipantId;
        readonly listener: RemoteRoomListener;
    }): Promise<RoomSession>;
}

export interface RoomSession {
    publishPlayhead(intent: PlayheadIntent): Promise<void>;
    publishSource(source: Stamped<MediaSourceRef | null>): Promise<void>;
    publishPresence(presence: Presence): Promise<void>;
    appendActivity(activity: Activity): Promise<void>;

    /**
     * Explicit removal, rather than the legacy read-modify-write of the whole
     * message map (`bound-messages.ts:74`), which loses concurrent updates.
     */
    retractActivities(ids: readonly ActivityId[]): Promise<void>;

    recordWatchedMinutes(delta: number): Promise<void>;

    /**
     * Register a "remove my presence" action to run if this client disappears
     * without calling `close()`.
     *
     * Exists because Firebase does this well (`onDisconnect().remove()`) and a
     * generic port should not pretend otherwise. It MUST be armed BEFORE the
     * first presence publish, otherwise a connection lost between the two
     * leaves a permanent ghost participant. Adapters that cannot support it
     * implement a no-op; the presence TTL remains the backstop.
     */
    armDisconnectCleanup(): Promise<void>;

    close(): Promise<void>;
}
