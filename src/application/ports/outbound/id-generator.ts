import type { ActivityId, ParticipantId, RoomId } from '../../../domain/room/ids';

/**
 * DRIVEN PORT — identity generation.
 *
 * Separated from the domain so tests get deterministic ids.
 *
 * Legacy used `randomStr(6)` for everything: ~31 bits over a 36-char alphabet.
 * For a user-visible, typeable room id that is a deliberate trade-off. For
 * activity ids (`bound-messages.ts:90`) it is a birthday collision waiting to
 * happen in a busy room, and a collision silently overwrites someone's message.
 */
export interface IdGeneratorPort {
    /** Short and human-typeable — it goes in the URL. */
    roomId(): RoomId;
    /** Stable per browser; generated once and persisted. */
    participantId(): ParticipantId;
    /** Collision-free (UUID-grade). Never typed by a human. */
    activityId(): ActivityId;
}
