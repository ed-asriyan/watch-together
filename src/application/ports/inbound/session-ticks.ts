import type { EpochMs } from '../../../domain/shared/time';

/**
 * DRIVING PORT — the scheduler as a driving adapter.
 *
 * One tick drives everything time-based: the presence heartbeat, the feed TTL
 * sweep, the stale-playback guard, watch-time accrual, and the drift check
 * against the projected position.
 *
 * Legacy ran five independent `setInterval`s buried in five constructors
 * (`stores/room/index.ts:60`, `bound-users.ts:67,71`, `bound-messages.ts:82`,
 * `bound-minutes-watched.ts:26`), each with its own period and each stoppable
 * only through the `Destructable` chain. Collapsing them into one entry point
 * means one place to fake in tests and one ordering to reason about.
 */
export interface SessionTicks {
    /**
     * Advance all time-based rules.
     *
     * The timestamp is passed in rather than read inside, so `FakeScheduler`
     * plus `FakeClock` can replay hours of session behaviour in milliseconds.
     *
     * @param now Current synchronized-clock reading, from `ClockPort.now()`.
     *            The same value is threaded through every rule evaluated by
     *            this tick, so they cannot disagree about when "now" is.
     */
    onTick(now: EpochMs): void;
}
