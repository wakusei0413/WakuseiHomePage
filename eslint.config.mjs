import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import globals from 'globals';

export default [
    {
        ignores: ['dist/**', 'public/**', 'node_modules/**', '.astro/**']
    },
    js.configs.recommended,
    {
        files: ['src/**/*.{ts,vue}', 'tests/**/*.test.ts', 'astro.config.mjs'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
                ecmaFeatures: { jsx: true },
                extraFileExtensions: ['.vue']
            },
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2021
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            ...tseslint.configs.recommended.rules,
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'off',
            'no-console': 'off',
            'no-var': 'error',
            'prefer-const': 'warn',
            eqeqeq: ['error', 'always'],
            'no-trailing-spaces': 'error',
            'no-multiple-empty-lines': ['error', { max: 1 }],
            semi: ['error', 'always']
        }
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsparser,
                ecmaVersion: 2022,
                sourceType: 'module',
                extraFileExtensions: ['.vue']
            },
            globals: {
                ...globals.browser
            }
        },
        plugins: {
            vue: vuePlugin,
            '@typescript-eslint': tseslint
        },
        rules: {
            ...vuePlugin.configs['flat/recommended'].rules,
            'vue/multi-word-component-names': 'off',
            'vue/html-indent': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/html-self-closing': 'off',
            'vue/singleline-html-element-content-newline': 'off',
            'no-inner-declarations': 'off',
            'prefer-const': 'off',
            'no-undef': 'off',
            'no-console': 'off',
            'no-var': 'error',
            eqeqeq: ['error', 'always'],
            'no-trailing-spaces': 'error',
            'no-multiple-empty-lines': ['error', { max: 1 }],
            semi: ['error', 'always'],
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }]
        }
    },
    {
        files: ['astro.config.mjs', '*.mjs'],
        languageOptions: {
            parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
            globals: {
                ...globals.node
            }
        },
        rules: {}
    },
    {
        files: ['tests/**/*.test.ts'],
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                vi: 'readonly'
            }
        }
    }
];