import { getDockItemActiveState, isDockLinkDisabled, resolveDockIcon, resolveDockLabel } from '../src/lib/dock';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DockItem } from '../src/types/site';

const iconComponent = readFileSync(join(process.cwd(), 'src', 'components', 'Icon.vue'), 'utf-8');

describe('dock helpers', () => {
    it('resolves translated labels before literal text', () => {
        const translate = (key: string) => (key === 'dock.theme' ? 'Theme' : key);

        expect(resolveDockLabel({ icon: 'moon', i18nKey: 'dock.theme', text: 'Fallback' }, translate)).toBe('Theme');
        expect(resolveDockLabel({ icon: 'moon', text: 'Literal' }, translate)).toBe('Literal');
        expect(resolveDockLabel({ icon: 'moon' }, translate)).toBe('');
    });

    it('uses active icon only when item is active and an active icon exists', () => {
        expect(resolveDockIcon({ icon: 'moon', iconActive: 'sun' }, true)).toBe('sun');
        expect(resolveDockIcon({ icon: 'moon', iconActive: 'sun' }, false)).toBe('moon');
        expect(resolveDockIcon({ icon: 'globe' }, true)).toBe('globe');
    });

    it('marks built-in theme action and active panels as active', () => {
        const themeItem: DockItem = { type: 'action', action: 'toggleTheme', display: { icon: 'moon' } };
        const languageItem: DockItem = { type: 'panel', panel: 'language', display: { icon: 'globe' } };
        const linkItem: DockItem = { type: 'link', href: '/settings', display: { icon: 'gear' } };

        expect(getDockItemActiveState(themeItem, { isDark: true, activePanel: null })).toBe(true);
        expect(getDockItemActiveState(themeItem, { isDark: false, activePanel: null })).toBe(false);
        expect(getDockItemActiveState(languageItem, { isDark: false, activePanel: 'language' })).toBe(true);
        expect(getDockItemActiveState(languageItem, { isDark: false, activePanel: null })).toBe(false);
        expect(getDockItemActiveState(linkItem, { isDark: true, activePanel: 'language' })).toBe(false);
    });

    it('treats hash-only links as disabled placeholders', () => {
        expect(isDockLinkDisabled('#')).toBe(true);
        expect(isDockLinkDisabled('/settings')).toBe(false);
    });

    it('supports the configured blog dock icon', () => {
        expect(iconComponent).toMatch(/newspaper:/);
    });
});
