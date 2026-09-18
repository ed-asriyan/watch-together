import type { EpochMs } from './time';
import type { ParticipantId } from '../room/ids';

/**
 * A Last-Writer-Wins register: a value plus the total-order key used to decide
 * which of two concurrent assignments survives.
 *
 * `by` exists solely as a deterministic tie-break. Without it, two writes
 * sharing a millisecond can leave two replicas permanently disagreeing — the
 * flaw in `src/legacy/stores/room/bound-timed-store.ts:21`, which compares
 * timestamps only.
 *
 * See docs/architecture/001-ddd-hexagonal-design.md §5.1.
 */
export interface Stamped<T> {
    readonly value: T;
    /** Synchronized clock reading at the moment of assignment. */
    readonly at: EpochMs;
    /** Author, used only to break `at` ties. */
    readonly by: ParticipantId;
}

/**
 * LWW merge. Total, commutative, associative and idempotent, so replicas
 * converge regardless of delivery order or duplication.
 *
 * Note what this does NOT do: it does not decide whether the winner is worth
 * *reacting* to. That is `reconcile()`'s job. The legacy code folded a
 * tolerance band into the merge itself, conflating the two questions.
 */
export declare function mergeLww<T>(local: Stamped<T>, incoming: Stamped<T>): Stamped<T>;

/** True when `incoming` would win the merge — i.e. it carries new information. */
export declare function supersedes<T>(incoming: Stamped<T>, local: Stamped<T>): boolean;

export declare function stamp<T>(value: T, at: EpochMs, by: ParticipantId): Stamped<T>;
