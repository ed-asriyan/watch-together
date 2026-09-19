// @vitest-environment jsdom
import { mount, unmount } from 'svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import SourceCard from './source-card.svelte';
import { SESSION_KEY, type Session } from '../session-context';
import type { SourceView } from '../../../../domains/watch-session/ports/inbound/views';
import type { Observable, Unsubscribe } from '../../../../domains/watch-session/model/shared/observable';
import { initI18n } from '../../../../i18n';

/**
 * The first component spec in the project.
 *
 * It was written to pin a suspected keystroke-lag bug in this field — `bind:value`
 * and the component's own `oninput` both fire on `input`, so reading the bound
 * variable in the handler *looks* one event behind. It is not: Svelte updates
 * the binding first, and both this spec and a real browser confirm it. The
 * symptom that prompted the hunt was a bad selector in the browser probe, which
 * was typing into the chat field.
 *
 * The spec stays anyway. What the field reports to the domain on every
 * keystroke is a real contract — the input is the one place where the "commands
 * in, views out" model needed an explicit affordance (design doc §18.7) — and
 * nothing below the driving adapter can check it: the coordinator would be
 * handed the wrong string and behave perfectly with it.
 */

const constant = <T,>(value: T): Observable<T> => ({
    subscribe(run: (value: T) => void): Unsubscribe {
        run(value);
        return () => undefined;
    },
});

const EMPTY_SOURCE: SourceView = {
    raw: '', revision: 0, kind: null, valid: false, empty: true,
    resolving: false, resolveFailed: false, isExample: false, seeding: false,
};

const harness = () => {
    const typed: string[] = [];
    const session = {
        commands: {
            setSourceFromUserInput: async (raw: string) => {
                typed.push(raw);
                return { status: 'unrecognized' as const };
            },
            recordInteraction: () => undefined,
            shareLocalFile: async () => ({ status: 'unsupported' as const }),
            playLocalFilePrivately: async () => undefined,
        },
        view: {
            source: constant(EMPTY_SOURCE),
            delivery: constant({
                visible: false, peers: 0, downloadBytesPerSecond: 0,
                uploadBytesPerSecond: 0, progress: null, seeding: false,
            }),
        },
        player: { mount: () => undefined, unmount: () => undefined },
    } as unknown as Session;

    const target = document.createElement('div');
    document.body.appendChild(target);
    const component = mount(SourceCard, {
        target,
        context: new Map<unknown, unknown>([[SESSION_KEY, session]]),
    });

    return { typed, target, component };
};

const type = (input: HTMLInputElement, text: string): void => {
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('source card', () => {
    beforeAll(() => {
        initI18n();
    });

    it('reports what the user actually typed, not the previous value', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'h');
        type(input, 'ht');
        type(input, 'htt');

        expect(typed).toEqual(['h', 'ht', 'htt']);
        await unmount(component);
    });

    it('reports a complete pasted link in one go', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'https://example.com/v.mp4');

        expect(typed).toEqual(['https://example.com/v.mp4']);
        await unmount(component);
    });

    it('reports an emptied field, so the room can clear its source', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'x');
        type(input, '');

        expect(typed).toEqual(['x', '']);
        await unmount(component);
    });
});
