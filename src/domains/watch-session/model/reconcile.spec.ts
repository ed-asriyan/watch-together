import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { driftOf, reconcile, type Correction } from './reconcile';
import { DEFAULT_SYNC_POLICY, LEGACY_SYNC_POLICY, type SyncPolicy } from './sync-policy';
import { T0, at, intent, observed, sec } from '../../../../test-support/builders';

const P = DEFAULT_SYNC_POLICY;

describe('reconcile', () => {
    describe('preconditions', () => {
        it('does nothing before the element is ready', () => {
            const correction = reconcile(
                observed({ position: sec(0), paused: false, ready: false }),
                intent({ position: sec(500), paused: false }),
                at(1_000),
                P,
            );
            expect(correction).toEqual({ kind: 'none' });
        });

        it('does nothing while stalled — a drift reading means nothing then', () => {
            const correction = reconcile(
                observed({ position: sec(100), paused: false, stalled: true }),
                intent({ position: sec(500), paused: false }),
                at(1_000),
                P,
            );
            expect(correction).toEqual({ kind: 'none' });
        });
    });

    describe('paused/playing disagreement', () => {
        it('halts at the PROJECTED position when the room paused', () => {
            // The projected position, not the stale one in the intent, and not
            // whatever the local element happens to show. This is the whole
            // reason paused and position are one value.
            const correction = reconcile(
                observed({ position: sec(107), paused: false }),
                intent({ position: sec(100), paused: true }, T0),
                at(5_000),
                P,
            );
            expect(correction).toEqual({ kind: 'halt', at: 100 });
        });

        it('resumes from the projected position when the room played', () => {
            const correction = reconcile(
                observed({ position: sec(100), paused: true }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                P,
            );
            expect(correction).toEqual({ kind: 'resume', from: 105 });
        });
    });

    describe('while both are paused', () => {
        it('does nothing when the position already matches', () => {
            expect(reconcile(
                observed({ position: sec(100), paused: true }),
                intent({ position: sec(100), paused: true }),
                at(5_000),
                P,
            )).toEqual({ kind: 'none' });
        });

        it('seeks when the position is off by more than the hard threshold', () => {
            expect(reconcile(
                observed({ position: sec(140), paused: true }),
                intent({ position: sec(100), paused: true }),
                at(5_000),
                P,
            )).toEqual({ kind: 'seek', to: 100 });
        });
    });

    describe('while playing', () => {
        it('does nothing when the player tracks the projection', () => {
            expect(reconcile(
                observed({ position: sec(105), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                P,
            )).toEqual({ kind: 'none' });
        });

        it('hard-seeks when drift exceeds the hard threshold', () => {
            expect(reconcile(
                observed({ position: sec(101), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                P,
            )).toEqual({ kind: 'seek', to: 105 });
        });

        it('nudges FASTER when the player is behind', () => {
            const correction = reconcile(
                observed({ position: sec(104.6), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                P,
            ) as Extract<Correction, { kind: 'nudge' }>;
            expect(correction.kind).toBe('nudge');
            expect(correction.rate).toBeGreaterThan(1);
        });

        it('nudges SLOWER when the player is ahead', () => {
            const correction = reconcile(
                observed({ position: sec(105.4), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                P,
            ) as Extract<Correction, { kind: 'nudge' }>;
            expect(correction.kind).toBe('nudge');
            expect(correction.rate).toBeLessThan(1);
        });

        it('bounds a nudge so it never becomes the steady state', () => {
            const correction = reconcile(
                observed({ position: sec(104.6), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                P,
            ) as Extract<Correction, { kind: 'nudge' }>;
            expect(correction.until).toBe(at(5_000) + P.maxNudgeDuration);
        });
    });

    describe('policy is honoured, not hardcoded', () => {
        it('a zero hard threshold corrects any divergence at all', () => {
            const strict: SyncPolicy = { ...P, hardSeekThreshold: sec(0), softNudgeThreshold: sec(0) };
            expect(reconcile(
                observed({ position: sec(105.001), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                strict,
            )).toEqual({ kind: 'seek', to: 105 });
        });

        it('an infinite threshold never corrects', () => {
            const lax: SyncPolicy = {
                ...P,
                hardSeekThreshold: sec(Number.POSITIVE_INFINITY),
                softNudgeThreshold: sec(Number.POSITIVE_INFINITY),
            };
            expect(reconcile(
                observed({ position: sec(0), paused: false }),
                intent({ position: sec(9_999), paused: false }, T0),
                at(5_000),
                lax,
            )).toEqual({ kind: 'none' });
        });

        it('characterization: the legacy policy only ever hard-seeks', () => {
            // Legacy had no soft correction. Under LEGACY_SYNC_POLICY the new
            // code must behave the same way, or step 2 of the migration is
            // changing behaviour it claimed only to preserve.
            const correction = reconcile(
                observed({ position: sec(105.4), paused: false }),
                intent({ position: sec(100), paused: false }, T0),
                at(5_000),
                LEGACY_SYNC_POLICY,
            );
            expect(correction.kind).not.toBe('nudge');
        });
    });

    describe('stability', () => {
        // The first version of this checked "feed the correction back in and it
        // settles", but modelled a nudge as leaving the position unchanged — so
        // any drift inside the nudge band looped forever. It passed only
        // because fast-check never sampled that band. A nudge is bounded by
        // `until`, so it IS a terminal answer; what actually needs proving is
        // that every correction aims at the projection and none of them
        // overshoot.

        const declared = intent({ position: sec(100), paused: false }, T0);
        const now = at(5_000);
        const projected = 105;

        it('never aims anywhere but at the projected position', () => {
            fc.assert(fc.property(
                fc.double({ min: -30, max: 30, noNaN: true }),
                fc.boolean(),
                (offset, paused) => {
                    const observedState = observed({ position: sec(100 + offset), paused });
                    const correction = reconcile(observedState, declared, now, P);
                    switch (correction.kind) {
                        case 'none': return true;
                        case 'seek': return correction.to === projected;
                        case 'halt': return correction.at === projected;
                        case 'resume': return correction.from === projected;
                        case 'nudge': return true;
                    }
                },
            ));
        });

        /**
         * Drift generated INSIDE the nudge band on every sample.
         *
         * A property that is allowed to return early when the correction is not
         * a nudge passes whether or not the generator ever reaches the band —
         * which is how the first version of this file stayed green while being
         * wrong. Generating in-band and asserting the kind makes vacuity
         * impossible.
         */
        const inBand = fc
            .tuple(
                fc.double({ min: P.softNudgeThreshold + 0.01, max: P.hardSeekThreshold, noNaN: true }),
                fc.boolean(),
            )
            .map(([magnitude, ahead]) => (ahead ? magnitude : -magnitude));

        it('only ever nudges toward the projection, by a bounded amount', () => {
            fc.assert(fc.property(inBand, (drift) => {
                const correction = reconcile(
                    observed({ position: sec(projected + drift), paused: false }),
                    declared,
                    now,
                    P,
                );
                expect(correction.kind).toBe('nudge');
                if (correction.kind !== 'nudge') return;

                const behind = drift < 0;
                expect(correction.rate > declared.value.rate).toBe(behind);
                expect(Math.abs(correction.rate - declared.value.rate)).toBeCloseTo(P.nudgeRateDelta, 10);
                expect(correction.until).toBe(now + P.maxNudgeDuration);
            }));
        });

        it('settles in ONE step once a discrete correction is applied', () => {
            fc.assert(fc.property(
                fc.double({ min: -30, max: 30, noNaN: true }),
                fc.boolean(),
                (offset, paused) => {
                    const first = reconcile(observed({ position: sec(100 + offset), paused }), declared, now, P);
                    if (first.kind === 'none' || first.kind === 'nudge') return true;

                    const applied = observed({
                        position: sec(first.kind === 'seek' ? first.to
                            : first.kind === 'halt' ? first.at
                            : first.from),
                        paused: first.kind === 'halt' ? true
                            : first.kind === 'resume' ? false
                            : paused,
                    });
                    const second = reconcile(applied, declared, now, P);
                    return second.kind === 'none';
                },
            ));
        });

        // The band the old property could not reach, pinned explicitly so
        // coverage of it is not a matter of which seed fast-check picked.
        it.each([
            [4, 'faster'],
            [4.5, 'faster'],
            [5.5, 'slower'],
            [6, 'slower'],
        ] as const)('nudges %s at offset %s, instead of seeking', (offset, direction) => {
            const correction = reconcile(
                observed({ position: sec(100 + offset), paused: false }),
                declared,
                now,
                P,
            ) as Extract<Correction, { kind: 'nudge' }>;
            expect(correction.kind).toBe('nudge');
            expect(correction.rate > 1).toBe(direction === 'faster');
        });

        it.each([3, 7])('hard-seeks at offset %s, outside the band', (offset) => {
            const correction = reconcile(
                observed({ position: sec(100 + offset), paused: false }),
                declared,
                now,
                P,
            );
            expect(correction.kind).toBe('seek');
        });

        it.each([4.9, 5, 5.1])('does nothing at offset %s, inside the tolerance', (offset) => {
            const correction = reconcile(
                observed({ position: sec(100 + offset), paused: false }),
                declared,
                now,
                P,
            );
            expect(correction.kind).toBe('none');
        });
    });
});

describe('driftOf', () => {
    it('is positive when the player is ahead of the projection', () => {
        expect(driftOf(
            observed({ position: sec(107), paused: false }),
            intent({ position: sec(100), paused: false }, T0),
            at(5_000),
        )).toBeCloseTo(2, 6);
    });

    it('is negative when the player lags', () => {
        expect(driftOf(
            observed({ position: sec(103), paused: false }),
            intent({ position: sec(100), paused: false }, T0),
            at(5_000),
        )).toBeCloseTo(-2, 6);
    });
});
