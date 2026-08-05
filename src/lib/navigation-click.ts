export function isPlainPrimaryClick(event: MouseEvent): boolean {
    return (
        event.button === 0 &&
        !event.defaultPrevented &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.shiftKey &&
        !event.altKey
    );
}

export function isExternalHref(href: string): boolean {
    return /^(?:[a-z][a-z\d+.-]*:)?\/\//i.test(href) || /^(?:mailto|tel):/i.test(href);
}

export function shouldEnhanceAnchorClick(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
    return (
        isPlainPrimaryClick(event) && !anchor.hasAttribute('download') && (!anchor.target || anchor.target === '_self')
    );
}
