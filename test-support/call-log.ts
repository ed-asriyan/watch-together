/**
 * A single ordered log of every outbound call, across all ports.
 *
 * Per-port spies answer "was it called?". The thing that actually goes wrong in
 * a coordinator is ORDER — arming disconnect cleanup after announcing presence,
 * publishing before the clock is synchronized, opening the new room before
 * closing the old one. One shared sequence makes those assertable.
 */
export interface Call {
    readonly seq: number;
    /** `"gateway.open"`, `"player.seekTo"`, ... */
    readonly name: string;
    readonly args: readonly unknown[];
}

export class CallLog {
    private seq = 0;
    readonly calls: Call[] = [];

    record(name: string, ...args: readonly unknown[]): void {
        this.calls.push({ seq: ++this.seq, name, args });
    }

    /** Every call name, in order. */
    get names(): string[] {
        return this.calls.map((c) => c.name);
    }

    /** Names matching a prefix, e.g. `only('gateway.')`. */
    only(prefix: string): string[] {
        return this.names.filter((n) => n.startsWith(prefix));
    }

    first(name: string): Call | undefined {
        return this.calls.find((c) => c.name === name);
    }

    all(name: string): Call[] {
        return this.calls.filter((c) => c.name === name);
    }

    /** True when `a` happened and `b` happened after it. */
    before(a: string, b: string): boolean {
        const first = this.first(a);
        const second = this.first(b);
        return first !== undefined && second !== undefined && first.seq < second.seq;
    }

    clear(): void {
        this.calls.length = 0;
    }
}
