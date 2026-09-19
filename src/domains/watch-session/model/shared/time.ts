import { notImplemented } from './not-implemented';
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
    return notImplemented('epochMs');
}
export function millis(raw: number): Millis {
    return notImplemented('millis');
}
export function seconds(raw: number): Seconds {
    return notImplemented('seconds');
}

/** Elapsed media-time between two instants. */
export function secondsBetween(from: EpochMs, to: EpochMs): Seconds {
    return notImplemented('secondsBetween');
}

/** Arithmetic helpers — branded numbers lose their brand under `+`/`-`. */
export function advance(at: EpochMs, by: Millis): EpochMs {
    return notImplemented('advance');
}
export function plus(position: Seconds, delta: Seconds): Seconds {
    return notImplemented('plus');
}
export function minus(a: Seconds, b: Seconds): Seconds {
    return notImplemented('minus');
}
export function abs(value: Seconds): Seconds {
    return notImplemented('abs');
}
export function toMillis(value: Seconds): Millis {
    return notImplemented('toMillis');
}
export function toSeconds(value: Millis): Seconds {
    return notImplemented('toSeconds');
}
