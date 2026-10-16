import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
const apiProxy = {
  "/api": {
    target: "http://localhost:8000",
    changeOrigin: true,
  },
};

export default defineConfig({
  plugins: [react()],
  // `vite preview` (testing a production build locally) talks to the API too.
  preview: { proxy: apiProxy },
  server: {
    port: 5173,
    // Proxy API calls to the FastAPI backend during development so the
    // frontend can call "/api/..." without worrying about CORS / ports.
    proxy: apiProxy,
  },
});
