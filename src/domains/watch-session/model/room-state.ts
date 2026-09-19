import type { EpochMs, Seconds } from './shared/time';
import type { Stamped } from './shared/stamped';
import type { ClockConfidence } from './shared/clock-confidence';
import type { ActivityId, ParticipantId, RoomId } from './ids';
import type { MediaSourceRef } from './media-source';
import type { PlayheadIntent } from './playhead';
import type { Presence, Participant } from './participant';
import type { Activity } from './activity';
import type { IssuedCorrection } from './echo';
import type { ConnectionState } from './connection';

/**
 * The replica's internal state. Not exposed to the UI — `RoomSnapshot` is.
 * Every field is `readonly`; transitions produce a new object.
 */
export interface RoomState {
    readonly roomId: RoomId;
    readonly self: ParticipantId;

    readonly playhead: PlayheadIntent;
    readonly source: Stamped<MediaSourceRef | null>;
    readonly presences: readonly Presence[];
    readonly activities: readonly Activity[];

    /** Correction awaiting its echo, if any. */
    readonly pending: IssuedCorrection | null;
    readonly correctionSeq: number;

    readonly lastPlayheadPublish: EpochMs | null;
    readonly lastPresencePublish: EpochMs | null;
    readonly lastSweep: EpochMs | null;
    readonly lastWatchTimeMark: EpochMs | null;
    readonly watchedMinutes: number;

    readonly connection: ConnectionState;
    readonly clockConfidence: ClockConfidence;
}

/**
 * The read-side view of the replica, recomputed for a given `now`.
 *
 * Time-dependent facts (who is online, which activities are still live, where
 * the playhead should be) are DERIVED here, never stored — so they cannot go
 * stale the way the legacy frozen presence cut-off did.
 */
export interface RoomSnapshot {
    readonly roomId: RoomId;
    readonly self: Participant;
    readonly others: readonly Participant[];
    readonly source: MediaSourceRef | null;
    readonly sourceChangedBy: ParticipantId;
    readonly playhead: PlayheadIntent;
    readonly projectedPosition: Seconds;
    readonly liveActivities: readonly Activity[];
    readonly expiredActivityIds: readonly ActivityId[];
    readonly watchedMinutes: number;
    readonly connection: ConnectionState;
    readonly clockConfidence: ClockConfidence;
}
