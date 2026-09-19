/**
 * DRIVEN PORT — crash and error reporting. Adapter: Sentry.
 *
 * A port purely so the domain and application never import an SDK, and so
 * tests can assert that a failure path reported rather than swallowed.
 */
export interface ErrorReporterPort {
    /**
     * Report a caught error.
     *
     * @param error   Whatever was caught — not necessarily an `Error`.
     * @param context Extra structured detail, e.g. the room id or the source
     *                kind. Must never carry a source URL or chat text, both of
     *                which are user content.
     */
    capture(error: unknown, context?: Readonly<Record<string, unknown>>): void;

    /**
     * Leave a trail attached to any error reported later — the state
     * transitions that make a sync bug intelligible after the fact.
     *
     * @param message Short and stable, so breadcrumbs group.
     * @param data    Structured detail, same content constraints as `capture`.
     */
    addBreadcrumb(message: string, data?: Readonly<Record<string, unknown>>): void;
}
