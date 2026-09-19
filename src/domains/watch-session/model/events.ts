import type { Seconds } from './shared/time';
import type { ClockConfidence } from './shared/clock-confidence';
import type { ActivityId, ParticipantId, RoomId } from './ids';
import type { MediaSourceRef } from './media-source';
import type { Participant } from './participant';
import type { Activity } from './activity';
import type { Correction } from './reconcile';
import type { ConnectionState } from './connection';

/**
 * The published language of the core.
 *
 * Exactly three consumers subscribe: the feed-notice projection, the telemetry
 * projection, and the read models. After this exists, `track(` appears in one
 * file instead of eight components, and nothing reads the transport to
 * assemble analytics context.
 *
 * `local` distinguishes "we did this" from "we observed someone else doing it" —
 * the two need different feed and telemetry treatment.
 */
export type DomainEvent =
    | { readonly type: 'RoomJoined'; readonly roomId: RoomId; readonly self: ParticipantId }
    | { readonly type: 'RoomLeft'; readonly roomId: RoomId }
    | { readonly type: 'SourceChanged'; readonly source: MediaSourceRef | null; readonly by: ParticipantId; readonly local: boolean }
    | { readonly type: 'PlaybackStarted'; readonly at: Seconds; readonly by: ParticipantId; readonly local: boolean }
    | { readonly type: 'PlaybackPaused'; readonly at: Seconds; readonly by: ParticipantId; readonly local: boolean }
    | { readonly type: 'PlaybackSeeked'; readonly to: Seconds; readonly by: ParticipantId; readonly local: boolean }
    | { readonly type: 'DriftCorrected'; readonly drift: Seconds; readonly correction: Correction }
    | { readonly type: 'PlaybackStalled'; readonly silentFor: Seconds }
    | { readonly type: 'ParticipantJoined'; readonly participant: Participant }
    | { readonly type: 'ParticipantLeft'; readonly participantId: ParticipantId }
    | { readonly type: 'ParticipantRenamed'; readonly participant: Participant }
    | { readonly type: 'ChatPosted'; readonly activity: Activity }
    | { readonly type: 'ReactionThrown'; readonly activity: Activity }
    | { readonly type: 'ActivitiesExpired'; readonly ids: readonly ActivityId[] }
    | { readonly type: 'MinuteWatched'; readonly total: number }
    | { readonly type: 'ConnectionChanged'; readonly state: ConnectionState }
    | { readonly type: 'ClockConfidenceChanged'; readonly confidence: ClockConfidence };

export type DomainEventType = DomainEvent['type'];
