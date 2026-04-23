import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initConsent, consentGranted } from '../js/consent.js';

// Mock localStorage
const storage = new Map();
global.localStorage = {
    getItem: (key) => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value.toString()),
    removeItem: (key) => storage.delete(key),
    clear: () => storage.clear()
};

// Mock document
const documentListeners = {};
global.document = {
    addEventListener: (type, handler, options) => {
        documentListeners[type] = { handler, options };
    },
    removeEventListener: (type, handler) => {
        if (documentListeners[type] && documentListeners[type].handler === handler) {
            delete documentListeners[type];
        }
    }
};

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

function createElementStub() {
    return {
        style: {},
        classList: createClassList(),
        parentNode: {
            removeChild: () => {}
        }
    };
}

describe('consent module', () => {
    beforeEach(() => {
        localStorage.clear();
        for (const key in documentListeners) {
            delete documentListeners[key];
        }
    });

    it('consentGranted returns false when no localStorage key exists', () => {
        assert.strictEqual(consentGranted(), false);
    });

    it('consentGranted returns false when localStorage data is invalid JSON', () => {
        localStorage.setItem('wakusei_consent_v1', 'not-json');
        assert.strictEqual(consentGranted(), false);
    });

    it('consentGranted returns false when consent is expired (>30d)', () => {
        localStorage.setItem(
            'wakusei_consent_v1',
            JSON.stringify({ granted: true, timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000 })
        );
        assert.strictEqual(consentGranted(), false);
    });

    it('consentGranted returns true when consent is within 30 days', () => {
        localStorage.setItem(
            'wakusei_consent_v1',
            JSON.stringify({ granted: true, timestamp: Date.now() - 1000 })
        );
        assert.strictEqual(consentGranted(), true);
    });

    it('initConsent calls onConsent (with slight delay) when consent already granted', (t, done) => {
        localStorage.setItem(
            'wakusei_consent_v1',
            JSON.stringify({ granted: true, timestamp: Date.now() })
        );

        let called = false;
        initConsent(null, null, function () {
            called = true;
            assert.strictEqual(called, true);
            done();
        }, null);
    });

    it('initConsent shows overlay and binds events when no consent', () => {
        const container = createElementStub();
        const overlay = createElementStub();
        let called = false;

        initConsent(container, overlay, () => {
            called = true;
        }, null);

        assert.strictEqual(overlay.classList.contains('active'), true);
        assert.strictEqual(container.style.filter.includes('blur'), true);
        assert.ok(documentListeners['mousedown']);
        assert.ok(documentListeners['touchstart']);
        assert.ok(documentListeners['keydown']);
    });

    it('handleConsent (via triggered event) saves consent and dismisses overlay', (t, done) => {
        const container = createElementStub();
        const overlay = createElementStub();
        let called = false;

        initConsent(container, overlay, () => {
            called = true;
        }, null);

        // Simulate interaction
        documentListeners['mousedown'].handler();

        assert.strictEqual(consentGranted(), true);
        assert.strictEqual(overlay.classList.contains('active'), false);
        assert.strictEqual(overlay.classList.contains('dismissed'), true);
        assert.strictEqual(container.style.filter, '');

        // Wait for the setTimeout in dismissConsentOverlay/bindConsentEvents
        setTimeout(() => {
            assert.strictEqual(called, true);
            done();
        }, 500);
    });
});
