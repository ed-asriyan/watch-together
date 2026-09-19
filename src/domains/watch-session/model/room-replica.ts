import type { EpochMs, Seconds } from './shared/time';
import type { Stamped } from './shared/stamped';
import { mergeLww, supersedes } from './shared/stamped';
import type { ActivityBody } from './activity';
import type { PublishIntent } from './decision';
import type { DomainEvent } from './events';
import type { Correction } from './reconcile';
import type { Playhead } from './playhead';
import type { IssuedCorrection, PlayerObservation } from './echo';
import { hasSettled, isEcho } from './echo';
import { isAdvancing, projectedPositionAt, silentFor } from './playhead';
import { reconcile } from './reconcile';
import { heartbeatDue, onlineOnly } from './presence-policy';
import { expiredIds, isExpired, liveOnly, sweepDue } from './retention-policy';
import { participantFrom } from './participant';
import type { ClockConfidence } from './shared/clock-confidence';
import type { ActivityId, Nickname, ParticipantId, RoomId } from './ids';
import type { MediaSourceRef } from './media-source';
import type { PlayheadIntent } from './playhead';
import type { Presence } from './participant';
import type { Activity, Notice } from './activity';
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

    /**
     * Post a system notice into the feed.
     *
     * The primitive behind "Bob scrubbed to 12:30" and "Bob is playing his own
     * copy". Used by the feed-notice projection, which turns domain events into
     * notices, and by the coordinator for the local-file case, which produces
     * no domain event of its own.
     *
     * Legacy authored these from view components by sending a chat message with
     * a magic `MessageType` and the position stuffed into `text`.
     *
     * @param id     Feed item id, from `IdGeneratorPort`.
     * @param notice What happened, structured. Rendering is the UI's job.
     * @param now    Synchronized clock reading.
     */
    postNotice(id: ActivityId, notice: Notice, now: EpochMs): Decision;
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
    /**
     * When the room was first written, or `null` for a room that does not
     * exist yet.
     *
     * The domain does not use it — room expiry is an operations concern. It is
     * on the port because the scheduled cleanup job prunes rooms by it, and a
     * gateway that never records it would leave the database growing forever.
     * Remembered from `clean-db.js`, which reads legacy `room/{id}/createdAt`.
     */
    readonly createdAt: EpochMs | null;
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
    return new Replica(params);
}

const NOTHING: Decision = { events: [], publish: [], correct: { kind: 'none' } };

interface Seen {
    readonly state: ObservedPlayback;
    readonly at: EpochMs;
}

class Replica implements RoomReplica {
    private readonly roomId: RoomId;
    private readonly self: ParticipantId;
    private readonly policy: SyncPolicy;
    private readonly bornAt: EpochMs;

    private nick: Nickname;
    private playhead: PlayheadIntent;
    private src: Stamped<MediaSourceRef | null>;
    private presences: readonly Presence[] = [];
    private activities: readonly Activity[] = [];

    private pending: IssuedCorrection | null = null;
    private seq = 0;
    private seen: Seen | null = null;

    private lastPlayheadPublish: EpochMs | null = null;
    private lastPresencePublish: EpochMs | null = null;
    private lastSweep: EpochMs | null = null;
    private lastWatchMark: EpochMs;
    private watched = 0;

    private connection: ConnectionState = { status: 'connecting' };
    private confidence: ClockConfidence = 'synced';

    private readonly knownActivityIds = new Set<string>();
    private readonly retractedIds = new Set<string>();
    private onlineIds: readonly ParticipantId[] = [];
    private joined = false;

    constructor({ roomId, self, nickname, policy, now }: RoomReplicaParams) {
        this.roomId = roomId;
        this.self = self;
        this.nick = nickname;
        this.policy = policy;
        this.bornAt = now;
        this.lastWatchMark = now;
        // Stamped at the epoch, NOT at `now`.
        //
        // A replica that has heard nothing has no claim about what the room is
        // watching, and a default stamped "now" is the newest write in the room
        // — so it would beat the real playhead on join and leave anyone
        // entering a film in progress sitting at zero, paused. These are
        // placeholders that must lose to everything.
        const nothingKnown = 0 as EpochMs;
        this.playhead = { value: { position: 0 as Seconds, paused: true, rate: 1 }, at: nothingKnown, by: self };
        this.src = { value: null, at: nothingKnown, by: self };
    }

