/**
 * Nominal ("branded") primitives.
 *
 * TypeScript is structurally typed, so `type Seconds = number` buys nothing —
 * a media position, a wall-clock timestamp and a peer count are all assignable
 * to each other. Branding makes them distinct at compile time with zero runtime
 * cost.
 *
 * See docs/architecture/001-ddd-hexagonal-design.md §5.1.
 */

declare const brand: unique symbol;

export type Brand<T, B extends string> = T & { readonly [brand]: B };
