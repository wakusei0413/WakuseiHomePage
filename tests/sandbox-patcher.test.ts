// @vitest-environment node

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const patcher = readFileSync('scripts/patch-esbuild-sandbox.cjs', 'utf8');

describe('sandbox esbuild patcher guardrails', () => {
    it('fails closed when required dependency internals drift', () => {
        expect(patcher).toContain('required patch target is missing');
        expect(patcher).toContain('required patch no longer matches dependency source');
        expect(patcher).not.toContain('no match (versions may differ)');
    });

    it('requires native and WebAssembly esbuild versions to stay aligned', () => {
        expect(patcher).toContain("const esbuildVersion = packageVersion('esbuild')");
        expect(patcher).toContain("const esbuildWasmVersion = packageVersion('esbuild-wasm')");
        expect(patcher).toContain("esbuildVersion !== esbuildWasmVersion || esbuildVersion !== '0.28.1'");
    });

    it('keeps the service protocol version synchronized with the supported pair', () => {
        expect(patcher.match(/0\.28\.1/g)).toHaveLength(3);
        expect(patcher).toContain('--service=');
    });
});
