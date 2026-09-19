import type { ActivityId, ParticipantId, RoomId } from '../../model/ids';

/**
 * DRIVEN PORT — identity generation.
 *
 * Separated from the domain so the aggregate stays pure and tests get
 * deterministic, readable ids.
 *
 * Legacy used `randomStr(6)` for everything: about 31 bits over a 36-character
 * alphabet. For a room id that a human types, that is a deliberate trade-off.
 * For activity ids (`bound-messages.ts:90`) it is a birthday collision waiting
 * to happen in a busy room, and a collision silently overwrites a message.
 */
export interface IdGeneratorPort {
    /**
     * A new room id: short, lowercase, unambiguous, because it is typed and
     * read aloud. Collisions are possible by design and acceptable — joining
     * an occupied room is the normal way to use the product.
     */
    roomId(): RoomId;

    /**
     * A new participant id. Generated once per browser and then persisted by
     * `ProfileStorePort`; never regenerated for an existing profile, or the
     * viewer's watch-time and presence entry are orphaned.
     */
    participantId(): ParticipantId;

    /**
     * A new feed item id. Must be collision-free (UUID-grade) — never typed by
     * a human, and a collision loses someone's message.
     */
    activityId(): ActivityId;
}
