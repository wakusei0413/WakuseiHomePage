/**
 * GitHub 贡献"地形"：把 53×7 的贡献矩阵投影成轴测 3D 缓坡（纯几何，无 DOM）。
 *
 * 提交稀疏时逐日柱子会显得孤立，所以高度不直接用当天提交数，而是对开方后的提交量做
 * 高斯平滑：活跃日成为山峰，周边渐次抬升成缓坡，空闲期回落为平地。
 *
 * 坐标约定（单位空间，渲染时整体按容器宽度等比缩放）：
 * - 周轴 u 主要向右、略向下；星期轴 v 短而向左下；高度向上（屏幕 y 减小）。
 * - 可见面只有三个：顶面、+v 方向的前面、+u 方向的右面。
 * - 画家算法：先画 d 小、再画 w 小的柱子（越靠屏幕上方越先画）。
 */
import type { ContributionGrid } from './github-contributions';

export type Point = readonly [number, number];

export interface SkylineGeometry {
    /** 周轴单位向量（屏幕坐标） */
    u: Point;
    /** 星期轴单位向量（屏幕坐标） */
    v: Point;
    /** 最高柱的高度（单位空间） */
    maxHeight: number;
    /** 0 提交日的地砖厚度 */
    floorHeight: number;
    /** 每格四周留缝比例（0~0.5）；接近 0 时格子连成一片地表 */
    inset: number;
    /** 平滑核在周/星期方向上的标准差（格） */
    sigma: Point;
    /** 当天原始值在最终强度中的占比（其余来自平滑邻域），保留一点"峰"的锐度 */
    sharpness: number;
    /** 底座厚度：整块 53×7 地面向下挤出的石台，让城市"落地" */
    plinthDepth: number;
    /** 四周留白（单位空间） */
    padding: number;
}

export const SKYLINE_GEOMETRY: SkylineGeometry = {
    u: [5.2, 0.45],
    v: [-2.4, 1.3],
    maxHeight: 30,
    floorHeight: 0.5,
    inset: 0.04,
    sigma: [2.4, 1.8],
    sharpness: 0.18,
    plinthDepth: 2.5,
    padding: 3
};

const WEEKS = 53;
const DAYS = 7;

export interface SkylineBar {
    week: number;
    day: number;
    date: string;
    count: number;
    level: number;
    /** 平滑后的强度（0~1），决定高度与颜色 */
    tone: number;
    isToday: boolean;
    /** 目标高度（单位空间，已含地砖厚度） */
    height: number;
    /** 底面四点：[后, 右, 前, 左]（屏幕坐标，单位空间，已平移到画布内） */
    base: [Point, Point, Point, Point];
    /** 入场动画的延迟比例（0~1，沿对角线从左后到右前） */
    delay: number;
}

export interface SkylineLayout {
    bars: SkylineBar[];
    /** 单位空间下的画布尺寸（与数据无关，只由几何常量决定，便于提前占位） */
    width: number;
    height: number;
    /** 底座顶面四点 [后, 右, 前, 左] */
    plinth: [Point, Point, Point, Point];
    plinthDepth: number;
    /** 地面中心（用于绘制落地阴影） */
    groundCenter: Point;
    /** 地面半径（x/y） */
    groundRadius: Point;
}

/** 低于该强度视为平地，不上色 */
export const TONE_FLOOR = 0.03;

/**
 * 把贡献矩阵平滑成 0~1 的强度场（与 grid.weeks 同形）。
 * 先开方压制极值日，再做可分离的高斯模糊，最后与原始值按 sharpness 混合并归一化。
 */
export function terrainTones(grid: ContributionGrid, geo: SkylineGeometry = SKYLINE_GEOMETRY): number[][] {
    const raw = grid.weeks.map((week) => week.map((cell) => Math.sqrt(Math.max(cell.count, 0))));
    const [sw, sd] = geo.sigma;
    const rw = Math.ceil(sw * 2.5);
    const rd = Math.ceil(sd * 2.5);

    const blurred = raw.map((week, w) =>
        week.map((_, d) => {
            let sum = 0;
            let weight = 0;
            for (let dw = -rw; dw <= rw; dw++) {
                const col = raw[w + dw];
                if (!col) continue;
                for (let dd = -rd; dd <= rd; dd++) {
                    const value = col[d + dd];
                    if (value === undefined) continue;
                    const k = Math.exp(-(dw * dw) / (2 * sw * sw) - (dd * dd) / (2 * sd * sd));
                    sum += value * k;
                    weight += k;
                }
            }
            return weight > 0 ? sum / weight : 0;
        })
    );

    const mix = raw.map((week, w) =>
        week.map((value, d) => geo.sharpness * value + (1 - geo.sharpness) * blurred[w][d])
    );
    let max = 0;
    for (const week of mix) for (const value of week) max = Math.max(max, value);
    return mix.map((week) => week.map((value) => (max > 0 ? value / max : 0)));
}

/** 强度 → 高度；平地返回地砖厚度，其余用略小于 1 的指数让缓坡更饱满。 */
export function barHeight(tone: number, geo: SkylineGeometry = SKYLINE_GEOMETRY): number {
    if (!(tone > TONE_FLOOR)) return geo.floorHeight;
    return geo.floorHeight + Math.pow(Math.min(tone, 1), 0.8) * (geo.maxHeight - geo.floorHeight);
}

