import type { MediaSourceKind, MediaSourceRef } from '../../../domains/watch-session/model/media-source';

/**
 * Source classification, recovered from `legacy/normalize-source.ts`.
 *
 * ORDER MATTERS and is the whole reason this is a list rather than a switch: a
 * YouTube link is also a valid http URL, so the direct matcher has to lose to
 * every provider. Legacy encoded that as a comment on the array
 * ("direct should always be the last one"); here it is a contract test.
 *
 * The locator is ALWAYS the raw input, never a derived form. It is what gets
 * written to the shared store, so it has to be something `classify` can read
 * back: storing `youtube/<id>` meant the next client to read it classified it
 * as nothing at all and saw an empty room. Legacy stored raw URLs too, so this
 * is also what keeps old clients interoperable.
 */
interface Matcher {
    readonly kind: MediaSourceKind;
    /** The provider id, for matchers that have one. */
    id(raw: string): string | null;
    matches(raw: string): boolean;
}

const YOUTUBE = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu\.be))(\/(?:[\w\-]+\?v=|embed\/|live\/|v\/)?)([\w\-]+)(\S+)?$/;
const VIMEO = /(?:www\.|player\.)?vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_-]+)?/i;

const asUrl = (raw: string): URL | null => {
    try {
        return new URL(raw);
    } catch {
        return null;
    }
};

const MATCHERS: readonly Matcher[] = [
    {
        kind: 'youtube',
        id: (raw) => YOUTUBE.exec(raw)?.[6] ?? null,
        matches(raw) {
            return this.id(raw) !== null;
        },
    },
    {
        kind: 'vimeo',
        id: (raw) => VIMEO.exec(raw)?.[1] ?? null,
        matches(raw) {
            return this.id(raw) !== null;
        },
    },
    {
        kind: 'magnet',
        id: () => null,
        matches: (raw) => asUrl(raw)?.protocol === 'magnet:',
    },
    {
        kind: 'hls',
        id: () => null,
        matches(raw) {
            const url = asUrl(raw);
            if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) return false;
            return url.pathname.toLowerCase().endsWith('.m3u8');
        },
    },
    {
        // Always last.
        kind: 'direct',
        id: () => null,
        matches(raw) {
            const url = asUrl(raw);
            return url?.protocol === 'http:' || url?.protocol === 'https:';
        },
    },
];

export const classify = (raw: string): MediaSourceRef | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    for (const matcher of MATCHERS) {
        if (matcher.matches(trimmed)) {
            return { kind: matcher.kind, locator: trimmed as MediaSourceRef['locator'] };
        }
    }
    return null;
};

/**
 * The form the player wants for a provider-hosted video, e.g. `youtube/<id>`.
 *
 * Derived at playback time, never stored: the store holds what the user pasted.
 *
 * @returns `null` for kinds the player takes as-is.
 */
export const providerPath = (ref: MediaSourceRef): string | null => {
    const matcher = MATCHERS.find((candidate) => candidate.kind === ref.kind);
    const id = matcher?.id(ref.locator);
    return id ? `${ref.kind}/${id}` : null;
};
