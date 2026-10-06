#!/usr/bin/env node
/**
 * Serves `e2e/fixtures/*` with HTTP Range support and CORS — what a real media
 * host does, and what the player needs to seek without downloading the file
 * from the start.
 *
 *   MEDIA_PORT  default 8788
 *
 * `?chunk=<bytes>` caps every range response at that many bytes, the way
 * segmented streaming (DASH, HLS, YouTube) works: the player never holds more
 * than a few seconds ahead, so a seek costs a round trip instead of being
 * answered from a buffer that already holds the whole file.
 *
 * `Cache-Control: no-store` matters: tests slow down one client's media
 * requests to simulate a bad connection, and a cached range would bypass that.
 */
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The player aborts range requests all the time — every seek cancels the one
 * in flight. An unhandled error on either end of the pipe would take the
 * server, and every test after it, down.
 */
const stream = (source, response) => {
    source.on('error', () => response.destroy());
    response.on('error', () => source.destroy());
    response.on('close', () => source.destroy());
    source.pipe(response);
};

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'fixtures');
const port = Number(process.env.MEDIA_PORT ?? 8788);

createServer((request, response) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
        'Cache-Control': 'no-store',
    };
    const url = new URL(request.url ?? '/', 'http://x');
    const path = decodeURIComponent(url.pathname);
    const chunk = Number(url.searchParams.get('chunk') ?? 0);
    if (path === '/health') {
        response.writeHead(200, headers);
        response.end('ok');
        return;
    }
    if (request.method === 'OPTIONS') {
        response.writeHead(204, headers);
        response.end();
        return;
    }
    const file = normalize(join(root, path));
    if (!file.startsWith(root) || !existsSync(file)) {
        response.writeHead(404, headers);
        response.end();
        return;
    }

    const size = statSync(file).size;
    const type = file.endsWith('.webm') ? 'video/webm' : 'application/octet-stream';
    const range = /bytes=(\d*)-(\d*)/.exec(request.headers.range ?? '');
    const head = request.method === 'HEAD';

    if (range) {
        const start = range[1] ? Number(range[1]) : 0;
        const requestedEnd = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        const end = chunk > 0 ? Math.min(requestedEnd, start + chunk - 1) : requestedEnd;
        response.writeHead(206, {
            ...headers,
            'Accept-Ranges': 'bytes',
            'Content-Type': type,
            'Content-Range': `bytes ${start}-${end}/${size}`,
            'Content-Length': end - start + 1,
        });
        if (head) response.end();
        else stream(createReadStream(file, { start, end }), response);
        return;
    }

    response.writeHead(200, { ...headers, 'Accept-Ranges': 'bytes', 'Content-Type': type, 'Content-Length': size });
    if (head) response.end();
    else stream(createReadStream(file), response);
}).listen(port, () => console.log(`[media] serving ${root} on http://localhost:${port}`));