function planePoint(w: number, d: number, geo: SkylineGeometry): Point {
    return [w * geo.u[0] + d * geo.v[0], w * geo.u[1] + d * geo.v[1]];
}

/** 数据无关的包围盒：x 取 [0,7] 列最左 ~ [53,0] 最右；y 顶部预留最高柱。 */
export function skylineBounds(geo: SkylineGeometry = SKYLINE_GEOMETRY) {
    const corners = [
        planePoint(0, 0, geo),
        planePoint(WEEKS, 0, geo),
        planePoint(0, DAYS, geo),
        planePoint(WEEKS, DAYS, geo)
    ];
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys) - geo.maxHeight;
    const maxX = Math.max(...xs);
    const maxY = Math.max(...ys) + geo.plinthDepth;
    return {
        offsetX: geo.padding - minX,
        offsetY: geo.padding - minY,
        width: maxX - minX + geo.padding * 2,
        height: maxY - minY + geo.padding * 2
    };
}

export function layoutSkyline(grid: ContributionGrid, geo: SkylineGeometry = SKYLINE_GEOMETRY): SkylineLayout {
    const { offsetX, offsetY, width, height } = skylineBounds(geo);
    const shift = (p: Point): Point => [p[0] + offsetX, p[1] + offsetY];

    const tones = terrainTones(grid, geo);

    const lastWeek = grid.weeks.length - 1;
    const lastDay = lastWeek >= 0 ? grid.weeks[lastWeek].length - 1 : -1;
    const diagonal = Math.max(WEEKS + DAYS - 2, 1);
    const lo = geo.inset;
    const hi = 1 - geo.inset;

    const bars: SkylineBar[] = [];
    for (let day = 0; day < DAYS; day++) {
        for (let week = 0; week < grid.weeks.length; week++) {
            const cell = grid.weeks[week][day];
            if (!cell) continue;
            bars.push({
                week,
                day,
                date: cell.date,
                count: cell.count,
                level: cell.level,
                tone: tones[week][day],
                isToday: week === lastWeek && day === lastDay,
                height: barHeight(tones[week][day], geo),
                base: [
                    shift(planePoint(week + lo, day + lo, geo)),
                    shift(planePoint(week + hi, day + lo, geo)),
                    shift(planePoint(week + hi, day + hi, geo)),
                    shift(planePoint(week + lo, day + hi, geo))
                ],
                delay: (week + day) / diagonal
            });
        }
    }

    const center = shift(planePoint(WEEKS / 2, DAYS / 2, geo));
    return {
        bars,
        width,
        height,
        plinth: [
            shift(planePoint(0, 0, geo)),
            shift(planePoint(WEEKS, 0, geo)),
            shift(planePoint(WEEKS, DAYS, geo)),
            shift(planePoint(0, DAYS, geo))
        ],
        plinthDepth: geo.plinthDepth,
        groundCenter: [center[0], center[1] + geo.plinthDepth],
        groundRadius: [(WEEKS * geo.u[0]) / 2 + DAYS * 2, DAYS * geo.v[1] + WEEKS * geo.u[1] * 0.5]
    };
}

/** 解析 #rgb / #rrggbb / rgb() / rgba()；无法解析时返回 null。 */
export function parseColor(input: string): [number, number, number, number] | null {
    const value = input.trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value);
    if (hex) {
        const raw = hex[1].length === 3 ? [...hex[1]].map((c) => c + c).join('') : hex[1];
        return [parseInt(raw.slice(0, 2), 16), parseInt(raw.slice(2, 4), 16), parseInt(raw.slice(4, 6), 16), 1];
    }
    const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i.exec(value);
    if (rgb) {
        return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
    }
    return null;
}

/** 两色线性插值（含透明度），无法解析时取 b。 */
export function mixColor(a: string, b: string, t: number): string {
    const ca = parseColor(a);
    const cb = parseColor(b);
    if (!ca || !cb) return b;
    const k = Math.min(Math.max(t, 0), 1);
    const [r, g, bl, al] = ca.map((v, i) => v + (cb[i] - v) * k);
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(bl)}, ${Number(al.toFixed(3))})`;
}

/** 在一组等距色标之间按 t 取色（t ∈ [0,1]）。 */
export function rampColor(stops: string[], t: number): string {
    if (stops.length === 0) return 'transparent';
    if (stops.length === 1) return stops[0];
    const x = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    const i = Math.min(Math.floor(x), stops.length - 2);
    return mixColor(stops[i], stops[i + 1], x - i);
}

/** 按比例压暗（factor < 1）或提亮（factor > 1），保留透明度。 */
export function shade(color: string, factor: number): string {
    const parsed = parseColor(color);
    if (!parsed) return color;
    const [r, g, b, a] = parsed;
    const ch = (n: number) => Math.round(Math.min(Math.max(n * factor, 0), 255));
    return `rgba(${ch(r)}, ${ch(g)}, ${ch(b)}, ${a})`;
}

/** 轻微过冲的缓出，让柱子"弹"到位。 */
export function easeOutBack(t: number): number {
    const c1 = 1.4;
    const c3 = c1 + 1;
    const x = Math.min(Math.max(t, 0), 1) - 1;
    return 1 + c3 * x * x * x + c1 * x * x;
}

export function easeOutCubic(t: number): number {
    const x = 1 - Math.min(Math.max(t, 0), 1);
    return 1 - x * x * x;
}
