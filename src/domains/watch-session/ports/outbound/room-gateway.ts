import type { Stamped } from '../../model/shared/stamped';
import type { ActivityId, ParticipantId, RoomId } from '../../model/ids';
import type { MediaSourceRef } from '../../model/media-source';
import type { PlayheadIntent } from '../../model/playhead';
import type { Presence } from '../../model/participant';
import type { Activity } from '../../model/activity';
import type { RemoteRoomListener } from '../inbound/remote-room-listener';

/**
 * DRIVEN PORT — the remote synchronized store.
 *
 * The most important port in the system: the one a second implementation is
 * wanted for. Implementations: `FirebaseRoomGateway`, `InMemoryRoomGateway`
 * (tests, offline dev), later `SupabaseRoomGateway` / `WsRoomGateway`.
 *
 * Rules this port exists to enforce:
 *  - it speaks DOMAIN TYPES ONLY — no `DatabaseReference`, no snapshot, no
 *    path strings. Wire mapping is the adapter's anti-corruption layer;
 *  - every write returns a Promise and is awaited, so a rejection surfaces as
 *    `RemoteRoomListener.onRemoteError` plus a degraded connection instead of
 *    silent divergence (legacy `bound-store.ts:27` ignored the result);
 *  - one subscription per session, torn down in `close()` — not attached and
 *    detached on every read, as the legacy stores did.
 *
 * Every implementation must pass the shared contract suite (design doc §12.2).
 */
export interface RoomGatewayPort {
    /**
     * Open a room: perform the initial read, deliver it as
     * `listener.onSnapshot`, then stream incremental updates to the same
     * listener until `close()`.
     *
     * Opening a room that does not exist yet is not an error — the snapshot
     * comes back empty and the first publish creates it.
     *
     * @param params.roomId   Room to open.
     * @param params.self     This client's participant id. The adapter needs it
     *                        to address this client's own presence node and to
     *                        arm disconnect cleanup.
     * @param params.listener Where every inbound signal is delivered. The
     *                        adapter must not call it before `open` resolves,
     *                        except for `onSnapshot`, which must be the first
     *                        call it makes.
     * @returns A handle scoped to this room. Opening a second room requires
     *          closing the first.
     */
    open(params: {
        readonly roomId: RoomId;
        readonly self: ParticipantId;
        readonly listener: RemoteRoomListener;
    }): Promise<RoomSession>;
}

/** A live connection to one room. All writes are last-writer-wins. */
export interface RoomSession {
    /**
     * Publish this client's playback intent.
     *
     * @param intent Position, paused and rate as ONE value, with the author and
     *               synchronized timestamp. An adapter storing position and
     *               paused in separate nodes must write both with the SAME
     *               timestamp, or peers can apply one against a stale other.
     * @returns Rejects on a refused write; the caller reports it rather than
     *          swallowing it.
     */
    publishPlayhead(intent: PlayheadIntent): Promise<void>;

    /**
     * Publish the room's agreed video source.
     *
     * @param source Stamped for the same LWW merge as the playhead. `value` is
     *               `null` to clear the source.
     */
    publishSource(source: Stamped<MediaSourceRef | null>): Promise<void>;

    /**
     * Publish this client's presence. Called on join, on rename, and on every
     * heartbeat.
     *
     * @param presence This client's entry only — never the whole set. Writing
     *                 the full map is a read-modify-write over shared state and
     *                 loses concurrent updates.
     */
    publishPresence(presence: Presence): Promise<void>;

    /**
     * Append one item to the room's ephemeral feed.
     *
     * @param activity Already carries its id, author and timestamp; the adapter
     *                 assigns nothing. Ids come from `IdGeneratorPort` so tests
     *                 are deterministic.
     */
    appendActivity(activity: Activity): Promise<void>;

    /**
     * Remove expired feed items.
     *
     * Explicit removal by id, rather than the legacy pattern of rewriting the
     * whole message map (`bound-messages.ts:74`), which is a read-modify-write
     * over a shared node and loses any message written concurrently.
     *
     * @param ids Items to delete. Ids that no longer exist are not an error —
     *            two clients sweeping at once is normal.
     */
    retractActivities(ids: readonly ActivityId[]): Promise<void>;

    /**
     * Add to this participant's watch-time counter.
     *
     * @param delta Minutes to add, always positive. The adapter increments
     *              rather than overwriting, so two open tabs do not clobber
     *              each other.
     */
    recordWatchedMinutes(delta: number): Promise<void>;

    /**
     * Register a "remove my presence" action to run if this client vanishes
     * without calling `close()` — a closed laptop, a killed tab, a dropped
     * connection.
     *
     * Exists because Firebase does this well (`onDisconnect().remove()`) and a
     * generic port should not pretend otherwise. It MUST be armed BEFORE the
     * first `publishPresence`, otherwise a connection lost between the two
     * leaves a permanent ghost participant. Adapters that cannot support it
     * implement a no-op; the presence TTL stays the backstop either way.
     */
    armDisconnectCleanup(): Promise<void>;

    /**
     * Tear down: cancel subscriptions, cancel the disconnect action, remove
     * this client's presence. Idempotent; safe to call after an error.
     */
    close(): Promise<void>;
}
