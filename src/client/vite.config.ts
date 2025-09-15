import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [wasm()],
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
