import type { EpochMs } from '../shared/time';
import type { HexColour, Nickname, ParticipantId } from './ids';

/**
 * What a participant publishes about itself. The wire shape of presence.
 * Legacy: `RawUser` in `src/legacy/stores/user.ts`.
 */
export interface Presence {
    readonly participantId: ParticipantId;
    readonly nickname: Nickname;
    /** Synchronized-clock heartbeat. */
    readonly lastSeen: EpochMs;
}

/** A participant as the domain knows them, with derived attributes. */
export interface Participant {
    readonly id: ParticipantId;
    readonly nickname: Nickname;
    readonly colour: HexColour;
    readonly lastSeen: EpochMs;
    /** True for the person at this browser. */
    readonly isSelf: boolean;
}

export declare function participantFrom(presence: Presence, self: ParticipantId): Participant;
