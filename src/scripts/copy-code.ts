/** 代码块复制按钮：由 article-runtime 在空闲阶段装饰。 */

import { copyText } from '../lib/clipboard';

const DONE_LABEL = '已复制';
const DONE_DURATION = 1600;

let activeRoot: HTMLElement | null = null;
let listenerController: AbortController | null = null;
const feedbackTimers = new Map<HTMLButtonElement, number>();

function attachButton(pre: HTMLPreElement): void {
    if (pre.dataset.copyReady === '1') return;
    pre.dataset.copyReady = '1';

    // 把 pre 包进 .code-block 定位容器，让按钮固定在容器右上、不随 pre 横向滚动消失
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.setAttribute('aria-label', '复制代码');
    button.textContent = '复制';

    wrapper.appendChild(button);
}

function resetButton(button: HTMLButtonElement): void {
    button.textContent = '复制';
    button.classList.remove('code-copy--done');
}

async function onCopyClick(event: MouseEvent): Promise<void> {
    const target = event.target;
    if (!(target instanceof Element) || !activeRoot) return;

    const button = target.closest<HTMLButtonElement>('.code-copy');
    if (!button || !activeRoot.contains(button)) return;

    const pre = button.closest('.code-block')?.querySelector<HTMLPreElement>('pre.astro-code');
    if (!pre) return;

    const code = pre.querySelector('code');
    const ok = await copyText(code?.innerText ?? pre.innerText);
    if (!ok || !button.isConnected) return;

    const previousTimer = feedbackTimers.get(button);
    if (previousTimer !== undefined) window.clearTimeout(previousTimer);
    button.textContent = DONE_LABEL;
    button.classList.add('code-copy--done');
    feedbackTimers.set(
        button,
        window.setTimeout(() => {
            feedbackTimers.delete(button);
            resetButton(button);
        }, DONE_DURATION)
    );
}

export function teardownCodeBlocks(): void {
    listenerController?.abort();
    listenerController = null;
    activeRoot = null;
    feedbackTimers.forEach((timer, button) => {
        window.clearTimeout(timer);
        resetButton(button);
    });
    feedbackTimers.clear();
}

export function enhanceCodeBlocks(root: HTMLElement): void {
    if (activeRoot === root && listenerController) return;

    teardownCodeBlocks();
    activeRoot = root;
    listenerController = new AbortController();
    root.querySelectorAll<HTMLPreElement>('pre.astro-code').forEach(attachButton);
    root.addEventListener('click', onCopyClick, { signal: listenerController.signal });
}
