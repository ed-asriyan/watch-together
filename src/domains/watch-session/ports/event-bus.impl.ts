import type { Unsubscribe } from '../model/shared/observable';
import type { DomainEvent, DomainEventType } from '../model/events';
import type { DomainEventBus } from './event-bus';

/**
 * Synchronous in-process fan-out. A subscriber that throws must not stop the
 * others — a broken telemetry mapping should not take the UI down with it.
 */
export const createEventBus = (
    onSubscriberError: (error: unknown) => void = () => undefined,
): DomainEventBus => {
    const listeners = new Set<(event: DomainEvent) => void>();

    const bus: DomainEventBus = {
        emit(event) {
            for (const run of [...listeners]) {
                try {
                    run(event);
                } catch (error) {
                    onSubscriberError(error);
                }
            }
        },
        subscribe(run) {
            listeners.add(run);
            return () => listeners.delete(run);
        },
        on<T extends DomainEventType>(
            type: T,
            run: (event: Extract<DomainEvent, { type: T }>) => void,
        ): Unsubscribe {
            return bus.subscribe((event) => {
                if (event.type === type) run(event as Extract<DomainEvent, { type: T }>);
            });
        },
    };

    return bus;
};
