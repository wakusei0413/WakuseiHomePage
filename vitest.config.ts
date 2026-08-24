import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': resolve(__dirname, 'src')
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts'],
        // The default `forks` pool launches worker child processes over pipes,
        // which is blocked in restricted CI sandboxes (named-pipe EPERM). The
        // `threads` pool runs tests in in-process worker_threads instead.
        pool: 'threads'
    }
});
