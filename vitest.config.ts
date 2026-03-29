import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'jsdom',
        include: ['tests/**/*.test.ts'],
        exclude: ['node_modules', 'dist'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules',
                'tests',
                'src/codemirror.d.ts'
            ]
        }
    },
    resolve: {
        alias: {
            'obsidian': resolve(__dirname, 'tests/mocks/obsidian-module.ts')
        }
    }
});