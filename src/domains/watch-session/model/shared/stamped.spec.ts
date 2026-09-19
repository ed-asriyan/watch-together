import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { mergeLww, stamp, supersedes } from './stamped';
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
});
