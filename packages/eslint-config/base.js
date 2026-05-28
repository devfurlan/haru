import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import onlyWarn from 'eslint-plugin-only-warn';
import tseslint from 'typescript-eslint';

export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  ...tseslint.configs.recommended,
  {
    plugins: { 'only-warn': onlyWarn },
  },
  {
    ignores: ['dist/**', '.next/**', 'node_modules/**'],
  },
];
