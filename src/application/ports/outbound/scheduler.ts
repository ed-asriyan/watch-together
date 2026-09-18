import type { EpochMs, Millis } from '../../../domain/shared/time';
import type { Unsubscribe } from '../../../domain/shared/observable';

/**
 * DRIVEN PORT — deferred work.
 *
 * Exists so that heartbeats, TTL sweeps and the stale-playback guard can be
 * tested by advancing a fake clock instead of waiting 60 real seconds.
 * `FakeScheduler` drives `FakeClock`, making whole distributed scenarios
 * deterministic and instant.
 */
export interface SchedulerPort {
    every(period: Millis, run: (now: EpochMs) => void): Unsubscribe;
    after(delay: Millis, run: (now: EpochMs) => void): Unsubscribe;
}
