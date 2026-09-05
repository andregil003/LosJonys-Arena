// vite.config.ts — Configuración de Vite para Phaser 4
import { defineConfig } from 'vite';

export default defineConfig({
  // Importante: './' para itch.io y subdirectorios; cambiar a '/losjonys-arena/' para GitHub Pages
  base: './',

  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Fraccionar Phaser en su propio chunk para cachear mejor
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
        },
      },
    },
    assetsInlineLimit: 4096,
  },

  server: {
    port: 5173,
    open: true, // abre el navegador al arrancar el dev server
    // host: '0.0.0.0', // descomentar para acceder desde el móvil en la misma red
  },

  // Los assets públicos (imágenes, audio) van en public/ y se sirven tal cual
  publicDir: 'public',
});