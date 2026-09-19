import type { WatchSessionCommands } from './inbound/watch-session-commands';
import type { WatchSessionView } from './inbound/watch-session-view';
import type { RemoteRoomListener } from './inbound/remote-room-listener';
import type { MediaPlayerListener } from './inbound/media-player-listener';
import type { SessionTicks } from './inbound/session-ticks';
import type { RoomGatewayPort } from './outbound/room-gateway';
import type { MediaPlayerPort } from './outbound/media-player';
import type { MediaResolverPort } from './outbound/media-resolver';
import type { ClockPort } from './outbound/clock';
import type { SchedulerPort } from './outbound/scheduler';
import type { ProfileStorePort } from './outbound/profile-store';
import type { IdGeneratorPort } from './outbound/id-generator';
import type { TelemetryPort } from './outbound/telemetry';
import type { ErrorReporterPort } from './outbound/error-reporter';
import type { LocationPort } from './outbound/location';
import type { DomainEventBus } from './event-bus';
import type { RoomReplicaFactory } from '../model/room-replica';
import type { SyncPolicy } from '../model/sync-policy';

/**
 * THE IMPLEMENTATION SIDE of the hexagon, sitting between `inbound/` and
 * `outbound/`.
 *
 * `WatchSession` is the one object that satisfies every inbound port, so a
 * driving adapter needs exactly one reference: the Svelte tree gets
 * `session.commands`/`session.view`, the gateway adapter gets it as a
 * `RemoteRoomListener`, the player adapter as a `MediaPlayerListener`, the
 * scheduler as `SessionTicks`.
 *
 * One object rather than four because they all mutate the same aggregate and
 * must be serialized against it. It is the only stateful and only impure thing
 * in the application layer, and it holds no business rules — it translates,
 * sequences, and executes the `Decision`s the aggregate returns.
 *
 * There is deliberately no `RequestPlayUseCase` class: the methods on
 * `WatchSessionCommands` are the use cases. Only the genuinely multi-port flows
 * (`join`, `setSourceFromUserInput`, `shareLocalFile`) get their own modules
 * under `use-cases/` when implementation starts.
 */
export interface WatchSession
    extends WatchSessionCommands, RemoteRoomListener, MediaPlayerListener, SessionTicks {
    /** The read side handed to the UI alongside the command methods. */
    readonly view: WatchSessionView;

    /**
     * Domain events, for the projections wired in the composition root:
     * feed notices, telemetry, watch time. Not for components — they read
     * {@link view}.
     */
    readonly events: DomainEventBus;

    /**
     * Release everything: leave the room, detach the player, cancel the tick
     * loop, release media delivery. Idempotent.
     */
    dispose(): Promise<void>;
}

/**
 * Everything the composition root must supply. This is the only place adapters
 * and the application meet, and the only reason `composition/` exists.
 */
export interface WatchSessionDependencies {
    /** Shared state backend: Firebase, in-memory, or a future alternative. */
    readonly gateway: RoomGatewayPort;
    /** The local media element. */
    readonly player: MediaPlayerPort;
    /** Source classification, resolution and P2P delivery. */
    readonly resolver: MediaResolverPort;
    /** Synchronized "now". Everything timestamped comes from here. */
    readonly clock: ClockPort;
    /** Drives `SessionTicks`. */
    readonly scheduler: SchedulerPort;
    /** Persisted per-browser identity and preferences. */
    readonly profiles: ProfileStorePort;
    /** Id generation, kept out of the domain for determinism in tests. */
    readonly ids: IdGeneratorPort;
    readonly telemetry: TelemetryPort;
    readonly errors: ErrorReporterPort;
    /** Address bar and share sheet. */
    readonly location: LocationPort;
    /** Builds the aggregate. Injected so tests can substitute a spy. */
    readonly replicas: RoomReplicaFactory;
    /** Every timing constant. `DEFAULT_SYNC_POLICY` in production. */
    readonly policy: SyncPolicy;
}

/**
 * Build the session. Wires nothing on its own — `join()` opens the gateway,
 * attaches the player and starts the tick loop.
 *
 * @param deps Adapter instances, assembled by the composition root.
 * @returns An idle session; call `join(roomId)` to enter a room.
 */
export declare function createWatchSession(deps: WatchSessionDependencies): WatchSession;

export type {
    WatchSessionCommands,
    SetSourceResult,
    SourceRejection,
    ShareFileResult,
    ShareFailure,
    InteractionTarget,
} from './inbound/watch-session-commands';
export type { WatchSessionView } from './inbound/watch-session-view';
export type { RemoteRoomListener, GatewayError } from './inbound/remote-room-listener';
export type { MediaPlayerListener, PlayerError } from './inbound/media-player-listener';
export type { SessionTicks } from './inbound/session-ticks';
