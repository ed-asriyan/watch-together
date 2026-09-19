import type { SchedulerPort } from '../../../domains/watch-session/ports/outbound/scheduler';
import type { ClockPort } from '../../../domains/watch-session/ports/outbound/clock';
import type { EpochMs, Millis } from '../../../domains/watch-session/model/shared/time';
import type { Unsubscribe } from '../../../domains/watch-session/model/shared/observable';

/**
 * `setInterval` behind a port, so the domain's time-based rules can be tested
 * by advancing a fake clock instead of waiting sixty real seconds.
 *
 * It takes the clock rather than reading one, so every rule a tick evaluates
 * sees the same synchronized reading.
 */
export class BrowserScheduler implements SchedulerPort {
    constructor(private readonly clock: ClockPort) {}

    every(period: Millis, run: (now: EpochMs) => void): Unsubscribe {
        const id = setInterval(() => run(this.clock.now()), period);
        return () => clearInterval(id);
    }

    after(delay: Millis, run: (now: EpochMs) => void): Unsubscribe {
        const id = setTimeout(() => run(this.clock.now()), delay);
        return () => clearTimeout(id);
    }
}
