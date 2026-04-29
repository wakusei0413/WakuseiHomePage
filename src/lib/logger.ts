export function createLogger(enabled: boolean) {
    return {
        log: (...args: unknown[]) => {
            if (enabled) {
                console.log(...args);
            }
        },
        warn: (...args: unknown[]) => {
            console.warn(...args);
        },
        error: (...args: unknown[]) => {
            console.error(...args);
        }
    };
}
