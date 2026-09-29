// Twikoo injects its CSS once, at module evaluation; a View Transitions head swap removes it.
vi.mock('twikoo', () => {
    const style = document.createElement('style');
    style.setAttribute('data-twikoo', '');
    style.textContent = '.twikoo{}';
    document.head.append(style);
    return { default: { init: vi.fn(), getVisitorsCount: vi.fn() } };
});

describe('Twikoo styles across client-side navigation', () => {
    it('puts the stylesheet back after the head is swapped', async () => {
        const { loadTwikoo } = await import('../src/lib/twikoo-client');
        await loadTwikoo();
        expect(document.querySelectorAll('style[data-twikoo]')).toHaveLength(1);

        // What astro:transitions does to head elements the next page does not declare.
        for (const el of [...document.head.children]) el.remove();
        expect(document.querySelector('style[data-twikoo]')).toBeNull();

        await loadTwikoo();
        expect(document.querySelectorAll('style[data-twikoo]')).toHaveLength(1);
    });
});
