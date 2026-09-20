import type { DockDisplayConfig, DockItem } from '../types/site';

interface DockActiveContext {
    isDark: boolean;
    activePanel: string | null;
}

export function resolveDockLabel(display: DockDisplayConfig, translate: (key: string) => string) {
    if (display.i18nKey) {
        return translate(display.i18nKey);
    }
    if (display.text) {
        return display.text;
    }
    return '';
}

export function resolveDockIcon(display: DockDisplayConfig, active: boolean) {
    return active && display.iconActive ? display.iconActive : display.icon;
}

export function getDockItemActiveState(item: DockItem, context: DockActiveContext) {
    if (item.type === 'action' && item.action === 'toggleTheme') {
        return context.isDark;
    }
    if (item.type === 'panel') {
        return context.activePanel === item.panel;
    }
    return false;
}

export function isDockLinkDisabled(href: string) {
    return href === '#';
}
