import type { ClockPort } from '../../../domains/watch-session/ports/outbound/clock';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';
import type { ClockConfidence } from '../../../domains/watch-session/model/shared/clock-confidence';
import type { Observable, Unsubscribe } from '../../../domains/watch-session/model/shared/observable';

/**
 * The device clock, honest about being one.
 *
 * It reports `unsynced` permanently, which under a policy with
 * `requireClockSync` means the replica renders and follows the room but does
 * not write — read-only rather than silently poisoning everyone else's ordering
 * with a skewed timestamp.
 */
export class SystemClock implements ClockPort {
    now(): EpochMs {
        return Date.now() as EpochMs;
    }

    readonly confidence: Observable<ClockConfidence> = {
        subscribe(run: (value: ClockConfidence) => void): Unsubscribe {
            run('unsynced');
            return () => undefined;
        },
    };

    async sync(): Promise<void> {
        // Nothing to synchronize against.
    }
}
