import type { MediaSourceKind, MediaSourceRef } from '../../../domains/watch-session/model/media-source';

/**
 * Source classification, recovered from `legacy/normalize-source.ts`.
 *
 * ORDER MATTERS and is the whole reason this is a list rather than a switch: a
 * YouTube link is also a valid http URL, so the direct matcher has to lose to
 * every provider. Legacy encoded that as a comment on the array
 * ("direct should always be the last one"); here it is a contract test.
 */
interface Matcher {
    readonly kind: MediaSourceKind;
    parse(raw: string): string | null;
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
        parse: (raw) => YOUTUBE.exec(raw)?.[6] ? `youtube/${YOUTUBE.exec(raw)![6]}` : null,
    },
    {
        kind: 'vimeo',
        parse: (raw) => VIMEO.exec(raw)?.[1] ? `vimeo/${VIMEO.exec(raw)![1]}` : null,
    },
    {
        kind: 'magnet',
        parse: (raw) => (asUrl(raw)?.protocol === 'magnet:' ? raw : null),
    },
    {
        kind: 'hls',
        parse: (raw) => {
            const url = asUrl(raw);
            if (!url || (url.protocol !== 'http:' && url.protocol !== 'https:')) return null;
            return url.pathname.toLowerCase().endsWith('.m3u8') ? raw : null;
        },
    },
    {
        // Always last.
        kind: 'direct',
        parse: (raw) => {
            const url = asUrl(raw);
            if (!url) return null;
            return url.protocol === 'http:' || url.protocol === 'https:' ? raw : null;
        },
    },
];

export const classify = (raw: string): MediaSourceRef | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    for (const matcher of MATCHERS) {
        const locator = matcher.parse(trimmed);
        if (locator) return { kind: matcher.kind, locator: locator as MediaSourceRef['locator'] };
    }
    return null;
};
