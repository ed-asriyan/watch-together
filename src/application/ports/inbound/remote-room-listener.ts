import type { Stamped } from '../../../domain/shared/stamped';
import type { MediaSourceRef } from '../../../domain/room/media-source';
import type { PlayheadIntent } from '../../../domain/room/playhead';
import type { Presence } from '../../../domain/room/participant';
import type { Activity } from '../../../domain/room/activity';
import type { ConnectionState } from '../../../domain/room/connection';
import type { RemoteRoomState } from '../../../domain/room/room-replica';

/**
 * DRIVING PORT — signals arriving from the remote synchronized store.
 *
 * Declared and implemented by the application; CALLED by the gateway adapter
 * (`FirebaseRoomGateway`, `InMemoryRoomGateway`, ...). That direction is the
 * point: the dependency arrow runs adapter -> application, so the application
 * never imports Firebase, and every gateway implementation is held to one
 * shared contract-test suite.
 *
 * Callbacks are synchronous and must not throw — an adapter cannot meaningfully
 * handle an application error mid-snapshot. Every method is idempotent from the
 * adapter's point of view: re-delivering the same value is harmless, because
 * the domain merges by LWW and discards anything that does not supersede what
 * it already has (invariant I3).
 *
 * (An `Observable<RemoteEvent>` variant reads better in Svelte; if wanted,
 * bridge it inside the application and keep this as the port, since this is
 * what contract tests target.)
 */
export interface RemoteRoomListener {
    /**
     * The initial full read, delivered exactly once per `RoomGatewayPort.open`
     * and always before any incremental callback below.
     *
     * @param state Everything the room held at open time. Fields are `null` or
     *              empty for a room that does not exist yet — joining a fresh
     *              room is not an error.
     */
    onSnapshot(state: RemoteRoomState): void;

    /**
     * Someone's playback intent changed, including our own echoed back.
     *
     * @param intent The complete playhead — position, paused and rate — with
     *               the author and synchronized timestamp that decide the LWW
     *               merge. Adapters that store position and paused separately
     *               must join them before calling this (invariant I2).
     */
    onPlayheadChanged(intent: PlayheadIntent): void;

    /**
     * The room's agreed video source changed.
     *
     * @param source Stamped so it merges by the same LWW rule as the playhead.
     *               `value` is `null` when the source was cleared.
     */
    onSourceChanged(source: Stamped<MediaSourceRef | null>): void;

    /**
     * Presence changed for anyone in the room.
     *
     * @param all The complete current presence set, not a delta — including
     *            this client's own entry and entries already past their TTL.
     *            Deciding who counts as online is the domain's job, evaluated
     *            against the current `now` every time (invariant I6).
     */
    onPresenceChanged(all: readonly Presence[]): void;

    /**
     * The ephemeral feed changed.
     *
     * @param all The complete current feed, not a delta, including items the
     *            TTL has already expired. The domain filters and, separately,
     *            decides what to retract remotely (invariant I7).
     */
    onActivityChanged(all: readonly Activity[]): void;

    /**
     * Link liveness changed — connected, lost, reconnecting.
     *
     * @param state Current link state. `degraded` means connected but unsafe
     *              to write, which the UI must surface rather than silently
     *              dropping the user's actions.
     */
    onConnectionChanged(state: ConnectionState): void;

    /**
     * A read or write failed.
     *
     * Exists because the legacy transport called Firebase `set()` without
     * awaiting or handling rejection (`bound-store.ts:27`), so a failed write
     * diverged local from remote state permanently and silently.
     *
     * @param error What failed and why. The application reports it and may
     *              move the connection to `degraded`.
     */
    onRemoteError(error: GatewayError): void;
}

export interface GatewayError {
    readonly kind:
        | 'write-rejected'
        | 'read-failed'
        /** Security rules refused the operation. */
        | 'permission-denied'
        | 'disconnected'
        | 'unknown';
    /** Human-readable, for the UI and the error reporter. */
    readonly message: string;
    /** The original SDK error. */
    readonly cause?: unknown;
}
