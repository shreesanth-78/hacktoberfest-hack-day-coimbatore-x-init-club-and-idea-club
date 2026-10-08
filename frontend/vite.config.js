import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves the site from /<repository>/, so the build there sets VITE_BASE; everywhere else it is '/'.
  base: process.env.VITE_BASE || '/',
  server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } } },
});