    // ---- local commands ----------------------------------------------------

    requestPlay(at: Seconds, now: EpochMs): Decision {
        return this.declare({ position: at, paused: false, rate: this.playhead.value.rate }, now,
            [{ type: 'PlaybackStarted', at, by: this.self, local: true }]);
    }

    requestPause(at: Seconds, now: EpochMs): Decision {
        return this.declare({ position: at, paused: true, rate: this.playhead.value.rate }, now,
            [{ type: 'PlaybackPaused', at, by: this.self, local: true }]);
    }

    requestSeek(to: Seconds, now: EpochMs): Decision {
        return this.declare({ position: to, paused: this.playhead.value.paused, rate: this.playhead.value.rate }, now,
            [{ type: 'PlaybackSeeked', to, by: this.self, local: true }]);
    }

    selectSource(source: MediaSourceRef | null, now: EpochMs): Decision {
        const stampedSource: Stamped<MediaSourceRef | null> = { value: source, at: now, by: this.self };
        this.src = mergeLww(this.src, stampedSource);

        // Same reading on both writes: a peer must never be able to apply the
        // new source against the old position, or the other way round.
        const reset: PlayheadIntent = {
            value: { position: 0 as Seconds, paused: true, rate: 1 },
            at: now,
            by: this.self,
        };
        this.playhead = mergeLww(this.playhead, reset);
        this.pending = null;

        return this.emit(
            [{ type: 'SourceChanged', source, by: this.self, local: true }],
            [{ kind: 'source', source: stampedSource }, { kind: 'playhead', intent: reset }],
            { kind: 'none' },
        );
    }

    postChat(id: ActivityId, text: string, now: EpochMs): Decision {
        const trimmed = text.trim();
        if (!trimmed) return NOTHING;
        const activity = this.authored(id, now, { kind: 'chat', text: trimmed });
        return this.emit([{ type: 'ChatPosted', activity }], [{ kind: 'activity', activity }], { kind: 'none' });
    }

    throwReaction(id: ActivityId, emoji: string, now: EpochMs): Decision {
        const activity = this.authored(id, now, { kind: 'reaction', emoji });
        return this.emit([{ type: 'ReactionThrown', activity }], [{ kind: 'activity', activity }], { kind: 'none' });
    }

    postNotice(id: ActivityId, notice: Notice, now: EpochMs): Decision {
        const activity = this.authored(id, now, { kind: 'notice', notice });
        return this.emit([], [{ kind: 'activity', activity }], { kind: 'none' });
    }

    rename(nickname: Nickname, now: EpochMs): Decision {
        this.nick = nickname;
        const presence = this.selfPresence(now);
        this.lastPresencePublish = now;
        return this.emit(
            [{ type: 'ParticipantRenamed', participant: participantFrom(presence, this.self) }],
            [{ kind: 'presence', presence }],
            { kind: 'none' },
        );
    }

    // ---- remote updates ----------------------------------------------------

    applyRemoteSnapshot(snapshot: RemoteRoomState, now: EpochMs): Decision {
        if (snapshot.playhead) this.playhead = mergeLww(this.playhead, snapshot.playhead);
        if (snapshot.source) this.src = mergeLww(this.src, snapshot.source);
        this.presences = snapshot.presences;
        this.activities = snapshot.activities;
        snapshot.activities.forEach((a) => this.knownActivityIds.add(a.id));
        this.onlineIds = onlineOnly(snapshot.presences, now, this.policy).map((p) => p.participantId);
        this.watched = snapshot.watchedMinutes;
        this.connection = { status: 'online' };
        // Announced once per replica: a gateway may deliver a snapshot more
        // than once (a reconnect re-reads the room), and joining is not
        // something that happens twice.
        const events: DomainEvent[] = this.joined
            ? []
            : [{ type: 'RoomJoined', roomId: this.roomId, self: this.self }];
        this.joined = true;
        return this.emit(events, [], this.correctNow(now));
    }

