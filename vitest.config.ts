import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        // Lógica pura (core, physics, app, audio, render helpers). Sin DOM.
        test: {
          name: 'node',
          include: ['src/{core,physics,app,audio,render}/**/*.test.ts'],
          environment: 'node',
          testTimeout: 30_000,
        },
      },
      {
        // Componentes de UI vanilla. jsdom.
        test: {
          name: 'jsdom',
          include: ['src/ui/**/*.test.ts'],
          environment: 'jsdom',
        },
      },
    ],
  },
});
