import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import { resolve } from "path";

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
      input: {
        main: resolve(__dirname, "index.html"),
        splash: resolve(__dirname, "splash.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name][extname]",
        sourcemapFileNames: "[name].js.map",
      },
    },
  },
});
