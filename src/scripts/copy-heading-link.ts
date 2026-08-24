/** 标题复制深链：由 article-runtime 在空闲阶段装饰。 */

import { copyText } from '../lib/clipboard';

const DONE_DURATION = 1600;
const BUTTON_CLASS = 'heading-copy';

const LINK_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7C4.24 7 2 9.24 2 12s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';

const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

let activeRoot: HTMLElement | null = null;
let listenerController: AbortController | null = null;
const feedbackTimers = new Map<HTMLButtonElement, number>();

function buildUrl(id: string): string {
    return window.location.origin + window.location.pathname + '#' + id;
}

function attachButton(heading: HTMLElement): void {
    if (heading.dataset.copyReady === '1' || !heading.id) return;
    heading.dataset.copyReady = '1';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.setAttribute('aria-label', '复制本节链接');
    button.innerHTML = LINK_ICON;
    heading.appendChild(button);
}

function resetButton(button: HTMLButtonElement): void {
    button.innerHTML = LINK_ICON;
    button.classList.remove(BUTTON_CLASS + '--done');
}

async function onCopyClick(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element) || !activeRoot) return;

    const button = target.closest<HTMLButtonElement>('.' + BUTTON_CLASS);
    if (!button || !activeRoot.contains(button)) return;

    const heading = button.closest<HTMLElement>(':is(h2,h3,h4,h5)[id]');
    if (!heading) return;

    event.preventDefault();
    const ok = await copyText(buildUrl(heading.id));
    if (!ok || !button.isConnected) return;

    const previousTimer = feedbackTimers.get(button);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    button.innerHTML = CHECK_ICON;
    button.classList.add(BUTTON_CLASS + '--done');
    feedbackTimers.set(
        button,
        window.setTimeout(() => {
            feedbackTimers.delete(button);
            resetButton(button);
        }, DONE_DURATION)
    );
}

export function teardownHeadingLinks(): void {
    listenerController?.abort();
    listenerController = null;
    activeRoot = null;
    feedbackTimers.forEach((timer, button) => {
        window.clearTimeout(timer);
        resetButton(button);
    });
    feedbackTimers.clear();
}

export function enhanceHeadingLinks(root: HTMLElement): void {
    if (activeRoot === root && listenerController) return;

    teardownHeadingLinks();
    activeRoot = root;
    listenerController = new AbortController();
    root.querySelectorAll<HTMLElement>(':is(h2,h3,h4,h5)[id]').forEach(attachButton);
    root.addEventListener('click', onCopyClick, { signal: listenerController.signal });
}
