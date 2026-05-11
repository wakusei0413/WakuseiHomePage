import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const runtimeEffects = readFileSync(join(process.cwd(), 'src', 'lib', 'runtime-effects.ts'), 'utf-8');
const topBarComponent = readFileSync(join(process.cwd(), 'src', 'components', 'TopBar.svelte'), 'utf-8');
const clockPanelComponent = readFileSync(join(process.cwd(), 'src', 'components', 'ClockPanel.svelte'), 'utf-8');

describe('logic guardrails', () => {
    it('does not block copy and cut inside editable controls', () => {
        assert.match(runtimeEffects, /const isEditableTarget = \(target: EventTarget \| null\) =>/);
        assert.match(runtimeEffects, /document\.addEventListener\('copy',/);
        assert.match(runtimeEffects, /document\.addEventListener\('cut',/);
        assert.match(runtimeEffects, /if \(isEditableTarget\(event\.target\)\) return;/);
    });

    it('cleans up topbar magnify listeners and rebinds on homepage state changes', () => {
        assert.match(topBarComponent, /let magnifyCleanup: \(\(\) => void\) \| undefined;/);
        assert.match(topBarComponent, /\$effect\(\(\) => \{/);
        assert.match(topBarComponent, /if \(magnifyCleanup\) \{/);
        assert.match(topBarComponent, /magnifyCleanup = setupIconMagnifyHover\(\);/);
    });

    it('respects clock visibility config flags', () => {
        assert.match(clockPanelComponent, /\{#if config\.showWeekday\}/);
        assert.match(clockPanelComponent, /\{#if config\.showDate && dateParts\.dateDisplay\}/);
    });
});
