import { defineConfig } from 'vite';

export default defineConfig({
  // Rutas relativas: el bundle funciona en Vercel, en un zip de itch.io y en file://.
  base: './',
  server: { port: process.env.PORT ? Number(process.env.PORT) : 5173 },
  build: { target: 'es2022', sourcemap: true },
  // El paquete -compat lleva el wasm embebido en base64; excluirlo del pre-bundle evita
  // que el optimizador de Vite lo reescriba.
  optimizeDeps: { exclude: ['@dimforge/rapier3d-compat'] },
});
