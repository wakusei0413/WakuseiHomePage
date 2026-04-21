import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    revealMainContent,
    showConfigFailureState,
    simplifyLegacyLoadingText,
    initScrollAnimations,
    initMobileStickyAvatar
} from '../js/bootstrap.js';

function createClassList() {
    const values = new Set();

    return {
        add(className) {
            values.add(className);
        },
        remove(className) {
            values.delete(className);
        },
        contains(className) {
            return values.has(className);
        }
    };
}

function createEventTarget() {
    return {
        listeners: {},
        addEventListener(type, handler) {
            this.listeners[type] = handler;
        }
    };
}

function createElementStub() {
    const target = createEventTarget();

    return {
        ...target,
        classList: createClassList(),
        style: {},
        scrollTop: 0,
        scrollCalls: [],
        scrollTo() {
            this.scrollCalls.push(Array.from(arguments));
        }
    };
}

describe('bootstrap helpers', () => {
    it('revealMainContent adds visible to the container and hidden to the overlay', () => {
        const container = { classList: createClassList() };
        const overlay = { classList: createClassList() };
        const documentStub = {
            querySelector(selector) {
                return selector === '.container' ? container : null;
            },
            getElementById(id) {
                return id === 'loadingOverlay' ? overlay : null;
            }
        };

        revealMainContent({ document: documentStub });

        assert.strictEqual(container.classList.contains('visible'), true);
        assert.strictEqual(overlay.classList.contains('hidden'), true);
    });

    it('showConfigFailureState logs each config error and reveals the page shell', () => {
        const container = { classList: createClassList() };
        const overlay = { classList: createClassList() };
        const errors = [];
        const documentStub = {
            querySelector(selector) {
                return selector === '.container' ? container : null;
            },
            getElementById(id) {
                return id === 'loadingOverlay' ? overlay : null;
            }
        };
        const loggerStub = {
            error(message) {
                errors.push(message);
            }
        };

        showConfigFailureState(['missing profile.name', 'invalid wallpaper.apis'], {
            document: documentStub,
            logger: loggerStub
        });

        assert.deepStrictEqual(errors, ['[CONFIG] missing profile.name', '[CONFIG] invalid wallpaper.apis']);
        assert.strictEqual(container.classList.contains('visible'), true);
        assert.strictEqual(overlay.classList.contains('hidden'), true);
    });

    it('simplifyLegacyLoadingText swaps to the legacy text only in compat mode', () => {
        const loadingText = {
            textContent: 'Loading...',
            getAttribute(name) {
                return name === 'data-legacy-text' ? 'Loading profile...' : null;
            }
        };
        const documentStub = {
            getElementById(id) {
                return id === 'loadingText' ? loadingText : null;
            }
        };

        simplifyLegacyLoadingText({
            document: documentStub,
            utils: {
                isLegacyCompatMode() {
                    return false;
                }
            }
        });
        assert.strictEqual(loadingText.textContent, 'Loading...');

        simplifyLegacyLoadingText({
            document: documentStub,
            utils: {
                isLegacyCompatMode() {
                    return true;
                }
            }
        });
        assert.strictEqual(loadingText.textContent, 'Loading profile...');
    });

    it('initScrollAnimations skips initialization in compat mode', () => {
        let observerCreated = false;
        const loggerMessages = [];

        initScrollAnimations(
            { enabled: true, delay: 100, offset: 20 },
            {
                document: {
                    querySelectorAll() {
                        return [createElementStub()];
                    }
                },
                utils: {
                    isLegacyCompatMode() {
                        return true;
                    }
                },
                logger: {
                    log(message) {
                        loggerMessages.push(message);
                    }
                },
                IntersectionObserver: function IntersectionObserverStub() {
                    observerCreated = true;
                }
            }
        );

        assert.strictEqual(observerCreated, false);
        assert.deepStrictEqual(loggerMessages, ['[兼容模式] 跳过滚动动画']);
    });

    it('initScrollAnimations does not throw in compat mode without a global IntersectionObserver', () => {
        const loggerMessages = [];

        assert.doesNotThrow(() => {
            initScrollAnimations(
                { enabled: true, delay: 100, offset: 20 },
                {
                    document: {
                        querySelectorAll() {
                            return [createElementStub()];
                        }
                    },
                    utils: {
                        isLegacyCompatMode() {
                            return true;
                        }
                    },
                    logger: {
                        log(message) {
                            loggerMessages.push(message);
                        }
                    }
                }
            );
        });

        assert.deepStrictEqual(loggerMessages, ['[兼容模式] 跳过滚动动画']);
    });

    it('initScrollAnimations marks targets, sets delays, and observes each target', () => {
        const targets = [createElementStub(), createElementStub(), createElementStub()];
        const observedTargets = [];
        let observerOptions;

        initScrollAnimations(
            { enabled: true, delay: 75, offset: 30 },
            {
                document: {
                    querySelectorAll() {
                        return targets;
                    }
                },
                utils: {
                    isLegacyCompatMode() {
                        return false;
                    }
                },
                logger: {
                    log() {}
                },
                IntersectionObserver: function IntersectionObserverStub(callback, options) {
                    observerOptions = options;
                    this.observe = function (target) {
                        observedTargets.push(target);
                    };
                    this.callback = callback;
                }
            }
        );

        assert.strictEqual(targets[0].classList.contains('scroll-reveal'), true);
        assert.strictEqual(targets[1].classList.contains('scroll-reveal'), true);
        assert.strictEqual(targets[2].classList.contains('scroll-reveal'), true);
        assert.strictEqual(targets[0].style.transitionDelay, '0ms');
        assert.strictEqual(targets[1].style.transitionDelay, '75ms');
        assert.strictEqual(targets[2].style.transitionDelay, '150ms');
        assert.deepStrictEqual(observedTargets, targets);
        assert.deepStrictEqual(observerOptions, {
            root: null,
            rootMargin: '0px 0px -30px 0px',
            threshold: 0.1
        });
    });

    it('initMobileStickyAvatar skips initialization in compat mode', () => {
        const container = createElementStub();
        const leftPanel = createElementStub();
        const avatarBox = createElementStub();
        const windowStub = createEventTarget();
        const loggerMessages = [];

        initMobileStickyAvatar({
            document: {
                querySelector(selector) {
                    if (selector === '.container') return container;
                    if (selector === '.left-panel') return leftPanel;
                    return null;
                },
                getElementById(id) {
                    return id === 'avatarBox' ? avatarBox : null;
                }
            },
            window: windowStub,
            utils: {
                isLegacyCompatMode() {
                    return true;
                }
            },
            logger: {
                log(message) {
                    loggerMessages.push(message);
                }
            }
        });

        assert.deepStrictEqual(container.listeners, {});
        assert.deepStrictEqual(leftPanel.listeners, {});
        assert.deepStrictEqual(avatarBox.listeners, {});
        assert.deepStrictEqual(windowStub.listeners, {});
        assert.deepStrictEqual(loggerMessages, ['[兼容模式] 跳过移动端粘性头像']);
    });

    it('initMobileStickyAvatar uses container scroll on mobile', () => {
        const container = createElementStub();
        const leftPanel = createElementStub();
        const avatarBox = createElementStub();

        initMobileStickyAvatar({
            document: {
                querySelector(selector) {
                    if (selector === '.container') return container;
                    if (selector === '.left-panel') return leftPanel;
                    return null;
                },
                getElementById(id) {
                    return id === 'avatarBox' ? avatarBox : null;
                },
                documentElement: {
                    style: {}
                }
            },
            window: createEventTarget(),
            utils: {
                isLegacyCompatMode() {
                    return false;
                },
                isMobile() {
                    return true;
                },
                debounce(handler) {
                    return handler;
                }
            },
            logger: {
                log() {}
            }
        });

        assert.ok(container.listeners.scroll);
        assert.strictEqual(leftPanel.listeners.scroll, undefined);

        container.scrollTop = 60;
        container.listeners.scroll();
        assert.strictEqual(avatarBox.classList.contains('scrolled'), true);

        container.scrollTop = 10;
        container.listeners.scroll();
        assert.strictEqual(avatarBox.classList.contains('scrolled'), false);
    });

    it('initMobileStickyAvatar scrolls the container to top on mobile avatar click', () => {
        const container = createElementStub();
        const leftPanel = createElementStub();
        const avatarBox = createElementStub();
        container.scrollTop = 80;
        leftPanel.scrollTop = 120;

        initMobileStickyAvatar({
            document: {
                querySelector(selector) {
                    if (selector === '.container') return container;
                    if (selector === '.left-panel') return leftPanel;
                    return null;
                },
                getElementById(id) {
                    return id === 'avatarBox' ? avatarBox : null;
                },
                documentElement: {
                    style: {
                        scrollBehavior: 'smooth'
                    }
                }
            },
            window: createEventTarget(),
            utils: {
                isLegacyCompatMode() {
                    return false;
                },
                isMobile() {
                    return true;
                },
                debounce(handler) {
                    return handler;
                }
            },
            logger: {
                log() {}
            }
        });

        avatarBox.listeners.click();

        assert.deepStrictEqual(container.scrollCalls, [[{ top: 0, behavior: 'smooth' }]]);
        assert.deepStrictEqual(leftPanel.scrollCalls, []);
    });
});
