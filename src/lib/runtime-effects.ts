export function enableContentProtection(enabled: boolean) {
    if (!enabled) {
        return () => undefined;
    }

    document.body.classList.add('no-copy');
    const preventDefault = (event: Event) => event.preventDefault();
    const mouseDownHandler = (event: Event) => {
        const target = event.target as HTMLElement | null;
        const tagName = target?.tagName;

        if (tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) {
            return;
        }

        event.preventDefault();
    };

    document.addEventListener('selectstart', preventDefault);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('cut', preventDefault);
    document.addEventListener('dragstart', preventDefault);
    document.addEventListener('mousedown', mouseDownHandler);

    return () => {
        document.body.classList.remove('no-copy');
        document.removeEventListener('selectstart', preventDefault);
        document.removeEventListener('contextmenu', preventDefault);
        document.removeEventListener('copy', preventDefault);
        document.removeEventListener('cut', preventDefault);
        document.removeEventListener('dragstart', preventDefault);
        document.removeEventListener('mousedown', mouseDownHandler);
    };
}

export function initScrollAnimations(delay: number, offset: number) {
    const targets = document.querySelectorAll('.social-link, .info-panel, .avatar-box, .name, .status-bar');

    targets.forEach((target, index) => {
        const element = target as HTMLElement;
        element.classList.add('scroll-reveal');
        element.style.transitionDelay = `${index * delay}ms`;
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('scroll-reveal--visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            root: null,
            rootMargin: `0px 0px -${offset}px 0px`,
            threshold: 0.1
        }
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
}

export function initMobileStickyAvatar(container: HTMLElement, avatarBox: HTMLElement) {
    let isMobile = window.matchMedia('(max-width: 900px)').matches;

    const handleScroll = () => {
        if (!isMobile) {
            return;
        }

        if (container.scrollTop > 50) {
            avatarBox.classList.add('scrolled');
        } else {
            avatarBox.classList.remove('scrolled');
        }
    };

    const handleClick = () => {
        if (!isMobile || container.scrollTop <= 50) {
            return;
        }

        container.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleResize = () => {
        isMobile = window.matchMedia('(max-width: 900px)').matches;

        if (!isMobile) {
            avatarBox.classList.remove('scrolled');
        }
    };

    container.addEventListener('scroll', handleScroll);
    avatarBox.addEventListener('click', handleClick);
    window.addEventListener('resize', handleResize);

    return () => {
        container.removeEventListener('scroll', handleScroll);
        avatarBox.removeEventListener('click', handleClick);
        window.removeEventListener('resize', handleResize);
    };
}
