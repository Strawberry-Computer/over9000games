import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import path from "path";

// Testbed-specific vite config - includes mocks for @devvit/web/client
export default defineConfig({
  plugins: [wasm()],
  resolve: {
    alias: {
      '@devvit/web/client': path.resolve(__dirname, '../../src/testbed/mocks/devvit-web-client.js'),
    }
  },
  optimizeDeps: {
    exclude: ['quickjs-emscripten']
  },
  build: {
    outDir: "../../dist/client",
    minify: false,
    rollupOptions: {
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        sourcemapFileNames: "[name].js.map",
      },
    },
  },
});
