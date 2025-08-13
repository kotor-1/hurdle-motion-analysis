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
    chunkSizeWarningLimit: 1000, // 警告の閾値を1MBに
    rollupOptions: {
      output: {
        manualChunks: {
          // TensorFlowを別チャンクに分離
          tensorflow: ["@tensorflow/tfjs", "@tensorflow-models/pose-detection"],
          // その他のベンダーライブラリ
          vendor: ["chart.js"]
        }
      }
    }
  },
  css: {
    postcss: null
  }
});
