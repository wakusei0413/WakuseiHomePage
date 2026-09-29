import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildContributionGrid, type ContributionDay } from '../src/lib/github-contributions';
import {
    SKYLINE_GEOMETRY,
    barHeight,
    easeOutBack,
    layoutSkyline,
    mixColor,
    parseColor,
    rampColor,
    shade,
    skylineBounds,
    terrainTones,
    TONE_FLOOR
} from '../src/lib/contribution-skyline';

const END = new Date(2026, 8, 29); // 周二

function sampleDays(): ContributionDay[] {
    return [
        { date: '2026-09-29', count: 3, level: 2 },
        { date: '2026-09-20', count: 12, level: 4 },
        { date: '2026-01-05', count: 1, level: 1 }
    ];
}

describe('contribution skyline geometry', () => {
    it('maps flat ground to the floor tile and full tone to the full height', () => {
        expect(barHeight(0)).toBe(SKYLINE_GEOMETRY.floorHeight);
        expect(barHeight(TONE_FLOOR / 2)).toBe(SKYLINE_GEOMETRY.floorHeight);
        expect(barHeight(1)).toBeCloseTo(SKYLINE_GEOMETRY.maxHeight);
        expect(barHeight(0.2)).toBeLessThan(barHeight(0.5));
        expect(barHeight(0.5)).toBeLessThan(barHeight(0.9));
    });

    it('smooths sparse commits into gentle slopes around the peak', () => {
        const grid = buildContributionGrid([{ date: '2026-06-10', count: 9, level: 4 }], END);
        const tones = terrainTones(grid);
        const flat = tones.flat();
        const peak = Math.max(...flat);
        const w = tones.findIndex((week) => week.includes(peak));
        const d = tones[w].indexOf(peak);

        expect(peak).toBe(1);
        // 邻居被抬升成缓坡，且随距离递减；远处仍是平地
        expect(tones[w + 1][d]).toBeGreaterThan(TONE_FLOOR);
        expect(tones[w + 1][d]).toBeLessThan(peak);
        expect(tones[w + 2][d]).toBeLessThan(tones[w + 1][d]);
        expect(tones[w + 12][d]).toBeLessThanOrEqual(TONE_FLOOR);
        expect(flat.filter((tone) => tone > TONE_FLOOR).length).toBeGreaterThan(10);
    });

    it('returns an all-flat field when there are no commits', () => {
        const tones = terrainTones(buildContributionGrid([], END));
        expect(tones.flat().every((tone) => tone === 0)).toBe(true);
    });

    it('lays out one bar per grid cell in back-to-front order', () => {
        const grid = buildContributionGrid(sampleDays(), END);
        const cellCount = grid.weeks.reduce((sum, week) => sum + week.length, 0);
        const { bars } = layoutSkyline(grid);

        expect(bars).toHaveLength(cellCount);
        for (let i = 1; i < bars.length; i++) {
            const prev = bars[i - 1];
            const next = bars[i];
            expect(prev.day < next.day || (prev.day === next.day && prev.week < next.week)).toBe(true);
        }
    });

    it('marks only the last cell as today and peaks at the busiest day', () => {
        const grid = buildContributionGrid(sampleDays(), END);
        const { bars } = layoutSkyline(grid);
        const today = bars.filter((bar) => bar.isToday);

        expect(today).toHaveLength(1);
        expect(today[0].date).toBe('2026-09-29');
        const tallest = bars.reduce((a, b) => (b.height > a.height ? b : a));
        expect(tallest.date).toBe('2026-09-20');
    });

    it('keeps every base point inside the data-independent bounds', () => {
        const { bars, width, height } = layoutSkyline(buildContributionGrid(sampleDays(), END));
        const bounds = skylineBounds();

        expect(width).toBe(bounds.width);
        expect(height).toBe(bounds.height);
        for (const bar of bars) {
            for (const [x, y] of bar.base) {
                expect(x).toBeGreaterThanOrEqual(0);
                expect(x).toBeLessThanOrEqual(width);
                expect(y - bar.height).toBeGreaterThanOrEqual(0);
                expect(y).toBeLessThanOrEqual(height);
            }
            expect(bar.delay).toBeGreaterThanOrEqual(0);
            expect(bar.delay).toBeLessThanOrEqual(1);
        }
    });

    it('parses and shades hex and rgba colors', () => {
        expect(parseColor('#fff')).toEqual([255, 255, 255, 1]);
        expect(parseColor('rgba(10, 20, 30, 0.5)')).toEqual([10, 20, 30, 0.5]);
        expect(parseColor('oklch(0.5 0.1 120)')).toBeNull();
        expect(shade('#646464', 0.5)).toBe('rgba(50, 50, 50, 1)');
        expect(shade('rgba(0, 0, 0, 0.06)', 0.8)).toBe('rgba(0, 0, 0, 0.06)');
        expect(shade('var(--x)', 0.5)).toBe('var(--x)');
        expect(mixColor('#000000', '#ffffff', 0.5)).toBe('rgba(128, 128, 128, 1)');
        expect(rampColor(['#000000', '#ffffff', '#000000'], 0.5)).toBe('rgba(255, 255, 255, 1)');
        expect(rampColor(['#000000', '#ffffff'], 2)).toBe('rgba(255, 255, 255, 1)');
    });

    it('eases from 0 to 1 with a slight overshoot', () => {
        expect(easeOutBack(0)).toBeCloseTo(0);
        expect(easeOutBack(1)).toBeCloseTo(1);
        const samples = Array.from({ length: 21 }, (_, i) => easeOutBack(i / 20));
        expect(Math.max(...samples)).toBeGreaterThan(1);
    });
});

describe('GitHubContributions component', () => {
    const source = readFileSync(join(process.cwd(), 'src', 'components', 'GitHubContributions.vue'), 'utf-8');

    it('releases animation frames and observers on unmount', () => {
        expect(source).toMatch(/onUnmounted\(\(\) => \{[\s\S]*?cancelAnimationFrame\(frameId\)/);
        expect(source).toMatch(/resizeObserver\?\.disconnect\(\)/);
        expect(source).toMatch(/themeObserver\?\.disconnect\(\)/);
        expect(source).toMatch(/controller\?\.abort\(\)/);
    });

    it('respects reduced motion and hides the canvas from assistive tech', () => {
        expect(source).toContain('prefers-reduced-motion: reduce');
        expect(source).toMatch(/<canvas[^>]*aria-hidden="true"/);
    });
});
