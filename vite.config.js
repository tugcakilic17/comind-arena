import { defineConfig } from 'vite';

export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? process.env.APP_BASE_PATH || '/comind-arena/' : '/',
  plugins: [{
    name: 'deployment-metadata',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'deployment.json', source: JSON.stringify({ base: this.environment.config.base }) });
    },
  }],
  server: {
    host: '127.0.0.1', port: 5174, strictPort: true,
    proxy: { '/api': { target: process.env.ACCOUNTS_API_TARGET || 'http://127.0.0.1:3001', changeOrigin: false } },
  },
}));
