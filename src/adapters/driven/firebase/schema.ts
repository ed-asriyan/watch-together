/**
 * The wire shape of the legacy Realtime Database, unchanged.
 *
 * Phase 1 keeps the existing schema exactly, so old and new clients can share a
 * room during the rollout. All the ugliness of that — a playhead split across
 * two nodes, timestamps in seconds, a message type as an integer — is contained
 * in `mappers.ts` and never reaches the domain.
 */
export interface TimedValueDto<T> {
    value: T;
    /** SECONDS since the epoch, as legacy wrote them. */
    updatedAt: number;
    /** New, ignored by old clients: the LWW tie-break author. */
    by?: string;
    /** New: playback rate, absent means 1. */
    rate?: number;
    /**
     * New, SECONDS: when the decision this value belongs to was made — the
     * LWW ordering key. Absent means `updatedAt`. Written only on the playhead
     * nodes, and only when it differs from `updatedAt`, which then holds the
     * instant the position was measured. Old clients read `updatedAt` as both,
     * which for them is the right projection anchor.
     */
    decidedAt?: number;
}

export interface UserDto {
    name: string;
    /** SECONDS. */
    lastSeen: number;
}

/** Legacy `MessageType`, preserved so old clients still render the feed. */
export const MESSAGE_TYPE = {
    regular: 0,
    seek: 1,
    pause: 2,
    play: 3,
    selectedLocalFile: 4,
    reaction: 5,
} as const;

export interface MessageDto {
    userId: string;
    text: string;
    type: number;
    /** SECONDS. */
    timestamp: number;
}

export interface RoomDto {
    url?: TimedValueDto<string>;
    currentTime?: TimedValueDto<number>;
    paused?: TimedValueDto<boolean>;
    users?: Record<string, UserDto>;
    messages?: Record<string, MessageDto>;
    minutesWatched?: Record<string, number>;
    /** SECONDS. */
    createdAt?: number;
}
