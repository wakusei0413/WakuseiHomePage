import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtimeEffects = readFileSync(join(process.cwd(), 'src', 'lib', 'runtime-effects.ts'), 'utf-8');
const topBarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.vue'), 'utf-8');
const clockPanelComponent = readFileSync(join(process.cwd(), 'src', 'components', 'ClockPanel.vue'), 'utf-8');

describe('logic guardrails', () => {
    it('does not block copy and cut inside editable controls', () => {
        expect(runtimeEffects).toMatch(/const isEditableTarget = \(target: EventTarget \| null\) =>/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('copy',/);
        expect(runtimeEffects).toMatch(/document\.addEventListener\('cut',/);
        expect(runtimeEffects).toMatch(/if \(isEditableTarget\(event\.target\)\) return;/);
    });

    it('cleans up topbar magnify listeners and rebinds on homepage state changes', () => {
        expect(topBarComponent).toMatch(/let magnifyCleanup: \(\(\) => void\) \| undefined;/);
        expect(topBarComponent).toMatch(/watch\(\[isMobile, isHomePage, barRef\]/);
        expect(topBarComponent).toMatch(/if \(magnifyCleanup\) \{/);
        expect(topBarComponent).toMatch(/magnifyCleanup = setupIconMagnifyHover\(\);/);
    });

    it('respects clock visibility config flags', () => {
        expect(clockPanelComponent).toMatch(/v-if="config\.showWeekday"/);
        expect(clockPanelComponent).toMatch(/v-if="config\.showDate && dateParts\.dateDisplay"/);
    });
});
