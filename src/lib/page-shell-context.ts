import type { PageShellState, ShellMode } from '../stores/page-shell';

export const PAGE_SHELL_CHANGE_EVENT = 'wakusei:shell-page-change';

function isShellMode(value: string | undefined): value is ShellMode {
    return value === 'home' || value === 'blog' || value === 'article' || value === 'error';
}

function normalizePageShellState(value: unknown): PageShellState | null {
    if (!value || typeof value !== 'object') {
        return null;
    }

    const detail = value as Record<string, unknown>;
    const mode = typeof detail.mode === 'string' && isShellMode(detail.mode) ? detail.mode : 'error';

    return {
        title: typeof detail.title === 'string' ? detail.title : '',
        mode,
        isHomePage: detail.isHomePage === true
    };
}

export function getPageShellStateFromElement(el: HTMLElement | null): PageShellState {
    if (!el) {
        return { title: '', mode: 'error', isHomePage: false };
    }

    const mode = isShellMode(el.dataset.shellMode) ? el.dataset.shellMode : 'error';
    const isHomePage = el.dataset.isHome === 'true';

    return {
        title: el.dataset.pageTitle ?? '',
        mode,
        isHomePage
    };
}

export function getPageShellStateFromDocument(root: Document = document): PageShellState {
    return getPageShellStateFromElement(root.getElementById('pageTransitionSurface'));
}

export function dispatchPageShellStateChange(next: PageShellState) {
    window.dispatchEvent(new CustomEvent<PageShellState>(PAGE_SHELL_CHANGE_EVENT, { detail: next }));
}

export function subscribePageShellStateChange(callback: (state: PageShellState) => void) {
    const handler = (event: Event) => {
        if (!(event instanceof CustomEvent)) {
            return;
        }

        const state = normalizePageShellState(event.detail);
        if (!state) {
            return;
        }

        callback(state);
    };
    window.addEventListener(PAGE_SHELL_CHANGE_EVENT, handler);
    return () => window.removeEventListener(PAGE_SHELL_CHANGE_EVENT, handler);
}
