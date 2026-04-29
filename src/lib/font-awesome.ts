import type { SocialLink } from '../types/site';

const FONT_AWESOME_URL = 'https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css';

type SchedulerDeps = {
    document?: DocumentLike;
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void;
    setTimeout?: typeof setTimeout;
    clearTimeout?: typeof clearTimeout;
};

type DocumentLike = {
    head: {
        appendChild: (node: unknown) => void;
    };
    createElement: (tagName: string) => Record<string, unknown>;
};

export function hasConfiguredIcons(links: Array<Record<string, unknown> & { icon?: SocialLink['icon'] }>) {
    return links.some((link) => typeof link.icon === 'string' && link.icon.trim().length > 0);
}

export function appendStylesheet(url: string, deps: SchedulerDeps = {}) {
    const documentRef = deps.document ?? document;
    const setTimeoutRef = deps.setTimeout ?? setTimeout;
    const clearTimeoutRef = deps.clearTimeout ?? clearTimeout;
    const link = documentRef.createElement('link') as Record<string, unknown> & {
        rel?: string;
        href?: string;
        crossOrigin?: string;
        onload?: () => void;
        onerror?: () => void;
        parentNode?: { removeChild: (node: unknown) => void };
    };

    link.rel = 'stylesheet';
    link.href = url;
    link.crossOrigin = 'anonymous';

    const timeout = setTimeoutRef(() => {
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    }, 5000);

    link.onload = () => {
        clearTimeoutRef(timeout);
    };
    link.onerror = () => {
        clearTimeoutRef(timeout);
        if (link.parentNode) {
            link.parentNode.removeChild(link);
        }
    };

    documentRef.head.appendChild(link as unknown as Node);

    return link;
}

export function scheduleFontAwesomeLoad(
    links: Array<Record<string, unknown> & { icon?: SocialLink['icon'] }>,
    deps: SchedulerDeps = {}
) {
    if (!hasConfiguredIcons(links)) {
        return false;
    }

    const schedule = deps.requestIdleCallback
        ? (task: () => void) => deps.requestIdleCallback?.(task, { timeout: 1500 })
        : (task: () => void) => (deps.setTimeout ?? setTimeout)(task, 1);

    schedule(() => {
        appendStylesheet(FONT_AWESOME_URL, deps);
    });

    return true;
}
