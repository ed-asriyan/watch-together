/**
 * DRIVEN PORT — crash and error reporting. Adapter: Sentry.
 *
 * Declared as a port purely so the domain and application never import an SDK,
 * and so tests can assert that a failure path reported rather than swallowed.
 */
export interface ErrorReporterPort {
    capture(error: unknown, context?: Readonly<Record<string, unknown>>): void;
    addBreadcrumb(message: string, data?: Readonly<Record<string, unknown>>): void;
}
