import { createLogger } from '../lib/logger';

export function useLogger(enabled: boolean) {
    return createLogger(enabled);
}
