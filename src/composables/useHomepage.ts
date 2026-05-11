import { useHomepageStore } from '../stores/homepage';

export function useHomepage() {
    const store = useHomepageStore();
    return {
        isReady: store.isReady,
        isHomePage: store.isHomePage,
        setReady: () => store.setReady(),
        checkHomePage: () => store.checkHomePage(),
        subscribeStateChange: (cb: (isHome: boolean) => void) => store.subscribeStateChange(cb)
    };
}
