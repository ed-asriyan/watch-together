import type { Stamped } from '../../../domain/shared/stamped';
import type { MediaSourceRef } from '../../../domain/room/media-source';
import type { PlayheadIntent } from '../../../domain/room/playhead';
import type { Presence } from '../../../domain/room/participant';
import type { Activity } from '../../../domain/room/activity';
import type { ConnectionState } from '../../../domain/room/connection';
import type { RemoteRoomState } from '../../../domain/room/room-replica';

/**
 * DRIVING PORT — inbound signals from the remote synchronized store.
 *
 * Declared and implemented by the application; CALLED by the gateway adapter.
 * That is the point: the dependency arrow runs adapter -> application, so the
 * application never imports Firebase, and every gateway implementation is held
 * to the same contract by one shared contract-test suite.
 *
 * (An `Observable<RemoteEvent>`-returning variant is ergonomically nicer in
 * Svelte; if wanted, bridge it in the application layer and keep this as the
 * port, because this is what contract tests target. See §6.1.2.)
 */
export interface RemoteRoomListener {
    /** Exactly once per `open()`, before any incremental callback. */
    onSnapshot(state: RemoteRoomState): void;

    onPlayheadChanged(intent: PlayheadIntent): void;
    onSourceChanged(source: Stamped<MediaSourceRef | null>): void;
    onPresenceChanged(all: readonly Presence[]): void;
    onActivityChanged(all: readonly Activity[]): void;

    onConnectionChanged(state: ConnectionState): void;
    onRemoteError(error: GatewayError): void;
}

export interface GatewayError {
    readonly kind: 'write-rejected' | 'read-failed' | 'permission-denied' | 'disconnected' | 'unknown';
    readonly message: string;
    readonly cause?: unknown;
}
