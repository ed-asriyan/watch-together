import type { ParticipantId, RoomId } from '../../../domain/room/ids';
import type { MediaSourceKind } from '../../../domain/room/media-source';
import type { DomainEvent } from '../../../domain/room/events';

/**
 * DRIVEN PORT — product analytics.
 *
 * Fed by one projection subscribed to the domain event bus, so `track(`
 * appears in exactly one file. Legacy called it from eight components, and its
 * `RoomEvent` base class assembled context by reading the transport stores
 * (`analytics.svelte:54,72,75`) — three Firebase listener attach/detach cycles
 * per tracked event.
 */
export interface TelemetryPort {
    /**
     * Record one product event.
     *
     * @param event   A domain event, used verbatim as the analytics vocabulary.
     *                Mapping to vendor event names belongs to the adapter.
     * @param context Room context at the moment of the event, assembled from
     *                the LOCAL snapshot and never by reading the network.
     */
    record(event: DomainEvent, context: TelemetryContext): void;

    /**
     * Associate subsequent events with this viewer.
     *
     * @param participantId The persisted, stable per-browser id. Called once
     *                      per session, after the profile is loaded — not at
     *                      module import time as legacy `me.ts` did.
     */
    identify(participantId: ParticipantId): void;
}

/** The room context attached to every room-scoped analytics event. */
export interface TelemetryContext {
    readonly roomId: RoomId;
    readonly paused: boolean;
    readonly sourceKind: MediaSourceKind | null;
    /** Hostname only, for direct links. Never the full URL — it is content. */
    readonly sourceHost: string | null;
    /** Including this viewer, matching what the UI shows. */
    readonly participantCount: number;
    /** Whether the source is one of the configured demo videos. */
    readonly isExampleSource: boolean;
}
