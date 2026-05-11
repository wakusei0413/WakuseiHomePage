import { defineStore } from 'pinia';
import { ref } from 'vue';

const HOMEPAGE_SCROLLER_SELECTOR = '.page-scroller';

export const useHomepageStore = defineStore('homepage', () => {
    const isReady = ref(false);
    const isHomePage = ref(false);

    function isHomePageDocument(root: ParentNode = document) {
        return root.querySelector(HOMEPAGE_SCROLLER_SELECTOR) !== null;
    }

    function setReady() {
        isReady.value = true;
        window.dispatchEvent(new CustomEvent('wakusei:homepage-ready'));
    }

    function checkHomePage() {
        isHomePage.value = isHomePageDocument();
    }

    function subscribeStateChange(callback: (isHome: boolean) => void) {
        const notify = () => {
            isHomePage.value = isHomePageDocument();
            callback(isHomePage.value);
        };

        notify();
        window.addEventListener('wakusei:homepage-mounted', notify);
        document.addEventListener('astro:after-swap', notify);

        return () => {
            window.removeEventListener('wakusei:homepage-mounted', notify);
            document.removeEventListener('astro:after-swap', notify);
        };
    }

    return { isReady, isHomePage, setReady, checkHomePage, subscribeStateChange };
});
