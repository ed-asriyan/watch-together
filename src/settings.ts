export const firebaseConfig = {
    apiKey: import.meta.env['VITE_FIREBASE_API_KEY'],
    authDomain: import.meta.env['VITE_FIREBASE_AUTHDOMAIN'],
    databaseURL: import.meta.env['VITE_FIREBASE_DATABASE_URL'],
    projectId: import.meta.env['VITE_FIREBASE_PROJECT_ID'],
    storageBucket: import.meta.env['VITE_FIREBASE_STORE_BUCKET'],
    messagingSenderId: import.meta.env['VITE_FIREBASE_MESSAGES_SENDER_ID'],
    appId: import.meta.env['VITE_FIREBASE_APP_ID'],
    measurementId: import.meta.env['VITE_FIREBASE_MEASUREMENT_ID'],
};

export const sentry = {
    dsn: import.meta.env['VITE_SENTRY_DSN']?.trim(),
};

export const environment = import.meta.env['MODE'];
export const isProduction = import.meta.env['PROD'] && environment === 'production';

export const analytics = {
    measurementId: import.meta.env['VITE_ANALYTICS_MEASHUREMENT_ID']?.trim(),
};

export const url = import.meta.env['VITE_URL'];

export const api = {
    hlsProxyUrl: import.meta.env['VITE_API_HLS_PROXY_URL']?.trim(),
    httpProxyUrl: import.meta.env['VITE_API_HTTP_PROXY_URL']?.trim(),
    videoExtractorUrl: import.meta.env['VITE_API_VIDEO_EXTRACTOR_URL']?.trim(),
};

export const iceServers = JSON.parse(atob(import.meta.env['VITE_ICE_SERVERS_JSON']));

export const webTorrentTrackers: string[] = import.meta.env['VITE_WEB_TORRENT_TRACKERS']?.split(',').map((x: string) => x.trim());

export const urlExamples: string[] = import.meta.env['VITE_URL_EXAMPLES']?.split(',').map((x: string) => x.trim());

export const userNames: string[] = import.meta.env['VITE_USERNAMES']?.split(',').map((x: string) => x.trim());

export const reactions: string = import.meta.env['VITE_REACTIONS']?.split(',').map((x: string) => x.trim());

export const defaultVideos: string[] = import.meta.env['VITE_DEFAULT_VIDEOS'].split(',').map((x: string) => x.trim());

export const version: string = import.meta.env['VITE_VERSION']?.trim() || null;
