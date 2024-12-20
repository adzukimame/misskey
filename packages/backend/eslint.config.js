import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import sharedConfig from '../shared/eslint.config.js';

/* eslint-disable import/no-default-export */

/** @type { import('eslint').Linter.Config[] } */
export default [
	...sharedConfig,
	{
		ignores: ['**/node_modules', 'built', 'built-test', '@types/**/*', 'migration'],
	},
	{
		files: ['**/*.ts', '**/*.tsx'],
		languageOptions: {
			parserOptions: {
				parser: tsParser,
				project: ['./tsconfig.json', './test/tsconfig.json', './test-federation/tsconfig.json'],
				sourceType: 'module',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'import/order': ['warn', {
				groups: [
					'builtin',
					'external',
					'internal',
					'parent',
					'sibling',
					'index',
					'object',
					'type',
				],
				pathGroups: [{
					pattern: '@/**',
					group: 'external',
					position: 'after',
				}],
			}],
			'no-restricted-globals': ['error', {
				name: '__dirname',
				message: 'Not in ESModule. Use `import.meta.url` instead.',
			}, {
				name: '__filename',
				message: 'Not in ESModule. Use `import.meta.url` instead.',
			}],
		},
	},
	{
		files: ['src/server/web/{bios,boot,cli}.js'],
		languageOptions: {
			globals: {
				...Object.fromEntries(Object.entries(globals.node).map(([key]) => [key, 'off'])),
				...globals.browser,
			},
		},
	},
	{
		files: ['scripts/*.mjs'],
		languageOptions: {
			globals: globals.node,
		},
	},
];
