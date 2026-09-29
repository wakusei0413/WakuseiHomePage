import fs from 'node:fs';
import path from 'node:path';
import {
    fetchContributionsFromApi,
    parseContributionsPayload,
    type ContributionsPayload
} from './github-contributions';

export interface CachedContributionsOptions {
    signal?: AbortSignal;
    timeoutMs?: number;
    ttlMs?: number;
    cacheDir?: string;
    forceRefresh?: boolean;
}

export const DEFAULT_CONTRIBUTIONS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

export function getContributionsCacheDir(): string {
    return path.resolve('node_modules/.cache/github-contributions');
}

/**
 * Fetch GitHub contributions with disk caching for build speed and resilience.
 *
 * During build:
 * 1. If fresh cache exists on disk (< TTL, default 1h), return it instantly (0ms network).
 * 2. If missing or expired, fetch from API and update disk cache.
 * 3. If remote fetch fails/times out, fall back to stale disk cache if available.
 */
export async function fetchContributionsWithCache(
    username: string,
    options?: CachedContributionsOptions
): Promise<ContributionsPayload> {
    const {
        signal,
        timeoutMs = 10000,
        ttlMs = process.env.CONTRIBUTIONS_CACHE_TTL_MS
            ? Number(process.env.CONTRIBUTIONS_CACHE_TTL_MS)
            : DEFAULT_CONTRIBUTIONS_CACHE_TTL,
        cacheDir = getContributionsCacheDir(),
        forceRefresh = process.env.REFRESH_CONTRIBUTIONS === 'true'
    } = options ?? {};

    const safeUsername = encodeURIComponent(username.trim());
    const cacheFile = path.join(cacheDir, `${safeUsername}.json`);

    let stalePayload: ContributionsPayload | null = null;

    if (!forceRefresh && fs.existsSync(cacheFile)) {
        try {
            const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            if (raw && typeof raw === 'object' && typeof raw.timestamp === 'number') {
                const parsed = parseContributionsPayload(raw.payload);
                if (Date.now() - raw.timestamp < ttlMs) {
                    return parsed;
                }
                stalePayload = parsed;
            }
        } catch {
            // Bad cache file, ignore and fetch fresh
        }
    }

    try {
        const payload = await fetchContributionsFromApi(username, { signal, timeoutMs });
        try {
            fs.mkdirSync(cacheDir, { recursive: true });
            fs.writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), payload }), 'utf8');
        } catch {
            // Cache write error shouldn't block build
        }
        return payload;
    } catch (error) {
        // If fetch failed but we have stale cache, use it instead of returning empty data
        if (stalePayload) {
            console.warn(
                `[github-contributions] Remote fetch failed (${error instanceof Error ? error.message : String(error)}), using stale cache`
            );
            return stalePayload;
        }
        throw error;
    }
}
