/**
 * 代码块复制按钮 —— 挂在每个 pre.astro-code 上
 * 监听 astro:page-load，确保 view transitions 切页后重新装饰
 */

import { copyText } from '../lib/clipboard';

const DONE_LABEL = '已复制';
const DONE_DURATION = 1600;

function attachButton(pre: HTMLPreElement): void {
    if (pre.dataset.copyReady === '1') return;
    pre.dataset.copyReady = '1';

    // 把 pre 包进 .code-block 定位容器，让按钮固定在容器右上、不随 pre 横向滚动消失
    const wrapper = document.createElement('div');
    wrapper.className = 'code-block';
    pre.parentNode?.insertBefore(wrapper, pre);
    wrapper.appendChild(pre);

    const code = pre.querySelector('code');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy';
    button.setAttribute('aria-label', '复制代码');
    button.textContent = '复制';

    button.addEventListener('click', async () => {
        const text = code?.innerText ?? pre.innerText;
        const ok = await copyText(text);
        if (!ok) return;
        button.textContent = DONE_LABEL;
        button.classList.add('code-copy--done');
        window.setTimeout(() => {
            button.textContent = '复制';
            button.classList.remove('code-copy--done');
        }, DONE_DURATION);
    });

    wrapper.appendChild(button);
}

function enhanceCodeBlocks(root: ParentNode): void {
    root.querySelectorAll<HTMLPreElement>('pre.astro-code').forEach(attachButton);
}

enhanceCodeBlocks(document.body);
document.addEventListener('astro:page-load', () => enhanceCodeBlocks(document.body));
