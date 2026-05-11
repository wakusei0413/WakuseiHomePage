const HOMEPAGE_SCROLLER_SELECTOR = '.page-scroller';

export function isHomePageDocument(root: ParentNode = document) {
    return root.querySelector(HOMEPAGE_SCROLLER_SELECTOR) !== null;
}

export function subscribeHomePageStateChange(onChange: (isHomePage: boolean) => void) {
    const notify = () => onChange(isHomePageDocument());

    notify();
    window.addEventListener('wakusei:homepage-mounted', notify);
    document.addEventListener('astro:after-swap', notify);

    return () => {
        window.removeEventListener('wakusei:homepage-mounted', notify);
        document.removeEventListener('astro:after-swap', notify);
    };
}
