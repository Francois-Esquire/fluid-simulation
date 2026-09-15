import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  base: '/fluid-simulation/',
  resolve: { alias: { assert: 'assert/', process: 'process/browser.js' } },
  build: { outDir: '../public', emptyOutDir: true },
});
