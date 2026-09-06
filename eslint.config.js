import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-config-prettier';

const noMathRandom = {
  'no-restricted-properties': [
    'error',
    {
      object: 'Math',
      property: 'random',
      message: 'Usa Rng (src/core/rng.ts): todo azar es determinista.',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'coverage/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  { files: ['src/**/*.ts'], rules: { ...noMathRandom } },
  { files: ['src/core/rng.ts'], rules: { 'no-restricted-properties': 'off' } },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                'three',
                'three/*',
                '@dimforge/*',
                '**/physics/**',
                '**/render/**',
                '**/ui/**',
                '**/app/**',
                '**/audio/**',
              ],
              message: 'src/core es puro: sin three, rapier, DOM ni capas superiores.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        'window',
        'document',
        'localStorage',
        'navigator',
        'requestAnimationFrame',
      ],
    },
  },
  {
    files: ['src/physics/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*', '**/render/**', '**/ui/**', '**/app/**', '**/audio/**'],
              message: 'src/physics no conoce three ni la UI.',
            },
          ],
        },
      ],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage'],
    },
  },
  prettier,
);
