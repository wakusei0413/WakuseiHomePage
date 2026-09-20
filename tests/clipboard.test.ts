import { afterEach, describe, expect, it, vi } from 'vitest';
import { copyText } from '../src/lib/clipboard';

describe('clipboard helper', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        document.body.innerHTML = '';
    });

    it('uses the Clipboard API in a secure context', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });

        await expect(copyText('hello')).resolves.toBe(true);
        expect(writeText).toHaveBeenCalledWith('hello');
        expect(document.querySelector('textarea')).toBeNull();
    });

    it('falls back and always removes its temporary textarea', async () => {
        const execCommand = vi.fn().mockReturnValue(true);
        Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
        Object.defineProperty(document, 'execCommand', {
            configurable: true,
            value: execCommand
        });

        await expect(copyText('fallback')).resolves.toBe(true);
        expect(execCommand).toHaveBeenCalledWith('copy');
        expect(document.querySelector('textarea')).toBeNull();
    });
});
