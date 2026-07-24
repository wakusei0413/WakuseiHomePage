import { createHomepagePage, homepagePageCount, homepagePageHref, homepagePagePath } from '../src/lib/home-pagination';
import type { PostListItem } from '../src/lib/post-model';

function createPost(index: number): PostListItem {
    return {
        slug: `post-${index}`,
        data: {
            title: `Post ${index}`,
            description: `Description ${index}`
        },
        dateLabel: null,
        wordCount: index
    };
}

describe('homepage pagination', () => {
    const posts = Array.from({ length: 13 }, (_, index) => createPost(index + 1));

    it('splits 13 posts into stable 6, 6 and 1 item pages', () => {
        const first = createHomepagePage(posts, 1);
        const second = createHomepagePage(posts, 2);
        const third = createHomepagePage(posts, 3);

        expect(first.posts.map((post) => post.slug)).toEqual(posts.slice(0, 6).map((post) => post.slug));
        expect(second.posts.map((post) => post.slug)).toEqual(posts.slice(6, 12).map((post) => post.slug));
        expect(third.posts.map((post) => post.slug)).toEqual(['post-13']);
        expect(first.pagination.totalPages).toBe(3);
    });

    it('normalizes page one to the homepage and adds the posts hash to navigation links', () => {
        expect(homepagePagePath(1)).toBe('/');
        expect(homepagePagePath(2)).toBe('/page/2');
        expect(homepagePageHref(1)).toBe('/#posts');
        expect(homepagePageHref(2)).toBe('/page/2#posts');
    });

    it('sets previous and next links at page boundaries', () => {
        expect(createHomepagePage(posts, 1).pagination.previousHref).toBeNull();
        expect(createHomepagePage(posts, 1).pagination.nextHref).toBe('/page/2#posts');
        expect(createHomepagePage(posts, 2).pagination.previousHref).toBe('/#posts');
        expect(createHomepagePage(posts, 3).pagination.nextHref).toBeNull();
    });

    it('keeps short and empty collections on a single page', () => {
        expect(homepagePageCount(4)).toBe(1);
        expect(createHomepagePage(posts.slice(0, 4), 1).pagination.totalPages).toBe(1);
        expect(createHomepagePage([], 1)).toEqual({
            posts: [],
            pagination: {
                currentPage: 1,
                totalPages: 1,
                previousHref: null,
                nextHref: null,
                pages: [{ page: 1, href: '/#posts' }]
            }
        });
    });

    it('rejects invalid sizes and unavailable pages', () => {
        expect(() => homepagePageCount(3, 0)).toThrow(RangeError);
        expect(() => createHomepagePage(posts, 4)).toThrow(RangeError);
    });
});