    applyRemotePlayhead(intent: PlayheadIntent, now: EpochMs): Decision {
        if (!supersedes(intent, this.playhead)) return NOTHING;
        const previous = this.playhead;
        this.playhead = intent;
        return this.emit(this.transition(previous, intent, now), [], this.correctNow(now));
    }

    applyRemoteSource(source: Stamped<MediaSourceRef | null>, now: EpochMs): Decision {
        if (!supersedes(source, this.src)) return NOTHING;
        this.src = source;

        // Resetting through the merge rather than overwriting: a playhead
        // written in the same millisecond by a different peer must win or lose
        // the same way on every replica.
        this.playhead = mergeLww(this.playhead, {
            value: { position: 0 as Seconds, paused: true, rate: 1 },
            at: source.at,
            by: source.by,
        });
        this.pending = null;

        return this.emit(
            [{ type: 'SourceChanged', source: source.value, by: source.by, local: source.by === this.self }],
            [],
            this.correctNow(now),
        );
    }

    applyRemotePresence(all: readonly Presence[], now: EpochMs): Decision {
        this.presences = all;
        const online = onlineOnly(all, now, this.policy)
            .filter((p) => p.participantId !== this.self);
        const ids = online.map((p) => p.participantId);

        const events: DomainEvent[] = [];
        for (const presence of online) {
            if (!this.onlineIds.includes(presence.participantId)) {
                events.push({ type: 'ParticipantJoined', participant: participantFrom(presence, this.self) });
            }
        }
        for (const id of this.onlineIds) {
            if (!ids.includes(id)) events.push({ type: 'ParticipantLeft', participantId: id });
        }
        this.onlineIds = ids;
        return this.emit(events, [], { kind: 'none' });
    }

    applyRemoteActivity(all: readonly Activity[], now: EpochMs): Decision {
        const byId = new Map(this.activities.map((a) => [a.id, a] as const));
        const events: DomainEvent[] = [];

        for (const activity of all) {
            byId.set(activity.id, activity);
            if (this.knownActivityIds.has(activity.id)) continue;
            this.knownActivityIds.add(activity.id);
            // An item already past its lifetime is delivered but never announced:
            // nothing should flash on screen only to vanish in the same frame.
            if (isExpired(activity, now, this.policy)) continue;
            if (activity.body.kind === 'chat') events.push({ type: 'ChatPosted', activity });
            if (activity.body.kind === 'reaction') events.push({ type: 'ReactionThrown', activity });
        }

        this.activities = [...byId.values()];
        return this.emit(events, [], { kind: 'none' });
    }

    applyConnectionChange(state: ConnectionState, now: EpochMs): Decision {
        this.connection = state;
        return this.emit([{ type: 'ConnectionChanged', state }], [], { kind: 'none' });
    }

    applyClockConfidence(confidence: ClockConfidence, now: EpochMs): Decision {
        if (confidence === this.confidence) return NOTHING;
        this.confidence = confidence;

        const events: DomainEvent[] = [{ type: 'ClockConfidenceChanged', confidence }];
        const blocked = this.policy.requireClockSync && confidence === 'unsynced';
        const next: ConnectionState = blocked
            ? { status: 'degraded', reason: 'clock-unsynced' }
            : { status: 'online' };
        if (next.status !== this.connection.status) {
            this.connection = next;
            events.push({ type: 'ConnectionChanged', state: next });
        }
        return this.emit(events, [], { kind: 'none' });
    }

    // ---- observation and time ----------------------------------------------

