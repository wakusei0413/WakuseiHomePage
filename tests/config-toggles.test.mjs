import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../js/validate-config.js';
import { CONFIG } from '../config.js';

function cloneConfig() {
    return JSON.parse(JSON.stringify(CONFIG));
}

describe('CONFIG toggle validation', () => {
    describe('slogans.loop', () => {
        it('accepts loop: true', () => {
            const config = cloneConfig();
            config.slogans.loop = true;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts loop: false', () => {
            const config = cloneConfig();
            config.slogans.loop = false;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts loop omitted (undefined)', () => {
            const config = cloneConfig();
            delete config.slogans.loop;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects loop: "yes"', () => {
            const config = cloneConfig();
            config.slogans.loop = 'yes';
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('loop')));
        });
    });

    describe('time toggles', () => {
        it('accepts showWeekday: true', () => {
            const config = cloneConfig();
            config.time.showWeekday = true;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts showWeekday: false', () => {
            const config = cloneConfig();
            config.time.showWeekday = false;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts showDate: false', () => {
            const config = cloneConfig();
            config.time.showDate = false;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects showWeekday: "yes"', () => {
            const config = cloneConfig();
            config.time.showWeekday = 'yes';
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('showWeekday')));
        });

        it('rejects showDate: 1', () => {
            const config = cloneConfig();
            config.time.showDate = 1;
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('showDate')));
        });
    });

    describe('wallpaper.infiniteScroll', () => {
        it('accepts enabled: true', () => {
            const config = cloneConfig();
            config.wallpaper.infiniteScroll = { enabled: true, speed: 2, batchSize: 5, maxImages: 50 };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts enabled: false', () => {
            const config = cloneConfig();
            config.wallpaper.infiniteScroll = { enabled: false, speed: 2, batchSize: 5, maxImages: 50 };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects enabled: "yes"', () => {
            const config = cloneConfig();
            config.wallpaper.infiniteScroll = { enabled: 'yes', speed: 2, batchSize: 5, maxImages: 50 };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('infiniteScroll.enabled')));
        });

        it('rejects non-number batchSize', () => {
            const config = cloneConfig();
            config.wallpaper.infiniteScroll = { enabled: true, batchSize: '5', speed: 2, maxImages: 50 };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('batchSize')));
        });
    });

    describe('effects.scrollReveal', () => {
        it('accepts enabled: true', () => {
            const config = cloneConfig();
            config.effects = { scrollReveal: { enabled: true, offset: 50, delay: 50 } };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts enabled: false', () => {
            const config = cloneConfig();
            config.effects = { scrollReveal: { enabled: false, offset: 50, delay: 50 } };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects enabled: "true"', () => {
            const config = cloneConfig();
            config.effects = { scrollReveal: { enabled: 'true', offset: 50, delay: 50 } };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('scrollReveal.enabled')));
        });

        it('rejects non-number offset', () => {
            const config = cloneConfig();
            config.effects = { scrollReveal: { enabled: true, offset: '50', delay: 50 } };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('offset')));
        });

        it('rejects non-number delay', () => {
            const config = cloneConfig();
            config.effects = { scrollReveal: { enabled: true, offset: 50, delay: 'fast' } };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('delay')));
        });
    });

    describe('animation.cursorStyle', () => {
        it('accepts block', () => {
            const config = cloneConfig();
            config.animation = { cursorStyle: 'block' };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts line', () => {
            const config = cloneConfig();
            config.animation = { cursorStyle: 'line' };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects invalid value', () => {
            const config = cloneConfig();
            config.animation = { cursorStyle: 'underline' };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('cursorStyle')));
        });
    });

    describe('debug.consoleLog', () => {
        it('accepts true', () => {
            const config = cloneConfig();
            config.debug.consoleLog = true;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('accepts false', () => {
            const config = cloneConfig();
            config.debug.consoleLog = false;
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects string', () => {
            const config = cloneConfig();
            config.debug.consoleLog = 'yes';
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('consoleLog')));
        });
    });

    describe('footer.text', () => {
        it('accepts string', () => {
            const config = cloneConfig();
            config.footer = { text: 'Hello 2025' };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects number', () => {
            const config = cloneConfig();
            config.footer = { text: 42 };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('footer.text')));
        });
    });

    describe('loading.texts', () => {
        it('accepts valid texts array', () => {
            const config = cloneConfig();
            config.loading = { texts: ['Loading...'], textSwitchInterval: 2000 };
            assert.ok(validate(config).valid, validate(config).errors.join('; '));
        });

        it('rejects empty texts array', () => {
            const config = cloneConfig();
            config.loading = { texts: [], textSwitchInterval: 2000 };
            assert.strictEqual(validate(config).valid, false);
        });

        it('rejects non-number textSwitchInterval', () => {
            const config = cloneConfig();
            config.loading = { texts: ['Loading...'], textSwitchInterval: 'fast' };
            assert.strictEqual(validate(config).valid, false);
            assert.ok(validate(config).errors.some(e => e.includes('textSwitchInterval')));
        });
    });

    describe('top-level section existence', () => {
        it('rejects missing footer section', () => {
            const config = cloneConfig();
            delete config.footer;
            const result = validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.includes('footer') && e.includes('missing')));
        });

        it('rejects missing animation section', () => {
            const config = cloneConfig();
            delete config.animation;
            const result = validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.includes('animation') && e.includes('missing')));
        });

        it('rejects missing effects section', () => {
            const config = cloneConfig();
            delete config.effects;
            const result = validate(config);
            assert.strictEqual(result.valid, false);
            assert.ok(result.errors.some(e => e.includes('effects') && e.includes('missing')));
        });
    });
});