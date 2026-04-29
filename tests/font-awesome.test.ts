import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { appendStylesheet, hasConfiguredIcons, scheduleFontAwesomeLoad } from '../src/lib/font-awesome';

describe('Font Awesome loading helpers', () => {
    it('detects whether any configured social link needs an icon font', () => {
        assert.strictEqual(hasConfiguredIcons([{ icon: 'fab fa-github' }]), true);
        assert.strictEqual(hasConfiguredIcons([{}]), false);
    });

    it('schedules the stylesheet only when icons are configured', () => {
        let scheduled = false;

        const didSchedule = scheduleFontAwesomeLoad([{ icon: 'fab fa-github' }], {
            requestIdleCallback(callback: () => void) {
                scheduled = true;
                callback();
            },
            document: {
                head: {
                    appendChild() {}
                },
                createElement() {
                    return {};
                }
            }
        });

        assert.strictEqual(didSchedule, true);
        assert.strictEqual(scheduled, true);
    });

    it('creates a stylesheet element with load and error handlers', () => {
        const appended: unknown[] = [];

        const link = appendStylesheet('https://example.com/app.css', {
            document: {
                head: {
                    appendChild(node: unknown) {
                        appended.push(node);
                    }
                },
                createElement() {
                    return {};
                }
            }
        });

        assert.strictEqual(appended.length, 1);
        assert.strictEqual(link.rel, 'stylesheet');
        assert.strictEqual(typeof link.onload, 'function');
        assert.strictEqual(typeof link.onerror, 'function');
    });
});
