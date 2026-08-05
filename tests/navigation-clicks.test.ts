import { describe, expect, it } from 'vitest';
import { isExternalHref, isPlainPrimaryClick, shouldEnhanceAnchorClick } from '../src/lib/navigation-click';

function click(init: MouseEventInit = {}) {
    return new MouseEvent('click', { button: 0, cancelable: true, ...init });
}

describe('navigation click helpers', () => {
    it('accepts only unmodified primary clicks', () => {
        expect(isPlainPrimaryClick(click())).toBe(true);
        expect(isPlainPrimaryClick(click({ button: 1 }))).toBe(false);
        expect(isPlainPrimaryClick(click({ metaKey: true }))).toBe(false);
        expect(isPlainPrimaryClick(click({ ctrlKey: true }))).toBe(false);
        expect(isPlainPrimaryClick(click({ shiftKey: true }))).toBe(false);
        expect(isPlainPrimaryClick(click({ altKey: true }))).toBe(false);

        const prevented = click();
        prevented.preventDefault();
        expect(isPlainPrimaryClick(prevented)).toBe(false);
    });

    it('preserves anchors with browser-owned navigation behavior', () => {
        const anchor = document.createElement('a');
        expect(shouldEnhanceAnchorClick(click(), anchor)).toBe(true);

        anchor.target = '_blank';
        expect(shouldEnhanceAnchorClick(click(), anchor)).toBe(false);

        anchor.target = '';
        anchor.download = 'article.html';
        expect(shouldEnhanceAnchorClick(click(), anchor)).toBe(false);
    });

    it('recognizes absolute, protocol-relative, mail, and telephone links', () => {
        expect(isExternalHref('https://example.com')).toBe(true);
        expect(isExternalHref('//example.com/path')).toBe(true);
        expect(isExternalHref('mailto:test@example.com')).toBe(true);
        expect(isExternalHref('tel:+123456')).toBe(true);
        expect(isExternalHref('/posts/example')).toBe(false);
        expect(isExternalHref('#posts')).toBe(false);
    });
});
