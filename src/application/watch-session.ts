import type { WatchSessionCommands } from './ports/inbound/watch-session-commands';
import type { RemoteRoomListener } from './ports/inbound/remote-room-listener';
import type { MediaPlayerListener } from './ports/inbound/media-player-listener';
import type { SessionTicks } from './ports/inbound/session-ticks';
import type { WatchSessionView } from './read-models/watch-session-view';
import type { DomainEventBus } from './event-bus';
import type { RoomGatewayPort } from './ports/outbound/room-gateway';
import type { MediaPlayerPort } from './ports/outbound/media-player';
import type { MediaResolverPort } from './ports/outbound/media-resolver';
import type { ClockPort } from './ports/outbound/clock';
import type { SchedulerPort } from './ports/outbound/scheduler';
import type { ProfileStorePort } from './ports/outbound/profile-store';
import type { IdGeneratorPort } from './ports/outbound/id-generator';
import type { TelemetryPort } from './ports/outbound/telemetry';
import type { ErrorReporterPort } from './ports/outbound/error-reporter';
import type { LocationPort } from './ports/outbound/location';
import type { RoomReplicaFactory } from '../domain/room/room-replica';
import type { SyncPolicy } from '../domain/room/sync-policy';

/**
 * The coordinator.
 *
 * One class implements all four driving ports because they all mutate the same
 * aggregate and must be serialized against it. It is the only stateful, only
 * impure object in the application layer, and it contains no business rules —
 * it translates, sequences, and executes `Decision`s.
 *
 * There is deliberately no `RequestPlayUseCase` class: the methods on
 * `WatchSessionCommands` ARE the use cases. Only the three genuinely
 * multi-port flows (`join`, `setSourceFromUserInput`, `shareLocalFile`) get
 * their own modules under `use-cases/`.
 */
export interface WatchSession
    extends WatchSessionCommands, RemoteRoomListener, MediaPlayerListener, SessionTicks {
    readonly view: WatchSessionView;
    readonly events: DomainEventBus;
    dispose(): Promise<void>;
}

/** Everything the composition root must supply. The only place adapters meet. */
export interface WatchSessionDependencies {
    readonly gateway: RoomGatewayPort;
    readonly player: MediaPlayerPort;
    readonly resolver: MediaResolverPort;
    readonly clock: ClockPort;
    readonly scheduler: SchedulerPort;
    readonly profiles: ProfileStorePort;
    readonly ids: IdGeneratorPort;
    readonly telemetry: TelemetryPort;
    readonly errors: ErrorReporterPort;
    readonly location: LocationPort;
    readonly replicas: RoomReplicaFactory;
    readonly policy: SyncPolicy;
}

export declare function createWatchSession(deps: WatchSessionDependencies): WatchSession;
