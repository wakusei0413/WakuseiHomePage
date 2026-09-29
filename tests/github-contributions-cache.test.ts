import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fetchContributionsWithCache } from '../src/lib/github-contributions-cache';
import * as githubMod from '../src/lib/github-contributions';

const TEST_CACHE_DIR = path.resolve('node_modules/.cache/test-github-contributions');

const mockPayload: githubMod.ContributionsPayload = {
    total: { lastYear: 100 },
    contributions: [
        { date: '2026-05-01', count: 10, level: 2 },
        { date: '2026-05-02', count: 0, level: 0 }
    ]
};

describe('fetchContributionsWithCache', () => {
    beforeEach(() => {
        if (fs.existsSync(TEST_CACHE_DIR)) {
            fs.rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        vi.restoreAllMocks();
        if (fs.existsSync(TEST_CACHE_DIR)) {
            fs.rmSync(TEST_CACHE_DIR, { recursive: true, force: true });
        }
    });

    it('fetches from API on cache miss and writes cache to disk', async () => {
        const fetchSpy = vi.spyOn(githubMod, 'fetchContributionsFromApi').mockResolvedValue(mockPayload);

        const result = await fetchContributionsWithCache('testuser', {
            cacheDir: TEST_CACHE_DIR
        });

        expect(result).toEqual(mockPayload);
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        const cacheFile = path.join(TEST_CACHE_DIR, 'testuser.json');
        expect(fs.existsSync(cacheFile)).toBe(true);

        const saved = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        expect(saved.payload).toEqual(mockPayload);
        expect(typeof saved.timestamp).toBe('number');
    });

    it('returns cached payload without calling API when cache is fresh', async () => {
        const cacheFile = path.join(TEST_CACHE_DIR, 'testuser.json');
        fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
        fs.writeFileSync(
            cacheFile,
            JSON.stringify({
                timestamp: Date.now() - 1000, // 1 second ago
                payload: mockPayload
            }),
            'utf8'
        );

        const fetchSpy = vi.spyOn(githubMod, 'fetchContributionsFromApi');

        const result = await fetchContributionsWithCache('testuser', {
            cacheDir: TEST_CACHE_DIR,
            ttlMs: 60000 // 1 minute TTL
        });

        expect(result).toEqual(mockPayload);
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('re-fetches when cache is expired', async () => {
        const cacheFile = path.join(TEST_CACHE_DIR, 'testuser.json');
        fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
        fs.writeFileSync(
            cacheFile,
            JSON.stringify({
                timestamp: Date.now() - 100000, // 100 seconds ago
                payload: mockPayload
            }),
            'utf8'
        );

        const freshPayload: githubMod.ContributionsPayload = {
            total: { lastYear: 150 },
            contributions: [{ date: '2026-05-01', count: 15, level: 3 }]
        };
        const fetchSpy = vi.spyOn(githubMod, 'fetchContributionsFromApi').mockResolvedValue(freshPayload);

        const result = await fetchContributionsWithCache('testuser', {
            cacheDir: TEST_CACHE_DIR,
            ttlMs: 5000 // 5 seconds TTL
        });

        expect(result).toEqual(freshPayload);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back to stale cache when remote fetch fails', async () => {
        const cacheFile = path.join(TEST_CACHE_DIR, 'testuser.json');
        fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
        fs.writeFileSync(
            cacheFile,
            JSON.stringify({
                timestamp: Date.now() - 100000, // expired
                payload: mockPayload
            }),
            'utf8'
        );

        vi.spyOn(githubMod, 'fetchContributionsFromApi').mockRejectedValue(new Error('Network error'));
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const result = await fetchContributionsWithCache('testuser', {
            cacheDir: TEST_CACHE_DIR,
            ttlMs: 5000
        });

        expect(result).toEqual(mockPayload);
        expect(warnSpy).toHaveBeenCalled();
    });

    it('throws error when remote fetch fails and no cache exists', async () => {
        vi.spyOn(githubMod, 'fetchContributionsFromApi').mockRejectedValue(new Error('Network offline'));

        await expect(
            fetchContributionsWithCache('testuser', {
                cacheDir: TEST_CACHE_DIR
            })
        ).rejects.toThrow('Network offline');
    });

    it('bypasses cache when forceRefresh is true', async () => {
        const cacheFile = path.join(TEST_CACHE_DIR, 'testuser.json');
        fs.mkdirSync(TEST_CACHE_DIR, { recursive: true });
        fs.writeFileSync(
            cacheFile,
            JSON.stringify({
                timestamp: Date.now(), // fresh
                payload: mockPayload
            }),
            'utf8'
        );

        const freshPayload: githubMod.ContributionsPayload = {
            total: { lastYear: 200 },
            contributions: [{ date: '2026-05-01', count: 20, level: 3 }]
        };
        const fetchSpy = vi.spyOn(githubMod, 'fetchContributionsFromApi').mockResolvedValue(freshPayload);

        const result = await fetchContributionsWithCache('testuser', {
            cacheDir: TEST_CACHE_DIR,
            forceRefresh: true
        });

        expect(result).toEqual(freshPayload);
        expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
});
