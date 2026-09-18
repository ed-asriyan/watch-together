import type { Unsubscribe } from '../domain/shared/observable';
import type { DomainEvent, DomainEventType } from '../domain/room/events';

/**
 * In-process, SYNCHRONOUS fan-out of domain events. Three subscribers: the
 * feed-notice projection, the telemetry projection, and the read models.
 *
 * Deliberately not async, not queued, no sagas — see §15 on what is skipped.
 */
export interface DomainEventBus {
    emit(event: DomainEvent): void;
    subscribe(run: (event: DomainEvent) => void): Unsubscribe;
    on<T extends DomainEventType>(
        type: T,
        run: (event: Extract<DomainEvent, { type: T }>) => void,
    ): Unsubscribe;
}
