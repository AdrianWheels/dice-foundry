import { defineConfig, devices } from '@playwright/test';

// WebGL en headless: ANGLE + SwiftShader (render por software). Si un test 3D
// falla con "WebGL not supported", añadir '--ignore-gpu-blocklist'.
const gl = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];

// Con BASE_URL se prueba contra un despliegue real (Tarea 27) y no se levanta servidor local.
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';
const webServer = process.env.BASE_URL
  ? undefined
  : {
      command: 'npm run build && npm run preview',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    };

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: gl },
  },
  webServer,
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
