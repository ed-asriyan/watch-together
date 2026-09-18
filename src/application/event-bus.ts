import type { Unsubscribe } from '../domain/shared/observable';
import type { DomainEvent, DomainEventType } from '../domain/room/events';

/**
 * In-process, SYNCHRONOUS fan-out of domain events.
 *
 * Not a port — it is application-internal machinery, exposed on `WatchSession`
 * only so the composition root can attach projections. Three subscribers: feed
 * notices, telemetry, and watch time.
 *
 * Deliberately not async, not queued, no sagas — see design doc §15 on what is
 * skipped and why.
 */
export interface DomainEventBus {
    /**
     * Publish an event to every subscriber, in subscription order, before
     * returning.
     *
     * @param event Already-happened fact from a `Decision`. A subscriber that
     *              throws must not prevent the others from running.
     */
    emit(event: DomainEvent): void;

    /**
     * Subscribe to every event.
     *
     * @param run Receives each event as it is emitted.
     * @returns Stops the subscription.
     */
    subscribe(run: (event: DomainEvent) => void): Unsubscribe;

    /**
     * Subscribe to one kind of event, narrowed at the type level so the
     * handler sees the event's own payload rather than the whole union.
     *
     * @param type Discriminant to filter on.
     * @param run  Receives only events of that type.
     * @returns Stops the subscription.
     */
    on<T extends DomainEventType>(
        type: T,
        run: (event: Extract<DomainEvent, { type: T }>) => void,
    ): Unsubscribe;
}