    observePlayer(observed: ObservedPlayback, now: EpochMs): Decision {
        const previous = this.seen;
        this.seen = { state: observed, at: now };

        // Nothing observed while loading or buffering means anything.
        if (!observed.ready || observed.stalled) return NOTHING;

        if (this.pending && !hasSettled(this.pending, now, this.policy)) {
            const observation = this.classify(previous, observed, now);
            // NOT cleared on the first match: one `halt` or `resume` produces
            // two events, the seek and the toggle, and forgetting it after the
            // first would leave the second to be declared as a user action.
            // `hasSettled` retires it instead, so the window governs how long
            // a correction can be blamed for what the element does.
            if (observation && isEcho(observation, this.pending, now, this.policy)) return NOTHING;
        }

        // A user action is a DISCONTINUITY against the player's own previous
        // reading. Falling behind the room is continuous, and publishing that
        // would tell everyone else to rewind to wherever this client is stuck.
        if (previous && previous.state.ready && !previous.state.stalled) {
            const expected = previous.state.paused
                ? previous.state.position
                : previous.state.position + (now - previous.at) / 1000;
            const jumped = Math.abs(observed.position - expected) > this.policy.hardSeekThreshold;
            const toggled = observed.paused !== previous.state.paused;

            if (jumped || toggled) {
                this.pending = null;
                return this.declare(
                    { position: observed.position, paused: observed.paused, rate: this.playhead.value.rate },
                    now,
                    toggled
                        ? observed.paused
                            ? [{ type: 'PlaybackPaused', at: observed.position, by: this.self, local: true }]
                            : [{ type: 'PlaybackStarted', at: observed.position, by: this.self, local: true }]
                        : [{ type: 'PlaybackSeeked', to: observed.position, by: this.self, local: true }],
                );
            }
        }

        return this.emit([], [], this.correctNow(now));
    }

    tick(now: EpochMs): Decision {
        const events: DomainEvent[] = [];
        const publish: PublishIntent[] = [];

        // Someone who stops heartbeating sends nothing, so nothing arrives to
        // re-evaluate them against. Presence has to expire on the clock, or a
        // closed laptop stays in the room until somebody else happens to write.
        const stillHere = onlineOnly(this.presences, now, this.policy)
            .filter((presence) => presence.participantId !== this.self)
            .map((presence) => presence.participantId);
        for (const id of this.onlineIds) {
            if (!stillHere.includes(id)) events.push({ type: 'ParticipantLeft', participantId: id });
        }
        this.onlineIds = stillHere;

        if (heartbeatDue(this.lastPresencePublish, now, this.policy)) {
            this.lastPresencePublish = now;
            publish.push({ kind: 'presence', presence: this.selfPresence(now) });
        }

        if (sweepDue(this.lastSweep, now, this.policy)) {
            this.lastSweep = now;
            const ids = expiredIds(this.activities, now, this.policy)
                .filter((id) => !this.retractedIds.has(id));
            if (ids.length) {
                ids.forEach((id) => this.retractedIds.add(id));
                publish.push({ kind: 'retract', ids });
                events.push({ type: 'ActivitiesExpired', ids });
            }
        }

        if (isAdvancing(this.playhead)) {
            const silent = silentFor(this.playhead, now);
            if (silent > this.policy.stalePlaybackTimeout) {
                // Whoever was driving playback is gone. Freeze where the room
                // would be now, not back where it was last heard from.
                const at = projectedPositionAt(this.playhead, now);
                const halted: PlayheadIntent = {
                    value: { position: at, paused: true, rate: this.playhead.value.rate },
                    at: now,
                    by: this.self,
                };
                this.playhead = halted;
                publish.push({ kind: 'playhead', intent: halted });
                events.push({ type: 'PlaybackStalled', silentFor: silent });
            } else {
                // Restate our own running playhead periodically, from what the
                // element is ACTUALLY doing.
                //
                // No decoder advances at exactly one second per second, so a
                // projection anchored once at the moment play was pressed
                // drifts away from reality for everybody — including the person
                // driving, who then starts correcting against their own stale
                // stamp. Only the author restates it; if everyone did, the room
                // would fight over the anchor.
                const mine = this.playhead.by === this.self;
                const due = this.lastPlayheadPublish === null
                    || now - this.lastPlayheadPublish >= this.policy.playheadHeartbeat * 1000;

                if (mine && due && this.seen?.state.ready && !this.seen.state.stalled) {
                    const restated: PlayheadIntent = {
                        value: { position: this.seen.state.position, paused: false, rate: 1 },
                        at: now,
                        by: this.self,
                    };
                    this.playhead = restated;
                    this.lastPlayheadPublish = now;
                    publish.push({ kind: 'playhead', intent: restated });
                }
            }

            if (now - this.lastWatchMark >= this.policy.watchTimeGranularity * 1000) {
                this.lastWatchMark = now;
                this.watched += 1;
                publish.push({ kind: 'watchTime', deltaMinutes: 1 });
                events.push({ type: 'MinuteWatched', total: this.watched });
            }
        } else {
            this.lastWatchMark = now;
        }

        return this.emit(events, publish, this.correctNow(now));
    }

