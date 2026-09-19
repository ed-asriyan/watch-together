/**
 * The ONLY module that reads `import.meta.env`.
 *
 * Replaces `src/legacy/settings.ts`, which was imported by source
 * classification, the analytics base class and the WebTorrent client alike —
 * so environment configuration reached into the model.
 *
 * Only the values the driving adapter needs are here. Adapter-specific config
 * (Firebase keys, proxy URLs, ICE servers, trackers) joins this file when the
 * driven adapters are written.
 */
const list = (raw: string | undefined): string[] =>
    raw?.split(',').map((x) => x.trim()).filter(Boolean) ?? [];

export const ui = {
    reactions: list(import.meta.env['VITE_REACTIONS']),
    hasExamples: list(import.meta.env['VITE_DEFAULT_VIDEOS']).length > 0,
    version: (import.meta.env['VITE_VERSION'] as string | undefined)?.trim() || null,
    environment: import.meta.env['MODE'] as string,
    isProduction: Boolean(import.meta.env['PROD']) && import.meta.env['MODE'] === 'production',
};
