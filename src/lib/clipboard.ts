function fallbackCopy(text: string): boolean {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();

    try {
        const { execCommand } = document as unknown as { execCommand: (command: string) => boolean };
        return execCommand.call(document, 'copy');
    } catch {
        return false;
    } finally {
        textarea.remove();
    }
}

export async function copyText(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // Older browsers and denied permissions use the compatibility fallback.
    }

    return fallbackCopy(text);
}
