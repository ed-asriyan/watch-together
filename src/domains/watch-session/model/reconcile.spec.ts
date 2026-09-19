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
        it('reaches a fixed point instead of fighting itself', () => {
            // Feed a correction's own outcome back in. If the rules can
            // oscillate, this never settles — which is exactly the failure the
            // legacy magic constants were empirically tuned to avoid.
            fc.assert(fc.property(
                fc.double({ min: -30, max: 30, noNaN: true }),
                fc.boolean(),
                (offset, paused) => {
                    const declared = intent({ position: sec(100), paused }, T0);
                    let state = observed({ position: sec(100 + offset), paused });
                    const now = at(5_000);

                    for (let step = 0; step < 5; step++) {
                        const correction = reconcile(state, declared, now, P);
                        if (correction.kind === 'none') return true;
                        state = observed({
                            ...state,
                            position: correction.kind === 'seek' ? correction.to
                                : correction.kind === 'halt' ? correction.at
                                : correction.kind === 'resume' ? correction.from
                                : state.position,
                            paused: correction.kind === 'halt' ? true
                                : correction.kind === 'resume' ? false
                                : state.paused,
                        });
                    }
                    throw new Error('reconcile did not settle within 5 steps');
                },
            ));
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
