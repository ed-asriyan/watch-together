import type { ClockPort } from '../../src/domains/watch-session/ports/outbound/clock';
import type { EpochMs, Millis } from '../../src/domains/watch-session/model/shared/time';
import type { ClockConfidence } from '../../src/domains/watch-session/model/shared/clock-confidence';
import type { Observable, Unsubscribe } from '../../src/domains/watch-session/model/shared/observable';

/**
 * A clock the test moves by hand. Together with {@link FakeScheduler} it lets a
 * whole session — heartbeats, TTL sweeps, the 60s stale-playback guard — be
 * replayed in microseconds.
 */
export class FakeClock implements ClockPort {
    private current: EpochMs;
    private level: ClockConfidence;
    private readonly listeners = new Set<(value: ClockConfidence) => void>();
    private readonly log?: { record(name: string, ...args: readonly unknown[]): void };

    constructor(
        start: EpochMs,
        confidence: ClockConfidence = 'synced',
        log?: { record(name: string, ...args: readonly unknown[]): void },
    ) {
        this.current = start;
        this.level = confidence;
        this.log = log;
    }

    now(): EpochMs {
        return this.current;
    }

    readonly confidence: Observable<ClockConfidence> = {
        subscribe: (run: (value: ClockConfidence) => void): Unsubscribe => {
            run(this.level);
            this.listeners.add(run);
            return () => this.listeners.delete(run);
        },
    };

    async sync(): Promise<void> {
        this.log?.record('clock.sync');
        this.setConfidence('synced');
    }

    /** Move time forward. Nothing fires on its own; the scheduler does that. */
    advance(by: Millis): EpochMs {
        this.current = (this.current + by) as EpochMs;
        return this.current;
    }

    setConfidence(level: ClockConfidence): void {
        this.level = level;
        this.listeners.forEach((run) => run(level));
    }
}
