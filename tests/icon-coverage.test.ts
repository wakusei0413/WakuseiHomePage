import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const iconComponent = readFileSync(join(process.cwd(), 'src', 'components', 'Icon.vue'), 'utf-8');
const customize = readFileSync(join(process.cwd(), 'src', 'data', 'customize.ts'), 'utf-8');

function extractIconKeys(source: string) {
    const matches = source.matchAll(/^\s{4}(?:'([^']+)'|([a-z0-9-]+)):\s*\{/gm);
    return [...matches].map((match) => match[1] ?? match[2]);
}

function extractConfiguredIcons(source: string) {
    const matches = source.matchAll(/icon(?:Active)?:\s*'([^']+)'/g);
    return [...matches].map((match) => match[1]);
}

describe('icon coverage', () => {
    it('defines inline SVG paths for every configured dock and social icon', () => {
        const iconKeys = new Set(extractIconKeys(iconComponent));
        const configuredIcons = extractConfiguredIcons(customize);

        for (const iconName of configuredIcons) {
            const parts = iconName.trim().split(/\s+/).filter(Boolean);
            const iconClass = [...parts].reverse().find((part) => {
                return part.startsWith('fa-') && !['fa-solid', 'fa-regular', 'fa-brands', 'fas', 'fab'].includes(part);
            });
            const resolved = (iconClass ?? iconName).replace(/^fa-/, '');

            expect(iconKeys.has(resolved), `missing inline icon for ${iconName}`).toBe(true);
        }
    });
});