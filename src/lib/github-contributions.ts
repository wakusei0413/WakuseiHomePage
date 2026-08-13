/**
 * GitHub 提交贡献数据层。
 *
 * 数据在**构建时**同步（见 src/pages/github-contributions.json.ts 端点路由）：
 * 构建时用 fetchContributionsFromApi 抓取 github-contributions-api（`?y=last`，一年数据，无 token），
 * 输出为站内静态 JSON；客户端用 fetchContributionsSnapshot 读取该快照，不再直连第三方。
 * 容错约定与壁纸一致：外部 API 失败不得阻断页面/构建——解析函数全部容错，
 * 端点失败时输出空数据，组件层把空/坏数据降级为 GitHub 链接。
 */

export interface ContributionDay {
    /** YYYY-MM-DD */
    date: string;
    count: number;
    /** 0-4（服务端按全站分位计算） */
    level: number;
}

export interface ContributionsPayload {
    /** 按年份（或 lastYear）聚合的总数，仅用于参考，展示用窗口内自算值 */
    total: Record<string, number>;
    contributions: ContributionDay[];
}

export interface ContributionCell {
    date: string;
    count: number;
    level: number;
}

export interface ContributionGrid {
    /** 每列一周（周日→周六），最多 53 列；最后一列可能不满 7 天 */
    weeks: ContributionCell[][];
    /** 窗口内总提交数（与格子渲染口径一致） */
    totalCount: number;
    /** 窗口起始日期（含） */
    startDate: string;
    /** 窗口结束日期（含，即"今天"） */
    endDate: string;
}

export const CONTRIBUTION_API_BASE = 'https://github-contributions-api.jogruber.de/v4';

export function contributionsApiUrl(username: string): string {
    return `${CONTRIBUTION_API_BASE}/${encodeURIComponent(username)}?y=last`;
}

/** 本地时区的 YYYY-MM-DD，避免 Date 的 UTC 解析坑。 */
export function toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 容错解析 API 响应：结构不对抛错（让组件降级）；单条记录坏则跳过，
 * 保证"缺字段/类型错"不会弄崩整个图。
 */
export function parseContributionsPayload(data: unknown): ContributionsPayload {
    if (typeof data !== 'object' || data === null) {
        throw new Error('GitHub 贡献数据格式无效：响应不是 JSON 对象');
    }
    const record = data as Record<string, unknown>;
    if (!Array.isArray(record.contributions)) {
        throw new Error('GitHub 贡献数据格式无效：缺少 contributions 数组');
    }

    const contributions: ContributionDay[] = [];
    for (const raw of record.contributions) {
        if (typeof raw !== 'object' || raw === null) continue;
        const item = raw as Record<string, unknown>;
        if (typeof item.date !== 'string' || !DATE_KEY_PATTERN.test(item.date)) continue;
        const count = typeof item.count === 'number' && Number.isFinite(item.count) ? item.count : 0;
        const level = typeof item.level === 'number' && Number.isFinite(item.level) ? item.level : count > 0 ? 1 : 0;
        contributions.push({ date: item.date, count, level: clampLevel(level) });
    }
    if (contributions.length === 0) {
        throw new Error('GitHub 贡献数据格式无效：contributions 中没有有效条目');
    }

    const total: Record<string, number> = {};
    if (typeof record.total === 'object' && record.total !== null) {
        for (const [key, value] of Object.entries(record.total as Record<string, unknown>)) {
            if (typeof value === 'number' && Number.isFinite(value)) total[key] = value;
        }
    }
    return { total, contributions };
}

export function clampLevel(level: number): number {
    return Math.min(Math.max(Math.round(level), 0), 4);
}

/**
 * 构建侧：拉取最近一年的贡献数据（仅构建端点/Node 环境调用）。
 * 自带超时（默认 10s）与外部 AbortSignal 合并；任一触发即中止。
 */
export async function fetchContributionsFromApi(
    username: string,
    options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<ContributionsPayload> {
    const { signal, timeoutMs = 10000 } = options ?? {};
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal) {
        if (signal.aborted) {
            controller.abort();
        } else {
            signal.addEventListener('abort', abort, { once: true });
        }
    }
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(contributionsApiUrl(username), {
            signal: controller.signal,
            headers: { Accept: 'application/json' }
        });
        if (!response.ok) {
            throw new Error(`GitHub 贡献 API 响应异常：HTTP ${response.status}`);
        }
        return parseContributionsPayload(await response.json());
    } finally {
        clearTimeout(timeoutId);
        if (signal) signal.removeEventListener('abort', abort);
    }
}

/** 客户端侧：读取构建时生成的站内快照（同源，无 CORS/限流问题）。 */
export async function fetchContributionsSnapshot(options?: { signal?: AbortSignal }): Promise<ContributionsPayload> {
    const { signal } = options ?? {};
    const response = await fetch('/github-contributions.json', { signal });
    if (!response.ok) {
        throw new Error(`GitHub 贡献快照响应异常：HTTP ${response.status}`);
    }
    return parseContributionsPayload(await response.json());
}

/**
 * 把每日贡献数据对齐成 GitHub 风格矩阵：
 * 以 endDate（默认今天）所在周的周日为起点，往前推 52 个完整周，共 53 列（≈ 一年）；
 * 最后一列只到今天，不渲染未来日期。
 */
export function buildContributionGrid(days: ContributionDay[], endDate: Date = new Date()): ContributionGrid {
    const byDate = new Map<string, ContributionDay>();
    for (const day of days) {
        if (day && typeof day.date === 'string') byDate.set(day.date, day);
    }

    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const dayOfWeek = end.getDay(); // 0 = 周日
    const start = new Date(end);
    start.setDate(start.getDate() - (52 * 7 + dayOfWeek));

    const weekColumns: ContributionCell[][] = [];
    const cursor = new Date(start);
    let totalCount = 0;
    while (cursor <= end) {
        const week: ContributionCell[] = [];
        for (let i = 0; i < 7 && cursor <= end; i++) {
            const date = toDateKey(cursor);
            const day = byDate.get(date);
            const count = day ? Math.max(Math.round(day.count) || 0, 0) : 0;
            const level = day ? clampLevel(Number.isFinite(day.level) ? day.level : count > 0 ? 1 : 0) : 0;
            totalCount += count;
            week.push({ date, count, level });
            cursor.setDate(cursor.getDate() + 1);
        }
        weekColumns.push(week);
    }

    return {
        weeks: weekColumns,
        totalCount,
        startDate: toDateKey(start),
        endDate: toDateKey(end)
    };
}
