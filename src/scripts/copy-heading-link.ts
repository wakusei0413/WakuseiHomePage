/**
 * 标题复制深链 —— 给文章正文每个带 id 的标题挂一个"复制链接"按钮，hover 标题
 * 时显示。点击把 当前页 + #id 写入剪贴板，短暂提示"已复制"。监听
 * astro:page-load，view transitions 切页后重新装饰。
 */

const DONE_DURATION = 1600;
const BUTTON_CLASS = 'heading-copy';

const LINK_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7C4.24 7 2 9.24 2 12s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';

const CHECK_ICON =
    '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false">' +
    '<path fill="currentColor" d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';

function fallbackCopy(text: string): boolean {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
        ok = document.execCommand('copy');
    } catch {
        /* ok stays false */
    }
    document.body.removeChild(ta);
    return ok;
}

async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        /* fall through */
    }
    return fallbackCopy(text);
}

function buildUrl(id: string): string {
    return window.location.origin + window.location.pathname + '#' + id;
}

function attach(heading: HTMLElement): void {
    if (heading.dataset.copyReady === '1') return;
    const id = heading.id;
    if (!id) return;
    heading.dataset.copyReady = '1';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = BUTTON_CLASS;
    btn.setAttribute('aria-label', '复制本节链接');
    btn.innerHTML = LINK_ICON;

    btn.addEventListener('click', async (e: MouseEvent) => {
        e.preventDefault();
        const ok = await copyText(buildUrl(id));
        if (!ok) return;
        btn.innerHTML = CHECK_ICON;
        btn.classList.add(BUTTON_CLASS + '--done');
        window.setTimeout(() => {
            btn.innerHTML = LINK_ICON;
            btn.classList.remove(BUTTON_CLASS + '--done');
        }, DONE_DURATION);
    });

    heading.appendChild(btn);
}

function enhance(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>('.post-body :is(h2,h3,h4,h5)[id]').forEach(attach);
}

enhance(document.body);
document.addEventListener('astro:page-load', () => enhance(document.body));

export {};
