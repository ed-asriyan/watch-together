import type { Brand } from './shared/brand';

/**
 * How the room's agreed source is delivered. The core needs the *kind* (it
 * drives affordances: a magnet shows peer stats, a local-only file is not
 * shared), but nothing about how bytes are actually fetched.
 */
export type MediaSourceKind =
    | 'direct'    // a plain http(s) media URL
    | 'hls'       // an .m3u8 playlist
    | 'youtube'
    | 'vimeo'
    | 'magnet'    // seeded peer-to-peer by a participant
    | 'localOnly'; // this viewer's own file, deliberately NOT shared — see §16 Q5

/** Opaque to the core: a URL, a provider video id, or a magnet URI. */
export type SourceLocator = Brand<string, 'SourceLocator'>;

/**
 * What the room agreed to watch.
 *
 * Deliberately absent: proxy URLs, Content-Type sniffing, extractor endpoints,
 * `esm.sh` imports. All of that is Media Delivery, behind `MediaResolverPort`.
 * Legacy equivalent: `src/legacy/normalize-source.ts` (`Source`), which also
 * reached into `settings.ts` for the "is this an example video?" check.
 */
export interface MediaSourceRef {
    readonly kind: MediaSourceKind;
    readonly locator: SourceLocator;
}

/** True when both refs name the same media. */
export declare function sameSource(a: MediaSourceRef | null, b: MediaSourceRef | null): boolean;

/** Whether picking this source is something other participants can act on. */
export declare function isShareable(ref: MediaSourceRef): boolean;
