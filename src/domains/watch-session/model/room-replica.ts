import { notImplemented } from './shared/not-implemented';
import type { EpochMs, Seconds } from './shared/time';
import type { Stamped } from './shared/stamped';
import type { ClockConfidence } from './shared/clock-confidence';
import type { ActivityId, Nickname, ParticipantId, RoomId } from './ids';
import type { MediaSourceRef } from './media-source';
import type { PlayheadIntent } from './playhead';
import type { Presence } from './participant';
import type { Activity } from './activity';
import type { ObservedPlayback } from './reconcile';
import type { SyncPolicy } from './sync-policy';
import type { Decision } from './decision';
import type { RoomSnapshot } from './room-state';
import type { ConnectionState } from './connection';

/**
 * The aggregate root: the LOCAL replica of one room's shared state.
 *
 * It is a pure state machine — `(state, message, now) -> (state', Decision)`.
 * It never awaits, never touches a port, never reads a clock, never generates
 * an id or a random number. Everything it needs is passed in; everything it
 * wants done comes back as a Decision.
 *
 * Invariants it owns (docs/architecture/001-ddd-hexagonal-design.md §5.6):
 *  I1 published stamps always come from the synchronized clock;
 *  I2 `paused` and `position` are always published together, atomically;
 *  I3 an older remote intent is discarded, never applied just because it arrived;
 *  I4 at most one correction per decision; a pending one suppresses conflicts;
 *  I5 an echo never produces a PublishIntent;
 *  I6 presence is always evaluated against the current `now`;
 *  I7 one TTL rule governs the feed; expiry is computed, never stored;
 *  I8 watch-time accrues only while the projected playhead actually advances;
 *  I9 with an unsynchronized clock and `requireClockSync`, refuse to publish
 *     and report `degraded` rather than corrupt the room.
 */
export interface RoomReplica {
    // ---- local commands (from the UI, via use cases) ------------------------
    requestPlay(at: Seconds, now: EpochMs): Decision;
    requestPause(at: Seconds, now: EpochMs): Decision;
    requestSeek(to: Seconds, now: EpochMs): Decision;
    selectSource(source: MediaSourceRef | null, now: EpochMs): Decision;
    postChat(id: ActivityId, text: string, now: EpochMs): Decision;
    throwReaction(id: ActivityId, emoji: string, now: EpochMs): Decision;
    rename(nickname: Nickname, now: EpochMs): Decision;

    // ---- remote updates (from the gateway, via RemoteRoomListener) ----------
    applyRemoteSnapshot(snapshot: RemoteRoomState, now: EpochMs): Decision;
    applyRemotePlayhead(intent: PlayheadIntent, now: EpochMs): Decision;
    applyRemoteSource(source: Stamped<MediaSourceRef | null>, now: EpochMs): Decision;
    applyRemotePresence(all: readonly Presence[], now: EpochMs): Decision;
    applyRemoteActivity(all: readonly Activity[], now: EpochMs): Decision;
    applyConnectionChange(state: ConnectionState, now: EpochMs): Decision;
    applyClockConfidence(confidence: ClockConfidence, now: EpochMs): Decision;

    // ---- observation and time ----------------------------------------------
    /** Feed the player's actual state in. Echo detection happens here. */
    observePlayer(observed: ObservedPlayback, now: EpochMs): Decision;
    /** Heartbeats, TTL sweep, stale-playback guard, watch-time accrual. */
    tick(now: EpochMs): Decision;

    // ---- projection ---------------------------------------------------------
    snapshot(now: EpochMs): RoomSnapshot;
}

/** Whatever the remote store had when we opened the room. */
export interface RemoteRoomState {
    readonly playhead: PlayheadIntent | null;
    readonly source: Stamped<MediaSourceRef | null> | null;
    readonly presences: readonly Presence[];
    readonly activities: readonly Activity[];
    readonly watchedMinutes: number;
}

export interface RoomReplicaParams {
    readonly roomId: RoomId;
    readonly self: ParticipantId;
    readonly nickname: Nickname;
    readonly policy: SyncPolicy;
    readonly now: EpochMs;
}

export interface RoomReplicaFactory {
    create(params: RoomReplicaParams): RoomReplica;
}

/**
 * Build a replica for a room this client is joining.
 *
 * @param params.roomId    Room being joined.
 * @param params.self      This client's participant id.
 * @param params.nickname  This client's display name, for the first presence.
 * @param params.policy    Every timing constant the replica will apply.
 * @param params.now       Synchronized clock reading at creation.
 */
export function createRoomReplica(params: RoomReplicaParams): RoomReplica {
    return notImplemented('createRoomReplica');
}
