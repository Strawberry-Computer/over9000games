import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@devvit/web/client': path.resolve(__dirname, 'src/testbed/mocks/devvit-web-client.js'),
      '@devvit/web/server': path.resolve(__dirname, 'src/testbed/mocks/devvit-web-server.js'),
      '@devvit/media': path.resolve(__dirname, 'src/testbed/mocks/devvit-media.js'),
    }
  },
  define: {
    'process.env.TESTBED_MODE': JSON.stringify('true')
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
