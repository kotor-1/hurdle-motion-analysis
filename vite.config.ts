import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["onnxruntime-web"]
        }
      }
    }
  },
  css: {
    postcss: null
  }
});
