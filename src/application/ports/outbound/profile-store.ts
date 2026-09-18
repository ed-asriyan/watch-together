import type { ParticipantId, Nickname, RoomId } from '../../../domain/room/ids';

/**
 * DRIVEN PORT — per-browser persisted preferences.
 *
 * Replaces `src/legacy/stores/me.ts` and `src/legacy/stores/local-store.ts`,
 * which read and WROTE `localStorage` and called the analytics SDK at module
 * import time, before anything asked them to.
 */
export interface ProfileStorePort {
    load(): StoredProfile | null;
    save(profile: StoredProfile): void;
}

export interface StoredProfile {
    readonly participantId: ParticipantId;
    readonly nickname: Nickname;
    readonly lastRoomId: RoomId | null;
    readonly locale: string | null;
}
