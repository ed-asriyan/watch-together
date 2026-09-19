import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['src/domains/**/*.spec.ts', 'test/**/*.spec.ts'],
        // The domain is pure, so nothing here needs a DOM, a timer shim or a
        // network mock. That is the point of the design, and this config is
        // the shortest proof of it.
    },
});
