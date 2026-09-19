import type { ParticipantId, Nickname, RoomId } from '../../model/ids';

/**
 * DRIVEN PORT — per-browser persisted preferences.
 *
 * Replaces `src/legacy/stores/me.ts` and `src/legacy/stores/local-store.ts`,
 * which read AND wrote `localStorage` and called the analytics SDK at module
 * import time, before anything asked them to.
 */
export interface ProfileStorePort {
    /**
     * Read the stored profile.
     *
     * @returns `null` on a first visit, or when storage is unavailable —
     *          private browsing, blocked cookies, a quota error. The caller
     *          generates a fresh identity and carries on; a viewer with no
     *          storage still gets a working session, just not a stable name.
     */
    load(): StoredProfile | null;

    /**
     * Persist the profile. Called on identity creation, rename, room change
     * and locale change.
     *
     * @param profile The complete profile; this replaces what is stored rather
     *                than merging.
     */
    save(profile: StoredProfile): void;
}

export interface StoredProfile {
    /** Stable across sessions; identifies this browser in every room. */
    readonly participantId: ParticipantId;
    readonly nickname: Nickname;
    /** Reopened when the site is visited with no room in the URL. */
    readonly lastRoomId: RoomId | null;
    /** BCP-47 tag, or `null` to follow the browser. */
    readonly locale: string | null;
}
