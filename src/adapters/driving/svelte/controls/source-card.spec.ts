// @vitest-environment jsdom
import { mount, unmount } from 'svelte';
import { beforeAll, describe, expect, it } from 'vitest';
import SourceCard from './source-card.svelte';
import { SESSION_KEY, type Session } from '../session-context';
import type { SourceView } from '../../../../domains/watch-session/ports/inbound/views';
import type { Observable, Unsubscribe } from '../../../../domains/watch-session/model/shared/observable';
import { initI18n } from '../../../../i18n';

/**
 * What the source field reports to the domain, and when.
 *
 * Reporting is a room-wide write — it sets everyone's source and resets
 * everyone's playhead — so it happens when the user is done with the field:
 * Enter, leaving it, or a paste or drop, which arrive whole. It used to happen
 * on every keystroke, and this spec used to pin that as the contract; every
 * prefix that parsed as a URL became the room's source in turn.
 *
 * Nothing below the driving adapter can check this: the coordinator would be
 * handed the partial strings and behave perfectly with them.
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

const type = (input: HTMLInputElement, text: string, inputType = 'insertText'): void => {
    input.value = text;
    input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType }));
};

const press = (input: HTMLInputElement, key: string): void => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};

const leave = (input: HTMLInputElement): void => {
    input.dispatchEvent(new Event('change', { bubbles: true }));
};

describe('source card', () => {
    beforeAll(() => {
        initI18n();
    });

    it('reports nothing while the user is still typing', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'h');
        type(input, 'ht');
        type(input, 'http://l');

        expect(typed).toEqual([]);
        await unmount(component);
    });

    it('reports what was typed once, on Enter', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'https://example.com/v');
        type(input, 'https://example.com/v.mp4');
        press(input, 'Enter');
        leave(input);

        expect(typed).toEqual(['https://example.com/v.mp4']);
        await unmount(component);
    });

    it('reports on leaving the field', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'https://example.com/v.mp4');
        leave(input);

        expect(typed).toEqual(['https://example.com/v.mp4']);
        await unmount(component);
    });

    it('reports a pasted link straight away, in one go', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'https://example.com/v.mp4', 'insertFromPaste');

        expect(typed).toEqual(['https://example.com/v.mp4']);
        await unmount(component);
    });

    it('reports an emptied field, so the room can clear its source', async () => {
        const { typed, target, component } = harness();
        const input = target.querySelector<HTMLInputElement>('input.uk-input')!;

        type(input, 'x', 'insertFromPaste');
        type(input, '', 'deleteContentBackward');
        press(input, 'Enter');

        expect(typed).toEqual(['x', '']);
        await unmount(component);
    });
});