    // ---- projection ---------------------------------------------------------

    snapshot(now: EpochMs): RoomSnapshot {
        const others = onlineOnly(this.presences, now, this.policy)
            .filter((presence) => presence.participantId !== this.self)
            .map((presence) => participantFrom(presence, this.self));

        return {
            roomId: this.roomId,
            self: participantFrom(this.selfPresence(this.lastPresencePublish ?? this.bornAt), this.self),
            others,
            source: this.src.value,
            sourceChangedBy: this.src.by,
            playhead: this.playhead,
            projectedPosition: projectedPositionAt(this.playhead, now),
            liveActivities: liveOnly(this.activities, now, this.policy)
                .slice()
                .sort((a, b) => a.at - b.at),
            expiredActivityIds: expiredIds(this.activities, now, this.policy),
            watchedMinutes: this.watched,
            connection: this.connection,
            clockConfidence: this.confidence,
        };
    }

    // ---- internals ----------------------------------------------------------

    /** Writes are withheld, not faked, while the clock cannot be trusted (I9). */
    private get writable(): boolean {
        return !(this.policy.requireClockSync && this.confidence === 'unsynced');
    }

    private emit(events: DomainEvent[], publish: PublishIntent[], correct: Correction): Decision {
        return { events, publish: this.writable ? publish : [], correct };
    }

    private declare(value: Playhead, now: EpochMs, events: DomainEvent[]): Decision {
        const intent: PlayheadIntent = { value, at: now, by: this.self };
        this.playhead = intent;
        this.lastPlayheadPublish = now;
        return this.emit(events, [{ kind: 'playhead', intent }], { kind: 'none' });
    }

    private authored(id: ActivityId, at: EpochMs, body: ActivityBody): Activity {
        const activity: Activity = { id, author: this.self, at, body };
        this.knownActivityIds.add(id);
        this.activities = [...this.activities, activity];
        return activity;
    }

    private selfPresence(lastSeen: EpochMs): Presence {
        return { participantId: this.self, nickname: this.nick, lastSeen };
    }

    private correctNow(now: EpochMs): Correction {
        if (!this.seen) return { kind: 'none' };
        const correction = reconcile(this.seen.state, this.playhead, now, this.policy);
        if (correction.kind === 'seek' || correction.kind === 'halt' || correction.kind === 'resume') {
            this.pending = { correction, issuedAt: now, seq: ++this.seq };
        }
        return correction;
    }

    private classify(previous: Seen | null, observed: ObservedPlayback, now: EpochMs): PlayerObservation | null {
        if (!previous) return { type: 'seeked', position: observed.position };
        if (observed.paused !== previous.state.paused) {
            return observed.paused
                ? { type: 'paused', position: observed.position }
                : { type: 'played', position: observed.position };
        }
        const expected = previous.state.paused
            ? previous.state.position
            : previous.state.position + (now - previous.at) / 1000;
        return Math.abs(observed.position - expected) > this.policy.hardSeekThreshold
            ? { type: 'seeked', position: observed.position }
            : { type: 'progress', position: observed.position };
    }

    private transition(previous: PlayheadIntent, next: PlayheadIntent, now: EpochMs): DomainEvent[] {
        const local = next.by === this.self;
        if (previous.value.paused !== next.value.paused) {
            return next.value.paused
                ? [{ type: 'PlaybackPaused', at: next.value.position, by: next.by, local }]
                : [{ type: 'PlaybackStarted', at: next.value.position, by: next.by, local }];
        }
        const drift = Math.abs(next.value.position - projectedPositionAt(previous, next.at));
        return drift > this.policy.hardSeekThreshold
            ? [{ type: 'PlaybackSeeked', to: next.value.position, by: next.by, local }]
            : [];
    }
}
