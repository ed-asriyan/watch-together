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
    dsn: import.meta.env['VITE_SENTRY_DSN'],
};

export const environment = import.meta.env['MODE'];
export const isProduction = import.meta.env['PROD'] && environment === 'production';

export const analytics = {
    measurementId: import.meta.env['VITE_ANALYTICS_MEASHUREMENT_ID'],
};

export const url = import.meta.env['VITE_URL'];
