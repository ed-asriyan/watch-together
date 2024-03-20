import * as Sentry from '@sentry/svelte';
import Root from './App.svelte';

Sentry.init({
  dsn: 'https://e622fa358656e1bdcec1b3409676fe7f@o4506688521175040.ingest.us.sentry.io/4506942185603072',
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],
  environment: import.meta.env['MODE'],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
  tracePropagationTargets: ['localhost', 'https://watchtogether.online'],
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

export default new Root({
  target: document.getElementById('app'),
});
