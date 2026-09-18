import type { ParticipantId, RoomId } from '../../../domain/room/ids';
import type { MediaSourceKind } from '../../../domain/room/media-source';
import type { DomainEvent } from '../../../domain/room/events';

/**
 * DRIVEN PORT — product analytics.
 *
 * Fed by a projection subscribed to the domain event bus, so `track(` appears
 * in exactly one file. Legacy called it from eight components, and its
 * `RoomEvent` base class assembled context by reading the transport stores
 * (`analytics.svelte:54,72,75`) — three Firebase listener attach/detach cycles
 * per tracked event.
 *
 * Context comes from the LOCAL snapshot, never from the network.
 */
export interface TelemetryPort {
    record(event: DomainEvent, context: TelemetryContext): void;
    identify(participantId: ParticipantId): void;
}

export interface TelemetryContext {
    readonly roomId: RoomId;
    readonly paused: boolean;
    readonly sourceKind: MediaSourceKind | null;
    /** Hostname only for direct links; never the full URL. */
    readonly sourceHost: string | null;
    readonly participantCount: number;
    readonly isExampleSource: boolean;
}
