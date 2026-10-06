import type { ClockPort } from '../../../domains/watch-session/ports/outbound/clock';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';
import type { ClockConfidence } from '../../../domains/watch-session/model/shared/clock-confidence';
import type { Observable, Unsubscribe } from '../../../domains/watch-session/model/shared/observable';
import type { LocalBackendConnection } from './connection';

const SAMPLES = 5;
const RESYNC_MS = 60_000;
const CONNECT_TIMEOUT_MS = 5_000;

/**
 * The local backend's clock, estimated the way NTP does it.
 *
 * Several round trips; the one with the shortest round-trip time is trusted,
 * assuming the server read its clock halfway through. Two browsers on one
 * machine agree to the millisecond; two devices on a LAN to within a few.
 *
 * The offset is rounded to whole milliseconds: stamps are LWW keys, and a
 * fractional one is a key no other client will ever produce.
 */
export class LocalBackendClock implements ClockPort {
    private offset = 0;
    private level: ClockConfidence = 'unsynced';
    private readonly listeners = new Set<(value: ClockConfidence) => void>();
    private resync: ReturnType<typeof setInterval> | null = null;

    constructor(private readonly connection: LocalBackendConnection) {}

    now(): EpochMs {
        return (Date.now() + this.offset) as EpochMs;
    }

    readonly confidence: Observable<ClockConfidence> = {
        subscribe: (run: (value: ClockConfidence) => void): Unsubscribe => {
            run(this.level);
            this.listeners.add(run);
            return () => this.listeners.delete(run);
        },
    };

    async sync(): Promise<void> {
        this.resync ??= setInterval(() => void this.measure(), RESYNC_MS);
        await this.measure();
    }

    private async measure(): Promise<void> {
        if (!(await this.connection.waitOnline(CONNECT_TIMEOUT_MS))) {
            this.announce('unsynced');
            return;
        }
        let best: { rtt: number; offset: number } | null = null;
        try {
            for (let i = 0; i < SAMPLES; i++) {
                const sent = Date.now();
                const ack = await this.connection.request({ t: 'time' });
                const received = Date.now();
                const rtt = received - sent;
                const offset = Number(ack.serverTime) + rtt / 2 - received;
                if (!best || rtt < best.rtt) best = { rtt, offset };
            }
        } catch {
            // Keep whatever offset we had; say how much it is worth.
        }
        if (!best) {
            this.announce('unsynced');
            return;
        }
        this.offset = Math.round(best.offset);
        this.announce('synced');
    }

    private announce(level: ClockConfidence): void {
        if (level === this.level) return;
        this.level = level;
        this.listeners.forEach((run) => run(level));
    }
}
