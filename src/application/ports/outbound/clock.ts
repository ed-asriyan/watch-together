import type { EpochMs } from '../../../domain/shared/time';
import type { Observable } from '../../../domain/shared/observable';
import type { ClockConfidence } from '../../../domain/shared/clock-confidence';

/**
 * DRIVEN PORT — the shared notion of "now".
 *
 * The single most valuable seam in this design. Because the domain cannot read
 * a clock, every timestamp is passed in, so every test controls time exactly
 * and the drift logic becomes testable at all.
 *
 * Implementations:
 *  - `FirebaseServerOffsetClock` — `.info/serverTimeOffset`, the millisecond
 *    offset a client adds to local time to estimate server time. Recommended:
 *    no extra request, continuously updated over the same socket as the data,
 *    so timestamps live in the same causal domain as the values they stamp;
 *  - `WorldTimeApiClock` — what `src/legacy/stores/clock.ts:5` does today, with
 *    one unguarded `fetch`, no timeout, no retry, against a service documented
 *    to offer no SLA. Fallback only;
 *  - `SystemClock` — `Date.now()`, reports `confidence: 'unsynced'`;
 *  - `FakeClock` — test-controlled, with `advance(ms)`.
 */
export interface ClockPort {
    /** Milliseconds since epoch, corrected by the current offset. */
    now(): EpochMs;

    readonly confidence: Observable<ClockConfidence>;

    /** Establish or refresh the offset. Never rejects; degrades instead. */
    sync(): Promise<void>;
}
