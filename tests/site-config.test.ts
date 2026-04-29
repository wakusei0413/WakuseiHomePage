import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { editableSiteConfig } from '../src/data/customize';
import { siteConfig } from '../src/data/site';
import { parseSiteConfig } from '../src/data/schema';

describe('site config schema', () => {
    it('accepts the current site config', () => {
        const parsed = parseSiteConfig(siteConfig);

        assert.strictEqual(parsed.profile.name, editableSiteConfig.profile.name);
        assert.ok(parsed.socialLinks.links.length > 0);
        assert.ok(parsed.slogans.list.length > 0);
        assert.ok(parsed.wallpaper.apis.length > 0);
    });

    it('accepts the editable config entrypoint', () => {
        const parsed = parseSiteConfig(editableSiteConfig);

        assert.strictEqual(parsed.profile.name, editableSiteConfig.profile.name);
        assert.deepStrictEqual(parsed.socialLinks.links, editableSiteConfig.socialLinks.links);
        assert.deepStrictEqual(parsed.slogans.list, editableSiteConfig.slogans.list);
        assert.deepStrictEqual(parsed.wallpaper.apis, editableSiteConfig.wallpaper.apis);
    });

    it('rejects invalid time format values', () => {
        assert.throws(
            () =>
                parseSiteConfig({
                    ...siteConfig,
                    time: {
                        ...siteConfig.time,
                        format: '25h'
                    }
                }),
            /time/i
        );
    });

    it('rejects empty social link names', () => {
        assert.throws(
            () =>
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
                }),
            /socialLinks/i
        );
    });
});
