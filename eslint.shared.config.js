// Shared ESLint configuration for all CompilerAI workspace packages.
// Packages extend this by importing and spreading it in their eslint.config.js.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export const sharedIgnores = ['dist/**', 'node_modules/**', 'docs/**', 'coverage/**'];

export const sharedRules = {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    },
  ],
  'no-console': 'warn',
  'no-undef': 'off',
  'no-empty': ['error', { allowEmptyCatch: true }],
  'prefer-const': 'error',
  'no-var': 'error',
  'eqeqeq': ['error', 'always'],
};

export function createSharedConfig() {
  return tseslint.config(
    {
      ignores: sharedIgnores,
    },
    {
      files: ['**/*.ts'],
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      languageOptions: {
        globals: {
          ...globals.node,
        },
      },
      rules: sharedRules,
    },
  );
}
