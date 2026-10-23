import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Deployment target: GitHub Pages, served from a repository sub-path
 * (https://<owner>.github.io/<repo>/). A *relative* base keeps the built
 * assets resolvable from any sub-path without rewriting URLs, which is what
 * lets the same `dist/` work at the repository root, under a project page,
 * or behind any future custom domain.
 */
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    cssCodeSplit: false,
    sourcemap: false,
    reportCompressedSize: true,
  },
  server: {
    host: '127.0.0.1',
    port: 5502,
    strictPort: false,
  },
  preview: {
    host: '127.0.0.1',
    port: 5503,
  },
});
