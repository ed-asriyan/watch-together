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
 *    so timestamps share a causal domain with the values they stamp;
 *  - `WorldTimeApiClock` — what `src/legacy/stores/clock.ts:5` does today, with
 *    one unguarded `fetch`, no timeout and no retry, against a service that
 *    documents no SLA. Fallback only;
 *  - `SystemClock` — plain `Date.now()`, reporting `unsynced`;
 *  - `FakeClock` — test-controlled, with `advance()`.
 */
export interface ClockPort {
    /**
     * Current time, corrected by whatever offset has been established.
     *
     * Must be cheap — it is called on every tick, every player event and every
     * remote update — and must never throw. With no offset yet it returns the
     * local clock and reports `unsynced` through {@link confidence}.
     *
     * @returns Milliseconds since the Unix epoch.
     */
    now(): EpochMs;

    /**
     * How far the current offset can be trusted.
     *
     * Part of the port rather than an adapter detail because LWW correctness is
     * bounded by clock agreement: a client an hour fast silently wins every
     * conflict in the room for an hour. Invariant I9 lets the replica refuse to
     * publish while this is `unsynced`.
     *
     * Emits the current confidence immediately, then on change.
     */
    readonly confidence: Observable<ClockConfidence>;

    /**
     * Establish or refresh the offset. Called once during join, before the
     * replica is created, and may be called again after a reconnect.
     *
     * Never rejects — a clock that cannot synchronize degrades to `unsynced`
     * and says so. Legacy let the `fetch` rejection propagate unhandled.
     */
    sync(): Promise<void>;
}
