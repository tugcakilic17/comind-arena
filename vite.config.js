import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at /; production is a GitHub project site.
  base: command === 'build' || isPreview ? '/comind-arena/' : '/',
}));
