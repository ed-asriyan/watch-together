import * as amplitude from '@amplitude/analytics-browser';
import type { TelemetryPort, TelemetryContext } from '../../../domains/watch-session/ports/outbound/telemetry';
import type { DomainEvent } from '../../../domains/watch-session/model/events';
import type { ParticipantId } from '../../../domains/watch-session/model/ids';

/** Domain event type -> the product event name the analytics tools already know. */
const NAMES: Partial<Record<DomainEvent['type'], string>> = {
    PlaybackStarted: 'played',
    PlaybackPaused: 'paused',
    PlaybackSeeked: 'seeked',
    SourceChanged: 'url_paste',
    ChatPosted: 'message_sent',
    ReactionThrown: 'reaction_sent',
    MinuteWatched: 'watch_minute',
    RoomJoined: 'room_joined',
};

/**
 * The only place `track(` appears.
 *
 * Legacy called it from eight components, and its `RoomEvent` base class built
 * the room context by reading the transport stores — three Firebase listener
 * attach/detach cycles per tracked event. Context now comes from the local
 * snapshot, which the coordinator already holds.
 */
export class AmplitudeGaTelemetry implements TelemetryPort {
    constructor(
        private readonly enabled: boolean,
        private readonly measurementId: string | null,
    ) {}

    record(event: DomainEvent, context: TelemetryContext): void {
        const name = NAMES[event.type];
        if (!name) return;

        const params = { ...context, ...this.payload(event) };
        if (!this.enabled) {
            console.log('[telemetry]', name, params);
            return;
        }
        amplitude.track(name, params);
        if (this.measurementId) {
            const layer = (window as unknown as { dataLayer?: unknown[] }).dataLayer;
            layer?.push(['event', name, params]);
        }
    }

    identify(participantId: ParticipantId): void {
        if (this.enabled) amplitude.setUserId(participantId);
    }

    private payload(event: DomainEvent): Record<string, unknown> {
        switch (event.type) {
            case 'PlaybackStarted':
            case 'PlaybackPaused':
                return { position: event.at, local: event.local };
            case 'PlaybackSeeked':
                return { position: event.to, local: event.local };
            case 'SourceChanged':
                return { sourceKind: event.source?.kind ?? null, local: event.local };
            case 'MinuteWatched':
                return { total: event.total };
            default:
                return {};
        }
    }
}
