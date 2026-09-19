import * as Sentry from '@sentry/svelte';
import type { ErrorReporterPort } from '../../../domains/watch-session/ports/outbound/error-reporter';

/** Sentry, or the console when no DSN is configured. */
export class SentryErrorReporter implements ErrorReporterPort {
    constructor(private readonly enabled: boolean) {}

    capture(error: unknown, context?: Readonly<Record<string, unknown>>): void {
        if (!this.enabled) {
            console.error('[error]', error, context);
            return;
        }
        Sentry.captureException(error, { extra: { ...context } });
    }

    addBreadcrumb(message: string, data?: Readonly<Record<string, unknown>>): void {
        if (!this.enabled) return;
        Sentry.addBreadcrumb({ message, data: { ...data } });
    }
}
