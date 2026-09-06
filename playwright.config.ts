import { defineConfig, devices } from '@playwright/test';

// WebGL en headless: ANGLE + SwiftShader (render por software). Si un test 3D
// falla con "WebGL not supported", añadir '--ignore-gpu-blocklist'.
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: gl },
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // Viewport y táctil de iPhone 13 sobre Chromium: el CI solo instala chromium y lo que se
      // valida aquí es el layout, no el motor.
      name: 'mobile',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
});
