import { beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { usePageShellStore } from '../src/stores/page-shell';

describe('page shell store', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    it('starts in home shell mode by default', () => {
        const store = usePageShellStore();
        expect(store.title).toBe('遊星 Wakusei');
        expect(store.mode).toBe('home');
        expect(store.isHomePage).toBe(true);
        expect(store.scrollProgress).toBe(0);
    });

    it('enters a blog shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: '博客', mode: 'blog', isHomePage: false });
        expect(store.title).toBe('博客');
        expect(store.mode).toBe('blog');
        expect(store.isHomePage).toBe(false);
    });

    it('enters an article shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: 'Hello World', mode: 'article', isHomePage: false });
        expect(store.title).toBe('Hello World');
        expect(store.mode).toBe('article');
        expect(store.isHomePage).toBe(false);
    });

    it('enters an error shell page', () => {
        const store = usePageShellStore();
        store.enterPage({ title: '404', mode: 'error', isHomePage: false });
        expect(store.title).toBe('404');
        expect(store.mode).toBe('error');
        expect(store.isHomePage).toBe(false);
    });

    it('clamps scroll progress between 0 and 1', () => {
        const store = usePageShellStore();
        store.setScrollProgress(-1);
        expect(store.scrollProgress).toBe(0);
        store.setScrollProgress(0.5);
        expect(store.scrollProgress).toBe(0.5);
        store.setScrollProgress(2);
        expect(store.scrollProgress).toBe(1);
        store.resetScrollProgress();
        expect(store.scrollProgress).toBe(0);
    });
});
