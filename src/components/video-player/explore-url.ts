import { Source, SourceType } from '../../normalize-source';
import { proxies } from '../../settings';

export const exploreUrl = async function(source: Source): Promise<Source> {
    if (source.type !== SourceType.direct) {
        return source;
    }

    const attepmts: ((src: Source) => Generator<Source>)[] = [
        tryAsIs,
        tryFromQueryParams,
        tryProxy,
    ];

    for (const attempt of attepmts) {
        for (const result of attempt(source)) {
            try {
                const a = await fetch(result.src as string, { mode: 'cors', method: 'HEAD' });
                return result;
            } catch {
            }
        }
    }

    return source;
};

const tryAsIs = function* (source: Source): Generator<Source> {
    yield source;
};

const tryFromQueryParams = function* (source: Source): Generator<Source> {
    if (typeof source.src !== 'string') return source;
    let url: URL;
    try {
        url = new URL(source.src);
    } catch {
        return source
    }
    for (const [_, value] of url.searchParams) {
        try {
            new URL(value);
        } catch {
            continue;
        }
        const result = new Source({ type: SourceType.direct, src: value });
        yield result;
        yield* tryFromQueryParams(result);
    }
};

const tryProxy = function* (source: Source): Generator<Source> {
    if (typeof source.src !== 'string') return source;

    const paths = new URL(source.src).pathname.split('.');
    const extenssion = paths[paths.length - 1];
    const isHls = extenssion === 'm3u8';
    if ((isHls && !proxies.hlsUrl) || (!isHls && !proxies.regularUrl)) {
        yield source;
    }
    let src: string;
    if (isHls) {
        src = `${proxies.hlsUrl}/${btoa(source.src)}.m3u8`;
    } else {
        src = `${proxies.regularUrl}?url=${source.src}`;
    }
    yield new Source({ ...source, src });
};
