import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { siteConfig } from '../data/site';

export type ShellMode = 'home' | 'blog' | 'article' | 'error';

export interface PageShellState {
    title: string;
    mode: ShellMode;
    isHomePage: boolean;
}

export const usePageShellStore = defineStore('page-shell', () => {
    const title = ref(siteConfig.profile.name);
    const mode = ref<ShellMode>('home');
    const isHomePage = ref(true);
    const scrollProgress = ref(0);
    const scrollDirection = ref<'up' | 'down'>('up');

    const leftPanelKey = computed(() => `${mode.value}:${title.value}`);

    function enterPage(next: PageShellState) {
        title.value = next.title;
        mode.value = next.mode;
        isHomePage.value = next.isHomePage;
    }

    function setScrollProgress(value: number) {
        if (!Number.isFinite(value)) {
            scrollProgress.value = 0;
            return;
        }

        scrollProgress.value = Math.max(0, Math.min(1, value));
    }

    function resetScrollProgress() {
        scrollProgress.value = 0;
    }

    function setScrollDirection(value: 'up' | 'down') {
        scrollDirection.value = value;
    }

    return {
        title,
        mode,
        isHomePage,
        scrollProgress,
        scrollDirection,
        leftPanelKey,
        enterPage,
        setScrollProgress,
        setScrollDirection,
        resetScrollProgress
    };
});
