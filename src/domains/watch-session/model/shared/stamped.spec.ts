import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeLww, nextStamp, stamp, supersedes } from './stamped';
import { ALICE, BOB, T0, at, ms, stamped } from '../../../../../test-support/builders';

describe('Stamped / LWW register', () => {
    describe('mergeLww', () => {
        it('takes the newer assignment', () => {
            const older = stamped('a', T0, ALICE);
            const newer = stamped('b', at(1), BOB);
            expect(mergeLww(older, newer)).toBe(newer);
        });

        it('keeps the local value when the incoming one is older', () => {
            const local = stamped('a', at(10), ALICE);
            const stale = stamped('b', T0, BOB);
            // Returned BY REFERENCE, so a caller can detect "nothing changed"
            // with ===, which is how the replica avoids emitting a no-op event.
            expect(mergeLww(local, stale)).toBe(local);
        });

        it('breaks a timestamp tie by author, deterministically', () => {
            const a = stamped('a', T0, ALICE);
            const b = stamped('b', T0, BOB);
            // Whatever rule is chosen, both replicas must choose the SAME one.
            expect(mergeLww(a, b)).toEqual(mergeLww(b, a));
        });

        it('never returns a value neither side held', () => {
            const a = stamped('a', T0, ALICE);
            const b = stamped('b', at(5), BOB);
            expect([a, b]).toContainEqual(mergeLww(a, b));
        });
    });

    describe('convergence laws', () => {
        const arbStamped = fc.record({
            value: fc.integer({ min: 0, max: 5 }),
            at: fc.integer({ min: 0, max: 20 }).map((n) => ms(T0 + n)),
            by: fc.constantFrom(ALICE, BOB),
        });

        it('is commutative — delivery order cannot change the winner', () => {
            fc.assert(fc.property(arbStamped, arbStamped, (a, b) => {
                expect(mergeLww(a, b)).toEqual(mergeLww(b, a));
            }));
        });

        it('is idempotent — a duplicate delivery changes nothing', () => {
            fc.assert(fc.property(arbStamped, (a) => {
                expect(mergeLww(a, a)).toEqual(a);
            }));
        });

        it('is associative — any interleaving converges on one value', () => {
            fc.assert(fc.property(arbStamped, arbStamped, arbStamped, (a, b, c) => {
                expect(mergeLww(mergeLww(a, b), c)).toEqual(mergeLww(a, mergeLww(b, c)));
            }));
        });

        it('every replica ends on the same value whatever the delivery order', () => {
            fc.assert(fc.property(fc.array(arbStamped, { minLength: 1, maxLength: 8 }), (writes) => {
                const fold = (order: typeof writes) => order.reduce((acc, next) => mergeLww(acc, next));
                const shuffled = [...writes].reverse();
                expect(fold(writes)).toEqual(fold(shuffled));
            }));
        });
    });

    describe('supersedes', () => {
        it('agrees with mergeLww', () => {
            const local = stamped('a', at(10), ALICE);
            const newer = stamped('b', at(11), BOB);
            const older = stamped('c', at(9), BOB);
            expect(supersedes(newer, local)).toBe(true);
            expect(supersedes(older, local)).toBe(false);
        });

        it('a value does not supersede itself', () => {
            const a = stamped('a', T0, ALICE);
            expect(supersedes(a, a)).toBe(false);
        });
    });

    describe('stamp', () => {
        it('carries the value, the reading and the author', () => {
            expect(stamp('x', T0, ALICE)).toEqual({ value: 'x', at: T0, by: ALICE });
        });
    });

    describe('restatements', () => {
        const decision = stamped('running', at(1_000), ALICE);
        const restatement = { ...stamped('running+', at(1_000), ALICE), anchoredAt: at(11_000) };

        it('a later re-measurement of the same decision supersedes the earlier one', () => {
            expect(supersedes(restatement, decision)).toBe(true);
            expect(supersedes(decision, restatement)).toBe(false);
        });

        it('never overtakes a newer decision, however late it is anchored', () => {
            const pause = stamped('paused', at(1_001), BOB);
            expect(supersedes({ ...restatement, anchoredAt: at(99_999) }, pause)).toBe(false);
            expect(mergeLww(pause, restatement)).toBe(pause);
        });
    });

    describe('ordering', () => {
        it('orders fractional stamps by value, not by their spelling', () => {
            // Regression: zero-padded string comparison put "…762.5" after
            // "…763", so a fractional stamp beat a later whole one.
            const earlier = stamped('a', ms(1_789_835_546_762.5), ALICE);
            const later = stamped('b', ms(1_789_835_546_763), ALICE);
            expect(mergeLww(earlier, later)).toBe(later);
            expect(mergeLww(later, earlier)).toBe(later);
        });
    });

    describe('nextStamp', () => {
        it('is the clock reading when that is already later than anything seen', () => {
            expect(nextStamp(at(5_000), stamped('x', at(1_000), BOB))).toBe(at(5_000));
        });

        it('is one past what was seen when the local clock is behind it', () => {
            expect(nextStamp(at(1_000), stamped('x', at(5_000), BOB))).toBe(at(5_001));
        });
    });
});

