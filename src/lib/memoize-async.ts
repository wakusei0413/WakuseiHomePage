export function memoizeAsync<T>(factory: () => Promise<T>, enabled: () => boolean): () => Promise<T> {
    let pending: Promise<T> | null = null;

    return () => {
        if (!enabled()) {
            return factory();
        }

        pending ??= factory().catch((error: unknown) => {
            pending = null;
            throw error;
        });
        return pending;
    };
}

export function memoizeAsyncByKey<K, T>(
    factory: (key: K) => Promise<T>,
    enabled: () => boolean
): (key: K) => Promise<T> {
    const cache = new Map<K, Promise<T>>();

    return (key) => {
        if (!enabled()) {
            return factory(key);
        }

        const cached = cache.get(key);
        if (cached) {
            return cached;
        }

        const pending = factory(key).catch((error: unknown) => {
            cache.delete(key);
            throw error;
        });
        cache.set(key, pending);
        return pending;
    };
}
