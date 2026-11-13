import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Relative base: the built site works from any path (GitHub Pages project
// sites, Netlify, a sub-folder) without extra configuration.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
