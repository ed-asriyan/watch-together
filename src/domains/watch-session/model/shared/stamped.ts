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
    /**
     * For a value that describes something moving in time (a running
     * playhead): the physical instant the value was measured at. Absent means
     * `at`.
     *
     * Kept apart from `at` because the two answer different questions. `at`
     * orders ASSIGNMENTS — who decided what, last. `anchoredAt` says when the
     * value was true. A restatement of the same assignment (the same `at` and
     * `by`, re-measured later) carries a later anchor and supersedes the
     * earlier restatement, but can never overtake a newer assignment: a
     * heartbeat is not a decision, and must not win against one.
     */
    readonly anchoredAt?: EpochMs;
}

/**
 * The total order two assignments are compared by: time, then author, then
 * anchor (a later restatement of the same assignment wins), then a stable
 * rendering of the value itself.
 *
 * The last key looks redundant — one author cannot normally write twice in the
 * same millisecond — but without it the merge is not commutative when they do,
 * and two replicas receiving the same pair in different orders keep different
 * values forever. It is arbitrary, which is fine; it only has to be the SAME
 * arbitrary choice everywhere.
 *
 * Times are compared as numbers. This used to compare zero-padded strings,
 * which orders `"…762.5"` after `"…763"` — wrong for any stamp that is not a
 * whole number of milliseconds.
 */
const compare = <T>(a: Stamped<T>, b: Stamped<T>): number => {
    if (a.at !== b.at) return a.at < b.at ? -1 : 1;
    if (a.by !== b.by) return a.by < b.by ? -1 : 1;
    const anchorA = a.anchoredAt ?? a.at;
    const anchorB = b.anchoredAt ?? b.at;
    if (anchorA !== anchorB) return anchorA < anchorB ? -1 : 1;
    const valueA = JSON.stringify(a.value) ?? '';
    const valueB = JSON.stringify(b.value) ?? '';
    return valueA === valueB ? 0 : valueA < valueB ? -1 : 1;
};

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
    return compare(incoming, local) > 0 ? incoming : local;
}

/**
 * Whether a value carries new information.
 *
 * @param incoming The candidate.
 * @param local    What is currently held.
 * @returns        True when `incoming` would win {@link mergeLww}.
 */
export function supersedes<T>(incoming: Stamped<T>, local: Stamped<T>): boolean {
    return compare(incoming, local) > 0;
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

/**
 * The stamp for a NEW assignment made by someone who currently holds `seen`.
 *
 * Its own clock reading, unless that reading is not later than what it has
 * already seen — then one millisecond past it. That is the hybrid-logical-
 * clock rule, and it is what makes an action taken AFTER seeing another one
 * win against it however far apart the two clients' clocks are. Without it a
 * client whose clock ran half a second behind lost every pause and every seek
 * made within half a second of the last write it had seen: the room ignored
 * it and carried on.
 *
 * @param now  Synchronized clock reading.
 * @param seen The newest assignment this replica holds for the register.
 */
export function nextStamp(now: EpochMs, seen: Stamped<unknown> | null): EpochMs {
    if (!seen || now > seen.at) return now;
    return (seen.at + 1) as EpochMs;
}
