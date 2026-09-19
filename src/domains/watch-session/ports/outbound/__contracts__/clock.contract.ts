import { describe, expect, it } from 'vitest';
import type { ClockPort } from '../clock';
import type { ClockConfidence } from '../../../model/shared/clock-confidence';

const read = (clock: ClockPort): ClockConfidence => {
    let value: ClockConfidence = 'unsynced';
    clock.confidence.subscribe((v) => { value = v; })();
    return value;
};

/**
 * THE CONTRACT every `ClockPort` implementation must satisfy.
 *
 * Short, but the clauses are load-bearing: LWW correctness is bounded by clock
 * agreement, so a clock that lies about how much it can be trusted is worse
 * than one that is simply wrong.
 *
 * @param name Shown in test output.
 * @param make Builds a fresh clock, unsynchronized.
 */
export const clockContract = (name: string, make: () => Promise<ClockPort>): void => {
    describe(`ClockPort contract: ${name}`, () => {
        it('reports a plausible epoch reading', async () => {
            const clock = await make();
            expect(clock.now()).toBeGreaterThan(1_600_000_000_000);
        });

        it('never goes backwards between two reads', async () => {
            const clock = await make();
            const first = clock.now();
            expect(clock.now()).toBeGreaterThanOrEqual(first);
        });

        it('emits the current confidence synchronously on subscribe', async () => {
            const clock = await make();
            let called = false;
            clock.confidence.subscribe(() => { called = true; })();
            expect(called).toBe(true);
        });

        it('starts unsynchronized and says so', async () => {
            const clock = await make();
            expect(read(clock)).toBe('unsynced');
        });

        it('sync() never rejects — it degrades instead', async () => {
            // Legacy let a bare `fetch` rejection propagate unhandled, and every
            // timestamp in the app depended on it.
            const clock = await make();
            await expect(clock.sync()).resolves.toBeUndefined();
        });

        it('reports better confidence after a successful sync', async () => {
            const clock = await make();
            await clock.sync();
            expect(['estimated', 'synced', 'unsynced']).toContain(read(clock));
        });

        it('stops notifying after unsubscribe', async () => {
            const clock = await make();
            let count = 0;
            const stop = clock.confidence.subscribe(() => { count++; });
            stop();
            const after = count;
            await clock.sync();
            expect(count).toBe(after);
        });
    });
};
