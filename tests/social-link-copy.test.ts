import { describe, expect, it } from 'vitest';
import { isCopyLink, resolveCopyUrl } from '../src/lib/social-link';
import type { SocialLink } from '../src/types/site';

const base: SocialLink = { name: 'GitHub', url: 'https://github.com/wakusei0413' };

describe('social link copy behaviour', () => {
    it('treats only an explicit copy flag as a copy link', () => {
        expect(isCopyLink({ ...base, copy: true })).toBe(true);
        expect(isCopyLink(base)).toBe(false);
        expect(isCopyLink({ ...base, copy: false })).toBe(false);
    });

    it('resolves a relative feed path against the configured site origin', () => {
        expect(resolveCopyUrl('/rss.xml', 'https://www.wakusei.top')).toBe('https://www.wakusei.top/rss.xml');
    });

    it('normalises a trailing slash on the origin instead of doubling it', () => {
        expect(resolveCopyUrl('/rss.xml', 'https://www.wakusei.top/')).toBe('https://www.wakusei.top/rss.xml');
    });

    it('leaves an already absolute url alone', () => {
        const absolute = 'https://example.com/feed.xml';
        expect(resolveCopyUrl(absolute, 'https://www.wakusei.top')).toBe(absolute);
    });

    it('falls back to the raw value when the origin cannot be parsed', () => {
        // 宁可复制一个相对地址，也不要因为一个坏 origin 把点击变成异常。
        expect(resolveCopyUrl('/rss.xml', 'not a url')).toBe('/rss.xml');
    });
});
