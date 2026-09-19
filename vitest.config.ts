import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    // The Svelte plugin is here only so component specs can import `.svelte`
    // files. The domain suite needs nothing: it is pure, so it runs in `node`
    // with no DOM, no timer shim and no network mock. Component specs opt into
    // jsdom with a `@vitest-environment` docblock.
    plugins: [svelte()],
    // Without the browser condition the server build of Svelte is loaded and
    // `mount` has no lifecycle to attach to. The domain suite is plain
    // TypeScript and is unaffected by it.
    resolve: { conditions: ['browser'] },
    test: {
        environment: 'node',
        include: [
            'src/domains/**/*.spec.ts',
            'src/adapters/**/*.spec.ts',
            'test/**/*.spec.ts',
        ],
    },
});
