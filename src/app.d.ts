/// <reference types="svelte" />
/// <reference types="vite/client" />

/**
 * UIkit drives behaviour through bare HTML attributes (`uk-grid`,
 * `uk-tooltip`, `uk-spinner`). Svelte's generated element typings reject
 * unknown attributes, so they are declared once here instead of being
 * `@ts-ignore`d at every call site as the legacy tree effectively did by never
 * being typechecked at all.
 */
declare namespace svelteHTML {
    interface HTMLAttributes<T> {
        'uk-grid'?: boolean | string;
        'uk-tooltip'?: string | undefined;
        'uk-spinner'?: string;
        'uk-icon'?: string;
    }
}

declare module 'prettier-bytes' {
    /** Formats a byte count as a short human-readable string. */
    export default function prettierBytes(bytes: number): string;
}

/**
 * WebTorrent is imported from a CDN at runtime rather than bundled, exactly as
 * it was before this refactor. TypeScript cannot resolve a URL specifier, and
 * the library ships no types worth having, so the module is declared here — in
 * one place, instead of the `@ts-ignore`s the legacy file carried.
 */
declare module 'https://esm.sh/webtorrent@2.2.1' {
    const WebTorrent: new (options?: unknown) => any;
    export default WebTorrent;
}
