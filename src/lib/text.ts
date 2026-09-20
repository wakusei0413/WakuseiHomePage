export interface TextSegment {
    text: string;
    isLatin: boolean;
}

export function splitLatinText(text: string): TextSegment[] {
    return text
        .split(/([A-Za-z][A-Za-z0-9'.-]*)/g)
        .filter(Boolean)
        .map((part) => ({ text: part, isLatin: /^[A-Za-z]/.test(part) }));
}
