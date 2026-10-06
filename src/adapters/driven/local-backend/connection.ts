import type { Unsubscribe } from '../../../domains/watch-session/model/shared/observable';
import type { ClientMessage, ServerMessage } from './protocol';

type Ack = Extract<ServerMessage, { t: 'ack' }>;
type Push = Extract<ServerMessage, { t: 'mutation' }>;
type Outgoing = ClientMessage extends infer M ? (M extends { req: number } ? Omit<M, 'req'> : never) : never;

interface Pending {
    readonly message: ClientMessage;
    readonly resolve: (ack: Ack) => void;
    readonly reject: (error: Error) => void;
}

const RECONNECT_MIN_MS = 250;
const RECONNECT_MAX_MS = 5_000;

/**
 * One WebSocket to the local backend, shared by the room gateway and the clock.
 *
 * Connects on first use and reconnects for ever with capped backoff. Requests
 * made while disconnected are queued, and requests that were in flight when
 * the socket dropped are sent again: delivery is at-least-once, which every
 * room mutation tolerates (they are all idempotent except the watch-time
 * counter, where a rare double minute is harmless).
 *
 * On reconnect the `reconnected` listeners run BEFORE the queue is flushed, so
 * a gateway can re-subscribe its rooms and the server knows who it is talking
 * to by the time the queued writes land.
 */
export class LocalBackendConnection {
    private socket: WebSocket | null = null;
    private connected = false;
    private closedByUs = false;
    private everConnected = false;
    private nextReq = 1;
    private backoff = RECONNECT_MIN_MS;
    private retry: ReturnType<typeof setTimeout> | null = null;

    private readonly queue: Pending[] = [];
    private readonly inFlight = new Map<number, Pending>();
    private readonly pushListeners = new Set<(push: Push) => void>();
    private readonly statusListeners = new Set<(online: boolean) => void>();
    private readonly reconnectListeners = new Set<() => void>();
    private readonly openWaiters = new Set<() => void>();

    constructor(
        private readonly url: string,
        private readonly makeSocket: (url: string) => WebSocket = (target) => new WebSocket(target),
    ) {}

    get isOnline(): boolean {
        return this.connected;
    }

    request(message: Outgoing): Promise<Ack> {
        this.ensure();
        return new Promise<Ack>((resolve, reject) => {
            const pending: Pending = {
                message: { ...message, req: this.nextReq++ } as ClientMessage,
                resolve,
                reject,
            };
            if (this.connected) this.send(pending);
            else this.queue.push(pending);
        });
    }

    /** Resolves once connected, or after `timeoutMs` with `false`. */
    waitOnline(timeoutMs: number): Promise<boolean> {
        this.ensure();
        if (this.connected) return Promise.resolve(true);
        return new Promise((resolve) => {
            const done = (value: boolean) => {
                clearTimeout(timer);
                this.openWaiters.delete(onOpen);
                resolve(value);
            };
            const onOpen = () => done(true);
            const timer = setTimeout(() => done(false), timeoutMs);
            this.openWaiters.add(onOpen);
        });
    }

    onPush(run: (push: Push) => void): Unsubscribe {
        this.pushListeners.add(run);
        return () => this.pushListeners.delete(run);
    }

    onStatus(run: (online: boolean) => void): Unsubscribe {
        this.statusListeners.add(run);
        return () => this.statusListeners.delete(run);
    }

    onReconnected(run: () => void): Unsubscribe {
        this.reconnectListeners.add(run);
        return () => this.reconnectListeners.delete(run);
    }

    close(): void {
        this.closedByUs = true;
        if (this.retry) clearTimeout(this.retry);
        this.socket?.close();
        this.socket = null;
        const failed = [...this.queue, ...this.inFlight.values()];
        this.queue.length = 0;
        this.inFlight.clear();
        failed.forEach((pending) => pending.reject(new Error('connection closed')));
    }

    // ---- internals ----------------------------------------------------------

    private ensure(): void {
        if (this.socket || this.closedByUs || this.retry) return;
        this.connect();
    }

    private connect(): void {
        this.retry = null;
        let socket: WebSocket;
        try {
            socket = this.makeSocket(this.url);
        } catch {
            this.scheduleReconnect();
            return;
        }
        this.socket = socket;

        socket.onopen = () => {
            this.connected = true;
            this.backoff = RECONNECT_MIN_MS;
            const isReconnect = this.everConnected;
            this.everConnected = true;
            this.statusListeners.forEach((run) => run(true));
            this.openWaiters.forEach((run) => run());
            if (isReconnect) this.reconnectListeners.forEach((run) => run());
            this.queue.splice(0).forEach((pending) => this.send(pending));
        };

        socket.onmessage = (event: MessageEvent) => {
            let message: ServerMessage;
            try {
                message = JSON.parse(String(event.data)) as ServerMessage;
            } catch {
                return;
            }
            if (message.t === 'mutation') {
                this.pushListeners.forEach((run) => run(message));
                return;
            }
            const pending = this.inFlight.get(message.req);
            if (!pending) return;
            this.inFlight.delete(message.req);
            if (message.error) pending.reject(new Error(message.error));
            else pending.resolve(message);
        };

        socket.onclose = () => {
            if (this.socket !== socket) return;
            this.socket = null;
            const wasConnected = this.connected;
            this.connected = false;
            // Unanswered requests go back to the front of the queue, in order.
            const unanswered = [...this.inFlight.values()];
            this.inFlight.clear();
            this.queue.unshift(...unanswered);
            if (wasConnected) this.statusListeners.forEach((run) => run(false));
            if (!this.closedByUs) this.scheduleReconnect();
        };

        // `close` always follows `error`; reconnecting is handled there.
        socket.onerror = () => undefined;
    }

    private scheduleReconnect(): void {
        if (this.retry || this.closedByUs) return;
        const delay = this.backoff;
        this.backoff = Math.min(RECONNECT_MAX_MS, this.backoff * 2);
        this.retry = setTimeout(() => this.connect(), delay);
    }

    private send(pending: Pending): void {
        this.inFlight.set(pending.message.req, pending);
        this.socket?.send(JSON.stringify(pending.message));
    }
}
