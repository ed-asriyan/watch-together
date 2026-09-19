import type { SchedulerPort } from '../../src/domains/watch-session/ports/outbound/scheduler';
import type { EpochMs, Millis } from '../../src/domains/watch-session/model/shared/time';
import type { Unsubscribe } from '../../src/domains/watch-session/model/shared/observable';
import type { FakeClock } from './clock';

interface Job {
    readonly id: number;
    due: number;
    readonly period: Millis | null;
    readonly run: (now: EpochMs) => void;
}

/**
 * A scheduler driven by {@link FakeClock} rather than by real time.
 *
 * `advance(ms)` moves the clock in due-order steps and fires every job that
 * falls inside the interval, each seeing the clock reading of its own due
 * time — so a test can assert on behaviour an hour into a session without
 * waiting, and without a single rule disagreeing about when "now" is.
 */
export class FakeScheduler implements SchedulerPort {
    private nextId = 1;
    private jobs: Job[] = [];

    constructor(private readonly clock: FakeClock) {}

    every(period: Millis, run: (now: EpochMs) => void): Unsubscribe {
        return this.schedule(period, period, run);
    }

    after(delay: Millis, run: (now: EpochMs) => void): Unsubscribe {
        return this.schedule(delay, null, run);
    }

    private schedule(delay: Millis, period: Millis | null, run: (now: EpochMs) => void): Unsubscribe {
        const id = this.nextId++;
        this.jobs.push({ id, due: this.clock.now() + delay, period, run });
        return () => {
            this.jobs = this.jobs.filter((job) => job.id !== id);
        };
    }

    /** Advance the clock, firing every job that comes due along the way. */
    advance(by: Millis): void {
        const target = this.clock.now() + by;
        for (;;) {
            const next = this.jobs
                .filter((job) => job.due <= target)
                .sort((a, b) => a.due - b.due)[0];
            if (!next) break;

            this.clock.advance((next.due - this.clock.now()) as Millis);
            if (next.period === null) {
                this.jobs = this.jobs.filter((job) => job.id !== next.id);
            } else {
                next.due += next.period;
            }
            next.run(this.clock.now());
        }
        this.clock.advance((target - this.clock.now()) as Millis);
    }

    get pending(): number {
        return this.jobs.length;
    }
}
