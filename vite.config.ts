/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages project-repo (not a *.github.io root repo) — assets are served under /ruderliga/
export default defineConfig({
  plugins: [react()],
  base: '/ruderliga/',
  // Single source of truth for the version shown in the header.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
