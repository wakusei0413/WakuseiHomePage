import type { PostListItem } from './post-model';

export const HOME_POSTS_PER_PAGE = 6;

export interface HomepagePageLink {
    page: number;
    href: string;
}

export interface HomepagePagination {
    currentPage: number;
    totalPages: number;
    previousHref: string | null;
    nextHref: string | null;
    pages: HomepagePageLink[];
}

export interface HomepagePage extends Record<string, unknown> {
    posts: PostListItem[];
    pagination: HomepagePagination;
}

export function homepagePagePath(page: number): string {
    return page === 1 ? '/' : `/page/${page}`;
}

export function homepagePageHref(page: number): string {
    return `${homepagePagePath(page)}#posts`;
}

export function homepagePageCount(totalPosts: number, pageSize = HOME_POSTS_PER_PAGE): number {
    if (!Number.isInteger(pageSize) || pageSize <= 0) {
        throw new RangeError('Homepage page size must be a positive integer.');
    }
    return Math.max(1, Math.ceil(Math.max(0, totalPosts) / pageSize));
}

export function createHomepagePage(
    posts: readonly PostListItem[],
    currentPage: number,
    pageSize = HOME_POSTS_PER_PAGE
): HomepagePage {
    const totalPages = homepagePageCount(posts.length, pageSize);
    if (!Number.isInteger(currentPage) || currentPage < 1 || currentPage > totalPages) {
        throw new RangeError(`Homepage page ${currentPage} is outside the available range 1-${totalPages}.`);
    }

    const start = (currentPage - 1) * pageSize;
    return {
        posts: posts.slice(start, start + pageSize),
        pagination: {
            currentPage,
            totalPages,
            previousHref: currentPage > 1 ? homepagePageHref(currentPage - 1) : null,
            nextHref: currentPage < totalPages ? homepagePageHref(currentPage + 1) : null,
            pages: Array.from({ length: totalPages }, (_, index) => ({
                page: index + 1,
                href: homepagePageHref(index + 1)
            }))
        }
    };
}
