export function enableContentProtection(enabled: boolean) {
    if (!enabled) {
        return () => undefined;
    }

    document.body.classList.add('no-copy');

    const reapplyNoCopy = () => {
        document.body.classList.add('no-copy');
    };
    document.addEventListener('astro:after-swap', reapplyNoCopy);

    const isEditableTarget = (target: EventTarget | null) => {
        const element = target as HTMLElement | null;
        if (!element) return false;
        const tagName = element.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName)) return true;
        return element.isContentEditable;
    };
    const isInteractiveTarget = (target: EventTarget | null) => {
        const element = target as HTMLElement | null;
        if (!element) return false;
        const tagName = element.tagName;
        if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'LABEL'].includes(tagName)) return true;
        if (element.isContentEditable) return true;
        return !!element.closest('a, button, [role="button"], label');
    };

    const preventDefault = (event: Event) => {
        if (isEditableTarget(event.target)) return;
        event.preventDefault();
    };
    const mouseDownHandler = (event: Event) => {
        if (isInteractiveTarget(event.target)) return;
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
        document.removeEventListener('astro:after-swap', reapplyNoCopy);
        document.removeEventListener('selectstart', preventDefault);
        document.removeEventListener('contextmenu', preventDefault);
        document.removeEventListener('copy', preventDefault);
        document.removeEventListener('cut', preventDefault);
        document.removeEventListener('dragstart', preventDefault);
        document.removeEventListener('mousedown', mouseDownHandler);
    };
}

export function initScrollAnimations(delay: number, offset: number) {
    const targets = document.querySelectorAll('.social-link, .avatar-box, .name, .status-bar');

    targets.forEach((target, index) => {
        const element = target as HTMLElement;
        element.classList.add('scroll-reveal');
        element.style.transitionDelay = `${index * delay}ms`;
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const target = entry.target as HTMLElement;
                    target.classList.add('scroll-reveal--visible');

                    const cleanup = () => {
                        clearTimeout(fallbackId);
                        target.removeEventListener('transitionend', onTransitionEnd);
                        target.classList.remove('scroll-reveal');
                        target.style.transitionDelay = '';
                    };

                    const onTransitionEnd = (e: TransitionEvent) => {
                        if (e.propertyName === 'transform') {
                            cleanup();
                        }
                    };
                    const fallbackId = setTimeout(cleanup, 800);
                    target.addEventListener('transitionend', onTransitionEnd);

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
    let frame: number | null = null;

    const applyScrollState = () => {
        frame = null;
        if (!isMobile) {
            return;
        }

        if (container.scrollTop > 50) {
            avatarBox.classList.add('scrolled');
        } else {
            avatarBox.classList.remove('scrolled');
        }
    };

    // Coalesce to one pass per animation frame (scrollTop is a layout read).
    const handleScroll = () => {
        if (frame !== null) return;
        frame = window.requestAnimationFrame(applyScrollState);
    };

    const handleResize = () => {
        isMobile = window.matchMedia('(max-width: 900px)').matches;

        if (!isMobile) {
            avatarBox.classList.remove('scrolled');
        }
    };

    container.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        if (frame !== null) {
            cancelAnimationFrame(frame);
            frame = null;
        }
    };
}
