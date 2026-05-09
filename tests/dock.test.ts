import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../src/lib/dock';
import type { DockItem } from '../src/types/site';

describe('dock helpers', () => {
    it('resolves translated labels before literal text', () => {
        const translate = (key: string) => (key === 'dock.theme' ? 'Theme' : key);

        assert.equal(resolveDockLabel({ icon: 'moon', i18nKey: 'dock.theme', text: 'Fallback' }, translate), 'Theme');
        assert.equal(resolveDockLabel({ icon: 'moon', text: 'Literal' }, translate), 'Literal');
        assert.equal(resolveDockLabel({ icon: 'moon' }, translate), '');
    });

    it('uses active icon only when item is active and an active icon exists', () => {
        assert.equal(resolveDockIcon({ icon: 'moon', iconActive: 'sun' }, true), 'sun');
        assert.equal(resolveDockIcon({ icon: 'moon', iconActive: 'sun' }, false), 'moon');
        assert.equal(resolveDockIcon({ icon: 'globe' }, true), 'globe');
    });

    it('marks built-in theme action and active panels as active', () => {
        const themeItem: DockItem = { type: 'action', action: 'toggleTheme', display: { icon: 'moon' } };
        const languageItem: DockItem = { type: 'panel', panel: 'language', display: { icon: 'globe' } };
        const linkItem: DockItem = { type: 'link', href: '/settings', display: { icon: 'gear' } };

        assert.equal(getDockItemActiveState(themeItem, { isDark: true, activePanel: null }), true);
        assert.equal(getDockItemActiveState(themeItem, { isDark: false, activePanel: null }), false);
        assert.equal(getDockItemActiveState(languageItem, { isDark: false, activePanel: 'language' }), true);
        assert.equal(getDockItemActiveState(languageItem, { isDark: false, activePanel: null }), false);
        assert.equal(getDockItemActiveState(linkItem, { isDark: true, activePanel: 'language' }), false);
    });

    it('treats hash-only links as disabled placeholders', () => {
        assert.equal(isDockLinkDisabled('#'), true);
        assert.equal(isDockLinkDisabled('/settings'), false);
    });
});
