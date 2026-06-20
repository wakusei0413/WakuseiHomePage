import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    PAGE_SHELL_CHANGE_EVENT,
    getPageShellStateFromDocument,
    getPageShellStateFromElement,
    subscribePageShellStateChange
} from '../src/lib/page-shell-context';

describe('page shell context helpers', () => {
    afterEach(() => {
        document.body.innerHTML = '';
        document.documentElement.className = '';
    });

    it('reads shell page data attributes from an element', () => {
        const el = document.createElement('div');
        el.dataset.shellMode = 'blog';
        el.dataset.pageTitle = '博客';
        el.dataset.isHome = 'false';

        expect(getPageShellStateFromElement(el)).toEqual({
            title: '博客',
            mode: 'blog',
            isHomePage: false
        });
    });

    it('reads article mode from an element', () => {
        const el = document.createElement('div');
        el.dataset.shellMode = 'article';
        el.dataset.pageTitle = 'Hello World';
        el.dataset.isHome = 'false';

        expect(getPageShellStateFromElement(el)).toEqual({
            title: 'Hello World',
            mode: 'article',
            isHomePage: false
        });
    });

    it('reads error mode from an element', () => {
        const el = document.createElement('div');
        el.dataset.shellMode = 'error';
        el.dataset.pageTitle = 'Not Found';
        el.dataset.isHome = 'false';

        expect(getPageShellStateFromElement(el)).toEqual({
            title: 'Not Found',
            mode: 'error',
            isHomePage: false
        });
    });

    it('falls back to error mode when carrier is missing', () => {
        expect(getPageShellStateFromDocument(document)).toEqual({
            title: '',
            mode: 'error',
            isHomePage: false
        });
    });

    it('reads the pageTransitionSurface carrier from a document', () => {
        document.body.innerHTML = `
            <div id="pageTransitionSurface" data-shell-mode="home" data-page-title="遊星 Wakusei" data-is-home="true"></div>
        `;

        expect(getPageShellStateFromDocument(document)).toEqual({
            title: '遊星 Wakusei',
            mode: 'home',
            isHomePage: true
        });
    });

    it('subscribes to shell page change events', () => {
        const callback = vi.fn();
        const cleanup = subscribePageShellStateChange(callback);
        window.dispatchEvent(
            new CustomEvent(PAGE_SHELL_CHANGE_EVENT, {
                detail: { title: '博客', mode: 'blog', isHomePage: false }
            })
        );
        expect(callback).toHaveBeenCalledWith({ title: '博客', mode: 'blog', isHomePage: false });
        cleanup();
        window.dispatchEvent(
            new CustomEvent(PAGE_SHELL_CHANGE_EVENT, {
                detail: { title: '文章', mode: 'blog', isHomePage: false }
            })
        );
        expect(callback).toHaveBeenCalledTimes(1);
    });

    it('ignores malformed shell page change events', () => {
        const callback = vi.fn();
        const cleanup = subscribePageShellStateChange(callback);
        window.dispatchEvent(new Event(PAGE_SHELL_CHANGE_EVENT));
        window.dispatchEvent(new CustomEvent(PAGE_SHELL_CHANGE_EVENT));
        window.dispatchEvent(new CustomEvent(PAGE_SHELL_CHANGE_EVENT, { detail: null }));
        window.dispatchEvent(new CustomEvent(PAGE_SHELL_CHANGE_EVENT, { detail: 'blog' }));
        cleanup();

        expect(callback).not.toHaveBeenCalled();
    });

    it('normalizes shell page change event details before invoking the callback', () => {
        const callback = vi.fn();
        const cleanup = subscribePageShellStateChange(callback);
        window.dispatchEvent(
            new CustomEvent(PAGE_SHELL_CHANGE_EVENT, {
                detail: { title: 123, mode: 'invalid', isHomePage: 'true' }
            })
        );
        cleanup();

        expect(callback).toHaveBeenCalledWith({ title: '', mode: 'error', isHomePage: false });
    });
});
