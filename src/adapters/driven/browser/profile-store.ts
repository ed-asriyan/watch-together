import type { ProfileStorePort, StoredProfile } from '../../../domains/watch-session/ports/outbound/profile-store';
import type { Nickname, ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';
import { nickname as parseNickname, participantId, roomId } from '../../../domains/watch-session/model/ids';
import type { IdGeneratorPort } from '../../../domains/watch-session/ports/outbound/id-generator';

const KEY = 'watch-together.profile';

/**
 * `localStorage`, read and written only when asked.
 *
 * Legacy did this at module import time: `stores/me.ts` generated an id, wrote
 * it, and called the analytics SDK before anything had asked for a profile.
 *
 * Every access is wrapped: private browsing, blocked cookies and quota errors
 * all throw, and a viewer without storage should still get a working session —
 * just not a stable name.
 */
export class LocalStorageProfileStore implements ProfileStorePort {
    constructor(
        private readonly ids: IdGeneratorPort,
        /** The friendly-name pool, so a first visit is not called "anon". */
        private readonly names: readonly string[] = [],
    ) {}

    load(): StoredProfile | null {
        const raw = this.read();
        if (!raw) return this.migrate() ?? this.mint();

        try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            const id = participantId(String(parsed['participantId'] ?? ''));
            const nick = parseNickname(String(parsed['nickname'] ?? ''));
            if (!id || !nick) return null;
            return {
                participantId: id,
                nickname: nick,
                lastRoomId: roomId(String(parsed['lastRoomId'] ?? '')),
                locale: typeof parsed['locale'] === 'string' ? parsed['locale'] : null,
            };
        } catch {
            return null;
        }
    }

    save(profile: StoredProfile): void {
        try {
            localStorage.setItem(KEY, JSON.stringify(profile));
        } catch {
            // No storage: the session still works, the identity just will not
            // survive a reload.
        }
    }

    /**
     * A first visit gets a complete identity here rather than in the
     * coordinator, because picking a friendly name needs the configured pool
     * and the domain has no business knowing about it. `load()` returning
     * `null` now means only that storage is unavailable.
     */
    private mint(): StoredProfile | null {
        const pick = this.names.length
            ? this.names[Math.floor(Math.random() * this.names.length)]!
            : 'anon';
        const nick = parseNickname(pick);
        if (!nick) return null;
        const minted: StoredProfile = {
            participantId: this.ids.participantId(),
            nickname: nick,
            lastRoomId: null,
            locale: null,
        };
        this.save(minted);
        return minted;
    }

    private read(): string | null {
        try {
            return localStorage.getItem(KEY);
        } catch {
            return null;
        }
    }

    /** Adopt the identity legacy left behind, so returning viewers keep it. */
    private migrate(): StoredProfile | null {
        try {
            const id = participantId(localStorage.getItem('my-id') ?? '');
            const nick = parseNickname(localStorage.getItem('my-name') ?? '');
            if (!id || !nick) return null;
            const migrated: StoredProfile = {
                participantId: id,
                nickname: nick,
                lastRoomId: roomId(localStorage.getItem('roomId') ?? ''),
                locale: localStorage.getItem('locale'),
            };
            this.save(migrated);
            return migrated;
        } catch {
            return null;
        }
    }
}

export type { Nickname, ParticipantId, RoomId };
