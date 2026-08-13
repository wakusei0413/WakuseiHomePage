import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    buildContributionGrid,
    contributionsApiUrl,
    fetchContributionsFromApi,
    fetchContributionsSnapshot,
    parseContributionsPayload,
    toDateKey,
    type ContributionDay
} from '../src/lib/github-contributions';

const END = new Date('2026-08-05T12:00:00'); // 周三（本地时区）
const END_KEY = '2026-08-05';

function day(date: string, count = 0, level?: number): ContributionDay {
    return { date, count, level: level ?? (count > 0 ? 1 : 0) };
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('parseContributionsPayload', () => {
    it('parses a valid payload and keeps total', () => {
        const parsed = parseContributionsPayload({
            total: { lastYear: 42 },
            contributions: [
                { date: '2026-05-01', count: 38, level: 4 },
                { date: '2026-05-02', count: 0, level: 0 }
            ]
        });

        expect(parsed.total).toEqual({ lastYear: 42 });
        expect(parsed.contributions).toEqual([
            { date: '2026-05-01', count: 38, level: 4 },
            { date: '2026-05-02', count: 0, level: 0 }
        ]);
    });

    it('skips malformed entries instead of throwing', () => {
        const parsed = parseContributionsPayload({
            total: 'nope',
            contributions: [
                { date: '2026-05-01', count: 38, level: 4 },
                { date: 'not-a-date', count: 5 },
                { count: 3 },
                null,
                42,
                { date: '2026-05-02', count: 'many' },
                { date: '2026-05-03', count: 2, level: 99 }
            ]
        });

        expect(parsed.total).toEqual({});
        expect(parsed.contributions).toEqual([
            { date: '2026-05-01', count: 38, level: 4 },
            { date: '2026-05-02', count: 0, level: 0 },
            { date: '2026-05-03', count: 2, level: 4 } // level 越界被夹到 0-4
        ]);
    });

    it('throws when contributions is not an array or is empty', () => {
        expect(() => parseContributionsPayload({ total: {} })).toThrow();
        expect(() => parseContributionsPayload(null)).toThrow();
        expect(() => parseContributionsPayload({ contributions: [] })).toThrow();
        expect(() => parseContributionsPayload({ contributions: [{ count: 1 }] })).toThrow();
    });
});

describe('buildContributionGrid', () => {
    it('builds a 53-week grid ending at today, starting on a Sunday', () => {
        const grid = buildContributionGrid([], END);

        expect(grid.weeks).toHaveLength(53);
        expect(grid.weeks[0]).toHaveLength(7);
        expect(grid.weeks[0][0].date).toBe('2025-08-03'); // 周日
        expect(grid.weeks[0][6].date).toBe('2025-08-09'); // 周六
        // 最后一列只到今天（2026-08-05 周三 → 4 天），不渲染未来日期
        expect(grid.weeks[52]).toHaveLength(4);
        expect(grid.weeks[52][grid.weeks[52].length - 1].date).toBe(END_KEY);
        expect(grid.endDate).toBe(END_KEY);
        expect(grid.startDate).toBe('2025-08-03');
        expect(grid.totalCount).toBe(0);
    });

    it('maps counts into cells and sums only in-window contributions', () => {
        const days = [
            day('2025-08-04', 1, 1),
            day('2026-05-01', 38, 4),
            day('2026-08-05', 4, 1),
            day('2024-01-01', 999, 4), // 窗口外：忽略
            day('2026-08-06', 99, 4) // 今天之后：忽略
        ];
        const grid = buildContributionGrid(days, END);

        expect(grid.weeks[0][1].count).toBe(1); // 2025-08-04（周一）
        expect(grid.weeks[0][1].level).toBe(1);
        expect(grid.weeks[52][3].count).toBe(4); // 2026-08-05（周三）
        expect(grid.totalCount).toBe(1 + 38 + 4);
    });

    it('falls back to level 1 when level is missing for a positive count', () => {
        // API 缺 level 字段的容错路径（类型断言模拟坏数据）。
        const grid = buildContributionGrid([{ date: END_KEY, count: 7 } as ContributionDay], END);

        expect(grid.weeks[52][3].level).toBe(1);
    });

    it('clamps negative and fractional levels', () => {
        const grid = buildContributionGrid(
            [
                { date: '2026-05-01', count: 1, level: -3 },
                { date: '2026-05-02', count: 1, level: 4.6 }
            ],
            END
        );

        const cells = grid.weeks.flat();
        expect(cells.find((cell) => cell.date === '2026-05-01')?.level).toBe(0);
        expect(cells.find((cell) => cell.date === '2026-05-02')?.level).toBe(4);
    });

    it('handles duplicate dates by keeping the last entry', () => {
        const grid = buildContributionGrid([day(END_KEY, 1, 1), day(END_KEY, 5, 2)], END);

        const last = grid.weeks[52][3];
        expect(last.count).toBe(5);
        expect(last.level).toBe(2);
        expect(grid.totalCount).toBe(5);
    });
});

describe('contributionsApiUrl', () => {
    it('builds the API url with y=last and encodes the username', () => {
        expect(contributionsApiUrl('wakusei0413')).toBe(
            'https://github-contributions-api.jogruber.de/v4/wakusei0413?y=last'
        );
        expect(contributionsApiUrl('a b')).toContain('a%20b');
    });
});

describe('fetchContributionsFromApi', () => {
    it('fetches and parses a successful response', async () => {
        const payload = { total: { lastYear: 1 }, contributions: [{ date: '2026-05-01', count: 1, level: 1 }] };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

        await expect(fetchContributionsFromApi('wakusei0413')).resolves.toEqual(payload);
        expect(fetch).toHaveBeenCalledWith(contributionsApiUrl('wakusei0413'), expect.any(Object));
    });

    it('rejects on non-ok responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }));

        await expect(fetchContributionsFromApi('wakusei0413')).rejects.toThrow(/503/);
    });

    it('rejects when the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

        await expect(fetchContributionsFromApi('wakusei0413')).rejects.toThrow('network down');
    });
});

describe('fetchContributionsSnapshot', () => {
    it('reads the static in-site snapshot', async () => {
        const payload = { total: {}, contributions: [{ date: '2026-05-01', count: 1, level: 1 }] };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

        await expect(fetchContributionsSnapshot()).resolves.toEqual(payload);
        expect(fetch).toHaveBeenCalledWith('/github-contributions.json', expect.any(Object));
    });

    it('rejects on non-ok responses', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) }));

        await expect(fetchContributionsSnapshot()).rejects.toThrow(/404/);
    });

    it('rejects when the request fails', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

        await expect(fetchContributionsSnapshot()).rejects.toThrow('network down');
    });
});

describe('toDateKey', () => {
    it('formats a date as YYYY-MM-DD in local time', () => {
        expect(toDateKey(new Date(2026, 0, 2))).toBe('2026-01-02');
    });
});
