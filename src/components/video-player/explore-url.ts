import { Source, SourceType } from '../../normalize-source';
import { api } from '../../settings';

export const exploreUrl = async function(source: Source): Promise<Source> {
    if (source.type !== SourceType.direct) {
        return source;
    }

    const attepmts: ((src: Source) => AsyncGenerator<Source>)[] = [
        tryAsIs,
        tryFromQueryParams,
        tryProxy,
        tryBrowser,
    ];

    for (const attempt of attepmts) {
        for await (const result of attempt(source)) {
            if (result.type !== SourceType.direct || await verifyUrl(result.src)){
                return result;
            }
        }
    }
    return source;
};

const verifyUrl = async function (url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { mode: 'cors', method: 'HEAD' });
        return response.ok && ['mpeg', 'mp4', 'mp3', 'video', '3gp', 'm3u8', 'mpegurl'].some(x => response.headers.get('Content-Type')?.includes(x));
    } catch {
        return false;
    }
};

const tryAsIs = async function* (source: Source): AsyncGenerator<Source> {
    yield source;
};

const tryFromQueryParams = async function* (source: Source): AsyncGenerator<Source> {
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
        yield Promise.resolve(result);
        yield* tryFromQueryParams(result);
    }
};

const tryProxy = async function* (source: Source, method?: string, headers?: {[s: string]: string}): AsyncGenerator<Source> {
    if (typeof source.src !== 'string') return source;

    const paths = new URL(source.src).pathname.split('.');
    const extenssion = paths[paths.length - 1].toLowerCase();

    const isHls = extenssion === 'm3u8';
    if ((isHls && !api.hlsProxyUrl) || (!isHls && !api.httpProxyUrl)) {
        yield source;
        return;
    }
    let src: string;
    if (isHls) {
        src = `${api.hlsProxyUrl}/${btoa(source.src)}.m3u8`;
    } else {
        const query: [string, string][] = [];
        query.push(['url', source.src]);
        method && query.push(['method', method]);
        headers && query.push(...Object.entries(headers).map(([key, value]) => (['headers', `${key}: ${value}`] as [string, string])));
        
        const queryStr = query.map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join('&');
        
        src = `${api.httpProxyUrl}?${queryStr}`;
    }
    yield new Source({ ...source, src });
};

const tryBrowser = async function* (source: Source): AsyncGenerator<Source> {
    if (!api.videoExtractorUrl) {
        yield source;
        return;
    }
    const result: {url: string, method: string, headers: {[x: string]: string}}[] = [];
    await new Promise<void>((resolve) => {
        const ws = new WebSocket(api.videoExtractorUrl);
        ws.onopen = () => {
            ws.send(source.src);
        };
        
        ws.onmessage = function(event) {
            result.push(JSON.parse(event.data));
        };
    
        ws.onerror = function() {
            resolve();
        };
    
        ws.onclose = function() {
            resolve();
        };
    });
    for (const link of result) {
        yield new Source({ src: link.url, type: SourceType.direct });
        yield* tryProxy(new Source({ src: link.url, type: SourceType.direct}), link.method, link.headers);
    }
};
