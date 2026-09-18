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

export declare function epochMs(raw: number): EpochMs;
export declare function millis(raw: number): Millis;
export declare function seconds(raw: number): Seconds;

/** Elapsed media-time between two instants. */
export declare function secondsBetween(from: EpochMs, to: EpochMs): Seconds;

/** Arithmetic helpers — branded numbers lose their brand under `+`/`-`. */
export declare function advance(at: EpochMs, by: Millis): EpochMs;
export declare function plus(position: Seconds, delta: Seconds): Seconds;
export declare function minus(a: Seconds, b: Seconds): Seconds;
export declare function abs(value: Seconds): Seconds;
export declare function toMillis(value: Seconds): Millis;
export declare function toSeconds(value: Millis): Seconds;
