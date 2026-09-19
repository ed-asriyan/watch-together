import { describe, expect, it } from 'vitest';
import type { MediaResolverPort } from '../media-resolver';

/**
 * THE CONTRACT every `MediaResolverPort` implementation must satisfy.
 *
 * Most of it is recovered from behaviour that only existed as control flow in
 * `legacy/normalize-source.ts` and `legacy/components/video-player/explore-url.ts`
 * — the classification order, the fallback chain, the abort behaviour — none of
 * which was written down anywhere.
 *
 * @param name Shown in test output.
 * @param make Builds a fresh resolver.
 */
export const mediaResolverContract = (name: string, make: () => Promise<MediaResolverPort>): void => {
    describe(`MediaResolverPort contract: ${name}`, () => {
        describe('classify', () => {
            it('is synchronous and returns without touching the network', async () => {
                // The input field calls this on every keystroke.
                const resolver = await make();
                const started = Date.now();
                resolver.classify('https://example.com/v.mp4');
                expect(Date.now() - started).toBeLessThan(50);
            });

            it('recognises the provider kinds', async () => {
                const resolver = await make();
                expect(resolver.classify('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.kind).toBe('youtube');
                expect(resolver.classify('https://vimeo.com/123456')?.kind).toBe('vimeo');
                expect(resolver.classify('magnet:?xt=urn:btih:deadbeef')?.kind).toBe('magnet');
                expect(resolver.classify('https://example.com/stream.m3u8')?.kind).toBe('hls');
            });

            it('falls back to a plain direct link LAST', async () => {
                // Order matters: a YouTube URL is also a valid http URL, so the
                // direct matcher must not win. Legacy encoded this as a comment
                // on the parser array ("direct should always be the last one").
                const resolver = await make();
                expect(resolver.classify('https://youtu.be/dQw4w9WgXcQ')?.kind).toBe('youtube');
                expect(resolver.classify('https://example.com/v.mp4')?.kind).toBe('direct');
            });

            it('rejects what is not a source at all', async () => {
                const resolver = await make();
                expect(resolver.classify('')).toBeNull();
                expect(resolver.classify('   ')).toBeNull();
                expect(resolver.classify('just some words')).toBeNull();
                expect(resolver.classify('javascript:alert(1)')).toBeNull();
            });

            it('is stable — the same input always classifies the same way', async () => {
                const resolver = await make();
                const once = resolver.classify('https://example.com/v.mp4');
                expect(resolver.classify('https://example.com/v.mp4')).toEqual(once);
            });
        });

        describe('resolve', () => {
            it('returns a playable URL and says how it got there', async () => {
                const resolver = await make();
                const ref = resolver.classify('https://example.com/v.mp4')!;
                const media = await resolver.resolve(ref, new AbortController().signal);
                expect(media).toMatchObject({ ref, playbackUrl: expect.any(String) });
                expect(['direct', 'proxy', 'extractor', 'p2p', 'blob']).toContain(media.via);
            });

            it('stops promptly when aborted', async () => {
                // The room's source can change while a probe chain is still
                // walking proxies and an extractor socket. Legacy had no way to
                // stop it, so a stale resolution could land on the player after
                // the room had moved on.
                const resolver = await make();
                const ref = resolver.classify('https://example.com/slow.mp4')!;
                const controller = new AbortController();
                const pending = resolver.resolve(ref, controller.signal);
                controller.abort();
                await expect(pending).rejects.toBeDefined();
            });

            it('rejects rather than returning an unplayable URL when nothing works', async () => {
                const resolver = await make();
                const ref = resolver.classify('https://example.invalid/nope.mp4')!;
                await expect(resolver.resolve(ref, new AbortController().signal)).rejects.toBeDefined();
            });
        });

        describe('sharing', () => {
            it('returns a magnet reference other peers can resolve', async () => {
                const resolver = await make();
                const ref = await resolver.share(new File(['data'], 'movie.mkv'));
                expect(ref.kind).toBe('magnet');
            });

            it('localOnly produces playable media without a shareable reference', async () => {
                const resolver = await make();
                const media = await resolver.localOnly(new File(['data'], 'movie.mkv'));
                expect(media.ref.kind).toBe('localOnly');
                expect(media.via).toBe('blob');
            });
        });

        describe('stats', () => {
            it('emits the current value synchronously on subscribe', async () => {
                const resolver = await make();
                let emitted = false;
                resolver.stats().subscribe(() => { emitted = true; })();
                expect(emitted).toBe(true);
            });

            it('reports inactive when nothing needs special delivery', async () => {
                const resolver = await make();
                let value: { active: boolean } | null = null;
                resolver.stats().subscribe((v) => { value = v; })();
                expect(value).toMatchObject({ active: false });
            });
        });

        describe('release', () => {
            it('is idempotent', async () => {
                const resolver = await make();
                await resolver.release();
                await expect(resolver.release()).resolves.toBeUndefined();
            });
        });
    });
};
