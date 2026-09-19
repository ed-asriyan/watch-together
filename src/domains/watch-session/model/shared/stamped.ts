import { notImplemented } from './not-implemented';
import type { EpochMs } from './time';
import type { ParticipantId } from '../ids';

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
 * The total order two assignments are compared by: time, then author, then a
 * stable rendering of the value itself.
 *
 * The third key looks redundant — one author cannot normally write twice in the
 * same millisecond — but without it the merge is not commutative when they do,
 * and two replicas receiving the same pair in different orders keep different
 * values forever. It is arbitrary, which is fine; it only has to be the SAME
 * arbitrary choice everywhere.
 */
const rank = <T>(s: Stamped<T>): string =>
    `${String(s.at).padStart(20, '0')}|${s.by}|${JSON.stringify(s.value) ?? ''}`;

/**
 * LWW merge. Total, commutative, associative and idempotent, so replicas
 * converge regardless of delivery order or duplication.
 *
 * Note what this does NOT do: it does not decide whether the winner is worth
 * *reacting* to. That is `reconcile()`'s job. The legacy code folded a
 * tolerance band into the merge itself, conflating the two questions.
 *
 * @param local    What this replica currently holds.
 * @param incoming What arrived from the remote store.
 * @returns        The winner. Returns `local` unchanged when `incoming` does
 *                 not supersede it, so callers can compare by reference to
 *                 detect "nothing changed".
 */
export function mergeLww<T>(local: Stamped<T>, incoming: Stamped<T>): Stamped<T> {
    return rank(incoming) > rank(local) ? incoming : local;
}

/**
 * Whether a value carries new information.
 *
 * @param incoming The candidate.
 * @param local    What is currently held.
 * @returns        True when `incoming` would win {@link mergeLww}.
 */
export function supersedes<T>(incoming: Stamped<T>, local: Stamped<T>): boolean {
    return rank(incoming) > rank(local);
}

/**
 * Attach a total-order key to a value.
 *
 * @param value The value being assigned.
 * @param at    Synchronized clock reading — never `Date.now()` (invariant I1).
 * @param by    This client's participant id, used only for tie-breaking.
 */
export function stamp<T>(value: T, at: EpochMs, by: ParticipantId): Stamped<T> {
    return { value, at, by };
}
