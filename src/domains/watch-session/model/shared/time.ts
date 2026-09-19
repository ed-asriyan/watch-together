import type { Brand } from './brand';

/**
 * Wall-clock instant, milliseconds since the Unix epoch, read from a
 * {@link ../../application/ports/outbound/clock ClockPort} — never `Date.now()`.
 */
export type EpochMs = Brand<number, 'EpochMs'>;

/** A duration in milliseconds. */
export type Millis = Brand<number, 'Millis'>;

/**
 * A position in, or duration of, media playback, in seconds.
 *
 * Deliberately a different type from {@link Millis}: the legacy clock worked in
 * seconds (`src/legacy/stores/clock.ts`) while every browser API works in
 * milliseconds, and nothing in the type system stopped the two from mixing.
 */
export type Seconds = Brand<number, 'Seconds'>;

export function epochMs(raw: number): EpochMs {
    return raw as EpochMs;
}
export function millis(raw: number): Millis {
    return raw as Millis;
}
export function seconds(raw: number): Seconds {
    return raw as Seconds;
}

/** Elapsed media-time between two instants. */
export function secondsBetween(from: EpochMs, to: EpochMs): Seconds {
    return ((to - from) / 1000) as Seconds;
}

/** Arithmetic helpers — branded numbers lose their brand under `+`/`-`. */
export function advance(at: EpochMs, by: Millis): EpochMs {
    return (at + by) as EpochMs;
}
export function plus(position: Seconds, delta: Seconds): Seconds {
    return (position + delta) as Seconds;
}
export function minus(a: Seconds, b: Seconds): Seconds {
    return (a - b) as Seconds;
}
export function abs(value: Seconds): Seconds {
    return Math.abs(value) as Seconds;
}
export function toMillis(value: Seconds): Millis {
    return (value * 1000) as Millis;
}
export function toSeconds(value: Millis): Seconds {
    return (value / 1000) as Seconds;
}
