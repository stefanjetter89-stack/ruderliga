import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages project-repo (not a *.github.io root repo) — assets are served under /ruderliga/
export default defineConfig({
  plugins: [react()],
  base: '/ruderliga/',
})
