import { child, getDatabase, onValue, ref, type Database } from 'firebase/database';
import type { FirebaseApp } from 'firebase/app';
import type { ClockPort } from '../../../domains/watch-session/ports/outbound/clock';
import type { EpochMs } from '../../../domains/watch-session/model/shared/time';
import type { ClockConfidence } from '../../../domains/watch-session/model/shared/clock-confidence';
import type { Observable, Unsubscribe } from '../../../domains/watch-session/model/shared/observable';

/**
 * Time from the same socket the data comes over.
 *
 * Firebase publishes at `.info/serverTimeOffset` the millisecond offset a
 * client should add to its local clock to estimate server time, and keeps it
 * updated. That is strictly better than the HTTP time service it replaces: no
 * extra request, no extra failure mode, and — the part that matters — the
 * timestamps live in the same causal domain as the values they stamp.
 *
 * Legacy called `worldtimeapi.org` once, with no timeout, no retry and no
 * rejection handling, and every timestamp in the application depended on it.
 */
export class FirebaseServerOffsetClock implements ClockPort {
    private readonly database: Database;
    private offset = 0;
    private level: ClockConfidence = 'unsynced';
    private readonly listeners = new Set<(value: ClockConfidence) => void>();
    private stop: Unsubscribe | null = null;

    constructor(app: FirebaseApp) {
        this.database = getDatabase(app);
    }

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
        if (this.stop) return;
        await new Promise<void>((resolve) => {
            let settled = false;
            // Never rejects: an unreachable clock degrades and says so, rather
            // than taking the session down with it.
            const giveUp = setTimeout(() => {
                if (!settled) {
                    settled = true;
                    this.announce('unsynced');
                    resolve();
                }
            }, 5_000);

            this.stop = onValue(
                child(ref(this.database), '.info/serverTimeOffset'),
                (snapshot) => {
                    this.offset = Number(snapshot.val() ?? 0);
                    this.announce('synced');
                    if (!settled) {
                        settled = true;
                        clearTimeout(giveUp);
                        resolve();
                    }
                },
                () => {
                    this.announce('unsynced');
                    if (!settled) {
                        settled = true;
                        clearTimeout(giveUp);
                        resolve();
                    }
                },
            );
        });
    }

    private announce(level: ClockConfidence): void {
        if (level === this.level) return;
        this.level = level;
        this.listeners.forEach((run) => run(level));
    }
}
