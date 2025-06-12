// eslint.config.js

import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import nPlugin from 'eslint-plugin-n';
import prettierPlugin from 'eslint-plugin-prettier';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
        ecmaVersion: 2023,
        sourceType: 'module',
      },
    },
    plugins: {
      import: importPlugin,
      prettier: prettierPlugin,
      n: nPlugin,
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: './tsconfig.json'
        }
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // Node.js rules
      'n/no-deprecated-api': 'error',
      'n/no-missing-import': 'off', // Turning this off as we're using TypeScript's module resolution
      'n/no-unpublished-import': 'off', // Turning this off as we're in a development environment
      'n/no-unsupported-features/es-syntax': [
        'error',
        {
          version: '>=16.0.0',
          ignores: ['modules'],
        },
      ],
      'n/shebang': 'error',

      // Prettier rules
      'prettier/prettier': ['error', {}, { usePrettierrc: true }],

      // Import rules
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
            'object',
            'type',
          ],
          pathGroups: [
            {
              pattern: '@/**',
              group: 'internal',
              position: 'before',
            },
          ],
          'newlines-between': 'always',
          alphabetize: {
            order: 'asc',
            caseInsensitive: true,
          },
        },
      ],
      'import/no-duplicates': 'error',
      'import/no-unresolved': 'error',
      'import/named': 'error',
      'import/namespace': 'error',
      'import/default': 'error',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
      'import/no-cycle': 'error',

      // TypeScript rules
      '@typescript-eslint/no-unused-expressions': [
        'error',
        {
          allowShortCircuit: true,
          allowTernary: true,
          allowTaggedTemplates: true,
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Naming convention rules
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'interface',
          format: ['PascalCase'],
          suffix: ['Interface'],
        },
        {
          selector: 'typeAlias',
          format: ['PascalCase'],
          suffix: ['Type'],
        },
        {
          selector: 'class',
          format: ['PascalCase'],
        },
        {
          selector: 'method',
          format: ['camelCase'],
        },
        {
          selector: 'function',
          format: ['camelCase'],
        },
        {
          selector: 'variable',
          format: ['camelCase', 'UPPER_CASE'],
          filter: {
            regex: '^(__filename|__dirname)$',
            match: false,
          },
        },
        {
          selector: 'memberLike',
          modifiers: ['private'],
          format: ['camelCase'],
          leadingUnderscore: 'require',
        },
      ],
    },
  },
  eslintConfigPrettier,
);
