import { createSignal, onCleanup, onMount } from 'solid-js';

import { siteConfig } from '../data/site';
import { createI18n } from '../lib/i18n';
import { Footer } from './Footer';
import { MobileDockSidebar } from './MobileDockSidebar';
import { TopBar } from './TopBar';

export function SiteShell(props: { initialIsHomePage: boolean }) {
    const i18n = createI18n(siteConfig.i18n);
    const [isHomePage, setIsHomePage] = createSignal(props.initialIsHomePage);

    function checkHomePage() {
        setIsHomePage(document.querySelector('.page-scroller') !== null);
    }

    onMount(() => {
        checkHomePage();
        window.addEventListener('wakusei:homepage-mounted', checkHomePage);
        onCleanup(() => window.removeEventListener('wakusei:homepage-mounted', checkHomePage));
    });

    return (
        <>
            <div class="noise-overlay"></div>
            <TopBar config={siteConfig} i18n={i18n} initialIsHomePage={props.initialIsHomePage} />
            {!isHomePage() && (
                <Footer
                    links={siteConfig.footer.links}
                    socialLinks={siteConfig.socialLinks.links}
                    copyrightText={siteConfig.footer.text}
                />
            )}
            <MobileDockSidebar config={siteConfig} i18n={i18n} />
        </>
    );
}
