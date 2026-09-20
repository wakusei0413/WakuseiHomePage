import type { PostListItem } from './post-model';

export interface ArchivePostItem extends PostListItem {
    archiveTimestamp: number;
    archiveIso: string;
    archiveYear: number;
    archiveMonth: number;
    archiveDay: number;
    archiveDayLabel: string;
}

export interface ArchiveMonthGroup {
    year: number;
    month: number;
    label: string;
    posts: ArchivePostItem[];
    count: number;
}

export interface ArchiveYearGroup {
    year: number;
    months: ArchiveMonthGroup[];
    count: number;
}

export interface ArchiveGroups {
    years: ArchiveYearGroup[];
    undated: PostListItem[];
    totalPosts: number;
    totalMonths: number;
}

export interface ArchiveFilter {
    category?: string | null;
    tag?: string | null;
}

function matchesArchiveFilter(post: PostListItem, filter: ArchiveFilter) {
    const matchesCategory = !filter.category || post.data.category === filter.category;
    const matchesTag = !filter.tag || post.data.tags?.includes(filter.tag);
    return matchesCategory && matchesTag;
}

export function filterArchiveGroups(archive: ArchiveGroups, filter: ArchiveFilter): ArchiveGroups {
    const years = archive.years
        .map((year) => {
            const months = year.months
                .map((month) => {
                    const posts = month.posts.filter((post) => matchesArchiveFilter(post, filter));
                    return { ...month, posts, count: posts.length };
                })
                .filter((month) => month.count > 0);

            return {
                ...year,
                months,
                count: months.reduce((total, month) => total + month.count, 0)
            };
        })
        .filter((year) => year.count > 0);

    const undated = archive.undated.filter((post) => matchesArchiveFilter(post, filter));

    return {
        years,
        undated,
        totalPosts: years.reduce((total, year) => total + year.count, undated.length),
        totalMonths: years.reduce((total, year) => total + year.months.length, 0)
    };
}

function parseArchiveDate(raw?: string) {
    if (!raw) return null;
    const date = new Date(raw);
    const timestamp = date.getTime();
    if (Number.isNaN(timestamp)) return null;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return {
        timestamp,
        year,
        month,
        day,
        iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        dayLabel: String(day).padStart(2, '0')
    };
}

export function createArchiveGroups(posts: PostListItem[]): ArchiveGroups {
    const publishedPosts = posts.filter((post) => !post.data.draft);
    const monthBuckets = new Map<number, Map<number, ArchivePostItem[]>>();
    const undated: PostListItem[] = [];

    publishedPosts.forEach((post) => {
        const parsed = parseArchiveDate(post.data.pubDate);

        if (!parsed) {
            undated.push(post);
            return;
        }

        const yearBucket = monthBuckets.get(parsed.year) ?? new Map<number, ArchivePostItem[]>();
        const monthBucket = yearBucket.get(parsed.month) ?? [];

        monthBucket.push({
            ...post,
            dateLabel: post.dateLabel ?? parsed.iso,
            archiveTimestamp: parsed.timestamp,
            archiveIso: parsed.iso,
            archiveYear: parsed.year,
            archiveMonth: parsed.month,
            archiveDay: parsed.day,
            archiveDayLabel: parsed.dayLabel
        });

        yearBucket.set(parsed.month, monthBucket);
        monthBuckets.set(parsed.year, yearBucket);
    });

    const years = Array.from(monthBuckets.entries())
        .sort(([yearA], [yearB]) => yearB - yearA)
        .map(([year, months]) => {
            const monthGroups = Array.from(months.entries())
                .sort(([monthA], [monthB]) => monthB - monthA)
                .map(([month, monthPosts]) => {
                    const sortedPosts = [...monthPosts].sort((a, b) => {
                        if (a.archiveTimestamp !== b.archiveTimestamp) {
                            return b.archiveTimestamp - a.archiveTimestamp;
                        }
                        return a.slug.localeCompare(b.slug, 'zh-CN');
                    });

                    return {
                        year,
                        month,
                        label: `${month}月`,
                        posts: sortedPosts,
                        count: sortedPosts.length
                    };
                });

            return {
                year,
                months: monthGroups,
                count: monthGroups.reduce((total, month) => total + month.count, 0)
            };
        });

    return {
        years,
        undated,
        totalPosts: publishedPosts.length,
        totalMonths: years.reduce((total, year) => total + year.months.length, 0)
    };
}
