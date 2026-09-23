import { editableSiteConfig } from '../src/data/customize';
import { siteConfig } from '../src/data/site';
import { parseSiteConfig } from '../src/data/schema';

describe('site config schema', () => {
    it('accepts the current site config', () => {
        const parsed = parseSiteConfig(siteConfig);

        expect(parsed.profile.name).toBe(editableSiteConfig.profile.name);
        expect(parsed.socialLinks.links.length > 0).toBeTruthy();
        expect(parsed.github.username).toBe(editableSiteConfig.github.username);
        expect(parsed.slogans.list.length > 0).toBeTruthy();
        expect(parsed.wallpaper.apis.length > 0).toBeTruthy();
    });

    it('accepts the editable config entrypoint', () => {
        const parsed = parseSiteConfig(editableSiteConfig);

        expect(parsed.profile.name).toBe(editableSiteConfig.profile.name);
        expect(parsed.socialLinks.links).toEqual(editableSiteConfig.socialLinks.links);
        expect(parsed.github).toEqual(editableSiteConfig.github);
        expect(parsed.slogans.list).toEqual(editableSiteConfig.slogans.list);
        expect(parsed.wallpaper.apis).toEqual(editableSiteConfig.wallpaper.apis);
    });

    it('rejects invalid time format values', () => {
        expect(() =>
            parseSiteConfig({
                ...siteConfig,
                time: {
                    ...siteConfig.time,
                    format: '25h'
                }
            })
        ).toThrow(/time/i);
    });

    it('rejects empty social link names', () => {
        expect(() =>
            parseSiteConfig({
                ...siteConfig,
                socialLinks: {
                    ...siteConfig.socialLinks,
                    links: [
                        {
                            ...siteConfig.socialLinks.links[0],
                            name: ''
                        }
                    ]
                }
            })
        ).toThrow(/socialLinks/i);
    });

    it('ships an RSS copy link that points at the generated feed', () => {
        const rss = editableSiteConfig.socialLinks.links.find((link) => link.copy === true);

        expect(rss, 'expected a copy:true social link').toBeDefined();
        // 端点由 src/pages/rss.xml.ts 生成，scripts/check-dist.mjs 校验其存在。
        expect(rss!.url).toBe('/rss.xml');
        expect(rss!.icon).toBeTruthy();
    });

    it('fills one social page so no placeholder cell is left over', () => {
        // SocialLinks 每页 6 张（3 列 × 2 行）；凑满 6 条即不再渲染占位格。
        expect(editableSiteConfig.socialLinks.links).toHaveLength(6);
    });
});
