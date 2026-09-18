import type { EpochMs, Millis } from '../../../domain/shared/time';
import type { Unsubscribe } from '../../../domain/shared/observable';

/**
 * DRIVEN PORT — deferred and repeating work.
 *
 * Exists so heartbeats, TTL sweeps and the stale-playback guard can be tested
 * by advancing a fake clock instead of waiting sixty real seconds.
 * `FakeScheduler` drives `FakeClock`, which makes whole multi-client scenarios
 * deterministic and instant.
 */
export interface SchedulerPort {
    /**
     * Run something repeatedly until cancelled.
     *
     * @param period How long between runs. Implementations need not compensate
     *               for drift; every rule that cares takes `now` as an argument
     *               and computes against it.
     * @param run    Receives the synchronized-clock reading for that run, so a
     *               single tick cannot see two different "now"s.
     * @returns Cancels the repetition.
     */
    every(period: Millis, run: (now: EpochMs) => void): Unsubscribe;

    /**
     * Run something once, later.
     *
     * @param delay How long to wait.
     * @param run   Receives the synchronized-clock reading at fire time.
     * @returns Cancels the pending run if it has not fired.
     */
    after(delay: Millis, run: (now: EpochMs) => void): Unsubscribe;
}
