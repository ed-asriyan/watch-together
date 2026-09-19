import type { IdGeneratorPort } from '../../../domains/watch-session/ports/outbound/id-generator';
import type { ActivityId, ParticipantId, RoomId } from '../../../domains/watch-session/model/ids';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

const short = (length: number): string => {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('');
};

/**
 * Two different requirements, deliberately answered differently.
 *
 * Legacy used `randomStr(6)` for everything — about 31 bits. For a room id that
 * someone types or reads aloud that is a reasonable trade: a collision just
 * means joining an occupied room, which is how the product works anyway. For an
 * activity id it is a birthday collision waiting to happen in a busy room, and
 * a collision silently overwrites somebody's message.
 */
export class CryptoIdGenerator implements IdGeneratorPort {
    roomId(): RoomId {
        return short(6) as RoomId;
    }

    participantId(): ParticipantId {
        return short(16) as ParticipantId;
    }

    activityId(): ActivityId {
        return (crypto.randomUUID?.() ?? short(32)).replace(/-/g, '') as ActivityId;
    }
}
