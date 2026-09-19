/**
 * The ONLY module that reads `import.meta.env`.
 *
 * Replaces `src/legacy/settings.ts`, which was imported by source
 * classification, the analytics base class and the torrent client alike — so
 * environment configuration reached all the way into the model.
 */
const text = (key: string): string | null =>
    (import.meta.env[key] as string | undefined)?.trim() || null;

const list = (key: string): string[] =>
    (import.meta.env[key] as string | undefined)?.split(',').map((x) => x.trim()).filter(Boolean) ?? [];

const json = <T>(key: string, fallback: T): T => {
    const raw = text(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(atob(raw)) as T;
    } catch {
        return fallback;
    }
};

export const environment = (import.meta.env['MODE'] as string) ?? 'development';
export const isProduction = Boolean(import.meta.env['PROD']) && environment === 'production';

export const firebaseConfig = {
    apiKey: text('VITE_FIREBASE_API_KEY') ?? '',
    authDomain: text('VITE_FIREBASE_AUTHDOMAIN') ?? '',
    databaseURL: text('VITE_FIREBASE_DATABASE_URL') ?? '',
    projectId: text('VITE_FIREBASE_PROJECT_ID') ?? '',
    storageBucket: text('VITE_FIREBASE_STORE_BUCKET') ?? '',
    messagingSenderId: text('VITE_FIREBASE_MESSAGES_SENDER_ID') ?? '',
    appId: text('VITE_FIREBASE_APP_ID') ?? '',
};

export const proxies = {
    hlsProxyUrl: text('VITE_API_HLS_PROXY_URL'),
    httpProxyUrl: text('VITE_API_HTTP_PROXY_URL'),
    videoExtractorUrl: text('VITE_API_VIDEO_EXTRACTOR_URL'),
};

export const torrents = {
    iceServers: json<unknown>('VITE_ICE_SERVERS_JSON', []),
    trackers: list('VITE_WEB_TORRENT_TRACKERS'),
    serviceWorkerUrl: '/sw.min.js',
};

export const telemetry = {
    amplitudeApiKey: text('VITE_AMPLITUDE_API_KEY'),
    measurementId: text('VITE_ANALYTICS_MEASUREMENT_ID'),
};

export const sentry = { dsn: text('VITE_SENTRY_DSN') };

export const nicknames = list('VITE_USERNAMES');

export const ui = {
    reactions: list('VITE_REACTIONS'),
    examples: list('VITE_DEFAULT_VIDEOS'),
    get hasExamples(): boolean {
        return this.examples.length > 0;
    },
    version: text('VITE_VERSION'),
    environment,
    isProduction,
};

/** A random configured demo video, or `null` when none are configured. */
export const pickExample = (): string | null =>
    ui.examples.length ? ui.examples[Math.floor(Math.random() * ui.examples.length)]! : null;
