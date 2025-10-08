import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    outDir: 'dist/server',
    lib: {
      entry: path.resolve(__dirname, 'src/server/index.js'),
      formats: ['cjs'],
      fileName: () => 'index.cjs'
    },
    rollupOptions: {
      external: ['express', 'redis', 'dotenv']
    }
  },
  resolve: {
    alias: {
      '@devvit/web/server': path.resolve(__dirname, 'src/testbed/mocks/devvit-web-server.js'),
      '@devvit/media': path.resolve(__dirname, 'src/testbed/mocks/devvit-media.js'),
    }
  },
  define: {
    'process.env.TESTBED_MODE': JSON.stringify('true')
  }
});
