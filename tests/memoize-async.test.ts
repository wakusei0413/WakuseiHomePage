import { memoizeAsync, memoizeAsyncByKey } from '../src/lib/memoize-async';

describe('async memoization', () => {
    it('recomputes whenever caching is disabled', async () => {
        let calls = 0;
        const load = memoizeAsync(
            async () => ++calls,
            () => false
        );

        await expect(load()).resolves.toBe(1);
        await expect(load()).resolves.toBe(2);
    });

    it('reuses a successful result and retries after a failure', async () => {
        let calls = 0;
        const load = memoizeAsync(
            async () => {
                calls += 1;
                if (calls === 1) throw new Error('fail');
                return 'ok';
            },
            () => true
        );

        await expect(load()).rejects.toThrow('fail');
        await expect(load()).resolves.toBe('ok');
        await expect(load()).resolves.toBe('ok');
        expect(calls).toBe(2);
    });

    it('caches each key independently', async () => {
        const load = memoizeAsyncByKey(
            async (key: string) => key.toUpperCase(),
            () => true
        );

        await expect(load('a')).resolves.toBe('A');
        await expect(load('b')).resolves.toBe('B');
        await expect(load('a')).resolves.toBe('A');
    });
});
