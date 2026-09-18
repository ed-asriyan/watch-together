/**
 * The framework-neutral read contract used at every boundary that pushes values
 * (read models, delivery stats, clock confidence, connection state).
 *
 * It is intentionally *structurally identical* to Svelte's store contract, so a
 * component can write `$playback` against it with zero `svelte` import in the
 * domain or application layers. Any other UI layer can adapt it in three lines.
 *
 * Contract:
 *  - `subscribe` MUST invoke `run` synchronously with the current value before
 *    returning (so `$store` is never `undefined` on first render);
 *  - `run` MUST be invoked on every subsequent change, and MUST NOT be invoked
 *    after the returned `Unsubscribe` has been called;
 *  - values MUST be treated as immutable by subscribers.
 *
 * See docs/architecture/001-ddd-hexagonal-design.md §4.1.
 */
export type Unsubscribe = () => void;

export interface Observable<T> {
    subscribe(run: (value: T) => void): Unsubscribe;
}
