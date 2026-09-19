import type { RemoteRoomState } from '../../../domains/watch-session/model/room-replica';
import type { ActivityId, ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import type { MediaSourceRef } from '../../../domains/watch-session/model/media-source';
import type { PlayheadIntent } from '../../../domains/watch-session/model/playhead';
import type { Presence } from '../../../domains/watch-session/model/participant';
import type { Activity } from '../../../domains/watch-session/model/activity';
import type { Stamped } from '../../../domains/watch-session/model/shared/stamped';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';

/** Every way a room can change. Serializable, so it can cross a channel. */
export type RoomMutation =
    | { readonly kind: 'playhead'; readonly intent: PlayheadIntent }
    | { readonly kind: 'source'; readonly source: Stamped<MediaSourceRef | null> }
    | { readonly kind: 'presence'; readonly presence: Presence }
    | { readonly kind: 'activity'; readonly activity: Activity }
    | { readonly kind: 'retract'; readonly ids: readonly ActivityId[] }
    | { readonly kind: 'watchTime'; readonly participant: ParticipantId; readonly delta: number }
    | { readonly kind: 'depart'; readonly participant: ParticipantId };

/**
 * One room's state and the rules for changing it, with no transport attached.
 *
 * Shared by the in-process gateway and the cross-tab one, so the two cannot
 * drift apart in what a write means.
 */
export class RoomStore {
    createdAt: EpochMs | null = null;
    playhead: PlayheadIntent | null = null;
    source: Stamped<MediaSourceRef | null> | null = null;
    readonly presences = new Map<ParticipantId, Presence>();
    readonly activities = new Map<ActivityId, Activity>();
    readonly watched = new Map<ParticipantId, number>();

    constructor(readonly roomId: RoomId) {}

    apply(mutation: RoomMutation, now: () => EpochMs): void {
        // Any write creates the room; the timestamp never moves afterwards,
        // because the scheduled cleanup prunes by it.
        if (mutation.kind !== 'retract' && mutation.kind !== 'depart') this.createdAt ??= now();

        switch (mutation.kind) {
            case 'playhead': this.playhead = mutation.intent; return;
            case 'source': this.source = mutation.source; return;
            case 'presence': this.presences.set(mutation.presence.participantId, mutation.presence); return;
            case 'activity': this.activities.set(mutation.activity.id, mutation.activity); return;
            case 'retract': mutation.ids.forEach((id) => this.activities.delete(id)); return;
            case 'watchTime':
                this.watched.set(mutation.participant, (this.watched.get(mutation.participant) ?? 0) + mutation.delta);
                return;
            case 'depart': this.presences.delete(mutation.participant); return;
        }
    }

    /**
     * Watch time is kept PER PARTICIPANT, because that is what the operational
     * stats export reads, but reported as the ROOM total: a client has no use
     * for another viewer's counter.
     */
    snapshot(): RemoteRoomState {
        let watchedMinutes = 0;
        for (const minutes of this.watched.values()) watchedMinutes += minutes;
        return {
            createdAt: this.createdAt,
            playhead: this.playhead,
            source: this.source,
            presences: [...this.presences.values()],
            activities: [...this.activities.values()],
            watchedMinutes,
        };
    }

    adopt(state: RemoteRoomState): void {
        this.createdAt = state.createdAt;
        if (state.playhead) this.playhead = state.playhead;
        if (state.source) this.source = state.source;
        state.presences.forEach((presence) => this.presences.set(presence.participantId, presence));
        state.activities.forEach((activity) => this.activities.set(activity.id, activity));
    }
}
